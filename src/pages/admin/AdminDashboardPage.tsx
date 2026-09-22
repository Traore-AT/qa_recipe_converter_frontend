import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { adminApi } from '../../api/admin';
import { AdminIcon } from '../../components/admin/AdminIcon';
import { PageLayout } from '../../components/layout/PageLayout';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { KpiCard } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton, SkeletonCard } from '../../components/ui/Skeleton';
import { getApiErrorMessage } from '../../lib/errors';
import { queryKeys } from '../../lib/queryKeys';
import { fillDateSeries, formatDateTime, getInitial } from '../../lib/admin';

const KPI_COLORS = {
  users: '#3B82F6',
  teams: '#8B5CF6',
  projects: '#F59E0B',
  jobs: '#10B981',
  use_cases: '#14B8A6',
  defects: '#EF4444',
  sprints: '#6366F1',
  reports: '#EC4899',
} as const;

const NAV_ITEMS = [
  { to: '/admin/users', icon: 'users', label: 'Utilisateurs', description: 'Comptes, accès et rôles' },
  { to: '/admin/teams', icon: 'teams', label: 'Équipes', description: 'Organisation et propriété' },
  { to: '/admin/projects', icon: 'folder', label: 'Projets', description: 'Statuts et visibilité' },
  { to: '/admin/jobs', icon: 'upload', label: 'Conversions', description: 'Traitements et erreurs' },
  { to: '/admin/activity', icon: 'activity', label: 'Activité', description: "Journal d'audit" },
  { to: '/admin/system', icon: 'server', label: 'Système', description: 'Stockage et base de données' },
] as const;

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--color-surface-container-lowest)',
  border: '1px solid var(--color-outline-variant)',
  borderRadius: 12,
  fontSize: 13,
} as const;

export default function AdminDashboardPage() {
  const summary = useQuery({ queryKey: queryKeys.admin.summary(), queryFn: adminApi.getSummary });
  const stats = useQuery({
    queryKey: queryKeys.admin.statistics(),
    queryFn: () => adminApi.getStatistics(30),
  });

  const loading = summary.isPending;
  const error = summary.error ?? stats.error;

  return (
    <PageLayout>
      <PageHeader
        title="Administration système"
        subtitle="Panorama global de la plateforme QA : utilisateurs, équipes, projets et activité."
      />

      {error && !loading ? (
        <ErrorState message={getApiErrorMessage(error)} onRetry={() => summary.refetch()} />
      ) : (
        <div className="space-y-8">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                  <AdminIcon name={item.icon} />
                </span>
                <span className="min-w-0">
                  <span className="block text-label-md font-semibold text-on-surface">{item.label}</span>
                  <span className="block truncate text-body-sm text-on-surface-variant">{item.description}</span>
                </span>
              </Link>
            ))}
          </section>

          <section aria-label="Indicateurs clés">
            {summary.isPending ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
                {Array.from({ length: 8 }).map((_, index) => (
                  <SkeletonCard key={index} />
                ))}
              </div>
            ) : summary.data ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
                <KpiCard label="Utilisateurs" value={summary.data.users.total} icon={<AdminIcon name="users" />} color={KPI_COLORS.users} />
                <KpiCard label="Équipes" value={summary.data.teams.total} icon={<AdminIcon name="teams" />} color={KPI_COLORS.teams} />
                <KpiCard label="Projets" value={summary.data.projects.total} icon={<AdminIcon name="folder" />} color={KPI_COLORS.projects} />
                <KpiCard label="Conversions" value={summary.data.jobs.total} icon={<AdminIcon name="upload" />} color={KPI_COLORS.jobs} />
                <KpiCard label="Cas de test" value={summary.data.use_cases.total} icon={<AdminIcon name="description" />} color={KPI_COLORS.use_cases} />
                <KpiCard label="Anomalies" value={summary.data.defects.total} icon={<AdminIcon name="bug" />} color={KPI_COLORS.defects} />
                <KpiCard label="Sprints" value={summary.data.sprints.total} icon={<AdminIcon name="flag" />} color={KPI_COLORS.sprints} />
                <KpiCard label="Rapports" value={summary.data.reports.total} icon={<AdminIcon name="article" />} color={KPI_COLORS.reports} />
              </div>
            ) : null}

            {summary.data && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                <Card className="!p-3 text-center">
                  <p className="text-body-sm text-on-surface-variant">Taux de réussite</p>
                  <p className="text-headline-sm font-bold text-on-surface">{summary.data.use_cases.success_rate}%</p>
                </Card>
                <Card className="!p-3 text-center">
                  <p className="text-body-sm text-on-surface-variant">Anomalies ouvertes</p>
                  <p className="text-headline-sm font-bold text-on-surface">{summary.data.defects.open}</p>
                </Card>
                <Card className="!p-3 text-center">
                  <p className="text-body-sm text-on-surface-variant">Anomalies critiques</p>
                  <p className="text-headline-sm font-bold text-on-surface">{summary.data.defects.critical}</p>
                </Card>
                <Card className="!p-3 text-center">
                  <p className="text-body-sm text-on-surface-variant">Cas automatisés</p>
                  <p className="text-headline-sm font-bold text-on-surface">{summary.data.use_cases.automated}</p>
                </Card>
                <Card className="!p-3 text-center">
                  <p className="text-body-sm text-on-surface-variant">Conversions 24 h</p>
                  <p className="text-headline-sm font-bold text-on-surface">{summary.data.jobs.recent_24h}</p>
                </Card>
              </div>
            )}
          </section>

          <section aria-label="Évolution sur 30 jours" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-title-md font-semibold text-on-surface">Conversions (30 jours)</h2>
                <Badge variant="default">Fichier → QC</Badge>
              </div>
              <div className="h-64">
                {stats.isPending ? (
                  <Skeleton className="h-full w-full" />
                ) : stats.data ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={fillDateSeries(stats.data.conversions, 30)} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="conversionsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={KPI_COLORS.jobs} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={KPI_COLORS.jobs} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} tickFormatter={(value: string) => value.slice(5)} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} allowDecimals={false} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Area type="monotone" dataKey="count" stroke={KPI_COLORS.jobs} fill="url(#conversionsFill)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </Card>

            <Card>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-title-md font-semibold text-on-surface">Nouveaux utilisateurs (30 jours)</h2>
                <Badge variant="default">Inscriptions</Badge>
              </div>
              <div className="h-64">
                {stats.isPending ? (
                  <Skeleton className="h-full w-full" />
                ) : stats.data ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fillDateSeries(stats.data.users, 30)} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} tickFormatter={(value: string) => value.slice(5)} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} allowDecimals={false} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Bar dataKey="count" fill={KPI_COLORS.users} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </Card>
          </section>

          <section aria-label="Activité récente">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-title-md font-semibold text-on-surface">Activité récente</h2>
                <Link to="/admin/activity" className="text-label-sm font-semibold text-primary hover:underline">
                  Voir tout le journal →
                </Link>
              </div>
              {summary.isPending ? (
                <Skeleton lines={4} />
              ) : summary.data && summary.data.recent_activity.length > 0 ? (
                <ul className="divide-y divide-outline-variant">
                  {summary.data.recent_activity.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-sm font-semibold text-primary">
                        {getInitial(item.actor?.full_name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-body-sm text-on-surface">
                          <span className="font-semibold">{item.actor?.username ?? 'Système'}</span>{' '}
                          {item.description && <span>{item.description}</span>}
                        </p>
                        <p className="mt-0.5 text-body-sm text-on-surface-variant">{formatDateTime(item.created_at)}</p>
                      </div>
                      <Badge variant="default">{item.action_type}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="Aucune activité récente" description="Le journal se remplira au fil des actions." icon={null} />
              )}
            </Card>
          </section>
        </div>
      )}
    </PageLayout>
  );
}