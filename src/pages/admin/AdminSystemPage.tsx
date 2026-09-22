import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { AdminIcon } from '../../components/admin/AdminIcon';
import { PageLayout } from '../../components/layout/PageLayout';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { getApiErrorMessage } from '../../lib/errors';
import { queryKeys } from '../../lib/queryKeys';

const CATEGORY_LABELS: Record<string, string> = {
  jobs: 'Conversions',
  projects: 'Projets',
  screenshots: 'Captures',
  avatars: 'Avatars',
  reports: 'Rapports',
  other: 'Autres',
};

function formatBytesLocal(bytes: number): string {
  if (bytes <= 0) return '0 Ko';
  const units = ['Ko', 'Mo', 'Go', 'To'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

export default function AdminSystemPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.admin.system(),
    queryFn: adminApi.getSystem,
  });

  const categories = data?.media.categories ?? {};
  const categoryEntries = Object.entries(categories);
  const totalBytes = data?.media.total_bytes ?? 0;

  return (
    <PageLayout>
      <PageHeader
        title="Système"
        subtitle="Stockage multimédia et taille de la base de données."
      />

      {error ? (
        <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                <AdminIcon name="server" />
              </span>
              <div>
                <h2 className="text-title-md font-semibold text-on-surface">Stockage multimédia</h2>
                <p className="text-body-sm text-on-surface-variant">
                  {data.media.total_files} fichier{data.media.total_files !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-end justify-between rounded-xl border border-outline-variant bg-surface-container-low px-5 py-4">
              <div>
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Espace utilisé</p>
                <p className="text-headline-md font-bold text-on-surface">{data.media.total_bytes_human}</p>
              </div>
              <Badge variant="default">{formatBytesLocal(totalBytes)}</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                <AdminIcon name="database" />
              </span>
              <div>
                <h2 className="text-title-md font-semibold text-on-surface">Base de données</h2>
                <p className="text-body-sm text-on-surface-variant">Espace occupé par les données</p>
              </div>
            </div>
            <div className="mt-6 flex items-end justify-between rounded-xl border border-outline-variant bg-surface-container-low px-5 py-4">
              <div>
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Taille</p>
                <p className="text-headline-md font-bold text-on-surface">{data.database.bytes_human}</p>
              </div>
              <Badge variant="default">{formatBytesLocal(data.database.bytes)}</Badge>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="text-title-md font-semibold text-on-surface">Répartition par catégorie</h2>
            {categoryEntries.length === 0 ? (
              <p className="mt-4 text-body-sm text-on-surface-variant">Aucun fichier multimédia pour le moment.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {categoryEntries.map(([category, bytes]) => {
                  const percent = totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0;
                  return (
                    <li key={category}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="text-body-sm font-medium text-on-surface">
                          {CATEGORY_LABELS[category] ?? category}
                        </span>
                        <span className="text-body-sm text-on-surface-variant">
                          {formatBytesLocal(bytes)} · {percent}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </PageLayout>
  );
}