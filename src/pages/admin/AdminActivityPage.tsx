import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { PageLayout } from '../../components/layout/PageLayout';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Select } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { SkeletonList } from '../../components/ui/Skeleton';
import { formatDateTime, getInitial } from '../../lib/admin';
import { getApiErrorMessage } from '../../lib/errors';
import { queryKeys } from '../../lib/queryKeys';

const PAGE_SIZE = 20;

const ACTION_GROUPS: Record<string, string> = {
  'auth.login': 'auth.login',
  'admin.user-created': 'admin.user-created',
  'admin.user-updated': 'admin.user-updated',
  'admin.user-deleted': 'admin.user-deleted',
  'admin.team-created': 'admin.team-created',
  'admin.team-updated': 'admin.team-updated',
  'admin.team-deleted': 'admin.team-deleted',
  'admin.project-created': 'admin.project-created',
  'admin.project-updated': 'admin.project-updated',
  'admin.project-deleted': 'admin.project-deleted',
  'admin.job-deleted': 'admin.job-deleted',
  'admin.password-reset': 'admin.password-reset',
  'admin.transfer-owner': 'admin.transfer-owner',
};

export default function AdminActivityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const actionType = searchParams.get('action_type') ?? '';

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.admin.activity(page, actionType),
    queryFn: () => adminApi.listActivity({ action_type: actionType || undefined, page }),
  });

  const items = data?.results ?? [];

  const applyAction = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set('action_type', value);
    else params.delete('action_type');
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(next));
    setSearchParams(params);
    window.scrollTo({ top: 0 });
  };

  return (
    <PageLayout>
      <PageHeader
        title="Journal d'activité"
        subtitle="Trace de toutes les actions réalisées sur la plateforme."
      />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <Select
          label="Type d'action"
          className="min-w-56"
          value={actionType}
          onChange={(event) => applyAction(event.target.value)}
          options={[
            { value: '', label: 'Toutes les actions' },
            ...Object.entries(ACTION_GROUPS).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>

      {error ? (
        <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <SkeletonList rows={6} />
      ) : items.length === 0 ? (
        <EmptyState title="Aucune activité" description="Aucune entrée ne correspond à votre recherche." icon={null} />
      ) : (
        <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-sm font-semibold text-primary">
                {getInitial(item.actor?.full_name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body-sm text-on-surface">
                  <span className="font-semibold">{item.actor?.username ?? 'Système'}</span>{' '}
                  {item.description && <span>{item.description}</span>}
                </p>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                  {formatDateTime(item.created_at)}
                  {(item.team_name || item.project_title) && (
                    <span> · {item.team_name ?? ''}{item.team_name && item.project_title ? ' / ' : ''}{item.project_title ?? ''}</span>
                  )}
                </p>
              </div>
              <Badge variant="default">{item.action_type}</Badge>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        count={data?.count ?? 0}
        pageSize={PAGE_SIZE}
        isFetching={isFetching}
        onPageChange={handlePageChange}
        ariaLabel="Pagination du journal"
      />
    </PageLayout>
  );
}