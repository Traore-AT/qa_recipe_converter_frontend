import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { teamsApi } from '../api/teams';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, KpiCard } from '../components/ui/Card';
import { StatusPill } from '../components/ui/StatusPill';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../lib/errors';
import { queryKeys } from '../lib/queryKeys';

export default function TeamDashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: queryKeys.dashboard(slug),
    queryFn: () => teamsApi.getDashboard(slug!),
    enabled: !!slug,
  });

  const inviteMutation = useMutation({
    mutationFn: () => teamsApi.inviteMember(slug!, inviteEmail, inviteRole),
    onSuccess: () => {
      setInviteStatus({ type: 'success', msg: `✅ Invitation envoyée à ${inviteEmail}` });
      setTimeout(() => { setInviteModalOpen(false); setInviteEmail(''); setInviteStatus(null); }, 2000);
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(slug) });
    },
    onError: (err: unknown) => {
      setInviteStatus({ type: 'error', msg: getApiErrorMessage(err, 'Erreur réseau') });
    },
  });

  if (isLoading) {
    return (
      <PageLayout>
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-surface-container-high" />
            <div className="space-y-2 flex-1">
              <div className="h-7 w-48 bg-surface-container-high rounded-lg" />
              <div className="h-4 w-64 bg-surface-container-high rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-surface-container-high rounded-xl" />)}
          </div>
          <div className="h-20 bg-surface-container-high rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-surface-container-high rounded-xl" />)}
            </div>
            <div className="lg:col-span-5 space-y-3">
              <div className="h-40 bg-surface-container-high rounded-xl" />
              <div className="h-40 bg-surface-container-high rounded-xl" />
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!dashboard) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-xl bg-error-container flex items-center justify-center text-error mb-4">
            <span className="material-symbols-outlined text-3xl">error</span>
          </div>
          <h2 className="text-headline-md font-bold text-on-surface mb-2">Erreur de chargement</h2>
          <p className="text-body-base text-on-surface-variant mb-6 text-center max-w-md">
            Impossible de charger le tableau de bord. Vérifiez que vous êtes bien membre de cette équipe.
          </p>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-primary text-white rounded-lg text-label-sm font-medium hover:brightness-110 transition-all">
            Retour au dashboard
          </button>
        </div>
      </PageLayout>
    );
  }

  const { team, stats, projects, members } = dashboard;

  return (
    <PageLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-md">
            {team.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-headline-md sm:text-headline-lg font-bold text-on-surface truncate">{team.name}</h1>
              <Badge variant={user?.id === team.owner.id ? 'primary' : 'info'}>
                {user?.id === team.owner.id ? 'Owner' : dashboard.team.my_role}
              </Badge>
            </div>
            <p className="text-body-base text-on-surface-variant mt-0.5 truncate">{team.description}</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => navigate(`/teams/${slug}/projects/new`)} size="sm" className="flex-1 sm:flex-none">➕ Nouveau projet</Button>
            <Button variant="secondary" onClick={() => setInviteModalOpen(true)} size="sm" className="flex-1 sm:flex-none">✉️ Inviter</Button>
            <Button variant="secondary" onClick={() => navigate(`/teams/${slug}/activity`)} size="sm" className="flex-1 sm:flex-none">🕘 Activité</Button>
            <Button variant="secondary" onClick={() => navigate(`/teams/${slug}/weekly-reports`)} size="sm" className="flex-1 sm:flex-none">📝 Rapports</Button>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Projets" value={stats.projects_total} icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>} color="#1e40af" />
        <KpiCard label="Tests" value={stats.use_cases_total} icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>} color="#10b981" />
        <KpiCard label="Taux de réussite" value={`${stats.success_rate}%`} icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>} color="#f59e0b" />
        <KpiCard label="Membres" value={stats.members_count} icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>} color="#0058be" />
      </div>

      {/* Success rate bar */}
      {stats.use_cases_total > 0 && (
        <Card className="mb-8">
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-label-md font-bold text-on-surface">🎯 Taux de succès global</span>
              <span className="text-headline-md font-bold text-success font-mono">{stats.success_rate}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-container-high overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-success to-success/60 transition-all duration-500"
                   style={{ width: `${Math.min(stats.success_rate, 100)}%` }} />
            </div>
            <div className="flex justify-between mt-1.5 text-body-xs text-on-surface-variant">
              <span>{stats.use_cases_passed ?? 0} PASSÉS</span>
              <span>{stats.use_cases_total} total</span>
            </div>
          </div>
        </Card>
      )}

      {/* Main content grid — clearly separated columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* LEFT: Projects — 7/12 */}
        <div className="lg:col-span-7 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-md font-bold text-on-surface">Projets</h2>
            <span className="text-body-sm text-on-surface-variant px-2.5 py-1 rounded-full bg-surface-container-low">
              {projects.length} projet{projects.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {projects.map(project => (
              <Card
                key={project.id}
                hover
                onClick={() => navigate(`/teams/${slug}/projects/${project.slug}`)}
                className="group flex items-center gap-4 p-4"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm" style={{ backgroundColor: project.color || '#1e40af' }}>
                  {project.icon ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d={projectIcons[project.icon] || 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'} />
                    </svg>
                  ) : (
                    project.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-body-base font-semibold text-on-surface truncate">{project.name}</h3>
                    <Badge variant={project.visibility === 'private' ? 'default' : project.visibility === 'team' ? 'primary' : 'success'}>
                      {project.visibility}
                    </Badge>
                  </div>
                  {project.description && (
                    <p className="text-body-sm text-on-surface-variant truncate mt-0.5">{project.description}</p>
                  )}
                  <div className="mt-2 h-1.5 rounded-full bg-surface-container-high overflow-hidden max-w-[180px]">
                    <div className="h-full rounded-full bg-gradient-to-r from-success to-success/60 transition-all duration-500"
                         style={{ width: `${project.stats?.success_rate || 0}%` }} />
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-right shrink-0">
                  <div>
                    <p className="text-body-xs text-on-surface-variant">Tests</p>
                    <p className="text-label-md font-semibold text-on-surface">{project.stats?.total || 0}</p>
                  </div>
                  <div>
                    <p className="text-body-xs text-on-surface-variant">Réussite</p>
                    <p className="text-label-md font-semibold text-success">{project.stats?.success_rate || 0}%</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0">chevron_right</span>
              </Card>
            ))}
            {projects.length === 0 && (
              <Card>
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-on-surface-variant text-2xl">folder_off</span>
                  </div>
                  <p className="text-on-surface-variant text-body-base mb-4">Aucun projet pour le moment</p>
                  <Button onClick={() => navigate(`/teams/${slug}/projects/new`)} size="sm">➕ Créer un projet</Button>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* RIGHT: Members + Activity — 5/12, sticky */}
        <div className="lg:col-span-5 min-w-0 flex flex-col gap-6 lg:sticky lg:top-6">
          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline-md font-bold text-on-surface">Membres</h2>
              <span className="text-body-sm text-on-surface-variant px-2.5 py-1 rounded-full bg-surface-container-low">{members.length}</span>
            </div>
            <Card className="p-2">
              <div className="divide-y divide-outline-variant/50">
                {members.map(member => (
                  <div key={member.id} className="flex items-center gap-3 py-2.5 px-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-sm">
                      {member.user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-medium text-on-surface truncate">{member.user.full_name}</p>
                      <p className="text-body-xs text-on-surface-variant truncate">{member.user.email}</p>
                    </div>
                    <Badge variant={member.role === 'owner' ? 'primary' : member.role === 'admin' ? 'info' : 'default'}>
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Recent activity */}
          <div>
            <h2 className="text-headline-md font-bold text-on-surface mb-4">Activité récente</h2>
            <Card className="p-2">
              {dashboard.recent_activity.length === 0 ? (
                <div className="text-center py-10">
                  <span className="material-symbols-outlined text-on-surface-variant/50 text-3xl block mb-2">history</span>
                  <p className="text-on-surface-variant text-body-sm">Aucune activité récente</p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/50">
                  {dashboard.recent_activity.map((activity, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 px-2">
                      <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-base">description</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm text-on-surface truncate">{activity.filename}</p>
                        <p className="text-body-xs text-on-surface-variant">{activity.use_cases_count} cas de test</p>
                      </div>
                      <StatusPill status={activity.status} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Invite modal */}
      <Modal
        open={inviteModalOpen}
        onClose={() => { setInviteModalOpen(false); setInviteStatus(null); }}
        labelledBy="invite-modal-title"
        maxWidth="max-w-md"
        className="p-7"
      >
        <h3 id="invite-modal-title" className="text-headline-sm font-extrabold text-on-surface mb-5 flex items-center gap-2">✉️ Inviter un membre</h3>

        <div className="mb-4">
          <label htmlFor="invite-email" className="text-label-md text-on-surface-variant block mb-1.5">Adresse email *</label>
          <input
            id="invite-email"
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="colleague@example.com"
            className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-base text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="invite-role" className="text-label-md text-on-surface-variant block mb-1.5">Rôle</label>
          <select
            id="invite-role"
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
            className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-base text-on-surface outline-none focus:border-primary bg-surface"
          >
            <option value="member">👤 Membre — peut uploader et générer</option>
            <option value="admin">🔧 Admin — peut créer des projets et inviter</option>
            <option value="viewer">👁️ Lecteur — lecture seule</option>
          </select>
        </div>

        {inviteStatus && (
          <div
            role={inviteStatus.type === 'success' ? 'status' : 'alert'}
            className={`mb-4 rounded-lg border p-3 text-body-sm ${inviteStatus.type === 'success' ? 'border-success/40 bg-success-container text-on-success-container' : 'border-error/40 bg-error-container text-on-error-container'}`}
          >
            {inviteStatus.msg}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => { setInviteModalOpen(false); setInviteStatus(null); }}>
            Annuler
          </Button>
          <Button onClick={() => inviteMutation.mutate()} disabled={!inviteEmail || inviteMutation.isPending}>
            {inviteMutation.isPending ? '⏳…' : '✉️ Envoyer l\'invitation'}
          </Button>
        </div>
      </Modal>
    </PageLayout>
  );
}

const projectIcons: Record<string, string> = {
  science: 'M19.8 18.4L14 10.67V6.5l1.35-1.69c.26-.33.03-.81-.39-.81H9.04c-.42 0-.65.48-.39.81L10 6.5v4.17L4.2 18.4c-.49.66-.02 1.6.8 1.6h14c.82 0 1.29-.94.8-1.6z',
  web: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
  analytics: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z',
};