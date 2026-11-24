import { useState } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { teamsApi } from '../api/teams';
import { DefectDetailModal } from '../components/qa/DefectDetailModal';
import { DefectFormModal } from '../components/qa/DefectFormModal';
import { RegressionCampaignModal } from '../components/qa/RegressionCampaignModal';
import { PageLayout } from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { getApiErrorMessage } from '../lib/errors';
import { caseLabel, DEFECT_STATUS, formatDay, SEVERITIES } from '../lib/qa';
import { invalidateProjectScope, queryKeys } from '../lib/queryKeys';
import type { Defect, Regression } from '../types';

const PAGE_SIZE = 20;

export default function DefectTrackerPage() {
  const { slug, projectSlug } = useParams<{ slug: string; projectSlug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const [view, setView] = useState<'defects' | 'regressions'>('defects');
  const [filters, setFilters] = useState({ status: '', severity: '', sprint: '', regression: '', search: '' });
  const search = useDebouncedValue(filters.search.trim(), 300);
  const [form, setForm] = useState<{ defect?: Defect; regression?: Regression } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [deleting, setDeleting] = useState<Defect | null>(null);

  const params: Record<string, string | number> = { page };
  for (const [key, value] of Object.entries({ ...filters, search })) if (value) params[key] = value;

  const { data: project } = useQuery({
    queryKey: queryKeys.project(slug, projectSlug),
    queryFn: () => teamsApi.getProject(slug!, projectSlug!),
    enabled: !!slug && !!projectSlug,
  });
  const canWrite = !!project?.can_write;
  const canManage = !!project?.can_manage;

  const { data: defects, isLoading, isFetching, error } = useQuery({
    queryKey: queryKeys.defects(slug, projectSlug, JSON.stringify({ ...params, page: undefined }), page),
    queryFn: () => teamsApi.listDefects(slug!, projectSlug!, params),
    enabled: !!slug && !!projectSlug,
    placeholderData: keepPreviousData,
  });
  const { data: stats } = useQuery({
    queryKey: queryKeys.defectStats(slug, projectSlug),
    queryFn: () => teamsApi.getDefectStats(slug!, projectSlug!),
    enabled: !!slug && !!projectSlug,
  });
  const { data: sprints } = useQuery({
    queryKey: queryKeys.sprints(slug, projectSlug),
    queryFn: () => teamsApi.listSprints(slug!, projectSlug!),
    enabled: !!slug && !!projectSlug,
  });
  const { data: regressions } = useQuery({
    queryKey: queryKeys.regressions(slug, projectSlug),
    queryFn: () => teamsApi.listRegressions(slug!, projectSlug!),
    enabled: !!slug && !!projectSlug,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      teamsApi.updateDefect(slug!, projectSlug!, id, { status }),
    onSuccess: (_, { id }) => {
      invalidateProjectScope(queryClient, slug, projectSlug);
      queryClient.invalidateQueries({ queryKey: queryKeys.defectHistory(id) });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => teamsApi.deleteDefect(slug!, projectSlug!, id),
    onSuccess: () => {
      invalidateProjectScope(queryClient, slug, projectSlug);
      setDeleting(null);
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => teamsApi.downloadDefectsExcel(slug!, projectSlug!, Object.fromEntries(Object.entries(params).filter(([key]) => key !== 'page'))),
  });

  const setPage = (next: number) => {
    const p = new URLSearchParams(searchParams);
    if (next > 1) p.set('page', String(next));
    else p.delete('page');
    setSearchParams(p);
  };
  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters(f => ({ ...f, [key]: value }));
    if (page > 1) setPage(1);
  };

  // Les données affichées suivent le rafraîchissement de la liste.
  const detail = defects?.results?.find(d => d.id === detailId);
  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-body-sm transition-all cursor-pointer ${active ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'}`;
  const selectClass = 'rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface';

  return (
    <PageLayout>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate(`/teams/${slug}/projects/${projectSlug}`)} className="flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary transition-colors mb-2 cursor-pointer">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            Retour au projet
          </button>
          <h1 className="text-headline-lg font-bold text-on-surface">Suivi des anomalies</h1>
          <p className="text-body-sm text-on-surface-variant">Défauts, régressions et anomalies du projet</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" loading={exportMutation.isPending} onClick={() => exportMutation.mutate()}>📊 Exporter en Excel</Button>
          {canWrite && <Button onClick={() => setForm({})}>+ Signaler une anomalie</Button>}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-on-surface' },
            { label: 'Ouverts', value: stats.open + (stats.reopened ?? 0), color: 'text-error' },
            { label: 'En traitement', value: stats.in_progress, color: 'text-warning' },
            { label: 'Résolus', value: stats.resolved, color: 'text-success' },
            { label: 'Fermés', value: stats.closed, color: 'text-on-surface-variant' },
            { label: 'Dont régressions', value: stats.regressions ?? 0, color: 'text-warning' },
          ].map(s => (
            <Card key={s.label}>
              <div className="text-center">
                <p className={`text-headline-md font-bold ${s.color}`}>{s.value}</p>
                <p className="text-body-xs text-on-surface-variant">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div role="tablist" aria-label="Vue" className="mb-4 flex gap-2 border-b border-outline-variant">
        {([['defects', 'Anomalies'], ['regressions', `Régressions (${regressions?.count ?? 0})`]] as const).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
            className={`cursor-pointer border-b-2 px-4 py-2 text-body-sm font-medium ${view === key ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {(statusMutation.isError || exportMutation.isError) && <p role="alert" className="mb-3 text-error">{getApiErrorMessage(statusMutation.error ?? exportMutation.error)}</p>}

      {view === 'regressions' ? (
        <div className="space-y-3">
          {canManage && !!regressions?.count && (
            <div className="flex justify-end">
              <Button onClick={() => setCampaignOpen(true)}>🔁 Lancer une campagne de non-régression</Button>
            </div>
          )}
          {regressions?.results?.map(r => (
            <Card key={r.use_case} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-label-md font-bold text-primary">{caseLabel(r.case_number)}</span>
                  <Badge variant={r.is_active ? 'error' : 'success'}>{r.is_active ? 'Active' : 'Corrigée'}</Badge>
                  {r.occurrences > 1 && <Badge variant="warning">{r.occurrences} occurrences</Badge>}
                </div>
                <p className="mt-1 text-body-base text-on-surface">{r.title}</p>
                <p className="text-body-xs text-on-surface-variant">
                  Détectée le {formatDay(r.last_detected_at)}{r.detected_by ? ` par ${r.detected_by}` : ''}{r.sprint_name ? ` · ${r.sprint_name}` : ''} · statut actuel : {r.current_status}
                </p>
                {r.defects.length > 0 && (
                  <p className="mt-1 text-body-xs text-on-surface-variant">Anomalies liées : {r.defects.map(d => `${d.ticket_number} (${DEFECT_STATUS[d.status].label})`).join(', ')}</p>
                )}
              </div>
              {canWrite && r.is_active && (
                <Button size="sm" variant="secondary" onClick={() => setForm({ regression: r })}>🐛 Créer l’anomalie</Button>
              )}
            </Card>
          ))}
          {regressions?.count === 0 && <div className="text-center py-12 text-on-surface-variant">Aucune régression détectée</div>}
        </div>
      ) : (
        <>
          <div className="mb-3 flex gap-2 flex-wrap" role="group" aria-label="Filtrer par statut">
            <button className={chip(!filters.status)} aria-pressed={!filters.status} onClick={() => setFilter('status', '')}>Tous</button>
            {Object.entries(DEFECT_STATUS).map(([key, s]) => (
              <button key={key} className={chip(filters.status === key)} aria-pressed={filters.status === key} onClick={() => setFilter('status', key)}>{s.label}</button>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <input type="search" aria-label="Rechercher une anomalie" placeholder="Titre, description ou ticket…" value={filters.search} onChange={e => setFilter('search', e.target.value)} className={`${selectClass} min-w-56 flex-1`} />
            <select aria-label="Filtrer par sévérité" value={filters.severity} onChange={e => setFilter('severity', e.target.value)} className={selectClass}>
              <option value="">Toutes sévérités</option>
              {Object.entries(SEVERITIES).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
            </select>
            <select aria-label="Filtrer par sprint" value={filters.sprint} onChange={e => setFilter('sprint', e.target.value)} className={selectClass}>
              <option value="">Tous les sprints</option>
              <option value="none">Hors sprint</option>
              {sprints?.results?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select aria-label="Filtrer les régressions" value={filters.regression} onChange={e => setFilter('regression', e.target.value)} className={selectClass}>
              <option value="">Toutes les anomalies</option>
              <option value="true">Régressions uniquement</option>
              <option value="false">Hors régressions</option>
            </select>
          </div>

          {isLoading ? (
            <div className="animate-pulse space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-surface-container-high rounded-lg" />)}</div>
          ) : error ? (
            <p role="alert" className="py-8 text-center text-error">{getApiErrorMessage(error)}</p>
          ) : (
            <div className="space-y-3">
              {defects?.results?.map(defect => {
                const cases = [defect.use_case_detail, ...(defect.related_cases ?? [])].filter(c => !!c);
                return (
                  <Card key={defect.id} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                    <Badge variant={SEVERITIES[defect.severity]?.variant}>{SEVERITIES[defect.severity]?.label || defect.severity}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <button type="button" onClick={() => setDetailId(defect.id)} className="cursor-pointer text-left text-body-base font-semibold text-on-surface hover:text-primary hover:underline">{defect.title}</button>
                        {defect.is_regression && <Badge variant="warning">↩ Régression</Badge>}
                        {defect.jira_key && <Badge variant="info">{defect.jira_key}</Badge>}
                        {defect.jira_sync_error && <Badge variant="error">Jira : erreur</Badge>}
                      </div>
                      {defect.description && <p className="text-body-sm text-on-surface-variant mb-1 line-clamp-2">{defect.description}</p>}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-xs text-on-surface-variant">
                        {defect.ticket_number && <span className="font-mono">{defect.ticket_number}</span>}
                        <span>Signalé par {defect.reported_by_user?.full_name ?? '—'}</span>
                        {defect.assigned_to_user && <span>→ {defect.assigned_to_user.full_name}</span>}
                        <span>{new Date(defect.created_at).toLocaleDateString('fr-FR')}</span>
                        {defect.sprint_name && <span>🏃 {defect.sprint_name}</span>}
                        {cases.length > 0 && <span>🧪 {cases.map(c => caseLabel(c.case_number)).join(', ')}</span>}
                        {defect.comments_count > 0 && <span>💬 {defect.comments_count}</span>}
                      </div>
                    </div>
                    <select
                      aria-label={`Statut de ${defect.title}`}
                      value={defect.status}
                      disabled={!canWrite || statusMutation.isPending}
                      onChange={e => statusMutation.mutate({ id: defect.id, status: e.target.value })}
                      className="text-body-sm border border-outline-variant rounded px-2 py-1 bg-surface"
                    >
                      {Object.entries(DEFECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </Card>
                );
              })}
              {defects?.results?.length === 0 && <div className="text-center py-12 text-on-surface-variant">Aucune anomalie signalée</div>}
            </div>
          )}

          <Pagination
            page={page}
            count={defects?.count || 0}
            pageSize={PAGE_SIZE}
            onPageChange={(next) => { setPage(next); window.scrollTo({ top: 0 }); }}
            ariaLabel="Pagination des anomalies"
            isFetching={isFetching}
          />
        </>
      )}

      {form && (
        <DefectFormModal
          teamSlug={slug!}
          projectSlug={projectSlug!}
          defect={form.defect}
          initial={form.regression && {
            title: `Régression ${caseLabel(form.regression.case_number)} — ${form.regression.title}`.slice(0, 300),
            sprint: form.regression.sprint ?? '',
            use_case: form.regression.use_case,
            is_regression: true,
          }}
          onClose={() => setForm(null)}
        />
      )}
      {campaignOpen && (
        <RegressionCampaignModal
          teamSlug={slug!}
          projectSlug={projectSlug!}
          onClose={() => setCampaignOpen(false)}
          onDone={sprint => navigate(`/teams/${slug}/projects/${projectSlug}/sprints/${sprint.id}`)}
        />
      )}
      {detail && (
        <DefectDetailModal
          teamSlug={slug!}
          projectSlug={projectSlug!}
          defect={detail}
          canWrite={canWrite}
          canManage={canManage}
          onEdit={() => { setForm({ defect: detail }); setDetailId(null); }}
          onDelete={() => { setDeleting(detail); setDetailId(null); }}
          onClose={() => setDetailId(null)}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title="Supprimer l’anomalie ?"
        description={`« ${deleting?.title ?? ''} » sera supprimée définitivement, avec ses commentaires et son historique.`}
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
        error={deleteMutation.isError ? getApiErrorMessage(deleteMutation.error) : undefined}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </PageLayout>
  );
}
