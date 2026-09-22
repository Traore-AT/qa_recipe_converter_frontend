import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { teamsApi } from '../api/teams';
import { PageLayout } from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { WeeklyReport } from '../types';
import { queryKeys } from '../lib/queryKeys';

export default function WeeklyReportPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewAll, setViewAll] = useState(false);

  const { data: current } = useQuery({
    queryKey: queryKeys.weeklyReportCurrent(slug),
    queryFn: () => teamsApi.getCurrentWeeklyReport(slug!),
    enabled: !!slug,
  });

  const { data: allReports } = useQuery({
    queryKey: queryKeys.weeklyReports(slug),
    queryFn: () => teamsApi.listWeeklyReports(slug!),
    enabled: !!slug && viewAll,
  });

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      current?.id
        ? teamsApi.updateWeeklyReport(slug!, current.id, data)
        : teamsApi.saveWeeklyReport(slug!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyReportCurrent(slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyReports(slug) });
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => current?.id
      ? teamsApi.updateWeeklyReport(slug!, current.id, { status: 'submitted' })
      : teamsApi.saveWeeklyReport(slug!, { status: 'submitted' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyReportCurrent(slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyReports(slug) });
    },
  });

  const saveField = (field: string, value: string) => {
    const data: Record<string, unknown> = { [field]: value };
    if (current?.week_start) data.week_start = current.week_start;
    if (current?.week_end) data.week_end = current.week_end;
    saveMutation.mutate(data);
  };

  return (
    <PageLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button onClick={() => navigate(`/teams/${slug}`)} className="flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary transition-colors mb-2 cursor-pointer">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            Retour à l'équipe
          </button>
          <h1 className="text-headline-lg font-bold text-on-surface">Rapport hebdomadaire</h1>
          <p className="text-body-sm text-on-surface-variant">
            {current?.week_label || 'Cette semaine'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setViewAll(!viewAll)}>
            {viewAll ? 'Masquer l\'historique' : 'Voir historique'}
          </Button>
          {current && current.status === 'draft' && (
            <Button size="sm" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? '⏳…' : '📤 Soumettre'}
            </Button>
          )}
        </div>
      </div>

      {current && (
        <Card className="mb-6">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-headline-md font-bold text-on-surface">
                {current.week_label}
              </h2>
              <Badge variant={current.status === 'draft' ? 'warning' : 'success'}>
                {current.status === 'draft' ? 'Brouillon' : 'Soumis'}
                {current.submitted_at && ` le ${new Date(current.submitted_at).toLocaleDateString('fr-FR')}`}
              </Badge>
            </div>

            <div>
              <label className="text-label-md font-bold text-on-surface block mb-2">
                ✅ Accomplissements
              </label>
              <textarea
                value={current.accomplishments}
                onChange={e => saveField('accomplishments', e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant rounded-lg outline-none focus:border-primary bg-surface resize-none min-h-[120px] text-body-base"
                placeholder="Décrivez ce que vous avez accompli cette semaine..."
                disabled={current.status === 'submitted'}
              />
            </div>

            <div>
              <label className="text-label-md font-bold text-on-surface block mb-2">
                🚧 Blocages / Problèmes
              </label>
              <textarea
                value={current.blockers}
                onChange={e => saveField('blockers', e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant rounded-lg outline-none focus:border-primary bg-surface resize-none min-h-[120px] text-body-base"
                placeholder="Avez-vous rencontré des problèmes ou blocages ?"
                disabled={current.status === 'submitted'}
              />
            </div>

            <div>
              <label className="text-label-md font-bold text-on-surface block mb-2">
                📋 Prévisions semaine prochaine
              </label>
              <textarea
                value={current.next_week_plans}
                onChange={e => saveField('next_week_plans', e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant rounded-lg outline-none focus:border-primary bg-surface resize-none min-h-[120px] text-body-base"
                placeholder="Que prévoyez-vous pour la semaine prochaine ?"
                disabled={current.status === 'submitted'}
              />
            </div>

            <div>
              <label className="text-label-md font-bold text-on-surface block mb-2">
                💬 Notes supplémentaires
              </label>
              <textarea
                value={current.additional_notes}
                onChange={e => saveField('additional_notes', e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant rounded-lg outline-none focus:border-primary bg-surface resize-none min-h-[80px] text-body-base"
                placeholder="Toute information supplémentaire..."
                disabled={current.status === 'submitted'}
              />
            </div>

            {saveMutation.isPending && (
              <p className="text-body-sm text-primary animate-pulse">Sauvegarde en cours…</p>
            )}
          </div>
        </Card>
      )}

      {viewAll && (
        <div>
          <h2 className="text-headline-md font-bold text-on-surface mb-4">Historique</h2>
          <div className="space-y-3">
            {allReports?.results?.map((report: WeeklyReport) => (
              <Card key={report.id} className="flex items-center justify-between">
                <div>
                  <p className="text-body-base font-medium text-on-surface">{report.week_label}</p>
                  <p className="text-body-sm text-on-surface-variant">
                    Soumis le {report.submitted_at ? new Date(report.submitted_at).toLocaleDateString('fr-FR') : 'Non soumis'}
                  </p>
                </div>
                <Badge variant={report.status === 'submitted' ? 'success' : 'warning'}>
                  {report.status === 'submitted' ? 'Soumis' : 'Brouillon'}
                </Badge>
              </Card>
            ))}
            {(!allReports?.results || allReports.results.length === 0) && (
              <p className="text-body-base text-on-surface-variant text-center py-8">Aucun rapport précédent</p>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
