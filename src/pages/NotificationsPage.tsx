import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '../api/teams';
import { PageLayout } from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SkeletonList } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { queryKeys } from '../lib/queryKeys';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => teamsApi.getNotifications(),
    staleTime: 15_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => teamsApi.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  const markAllRead = useMutation({
    mutationFn: () => teamsApi.markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  const notifications = data?.results ?? [];
  const unreadCount = data?.unread_count ?? 0;

  return (
    <PageLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-headline-lg font-bold text-on-surface">Notifications</h1>
          <p className="text-body-sm text-on-surface-variant">
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Toutes vos notifications sont lues'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" onClick={() => markAllRead.mutate()} loading={markAllRead.isPending}>
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {isLoading && <SkeletonList rows={6} />}

      {isError && (
        <ErrorState title="Impossible de charger les notifications" message={String(error)} onRetry={() => refetch()} />
      )}

      {!isLoading && !isError && notifications.length === 0 && (
        <EmptyState
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9a6 6 0 0 0-12 0v.75a8.967 8.967 0 0 1-2.31 6.022c1.74.74 3.6 1.17 5.454 1.31m5.713 0a24.255 24.255 0 0 1-5.713 0m5.713 0a3 3 0 1 1-5.713 0"/></svg>}
          title="Aucune notification"
          description="Vous serez prévenu ici des cas assignés, anomalies et autres actions vous concernant."
        />
      )}

      {!isLoading && !isError && notifications.length > 0 && (
        <div className="flex flex-col gap-3">
          {notifications.map(notification => (
            <Card key={notification.id} className={`p-4 ${notification.is_read ? 'opacity-75' : 'border-l-4 border-l-primary'}`}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {(notification.actor.full_name || notification.actor.username).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-body-sm font-semibold text-on-surface">
                      {notification.actor.full_name || notification.actor.username}
                    </span>
                    {!notification.is_read && <Badge variant="primary">Nouveau</Badge>}
                    {notification.project && (
                      <span className="text-body-xs text-on-surface-variant">{notification.project}</span>
                    )}
                  </div>
                  <p className="text-body-sm text-on-surface">{notification.description}</p>
                  <p className="text-body-xs text-on-surface-variant mt-1">
                    {new Date(notification.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                {!notification.is_read && (
                  <button
                    type="button"
                    onClick={() => markRead.mutate(notification.id)}
                    disabled={markRead.isPending}
                    className="min-h-[44px] px-3 py-2 rounded-lg text-label-sm text-primary hover:bg-primary-fixed transition-all disabled:opacity-50 shrink-0"
                  >
                    Marquer comme lu
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}