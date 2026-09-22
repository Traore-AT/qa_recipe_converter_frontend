import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { teamsApi } from '../api/teams';
import { PageLayout } from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import type { Defect } from '../types';
import { queryKeys } from '../lib/queryKeys';

const PAGE_SIZE = 20;

const SEVERITY_STYLES: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critique', color: 'text-error bg-error-container' },
  major: { label: 'Majeure', color: 'text-warning bg-warning-container' },
  minor: { label: 'Mineure', color: 'text-primary bg-primary-fixed' },
  trivial: { label: 'Triviale', color: 'text-on-surface-variant bg-surface-container-high' },
};

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

const STATUS_STYLES: Record<string, { label: string; variant: BadgeVariant }> = {
  open: { label: 'Ouvert', variant: 'error' },
  in_progress: { label: 'En cours', variant: 'warning' },
  resolved: { label: 'Résolu', variant: 'info' },
  closed: { label: 'Fermé', variant: 'default' },
  reopened: { label: 'Réouvert', variant: 'error' },
};

export default function DefectTrackerPage() {
  const { slug, projectSlug } = useParams<{ slug: string; projectSlug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<string>('');
  const [newDefect, setNewDefect] = useState({
    title: '', description: '', severity: 'major', priority: 'medium',
    use_case: '', assigned_to: '', steps_to_reproduce: '', expected_behavior: '',
    actual_behavior: '', environment: '',
  });

  const { data: defects, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.defects(slug, projectSlug, filter, page),
    queryFn: () => teamsApi.listDefects(slug!, projectSlug!, filter ? { status: filter, page } : { page }),
    enabled: !!slug && !!projectSlug,
  });

  const { data: stats } = useQuery({
    queryKey: queryKeys.defectStats(slug, projectSlug),
    queryFn: () => teamsApi.getDefectStats(slug!, projectSlug!),
    enabled: !!slug && !!projectSlug,
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.projectMembers(slug, projectSlug),
    queryFn: () => teamsApi.listProjectMembers(slug!, projectSlug!),
    enabled: !!slug && !!projectSlug && showCreateModal,
  });

  const createMutation = useMutation({
    mutationFn: () => teamsApi.createDefect(slug!, projectSlug!, newDefect as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.defectsRoot(slug, projectSlug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.defectStats(slug, projectSlug) });
      setShowCreateModal(false);
      setNewDefect({ title: '', description: '', severity: 'major', priority: 'medium', use_case: '', assigned_to: '', steps_to_reproduce: '', expected_behavior: '', actual_behavior: '', environment: '' });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      teamsApi.updateDefect(slug!, projectSlug!, id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.defectsRoot(slug, projectSlug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.defectStats(slug, projectSlug) });
    },
  });

  return (
    <PageLayout>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate(`/teams/${slug}/projects/${projectSlug}`)} className="flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary transition-colors mb-2 cursor-pointer">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            Retour au projet
          </button>
          <h1 className="text-headline-lg font-bold text-on-surface">Suivi des anomalies</h1>
          <p className="text-body-sm text-on-surface-variant">Défauts, bugs et anomalies du projet</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>+ Signaler une anomalie</Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card><div className="p-3 text-center"><p className="text-headline-md font-bold text-on-surface">{stats.total}</p><p className="text-body-xs text-on-surface-variant">Total</p></div></Card>
          <Card><div className="p-3 text-center"><p className="text-headline-md font-bold text-error">{stats.open}</p><p className="text-body-xs text-on-surface-variant">Ouverts</p></div></Card>
          <Card><div className="p-3 text-center"><p className="text-headline-md font-bold text-warning">{stats.in_progress}</p><p className="text-body-xs text-on-surface-variant">En cours</p></div></Card>
          <Card><div className="p-3 text-center"><p className="text-headline-md font-bold text-success">{stats.resolved}</p><p className="text-body-xs text-on-surface-variant">Résolus</p></div></Card>
          <Card><div className="p-3 text-center"><p className="text-headline-md font-bold text-on-surface-variant">{stats.closed}</p><p className="text-body-xs text-on-surface-variant">Fermés</p></div></Card>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
          <button key={s} onClick={() => { setFilter(s); if (page > 1) { const p = new URLSearchParams(searchParams); p.delete('page'); setSearchParams(p); } }}
                  className={`px-3 py-1.5 rounded-lg text-body-sm transition-all ${filter === s ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'}`}>
            {s ? STATUS_STYLES[s]?.label || s : 'Tous'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-surface-container-high rounded-lg" />)}</div>
      ) : (
        <div className="space-y-3">
          {defects?.results?.map((defect: Defect) => (
            <Card key={defect.id} className="flex items-start gap-4">
              <div className={`px-2 py-1 rounded text-body-xs font-bold ${SEVERITY_STYLES[defect.severity]?.color || ''}`}>
                {SEVERITY_STYLES[defect.severity]?.label || defect.severity}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-body-base font-semibold text-on-surface">{defect.title}</h3>
                  <Badge variant={STATUS_STYLES[defect.status]?.variant || 'default'}>
                    {STATUS_STYLES[defect.status]?.label || defect.status}
                  </Badge>
                </div>
                {defect.description && <p className="text-body-sm text-on-surface-variant mb-1 line-clamp-2">{defect.description}</p>}
                <div className="flex items-center gap-3 text-body-xs text-on-surface-variant">
                  <span>Signalé par {defect.reported_by_user?.full_name}</span>
                  {defect.assigned_to_user && <span>→ {defect.assigned_to_user.full_name}</span>}
                  <span>{new Date(defect.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              <select
                value={defect.status}
                onChange={e => statusMutation.mutate({ id: defect.id, status: e.target.value })}
                className="text-body-sm border border-outline-variant rounded px-2 py-1 bg-surface"
              >
                {Object.entries(STATUS_STYLES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </Card>
          ))}
          {(!defects?.results || defects.results.length === 0) && (
            <div className="text-center py-12 text-on-surface-variant">Aucune anomalie signalée</div>
          )}
        </div>
      )}

      <Pagination
        page={page}
        count={defects?.count || 0}
        pageSize={PAGE_SIZE}
        onPageChange={(next) => {
          const p = new URLSearchParams(searchParams);
          p.set('page', String(next));
          setSearchParams(p);
          window.scrollTo({ top: 0 });
        }}
        ariaLabel="Pagination des anomalies"
        isFetching={isFetching}
      />

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        labelledBy="defect-modal-title"
        maxWidth="max-w-lg"
        className="p-7"
      >
        <h3 id="defect-modal-title" className="text-headline-sm font-bold text-on-surface mb-5">Signaler une anomalie</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="defect-title" className="text-label-md text-on-surface-variant block mb-1">Titre *</label>
            <input id="defect-title" value={newDefect.title} onChange={e => setNewDefect(p => ({ ...p, title: e.target.value }))}
                   className="w-full border border-outline-variant rounded-lg bg-surface px-3 py-2.5 outline-none focus:border-primary" />
          </div>
          <div>
            <label htmlFor="defect-description" className="text-label-md text-on-surface-variant block mb-1">Description</label>
            <textarea id="defect-description" value={newDefect.description} onChange={e => setNewDefect(p => ({ ...p, description: e.target.value }))}
                      className="w-full border border-outline-variant rounded-lg bg-surface px-3 py-2.5 outline-none focus:border-primary resize-none" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="defect-severity" className="text-label-md text-on-surface-variant block mb-1">Sévérité</label>
              <select id="defect-severity" value={newDefect.severity} onChange={e => setNewDefect(p => ({ ...p, severity: e.target.value }))}
                      className="w-full border border-outline-variant rounded-lg bg-surface px-3 py-2.5 outline-none focus:border-primary">
                <option value="critical">Critique</option>
                <option value="major">Majeure</option>
                <option value="minor">Mineure</option>
                <option value="trivial">Triviale</option>
              </select>
            </div>
            <div>
              <label htmlFor="defect-priority" className="text-label-md text-on-surface-variant block mb-1">Priorité</label>
              <select id="defect-priority" value={newDefect.priority} onChange={e => setNewDefect(p => ({ ...p, priority: e.target.value }))}
                      className="w-full border border-outline-variant rounded-lg bg-surface px-3 py-2.5 outline-none focus:border-primary">
                <option value="high">Haute</option>
                <option value="medium">Moyenne</option>
                <option value="low">Basse</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="defect-assigned-to" className="text-label-md text-on-surface-variant block mb-1">Assigné à</label>
            <select id="defect-assigned-to" value={newDefect.assigned_to} onChange={e => setNewDefect(p => ({ ...p, assigned_to: e.target.value }))}
                    className="w-full border border-outline-variant rounded-lg bg-surface px-3 py-2.5 outline-none focus:border-primary">
              <option value="">Non assigné</option>
              {members?.results?.map((m) => (
                <option key={m.user.id} value={m.user.id}>{m.user.full_name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Annuler
          </Button>
          <Button onClick={() => createMutation.mutate()} disabled={!newDefect.title || createMutation.isPending}>
            {createMutation.isPending ? '⏳…' : '✅ Signaler'}
          </Button>
        </div>
      </Modal>
    </PageLayout>
  );
}
