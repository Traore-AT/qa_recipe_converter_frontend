import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { teamsApi } from '../api/teams';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, KpiCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { queryKeys } from '../lib/queryKeys';


export default function MemberProgressPage() {
  const { slug, projectSlug } = useParams<{ slug: string; projectSlug: string }>();
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const { data: progress, isLoading } = useQuery({
    queryKey: queryKeys.memberProgress(slug, projectSlug),
    queryFn: () => teamsApi.getMemberProgress(slug!, projectSlug!),
    enabled: !!slug && !!projectSlug,
  });

  const selectedMember = selectedUser
    ? progress?.results?.find(m => m.user.id === Number(selectedUser))
    : null;

  const userStats = selectedMember || {
    user: { id: 0, username: '', email: '', full_name: 'Tous', date_joined: '' },
    total_ucs: progress?.results?.reduce((s, m) => s + m.total_ucs, 0) || 0,
    passed: progress?.results?.reduce((s, m) => s + m.passed, 0) || 0,
    failed: progress?.results?.reduce((s, m) => s + m.failed, 0) || 0,
    blocked: progress?.results?.reduce((s, m) => s + m.blocked, 0) || 0,
    in_progress: progress?.results?.reduce((s, m) => s + m.in_progress, 0) || 0,
    not_run: progress?.results?.reduce((s, m) => s + m.not_run, 0) || 0,
    progress_pct: 0,
    assigned_ucs: [],
  };

  if (!selectedMember && progress?.results?.length) {
    const total = userStats.total_ucs;
    const done = userStats.passed + userStats.failed;
    userStats.progress_pct = total > 0 ? Math.round((done / total) * 100) : 0;
  }

  return (
    <PageLayout>
      <div className="mb-6">
        <button onClick={() => navigate(`/teams/${slug}/projects/${projectSlug}`)} className="flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary transition-colors mb-2 cursor-pointer">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Retour au projet
        </button>
        <h1 className="text-headline-lg font-bold text-on-surface">Progression des membres</h1>
        <p className="text-body-sm text-on-surface-variant">Suivi individuel de l'avancement des cas assignés</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setSelectedUser(null)}
          className={`px-3 py-1.5 rounded-lg text-body-sm transition-all ${!selectedUser ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'}`}
        >
          📊 Vue d'ensemble
        </button>
        {progress?.results?.map(m => (
          <button
            key={m.user.id}
            onClick={() => setSelectedUser(String(m.user.id))}
            className={`px-3 py-1.5 rounded-lg text-body-sm transition-all flex items-center gap-1.5 ${selectedUser === String(m.user.id) ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'}`}
          >
            <div className="w-5 h-5 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-[10px]">
              {m.user.full_name.charAt(0).toUpperCase()}
            </div>
            {m.user.full_name}
            <span className="font-mono opacity-70">{m.progress_pct}%</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-surface-container-high rounded-lg" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KpiCard label="Total assignés" value={userStats.total_ucs} color="#1e40af" icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>} />
            <KpiCard label="Réussis" value={userStats.passed} color="#10b981" icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>} />
            <KpiCard label="Échoués" value={userStats.failed} color="#ba1a1a" icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>} />
            <KpiCard label="Progression" value={`${userStats.progress_pct}%`} color="#0058be" icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>} />
          </div>

          {selectedMember && (
            <>
              <Card className="mb-4">
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold">
                      {selectedMember.user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-headline-md font-bold text-on-surface">{selectedMember.user.full_name}</h2>
                      <p className="text-body-sm text-on-surface-variant">{selectedMember.user.email}</p>
                    </div>
                  </div>
                  <div className="h-3 rounded-full bg-surface-container-high overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-success to-success/60 transition-all"
                         style={{ width: `${Math.min(selectedMember.progress_pct, 100)}%` }} />
                  </div>
                  <div className="flex justify-between mt-1 text-body-xs text-on-surface-variant">
                    <span>{selectedMember.passed} passés / {selectedMember.failed} échoués</span>
                    <span>{selectedMember.progress_pct}%</span>
                  </div>
                </div>
              </Card>

              <h3 className="text-label-md font-bold text-on-surface mb-3">Cas assignés ({selectedMember.assigned_ucs.length})</h3>
              <div className="space-y-2">
                {selectedMember.assigned_ucs.map(uc => (
                  <Card key={uc.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-medium text-on-surface truncate">
                        UC#{uc.use_case_order} — {uc.use_case_desc || uc.use_case_id_str}
                      </p>
                    </div>
                    <Badge variant={uc.status === 'Passé' ? 'success' : uc.status === 'Échoué' ? 'error' : uc.status === 'Bloqué' ? 'warning' : uc.status === 'En cours' ? 'info' : 'default'}>
                      {uc.status}
                    </Badge>
                  </Card>
                ))}
                {selectedMember.assigned_ucs.length === 0 && (
                  <p className="text-body-sm text-on-surface-variant text-center py-6">Aucun cas assigné</p>
                )}
              </div>
            </>
          )}

          {!selectedMember && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {progress?.results?.map(m => {
                const pct = Math.min(m.progress_pct, 100);
                return (
                  <Card key={m.user.id} hover onClick={() => setSelectedUser(String(m.user.id))}>
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-sm">
                          {m.user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-body-sm font-semibold text-on-surface truncate">{m.user.full_name}</p>
                          <p className="text-body-xs text-on-surface-variant">{m.total_ucs} cas assignés</p>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-surface-container-high overflow-hidden mb-1">
                        <div className="h-full rounded-full bg-gradient-to-r from-success to-success/60 transition-all"
                             style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-body-xs text-on-surface-variant">
                        <span>✅ {m.passed} ❌ {m.failed} 🚫 {m.blocked}</span>
                        <span className="font-mono">{m.progress_pct}%</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}
