import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { teamsApi } from '../api/teams';
import { conversionApi } from '../api/conversion';
import { PageLayout } from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { StatusPill } from '../components/ui/StatusPill';
import type { TeamMember } from '../types';
import { getApiErrorMessage } from '../lib/errors';
import { queryKeys } from '../lib/queryKeys';
import { downloadBlob } from '../lib/download';

type ProjectTab = 'overview' | 'sprints' | 'defects' | 'progress' | 'reports';

export default function ProjectDetailPage() {
  const { slug, projectSlug } = useParams<{ slug: string; projectSlug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProjectTab>('overview');
  const [reportError, setReportError] = useState('');

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [selectedRole, setSelectedRole] = useState<string>('tester');

  const { data: project, isLoading } = useQuery({
    queryKey: queryKeys.project(slug, projectSlug),
    queryFn: () => teamsApi.getProject(slug!, projectSlug!),
    enabled: !!slug && !!projectSlug,
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.projectMembers(slug, projectSlug),
    queryFn: () => teamsApi.listProjectMembers(slug!, projectSlug!),
    enabled: !!slug && !!projectSlug,
  });

  const { data: teamMembers } = useQuery({
    queryKey: queryKeys.teamMembers(slug),
    queryFn: () => teamsApi.listMembers(slug!),
    enabled: !!slug && assignModalOpen,
  });

  const { data: jobs } = useQuery({
    queryKey: queryKeys.projectJobs(slug, projectSlug),
    queryFn: () => conversionApi.listJobs(),
    enabled: !!slug && !!projectSlug,
  });

  const { data: sprints } = useQuery({
    queryKey: queryKeys.sprints(slug, projectSlug),
    queryFn: () => teamsApi.listSprints(slug!, projectSlug!),
    enabled: !!slug && !!projectSlug && activeTab === 'sprints',
  });

  const { data: defectStats } = useQuery({
    queryKey: queryKeys.defectStats(slug, projectSlug),
    queryFn: () => teamsApi.getDefectStats(slug!, projectSlug!),
    enabled: !!slug && !!projectSlug && activeTab === 'defects',
  });

  const { data: memberProgress } = useQuery({
    queryKey: queryKeys.memberProgress(slug, projectSlug),
    queryFn: () => teamsApi.getMemberProgress(slug!, projectSlug!),
    enabled: !!slug && !!projectSlug && activeTab === 'progress',
  });

  const assignMutation = useMutation({
    mutationFn: (data: { user_id: number; role: string }) =>
      teamsApi.addProjectMember(slug!, projectSlug!, data.user_id, data.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers(slug, projectSlug) });
      setAssignModalOpen(false);
      setSelectedUserId('');
      setSelectedRole('tester');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: number) =>
      teamsApi.removeProjectMember(slug!, projectSlug!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers(slug, projectSlug) });
    },
  });

  const tabItems: { key: ProjectTab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
    { key: 'sprints', label: 'Sprints', icon: '🏃' },
    { key: 'defects', label: 'Anomalies', icon: '🐛' },
    { key: 'progress', label: 'Membres', icon: '👥' },
    { key: 'reports', label: 'Rapports', icon: '📄' },
  ];

  const canManage = project?.my_role === 'lead' || project?.my_role === 'owner' || project?.my_role === 'admin';

  const notProjectMembers = teamMembers?.results?.filter(
    (tm: TeamMember) => !members?.results?.some(pm => pm.user.id === tm.user.id)
  ) || [];

  return (
    <PageLayout>
      {/* Breadcrumb + Header */}
      <div className="mb-4">
        <p className="text-body-sm text-on-surface-variant mb-1">
          <button onClick={() => navigate(`/teams/${slug}`)} className="hover:underline cursor-pointer">{project?.team_name}</button>
          {' / '}
          <span className="text-on-surface">{project?.name}</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-outline-variant overflow-x-auto">
        {tabItems.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-body-sm font-medium whitespace-nowrap border-b-2 transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-surface-container-high rounded-lg" />
          <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-surface-container-high rounded-xl" />)}</div>
        </div>
      ) : !project ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-xl bg-error-container flex items-center justify-center text-error mb-4">⚠</div>
          <h2 className="text-headline-md font-bold text-on-surface mb-2">Projet introuvable</h2>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-primary text-white rounded-lg text-label-sm font-medium hover:brightness-110 transition-all">
            Retour au dashboard
          </button>
        </div>
      ) : activeTab === 'overview' ? (
        <>
          <Card className="mb-8">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl shrink-0" style={{ backgroundColor: project.color || '#1e40af' }}>
                {project.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-headline-lg font-bold text-on-surface">{project.name}</h1>
                  <Badge variant={project.visibility === 'private' ? 'default' : project.visibility === 'team' ? 'primary' : 'success'}>{project.visibility}</Badge>
                  <Badge variant={project.status === 'active' ? 'success' : project.status === 'archived' ? 'warning' : 'default'}>{project.status}</Badge>
                </div>
                {project.description && <p className="text-body-base text-on-surface-variant mb-2">{project.description}</p>}
                <p className="text-body-sm text-on-surface-variant">
                  Créé par {project.created_by.full_name} · {new Date(project.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                <Button variant="secondary" onClick={() => navigate(`/teams/${slug}/projects/${projectSlug}/activity`)}>
                  🕘 Activité
                </Button>
                <Button variant="secondary" onClick={() => navigate(`/convert?project=${project.id}`)}>
                  + Importer des cas
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {[
              { label: 'Total', value: project.stats?.total || 0, color: 'text-on-surface' },
              { label: 'Passés', value: project.stats?.passed || 0, color: 'text-success' },
              { label: 'Échoués', value: project.stats?.failed || 0, color: 'text-error' },
              { label: 'Bloqués', value: project.stats?.blocked || 0, color: 'text-warning' },
              { label: 'Non joués', value: project.stats?.not_run || 0, color: 'text-on-surface-variant' },
              { label: 'Taux réussite', value: `${project.stats?.success_rate || 0}%`, color: 'text-success' },
            ].map(s => (
              <div key={s.label} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center">
                <p className={`text-headline-md font-bold ${s.color}`}>{s.value}</p>
                <p className="text-body-sm text-on-surface-variant mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {(project.stats?.total || 0) > 0 && (
            <Card className="mb-8">
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-label-md font-bold text-on-surface">🎯 Taux de succès global</span>
                  <span className="text-headline-md font-bold text-success font-mono">{project.stats?.success_rate || 0}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-surface-container-high overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-success to-success/60 transition-all duration-500"
                       style={{ width: `${Math.min(project.stats?.success_rate || 0, 100)}%` }} />
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <h2 className="text-headline-md font-bold text-on-surface mb-4">Conversions récentes</h2>
              <Card>
                {jobs?.results?.length ? (
                  <div className="divide-y divide-outline-variant">
                    {jobs.results.slice(0, 5).map(job => (
                      <div key={job.id} className="flex items-center justify-between py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-body-sm font-medium text-on-surface truncate">{job.source_filename}</p>
                          <p className="text-body-sm text-on-surface-variant">{job.use_cases_count} cas · {new Date(job.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <StatusPill status={job.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-on-surface-variant text-body-base">
                    Importez un fichier Word pour voir les conversions
                  </div>
                )}
              </Card>
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-headline-md font-bold text-on-surface">Membres ({members?.results?.length || 0})</h2>
                {canManage && (
                  <button onClick={() => setAssignModalOpen(true)} className="text-body-sm text-primary hover:underline cursor-pointer">+ Ajouter</button>
                )}
              </div>
              <Card className="space-y-3">
                {members?.results?.length ? members.results.map(m => (
                  <div key={m.id} className="flex items-center gap-3 py-2">
                    <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                      {m.user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-medium text-on-surface truncate">{m.user.full_name}</p>
                      <p className="text-body-sm text-on-surface-variant truncate">{m.user.email}</p>
                    </div>
                    <Badge variant={m.role === 'lead' ? 'primary' : 'default'}>{m.role}</Badge>
                    {canManage && (
                      <button onClick={() => { if (confirm(`Retirer ${m.user.full_name} du projet ?`)) removeMutation.mutate(m.user.id); }}
                              className="text-body-xs text-on-surface-variant hover:text-error transition-colors cursor-pointer">✕</button>
                    )}
                  </div>
                )) : (
                  <div className="text-center py-8 text-on-surface-variant text-body-sm">Aucun membre</div>
                )}
              </Card>
            </div>
          </div>
        </>
      ) : activeTab === 'sprints' ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-md font-bold text-on-surface">Sprints & Assignation</h2>
            <Button size="sm" onClick={() => navigate(`/teams/${slug}/projects/${projectSlug}/sprint-board`)}>
              🏃 Voir le tableau Kanban
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sprints?.results?.map(sprint => (
              <Card key={sprint.id} hover onClick={() => navigate(`/teams/${slug}/projects/${projectSlug}/sprints/${sprint.id}`)}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-body-base font-bold text-on-surface truncate">{sprint.name}</h3>
                    <Badge variant={sprint.status === 'active' ? 'success' : sprint.status === 'completed' ? 'info' : 'default'}>
                      {sprint.status}
                    </Badge>
                  </div>
                  <p className="text-body-sm text-on-surface-variant mb-2">{sprint.start_date} → {sprint.end_date}</p>
                  {sprint.stats && sprint.stats.total > 0 && (
                    <div className="flex items-center gap-2 text-body-xs text-on-surface-variant">
                      <span>✅ {sprint.stats.passed}</span>
                      <span>❌ {sprint.stats.failed}</span>
                      <span className="font-mono ml-auto">{sprint.stats.progress_pct}%</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
            {(!sprints?.results || sprints.results.length === 0) && (
              <Card><div className="p-8 text-center text-on-surface-variant">Aucun sprint. Créez-en un depuis le tableau Kanban.</div></Card>
            )}
          </div>
        </div>
      ) : activeTab === 'defects' ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-md font-bold text-on-surface">Anomalies</h2>
            <Button size="sm" onClick={() => navigate(`/teams/${slug}/projects/${projectSlug}/defects`)}>
              🐛 Voir le suivi des anomalies
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card><div className="p-3 text-center"><p className="text-headline-md font-bold text-on-surface">{defectStats?.total || 0}</p><p className="text-body-xs text-on-surface-variant">Total</p></div></Card>
            <Card><div className="p-3 text-center"><p className="text-headline-md font-bold text-error">{defectStats?.open || 0}</p><p className="text-body-xs text-on-surface-variant">Ouvertes</p></div></Card>
            <Card><div className="p-3 text-center"><p className="text-headline-md font-bold text-warning">{defectStats?.in_progress || 0}</p><p className="text-body-xs text-on-surface-variant">En cours</p></div></Card>
            <Card><div className="p-3 text-center"><p className="text-headline-md font-bold text-success">{defectStats?.resolved || 0}</p><p className="text-body-xs text-on-surface-variant">Résolues</p></div></Card>
            <Card><div className="p-3 text-center"><p className="text-headline-md font-bold text-on-surface-variant">{defectStats?.closed || 0}</p><p className="text-body-xs text-on-surface-variant">Fermées</p></div></Card>
          </div>
        </div>
      ) : activeTab === 'progress' ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-md font-bold text-on-surface">Progression des membres</h2>
            <Button size="sm" onClick={() => navigate(`/teams/${slug}/projects/${projectSlug}/member-progress`)}>
              👥 Voir le détail
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {memberProgress?.results?.map(mp => (
              <Card key={mp.user.id}>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-sm">
                      {mp.user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-semibold text-on-surface truncate">{mp.user.full_name}</p>
                      <p className="text-body-xs text-on-surface-variant">{mp.total_ucs} cas · {mp.progress_pct}%</p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-success to-success/60" style={{ width: `${Math.min(mp.progress_pct, 100)}%` }} />
                  </div>
                  <div className="flex gap-3 mt-2 text-body-xs text-on-surface-variant">
                    <span>✅ {mp.passed}</span><span>❌ {mp.failed}</span><span>🚫 {mp.blocked}</span><span>⏳ {mp.in_progress}</span>
                  </div>
                </div>
              </Card>
            ))}
            {(!memberProgress?.results || memberProgress.results.length === 0) && (
              <Card><div className="p-8 text-center text-on-surface-variant">Assignez des cas à des membres pour voir leur progression.</div></Card>
            )}
          </div>
        </div>
      ) : activeTab === 'reports' ? (
        <div>
          <h2 className="text-headline-md font-bold text-on-surface mb-4">Rapports PDF</h2>
          <Card className="mb-6">
            <div className="p-5">
              <div className="flex gap-3 flex-wrap">
                <Button variant="secondary" onClick={async () => { try { setReportError(''); const blob = await teamsApi.downloadDailyScrum(slug!); downloadBlob(blob, `daily-scrum-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`); } catch (error: unknown) { setReportError(getApiErrorMessage(error, 'Impossible de télécharger le rapport.')); } }}>
                  📋 Daily Scrum
                </Button>
                <Button variant="secondary" onClick={async () => { try { setReportError(''); const blob = await teamsApi.downloadWeeklyReport(slug!); downloadBlob(blob, `weekly-report-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`); } catch (error: unknown) { setReportError(getApiErrorMessage(error, 'Impossible de télécharger le rapport.')); } }}>
                  📊 Weekly Report PDF
                </Button>
              </div>
              {reportError && <p role="alert" className="mt-3 text-body-sm text-error">{reportError}</p>}
            </div>
          </Card>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-md font-bold text-on-surface">Rapports hebdomadaires</h2>
            <Button size="sm" onClick={() => navigate(`/teams/${slug}/weekly-reports`)}>
              📝 Mon rapport
            </Button>
          </div>
          {canManage && (
            <p className="text-body-sm text-on-surface-variant mb-4">
              En tant que lead, vous pouvez consulter les rapports de votre équipe depuis la page dédiée.
            </p>
          )}
        </div>
      ) : null}

      <Modal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        labelledBy="assign-modal-title"
        maxWidth="max-w-md"
        className="p-7"
      >
        <h3 id="assign-modal-title" className="text-headline-sm font-extrabold text-on-surface mb-5">➕ Ajouter un membre</h3>
        {notProjectMembers.length === 0 ? (
          <p className="text-body-base text-on-surface-variant mb-4">Tous les membres de l'équipe sont déjà dans ce projet.</p>
        ) : (
          <>
            <div className="mb-4">
              <label htmlFor="assign-member" className="text-label-md text-on-surface-variant block mb-1.5">Membre</label>
              <select id="assign-member" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-base text-on-surface outline-none focus:border-primary bg-surface">
                <option value="">Sélectionner un membre…</option>
                {notProjectMembers.map(tm => (
                  <option key={tm.user.id} value={tm.user.id}>{tm.user.full_name} ({tm.user.email})</option>
                ))}
              </select>
            </div>
            <div className="mb-5">
              <label htmlFor="assign-role" className="text-label-md text-on-surface-variant block mb-1.5">Rôle</label>
              <select id="assign-role" value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
                      className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-base text-on-surface outline-none focus:border-primary bg-surface">
                <option value="tester">Testeur</option>
                <option value="lead">Lead QA</option>
                <option value="viewer">Lecteur</option>
              </select>
            </div>
          </>
        )}
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>
            Annuler
          </Button>
          <Button onClick={() => { if (selectedUserId) assignMutation.mutate({ user_id: selectedUserId as number, role: selectedRole }); }}
                  disabled={!selectedUserId || assignMutation.isPending}>
            {assignMutation.isPending ? '⏳ Ajout…' : '✅ Ajouter'}
          </Button>
        </div>
      </Modal>
    </PageLayout>
  );
}
