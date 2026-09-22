import { useMemo, useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { conversionApi } from '../api/conversion';
import { teamsApi } from '../api/teams';
import { PageLayout } from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatusPill } from '../components/ui/StatusPill';
import { SkeletonList } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { queryKeys } from '../lib/queryKeys';

const FILE_EXTENSIONS = ['.doc', '.docx', '.xlsx'] as const;

export default function SearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [extensions, setExtensions] = useState<string[]>([]);
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: queryKeys.jobs.list(1),
    queryFn: () => conversionApi.listJobs(1),
    enabled: debouncedQuery.length > 0,
  });

  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: queryKeys.teams,
    queryFn: () => teamsApi.listTeams(),
    enabled: !!user && debouncedQuery.length > 0,
  });

  // Projets de toutes les équipes de l'utilisateur (même pattern que DashboardPage)
  const projectQueries = useQueries({
    queries: (teamsData?.results ?? []).map((team) => ({
      queryKey: queryKeys.projects(team.slug),
      queryFn: () => teamsApi.listProjects(team.slug),
      enabled: !!user && debouncedQuery.length > 0,
      staleTime: 30_000,
    })),
  });

  const { data: filesData, isLoading: filesLoading, isError: filesError, refetch: refetchFiles } = useQuery({
    queryKey: queryKeys.fileSearch(debouncedQuery, extensions),
    queryFn: () => conversionApi.searchFiles(debouncedQuery, extensions),
    enabled: debouncedQuery.length >= 2,
    staleTime: 15_000,
  });

  const q = debouncedQuery.toLowerCase();

  const recipes = useMemo(
    () => (jobsData?.results ?? []).filter(job => job.source_filename.toLowerCase().includes(q)),
    [jobsData, q],
  );

  const projects = useMemo(() => {
    if (!q) return [];
    const flat = projectQueries.flatMap(pq => pq.data?.results ?? []);
    return flat.filter(p => p.name.toLowerCase().includes(q) || p.team_name.toLowerCase().includes(q));
  }, [projectQueries, q]);

  const toggleExtension = (ext: string) => {
    setExtensions(prev => (prev.includes(ext) ? prev.filter(e => e !== ext) : [...prev, ext]));
  };

  const updateQuery = (value: string) => {
    if (value.trim()) setSearchParams({ q: value.trim() });
    else setSearchParams({});
  };

  const projectsLoading = projectQueries.some(pq => pq.isLoading);
  const loading = jobsLoading || teamsLoading || projectsLoading || (debouncedQuery.length >= 2 && filesLoading);
  const hasAnyResults = recipes.length > 0 || projects.length > 0 || (filesData?.results?.length ?? 0) > 0;

  return (
    <PageLayout>
      <div className="mb-6">
        <h1 className="text-headline-lg font-bold text-on-surface">Recherche</h1>
        <p className="text-body-sm text-on-surface-variant">Recettes, fichiers locaux et projets</p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); }}
        role="search"
        className="relative max-w-xl mb-8"
      >
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant pointer-events-none" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => updateQuery(e.target.value)}
          placeholder="Rechercher une recette, un fichier, un projet…"
          aria-label="Recherche globale"
          className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-body-base text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </form>

      {query.trim() && debouncedQuery.length >= 2 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap" role="group" aria-label="Filtrer par extension">
          <span className="text-body-sm text-on-surface-variant">Extensions :</span>
          {FILE_EXTENSIONS.map(ext => (
            <button
              key={ext}
              type="button"
              onClick={() => toggleExtension(ext)}
              aria-pressed={extensions.includes(ext)}
              className={`px-3 py-1.5 rounded-lg text-body-sm transition-all min-h-[36px] ${
                extensions.includes(ext)
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {ext}
            </button>
          ))}
        </div>
      )}

      {!query.trim() && (
        <EmptyState
          icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>}
          title="Lancez une recherche"
          description="Tapez au moins 2 caractères pour chercher dans vos recettes, les fichiers locaux et vos projets."
        />
      )}

      {loading && query.trim() && (
        <div className="space-y-6">
          <SkeletonList rows={3} />
        </div>
      )}

      {!loading && query.trim() && !hasAnyResults && !filesError && (
        <EmptyState
          title="Aucun résultat"
          description={`Aucune recette, fichier ou projet ne correspond à « ${query.trim()} ».`}
        />
      )}

      {query.trim() && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Recettes */}
          <section className="lg:col-span-5 min-w-0" aria-label="Recettes">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline-md font-bold text-on-surface">Recettes</h2>
              <span className="text-body-sm text-on-surface-variant px-2.5 py-1 rounded-full bg-surface-container-low">{recipes.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {recipes.slice(0, 5).map(job => (
                <Card key={job.id} hover onClick={() => navigate(`/preview/${job.id}`)} className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-semibold text-on-surface truncate">{job.source_filename}</p>
                    <p className="text-body-xs text-on-surface-variant">{job.use_cases_count} cas · {new Date(job.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <StatusPill status={job.status} />
                </Card>
              ))}
              {recipes.length === 0 && (
                <Card className="text-center text-body-sm text-on-surface-variant p-4">Aucune recette trouvée</Card>
              )}
              {recipes.length > 5 && (
                <Link to={`/recipes?q=${encodeURIComponent(query.trim())}`} className="text-label-sm text-primary font-medium hover:underline">Voir les {recipes.length} recettes →</Link>
              )}
            </div>
          </section>

          {/* Fichiers locaux */}
          <section className="lg:col-span-4 min-w-0" aria-label="Fichiers locaux">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline-md font-bold text-on-surface">Fichiers locaux</h2>
              <span className="text-body-sm text-on-surface-variant px-2.5 py-1 rounded-full bg-surface-container-low">{filesData?.results?.length ?? 0}</span>
            </div>
            {debouncedQuery.length < 2 && !filesError && (
              <Card className="text-center text-body-sm text-on-surface-variant p-4">Saisissez au moins 2 caractères</Card>
            )}
            {debouncedQuery.length >= 2 && filesError && (
              <ErrorState title="Recherche de fichiers impossible" message="Le serveur local n'a pas pu répondre." onRetry={() => refetchFiles()} />
            )}
            {debouncedQuery.length >= 2 && !filesError && (
              <div className="flex flex-col gap-3">
                {filesData?.results?.slice(0, 8).map(file => (
                  <Card key={file.path} className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-body-sm font-semibold text-on-surface truncate" title={file.name}>{file.name}</p>
                      <Badge variant="info">{file.extension}</Badge>
                    </div>
                    <p className="text-body-xs text-on-surface-variant truncate" title={file.path}>{file.path}</p>
                    <p className="text-body-xs text-on-surface-variant">{file.size_human}</p>
                  </Card>
                ))}
                {filesData && filesData.results?.length === 0 && !filesData.error && (
                  <Card className="text-center text-body-sm text-on-surface-variant p-4">Aucun fichier local trouvé</Card>
                )}
                {filesData?.error && (
                  <Card className="text-center text-body-sm text-on-surface-variant p-4">{filesData.error}</Card>
                )}
              </div>
            )}
          </section>

          {/* Projets */}
          <section className="lg:col-span-3 min-w-0" aria-label="Projets">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline-md font-bold text-on-surface">Projets</h2>
              <span className="text-body-sm text-on-surface-variant px-2.5 py-1 rounded-full bg-surface-container-low">{projects.length}</span>
            </div>
            {!user && (
              <Card className="text-center p-4">
                <p className="text-body-sm text-on-surface-variant mb-3">Connectez-vous pour rechercher dans vos projets.</p>
                <Link to="/login" className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-4 py-2 text-label-sm font-medium text-on-primary transition-all hover:brightness-110">
                  Se connecter
                </Link>
              </Card>
            )}
            {user && (
              <div className="flex flex-col gap-3">
                {projects.slice(0, 6).map(project => (
                  <Card key={project.id} hover onClick={() => navigate(`/teams/${project.team_slug}/projects/${project.slug}`)} className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: project.color || '#1e40af' }}>
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-body-sm font-semibold text-on-surface truncate">{project.name}</p>
                    </div>
                    <p className="text-body-xs text-on-surface-variant truncate">{project.team_name}</p>
                  </Card>
                ))}
                {projects.length === 0 && (
                  <Card className="text-center text-body-sm text-on-surface-variant p-4">Aucun projet trouvé</Card>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </PageLayout>
  );
}