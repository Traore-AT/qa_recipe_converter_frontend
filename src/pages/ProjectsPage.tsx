import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { teamsApi } from '../api/teams';
import { PageLayout } from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Pagination } from '../components/ui/Pagination';
import { queryKeys } from '../lib/queryKeys';

const PAGE_SIZE = 20;

export default function ProjectsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.projects(slug, page),
    queryFn: () => teamsApi.listProjects(slug!, { page }),
    enabled: !!slug,
  });

  const projects = data?.results || [];

  const handlePageChange = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(next));
    setSearchParams(params);
    window.scrollTo({ top: 0 });
  };

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <button onClick={() => navigate(`/teams/${slug}`)} className="flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary transition-colors mb-2 cursor-pointer">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            Retour à l'équipe
          </button>
          <h1 className="text-headline-lg font-bold text-on-surface">Projets</h1>
          <p className="text-body-base text-on-surface-variant mt-1">{projects.length} projet{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate(`/teams/${slug}/projects/new`)}
          className="px-4 py-2.5 bg-primary text-white rounded-lg text-label-md font-medium hover:brightness-110 transition-all w-full sm:w-auto"
        >
          + Nouveau projet
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-container-high rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map(project => (
            <Card
              key={project.id}
              hover
              onClick={() => navigate(`/teams/${slug}/projects/${project.slug}`)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ backgroundColor: project.color || '#1e40af' }}>
                  {project.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-body-base font-semibold text-on-surface truncate">{project.name}</h3>
                    <Badge variant={project.visibility === 'private' ? 'default' : project.visibility === 'team' ? 'primary' : 'success'}>
                      {project.visibility === 'private' ? 'Privé' : project.visibility === 'team' ? 'Équipe' : 'Public'}
                    </Badge>
                    <Badge variant={project.status === 'active' ? 'success' : project.status === 'archived' ? 'warning' : 'default'}>
                      {project.status}
                    </Badge>
                  </div>
                  {project.description && (
                    <p className="text-body-sm text-on-surface-variant truncate mt-0.5">{project.description}</p>
                  )}
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    Créé par {project.created_by.full_name} · {new Date(project.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-center">
                    <p className="text-headline-sm font-bold text-on-surface">{project.stats?.total || 0}</p>
                    <p className="text-body-sm text-on-surface-variant">Tests</p>
                  </div>
                  <div className="text-center">
                    <p className="text-headline-sm font-bold text-success">{project.stats?.success_rate || 0}%</p>
                    <p className="text-body-sm text-on-surface-variant">Réussite</p>
                  </div>
                  <svg className="w-5 h-5 text-on-surface-variant" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                </div>
              </div>
            </Card>
          ))}
          {projects.length === 0 && (
            <Card>
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-xl bg-surface-container-high flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-on-surface-variant" fill="currentColor" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>
                </div>
                <h3 className="text-headline-sm font-semibold text-on-surface mb-1">Aucun projet</h3>
                <p className="text-body-base text-on-surface-variant mb-4">Créez votre premier projet pour commencer</p>
                <button
                  onClick={() => navigate(`/teams/${slug}/projects/new`)}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-label-sm font-medium"
                >
                  + Nouveau projet
                </button>
              </div>
            </Card>
          )}
        </div>
      )}

      <Pagination
        page={page}
        count={data?.count || 0}
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
        ariaLabel="Pagination des projets"
        isFetching={isFetching}
      />
    </PageLayout>
  );
}
