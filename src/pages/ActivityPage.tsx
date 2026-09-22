import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { teamsApi } from '../api/teams';
import { PageLayout } from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { SkeletonList } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { queryKeys } from '../lib/queryKeys';

const ACTION_LABELS: Record<string, string> = {
  sprint_created: 'Sprint créé',
  sprint_updated: 'Sprint mis à jour',
  assignments_created: 'Cas assignés',
  use_case_status: 'Statut de cas',
  defect_created: 'Anomalie créée',
  defect_status: 'Anomalie mise à jour',
  screenshot_uploaded: 'Capture ajoutée',
  weekly_report_submitted: 'Rapport hebdomadaire soumis',
};

function actionLabel(type: string): string {
  return ACTION_LABELS[type] ?? type;
}

export default function ActivityPage() {
  const { slug, projectSlug } = useParams<{ slug: string; projectSlug?: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.activity(slug, projectSlug),
    queryFn: () =>
      projectSlug
        ? teamsApi.getProjectActivity(slug!, projectSlug)
        : teamsApi.getTeamActivity(slug!),
    enabled: !!slug,
  });

  const activities = data?.results ?? [];

  return (
    <PageLayout>
      <div className="mb-6">
        <button onClick={() => projectSlug ? navigate(`/teams/${slug}/projects/${projectSlug}`) : navigate(`/teams/${slug}`)} className="flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary transition-colors mb-2 cursor-pointer">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          {projectSlug ? 'Retour au projet' : 'Retour à l\'équipe'}
        </button>
        <h1 className="text-headline-lg font-bold text-on-surface">Fil d'activité</h1>
        <p className="text-body-sm text-on-surface-variant">
          {projectSlug ? 'Activité récente du projet' : 'Activité récente de l\'équipe'}
        </p>
      </div>

      {isLoading && <SkeletonList rows={6} />}

      {isError && (
        <ErrorState title="Impossible de charger l'activité" message={String(error)} onRetry={() => refetch()} />
      )}

      {!isLoading && !isError && activities.length === 0 && (
        <EmptyState
          icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9l-7-7zM13 9V3.5L18.5 9H13zM11 19l-1.5-1.5L6 15l1.41-1.41L11 16.17l5.09-5.09L17.5 12.5 11 19z"/></svg>}
          title="Aucune activité"
          description="Les actions des membres (sprints, cas, anomalies…) apparaîtront ici."
        />
      )}

      {!isLoading && !isError && activities.length > 0 && (
        <div className="flex flex-col gap-3">
          {activities.map(activity => (
            <Card key={activity.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {(activity.actor.full_name || activity.actor.username).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-body-sm font-semibold text-on-surface">
                      {activity.actor.full_name || activity.actor.username}
                    </span>
                    <Badge variant="info">{actionLabel(activity.action_type)}</Badge>
                    {activity.project && (
                      <span className="text-body-xs text-on-surface-variant">{activity.project}</span>
                    )}
                  </div>
                  {activity.description && (
                    <p className="text-body-sm text-on-surface">{activity.description}</p>
                  )}
                  <p className="text-body-xs text-on-surface-variant mt-1">
                    {new Date(activity.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}