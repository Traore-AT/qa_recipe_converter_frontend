import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { conversionApi } from '../api/conversion';
import { PageLayout } from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Pagination } from '../components/ui/Pagination';
import { SkeletonCard } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { queryKeys } from '../lib/queryKeys';
import { getApiErrorMessage } from '../lib/errors';
import { useAuth } from '../context/AuthContext';

function aggregateByProject(jobs: Array<{ source_filename: string; use_cases_count: number; status: string; id: string; created_at: string }>) {
  const map = new Map<string, { name: string; count: number; converted: number; jobs: typeof jobs }>();
  for (const job of jobs) {
    const name = job.source_filename.replace(/\.(docx|xlsx)$/i, '');
    const existing = map.get(name) || { name, count: 0, converted: 0, jobs: [] };
    existing.count += job.use_cases_count;
    // ⚠️ Sémantique : status 'done' = *conversion réussie* (pas un test passé)
    if (job.status === 'done') existing.converted += job.use_cases_count;
    existing.jobs.push(job);
    map.set(name, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function getInitials(name: string) {
  return name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('');
}

const STAT_CARDS_ICON_BG = [
  'bg-primary-fixed text-primary',
  'bg-success-container text-on-success-container',
  'bg-warning-container text-on-warning-container',
];

export default function TestSuitesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const { user } = useAuth();
  const isAnonymous = !user;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.jobs.list(page),
    queryFn: () => conversionApi.listJobs(page),
  });

  const jobs = data?.results || [];
  const suites = aggregateByProject(jobs);
  const totalUC = jobs.reduce((sum, j) => sum + (j.use_cases_count || 0), 0);
  // ⚠️ 'done' = conversion réussie (pas un test passé) — libellés ajustés en conséquence
  const totalConverted = jobs.filter(j => j.status === 'done').reduce((sum, j) => sum + (j.use_cases_count || 0), 0);
  const conversionRate = totalUC > 0 ? Math.round((totalConverted / totalUC) * 100) : 0;
  const doneJobs = jobs.filter(j => j.status === 'done').length;

  const handlePageChange = (nextPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(nextPage));
    setSearchParams(params);
    window.scrollTo({ top: 0 });
  };

  return (
    <PageLayout>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-primary transition-colors mb-4 cursor-pointer"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Retour
        </button>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-headline-lg font-bold text-on-surface">Suites de test</h1>
            <p className="text-body-base text-on-surface-variant mt-1">
              {suites.length} suite{suites.length !== 1 ? 's' : ''} · {jobs.length} fichier{jobs.length !== 1 ? 's' : ''} importé{jobs.length !== 1 ? 's' : ''}
            </p>
          </div>
          {suites.length > 0 && (
            <button
              onClick={() => navigate('/convert')}
              className="px-4 py-2.5 bg-primary text-white rounded-xl text-label-sm font-semibold shadow-sm hover:shadow-md hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="text-base leading-none">+</span> Convertir un fichier
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} className="h-40" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Impossible de charger les suites"
          message={getApiErrorMessage(error)}
          onRetry={() => refetch()}
        />
      ) : suites.length === 0 ? (
        <EmptyState
          title={isAnonymous ? 'Connectez-vous pour retrouver vos suites' : 'Aucune suite de test'}
          description={
            isAnonymous
              ? 'Créez un compte ou connectez-vous pour retrouver vos cas de test et fichiers de conversion.'
              : 'Convertissez un fichier Word pour générer automatiquement vos premiers cas de test.'
          }
          icon={
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          }
          action={
            isAnonymous ? (
              <Link
                to="/login"
                className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-5 py-2.5 text-label-sm font-semibold text-on-primary shadow-sm transition-all hover:brightness-110"
              >
                Se connecter
              </Link>
            ) : (
              <Link
                to="/convert"
                className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-5 py-2.5 text-label-sm font-semibold text-on-primary shadow-sm transition-all hover:brightness-110"
              >
                + Convertir un fichier
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-6">
          {/* ── Dashboard: 3 Stat Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1 : Total fichiers avec anneau radial */}
            <Card>
              <div className="p-5 flex items-center gap-4">
                <div className="relative h-16 w-16 flex-shrink-0">
                  <svg className="h-full w-full -rotate-90 text-primary" viewBox="0 0 36 36" aria-hidden="true">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-surface-container-high)" strokeWidth="4" />
                    <circle
                      cx="18" cy="18" r="14" fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 14}`}
                      strokeDashoffset={`${2 * Math.PI * 14 * (1 - Math.min(doneJobs / Math.max(jobs.length, 1), 1))}`}
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-on-surface">{jobs.length}</span>
                  </div>
                </div>
                <div>
                  <p className={`w-9 h-9 rounded-lg flex items-center justify-center mb-1.5 text-lg ${STAT_CARDS_ICON_BG[0]}`}>📄</p>
                  <p className="text-body-sm font-semibold text-on-surface">Fichiers importés</p>
                  <p className="text-body-xs text-on-surface-variant">{doneJobs} terminé{doneJobs !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </Card>

            {/* Card 2 : Taux de réussite global */}
            <Card>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${STAT_CARDS_ICON_BG[1]}`}>✅</p>
                  <span className="text-2xl font-bold text-on-surface">{conversionRate}%</span>
                </div>
                <p className="text-body-sm font-semibold text-on-surface mb-2">Taux de conversion</p>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className="h-full rounded-full bg-success transition-all duration-700 ease-out"
                    style={{ width: `${conversionRate}%` }}
                  />
                </div>
                <p className="text-body-xs text-on-surface-variant mt-2">{totalConverted} / {totalUC} cas convertis</p>
              </div>
            </Card>

            {/* Card 3 : Total cas de test */}
            <Card>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${STAT_CARDS_ICON_BG[2]}`}>🧪</p>
                  <span className="text-2xl font-bold text-on-surface">{totalUC}</span>
                </div>
                <p className="text-body-sm font-semibold text-on-surface mb-2">Cas de test générés</p>
                <div className="flex gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-body-xs font-medium bg-primary/10 text-primary">
                    {suites.length} suite{suites.length !== 1 ? 's' : ''}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-body-xs font-medium bg-surface-container-high text-on-surface-variant">
                    Moy. {suites.length > 0 ? Math.round(totalUC / suites.length) : 0}/suite
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* ── Suites grid ── */}
          <div>
            <h2 className="text-label-md font-bold text-on-surface-variant uppercase tracking-widest mb-3 px-1">
              Vos suites
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suites.map(suite => {
                const suiteConversionRate = suite.count > 0 ? Math.round((suite.converted / suite.count) * 100) : 0;
                const badgeVariant = suiteConversionRate >= 80 ? 'success' : suiteConversionRate >= 50 ? 'warning' : 'error';
                const tone = {
                  avatar: suiteConversionRate >= 80
                    ? 'bg-success text-on-success'
                    : suiteConversionRate >= 50
                      ? 'bg-warning text-on-warning'
                      : 'bg-error text-on-error',
                  bar: suiteConversionRate >= 80
                    ? 'bg-success'
                    : suiteConversionRate >= 50
                      ? 'bg-warning'
                      : 'bg-error',
                };

                return (
                  <Card
                    key={suite.name}
                    hover
                    onClick={() => navigate(`/preview/${suite.jobs[0].id}`)}
                    className="animate-fade-in-up group cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-label-md shadow-sm ${tone.avatar}`}
                          aria-hidden="true"
                        >
                          {getInitials(suite.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-body-base font-bold text-on-surface truncate group-hover:text-primary transition-colors" title={suite.name}>
                            {suite.name}
                          </h3>
                          <p className="text-body-xs text-on-surface-variant mt-0.5">
                            {suite.jobs.length} fichier{suite.jobs.length !== 1 ? 's' : ''} · {suite.count} cas
                          </p>
                        </div>
                        <Badge variant={badgeVariant}>{suiteConversionRate}%</Badge>
                      </div>

                      {/* Progress bar with labels below (clean, no overlap) */}
                      <div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${tone.bar}`}
                            style={{ width: `${suiteConversionRate}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-body-xs text-on-surface-variant">
                            {suite.converted}/{suite.count} convertis
                          </span>
                          <span className="text-body-xs font-mono text-on-surface-variant/70 group-hover:text-primary transition-colors">
                            Voir →
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
          <Pagination
            page={page}
            count={data?.count || 0}
            onPageChange={handlePageChange}
            ariaLabel="Pagination des suites de test"
            isFetching={isFetching}
          />
        </div>
      )}
    </PageLayout>
  );
}