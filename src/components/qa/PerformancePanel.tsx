import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { teamsApi } from '../../api/teams';
import { getApiErrorMessage } from '../../lib/errors';
import { COMPONENT_LABELS, DEFECT_SERIES, formatDay, LEVEL_VARIANTS, RATE_SERIES } from '../../lib/qa';
import { queryKeys } from '../../lib/queryKeys';
import type { ScoreComponent, Sprint } from '../../types';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { ErrorState } from '../ui/ErrorState';
import { Skeleton } from '../ui/Skeleton';
import { EvolutionChart } from './EvolutionChart';
import { SprintComparisonChart } from '../charts/SprintComparisonChart';
import { StatusBreakdown } from '../charts/StatusBreakdown';
import { formatPercent } from '../../lib/chart';
import { SprintPicker } from './SprintPicker';

/** Jauge 0–100 % : la couleur porte le niveau (≥ 70 bon, ≥ 50 à surveiller, sinon critique). */
function Meter({ value, label }: { value: number; label: string }) {
  const color = value >= 70 ? 'var(--chart-1)' : value >= 50 ? 'var(--status-warning)' : 'var(--status-critical)';
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}
         className="mt-1 h-2 overflow-hidden rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)` }}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }} />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4 text-center">
      <p className="text-headline-sm font-bold text-on-surface">{value}</p>
      <p className="mt-0.5 text-body-sm text-on-surface-variant">{label}</p>
    </div>
  );
}

/** Niveau de performance et courbes d'évolution d'un projet (ou d'une sélection de sprints). */
export function PerformancePanel({ teamSlug, projectSlug, sprints }: { teamSlug: string; projectSlug: string; sprints: Sprint[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const performance = useQuery({
    queryKey: queryKeys.performance(teamSlug, projectSlug, selected),
    queryFn: () => teamsApi.getProjectPerformance(teamSlug, projectSlug, selected),
  });
  const evolution = useQuery({
    queryKey: queryKeys.evolution(teamSlug, projectSlug, selected),
    queryFn: () => teamsApi.getProjectEvolution(teamSlug, projectSlug, selected),
  });
  const error = performance.error ?? evolution.error;
  const perf = performance.data;
  const evo = evolution.data;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-headline-md font-bold text-on-surface">Niveau de performance</h2>
        <SprintPicker sprints={sprints} selected={selected} onChange={setSelected} />
      </div>

      {error ? (
        <ErrorState message={getApiErrorMessage(error)} onRetry={() => { performance.refetch(); evolution.refetch(); }} />
      ) : !perf || !evo ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <>
          <Card>
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="shrink-0 text-center md:w-44">
                <p className="text-headline-lg font-bold text-on-surface">{perf.score === null ? '—' : `${perf.score}/100`}</p>
                <Badge variant={LEVEL_VARIANTS[perf.level]}>{perf.level_label}</Badge>
              </div>
              <ul className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                {(Object.keys(COMPONENT_LABELS) as ScoreComponent[]).map(key => (
                  <li key={key}>
                    <div className="flex justify-between text-body-sm text-on-surface">
                      <span>{COMPONENT_LABELS[key].label} <span className="text-on-surface-variant">({perf.weights[key]} %)</span></span>
                      <strong className="tabular-nums">{formatPercent(perf.components[key])}</strong>
                    </div>
                    <Meter value={perf.components[key]} label={COMPONENT_LABELS[key].label} />
                    <p className="mt-0.5 text-body-xs text-on-surface-variant">{COMPONENT_LABELS[key].hint}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card>
            <StatusBreakdown stats={perf.stats} />
          </Card>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            <Kpi label="Cas" value={perf.stats.total} />
            <Kpi label="Exécutés" value={perf.stats.executed} />
            <Kpi label="Anomalies actives" value={perf.defects.active ?? 0} />
            <Kpi label="Cas en régression" value={perf.regressed_cases} />
            <Kpi label="Automatisation" value={`${perf.automation_rate} %`} />
            <Kpi label="Anomalies / cas exécuté" value={perf.defect_density} />
            <Kpi label="Délai moyen de résolution" value={perf.defects.avg_resolution_days == null ? '—' : `${perf.defects.avg_resolution_days} j`} />
          </div>

          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-headline-sm font-bold text-on-surface">Courbe d’évolution</h2>
              <p className="text-body-sm text-on-surface-variant">
                {formatDay(evo.start)} → {formatDay(evo.end)} ·{' '}
                <strong className="text-on-surface">{evo.trend > 0 ? '↑ +' : evo.trend < 0 ? '↓ ' : ''}{evo.trend} pt(s) de réussite</strong>
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
              <EvolutionChart title="Réussite et avancement" points={evo.points} series={RATE_SERIES} percent />
              <EvolutionChart title="Anomalies" points={evo.points} series={DEFECT_SERIES} />
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-headline-sm font-bold text-on-surface">Comparaison des sprints</h2>
            <div className="mb-6"><SprintComparisonChart sprints={perf.sprints} /></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-body-sm text-on-surface">
                <thead className="text-on-surface-variant">
                  <tr>{['Sprint', 'Période', 'Cas', 'Réussite', 'Avancement', 'Anomalies', 'Régressions', 'Niveau'].map(h => <th key={h} className="py-2 pr-4 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {perf.sprints.map(s => (
                    <tr key={s.id} className="border-t border-outline-variant/50">
                      <td className="py-2 pr-4 font-medium">{s.name}</td>
                      <td className="py-2 pr-4">{formatDay(s.start_date)} → {formatDay(s.end_date)}</td>
                      <td className="py-2 pr-4">{s.stats.total}</td>
                      <td className="py-2 pr-4">{s.stats.success_rate} %</td>
                      <td className="py-2 pr-4">{s.stats.execution_rate} %</td>
                      <td className="py-2 pr-4">{s.defects.total}</td>
                      <td className="py-2 pr-4">{s.regressed_cases}</td>
                      <td className="py-2 pr-4"><Badge variant={LEVEL_VARIANTS[s.level]}>{s.level_label}{s.score === null ? '' : ` · ${s.score}`}</Badge></td>
                    </tr>
                  ))}
                  {perf.sprints.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-on-surface-variant">Aucun sprint</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
