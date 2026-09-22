import { useQueries, useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { teamsApi } from '../api/teams';
import { conversionApi } from '../api/conversion';
import { PageLayout } from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { StatusPill } from '../components/ui/StatusPill';
import { useNavigate, Link } from 'react-router-dom';
import { queryKeys } from '../lib/queryKeys';

function initials(name: string): string {
  return name.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: queryKeys.teams,
    queryFn: () => teamsApi.listTeams(),
    enabled: !!user,
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: queryKeys.jobs.list(1),
    queryFn: () => conversionApi.listJobs(1),
    enabled: !!user,
  });

  const teams = teamsData?.results || [];
  const recentJobs = jobsData?.results?.slice(0, 6) || [];
  const totalUcCount = recentJobs.reduce((sum, j) => sum + (j.use_cases_count || 0), 0);
  const totalMembers = teams.reduce((sum, t) => sum + (t.members_count || 0), 0);
  const doneJobs = recentJobs.filter(j => j.status === 'done').length;

  // Nombre de projets : dérivé des vrais dashboards d'équipe (le champ n'existe
  // pas sur le serializer Team côté backend — voir AUDIT.md §B5).
  const dashboardQueries = useQueries({
    queries: teams.map((team) => ({
      queryKey: queryKeys.dashboard(team.slug),
      queryFn: () => teamsApi.getDashboard(team.slug),
      enabled: !!user,
      retry: false,
      staleTime: 60_000,
    })),
  });
  const totalProjects = dashboardQueries.reduce((sum, q) => sum + (q.data?.projects?.length ?? 0), 0);
  const dashboardsLoading = dashboardQueries.some((q) => q.isLoading);

  const isLoading = teamsLoading || (!!user && jobsLoading) || dashboardsLoading;

  if (isLoading) {
    return (
      <PageLayout>
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-surface-container-high" />
            <div className="space-y-2 flex-1"><div className="h-7 w-56 bg-surface-container-high rounded-lg" /><div className="h-4 w-40 bg-surface-container-high rounded" /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-surface-container-high rounded-xl" />)}</div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-7 space-y-4">
              <div className="h-6 w-40 bg-surface-container-high rounded" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-surface-container-high rounded-xl" />)}</div>
            </div>
            <div className="col-span-12 lg:col-span-5 space-y-4">
              <div className="h-24 bg-surface-container-high rounded-xl" />
              <div className="h-64 bg-surface-container-high rounded-xl" />
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (teams.length === 0) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white mb-6 shadow-lg">
            <span className="material-symbols-outlined text-3xl">groups</span>
          </div>
          <h2 className="text-headline-lg font-bold text-on-surface mb-2">Bienvenue sur QA Recipe</h2>
          <p className="text-body-base text-on-surface-variant mb-2 text-center max-w-md">
            Vous n'avez pas encore d'équipe. Créez votre première équipe pour gérer vos projets de test.
          </p>
          <ul className="text-body-sm text-on-surface-variant mb-8 space-y-1.5 text-left">
            <li className="flex items-center gap-2"><span className="text-primary">✓</span> Importez vos fichiers Word de recettes</li>
            <li className="flex items-center gap-2"><span className="text-primary">✓</span> Extrayez et éditez les cas de test</li>
            <li className="flex items-center gap-2"><span className="text-primary">✓</span> Exportez en Excel, Gherkin ou Cypress</li>
          </ul>
          <button onClick={() => navigate('/teams/new')} className="px-6 py-2.5 bg-primary text-white rounded-xl text-label-md font-medium hover:brightness-110 transition-all shadow-lg shadow-primary/20 cursor-pointer">
            Créer une équipe
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5 mb-8 p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg animate-fade-in-up">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary-container flex items-center justify-center text-on-primary text-headline-sm font-bold shrink-0 border-2 border-on-primary/30 shadow-md">
          {initials(user?.full_name || user?.username || 'U')}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-headline-sm sm:text-headline-lg font-bold text-on-primary mb-0.5">
            Bonjour, {user?.full_name?.split(' ')[0] || user?.username}
          </h1>
          <p className="text-body-sm sm:text-body-base text-on-primary">
            {teams.length} équipe{teams.length > 1 ? 's' : ''} · {totalProjects} projet{totalProjects > 1 ? 's' : ''} · {totalUcCount} cas de test traités
          </p>
        </div>
        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <button onClick={() => navigate('/convert')} className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-primary-container border border-on-primary/30 hover:brightness-125 text-on-primary rounded-xl text-label-sm font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer">
            <span className="material-symbols-outlined text-lg" aria-hidden="true">upload</span>
            Convertir
          </button>
          <button onClick={() => navigate('/teams/new')} className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-primary-container border border-on-primary/30 hover:brightness-125 text-on-primary rounded-xl text-label-sm font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer">
            <span className="material-symbols-outlined text-lg" aria-hidden="true">group_add</span>
            Équipe
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary">groups</span>
            </div>
            <div>
              <div className="text-headline-md font-extrabold text-on-surface font-mono leading-none">{teams.length}</div>
              <div className="text-body-sm text-on-surface-variant">Équipes</div>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: '100%' }} />
          </div>
        </Card>

        <Card className="p-4 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-success-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-success">folder</span>
            </div>
            <div>
              <div className="text-headline-md font-extrabold text-on-surface font-mono leading-none">{totalProjects}</div>
              <div className="text-body-sm text-on-surface-variant">Projets</div>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
            <div className="h-full rounded-full bg-success transition-all duration-700" style={{ width: '100%' }} />
          </div>
        </Card>

        <Card className="p-4 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-info-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-info">description</span>
            </div>
            <div>
              <div className="text-headline-md font-extrabold text-on-surface font-mono leading-none">{totalUcCount}</div>
              <div className="text-body-sm text-on-surface-variant">Cas de test</div>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
            <div className="h-full rounded-full bg-info transition-all duration-700" style={{ width: '100%' }} />
          </div>
        </Card>

        <Card className="p-4 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-tertiary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-tertiary">check_circle</span>
            </div>
            <div>
              <div className="text-headline-md font-extrabold text-on-surface font-mono leading-none">{doneJobs}</div>
              <div className="text-body-sm text-on-surface-variant">Conversions réussies</div>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
            <div
              className="h-full rounded-full bg-tertiary transition-all duration-700"
              style={{ width: `${recentJobs.length > 0 ? Math.round((doneJobs / recentJobs.length) * 100) : 0}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Main grid — 12 colonnes */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        {/* Colonne gauche : Mes équipes (7/12) */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md font-bold text-on-surface">Mes équipes</h2>
            <Link to="/teams/new" className="text-label-sm text-primary font-medium hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-lg">add</span>
              Nouvelle
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((team) => (
              <Card
                key={team.id}
                hover
                onClick={() => navigate(`/teams/${team.slug}`)}
                className="p-5 cursor-pointer animate-fade-in-up transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary font-bold text-base shrink-0">
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-base font-semibold text-on-surface truncate">{team.name}</h3>
                    <p className="text-body-xs font-mono text-on-surface-variant truncate">/teams/{team.slug}</p>
                  </div>
                </div>
                {team.description && (
                  <p className="text-body-sm text-on-surface-variant line-clamp-2 mb-3">{team.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-body-xs text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">people</span>
                    {team.members_count} membre{team.members_count > 1 ? 's' : ''}
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant/40 text-lg group-hover:text-primary transition-colors">
                    chevron_right
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Colonne droite : Membres + Activité récente (5/12) */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Membres */}
          <Card className="p-5 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant">diversity_3</span>
                Membres
              </h2>
              <span className="text-headline-sm font-extrabold text-on-surface font-mono">{totalMembers}</span>
            </div>
            <div className="flex items-center -space-x-2 mb-3">
              {teams.slice(0, 6).map((team, i) => (
                <div
                  key={team.id}
                  className="w-9 h-9 rounded-full border-2 border-surface flex items-center justify-center text-white text-label-sm font-bold shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, hsl(${(i * 63) % 360}, 65%, 55%), hsl(${(i * 63 + 40) % 360}, 65%, 45%))`,
                    zIndex: 10 - i,
                  }}
                  title={team.name}
                >
                  {team.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {teams.length > 6 && (
                <div className="w-9 h-9 rounded-full border-2 border-surface bg-surface-container-high flex items-center justify-center text-body-xs font-semibold text-on-surface-variant">
                  +{teams.length - 6}
                </div>
              )}
            </div>
            <p className="text-body-xs text-on-surface-variant">
              Répartis sur {teams.length} équipe{teams.length > 1 ? 's' : ''}
            </p>
          </Card>

          {/* Activité récente */}
          <Card className="p-5 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant">history</span>
                Activité récente
              </h2>
              <Link to="/convert" className="text-label-sm text-primary font-medium hover:underline">
                Tout voir
              </Link>
            </div>
            {recentJobs.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant text-center py-6">Aucune conversion pour le moment</p>
            ) : (
              <div className="space-y-2">
                {recentJobs.map(job => (
                  <div key={job.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-surface-container-low border border-outline-variant hover:bg-surface-container transition-all">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-base">description</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-body-xs font-medium text-on-surface truncate" title={job.source_filename}>{job.source_filename}</p>
                        <p className="text-body-xs text-on-surface-variant/70">
                          {new Date(job.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          <span className="mx-1">·</span>
                          {job.use_cases_count} UC
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusPill status={job.status} />
                      {job.status === 'done' && (
                        <Link to={`/preview/${job.id}`} className="text-body-xs text-primary hover:underline">Voir</Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Rangée basse : Actions rapides / Profil / Astuce, réparties en 3 colonnes égales */}
      <div className="grid grid-cols-12 gap-6">
        {/* Actions rapides */}
        <Card className="col-span-12 md:col-span-4 animate-fade-in-up">
          <h2 className="text-headline-sm font-bold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant">bolt</span>
            Actions rapides
          </h2>
          <div className="space-y-2">
            <button onClick={() => navigate('/convert')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-transparent hover:from-primary/10 border border-outline-variant hover:border-primary/30 transition-all text-left cursor-pointer">
              <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg">upload</span>
              </div>
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-on-surface">Convertir une recette</p>
                <p className="text-body-xs text-on-surface-variant">Word → Excel / Gherkin / Cypress</p>
              </div>
            </button>
            <button onClick={() => navigate('/teams/new')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-outline-variant hover:border-primary/30 hover:bg-surface-container-low transition-all text-left cursor-pointer">
              <div className="w-9 h-9 rounded-lg bg-success-container text-success flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg">group_add</span>
              </div>
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-on-surface">Créer une équipe</p>
                <p className="text-body-xs text-on-surface-variant">Invitez des collaborateurs</p>
              </div>
            </button>
            <button onClick={() => navigate('/settings')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-outline-variant hover:border-primary/30 hover:bg-surface-container-low transition-all text-left cursor-pointer">
              <div className="w-9 h-9 rounded-lg bg-tertiary-container text-tertiary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg">settings</span>
              </div>
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-on-surface">Paramètres</p>
                <p className="text-body-xs text-on-surface-variant">Préférences du compte</p>
              </div>
            </button>
          </div>
        </Card>

        {/* Profil */}
        <Card className="col-span-12 md:col-span-4 animate-fade-in-up">
          <h2 className="text-headline-sm font-bold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant">person</span>
            Profil
          </h2>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-container text-white flex items-center justify-center text-label-md font-bold shrink-0 shadow-md">
              {initials(user?.full_name || user?.username || 'U')}
            </div>
            <div className="min-w-0">
              <p className="text-body-base font-semibold text-on-surface truncate">{user?.full_name || user?.username}</p>
              <p className="text-body-sm text-on-surface-variant truncate">{user?.email}</p>
              <p className="text-body-xs text-on-surface-variant/60">Membre depuis {user?.date_joined ? new Date(user.date_joined).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : ''}</p>
            </div>
          </div>
          <div className="pt-3 border-t border-outline-variant">
            <button onClick={() => navigate('/settings')}
                    className="w-full py-2 px-3 rounded-lg text-body-sm text-primary font-medium hover:bg-primary-fixed/50 transition-all cursor-pointer">
              Gérer mon profil →
            </button>
          </div>
        </Card>

        {/* Astuce */}
        <Card className="col-span-12 md:col-span-4 bg-gradient-to-br from-warning-container/60 to-warning-container/20 border-warning/30 animate-fade-in-up">
          <h3 className="text-label-sm font-bold text-on-warning-container mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-lg">lightbulb</span>
            Astuce
          </h3>
          <p className="text-body-sm text-on-warning-container/80">
            Vous pouvez convertir un fichier Word directement depuis la page <strong>Convert</strong> sans avoir besoin de créer une équipe au préalable.
          </p>
          <button onClick={() => navigate('/convert')}
                  className="mt-3 text-body-xs font-semibold text-on-warning-container hover:text-warning underline cursor-pointer decoration-warning/60">
            Commencer une conversion →
          </button>
        </Card>
      </div>
    </PageLayout>
  );
}