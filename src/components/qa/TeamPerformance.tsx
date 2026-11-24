import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { teamsApi } from '../../api/teams';
import { LEVEL_VARIANTS } from '../../lib/qa';
import { queryKeys } from '../../lib/queryKeys';
import type { TeamPerformanceRow } from '../../types';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

/** Mini-courbe du taux de réussite (0–100 %), tracée en SVG pour rester légère. */
function Sparkline({ row }: { row: TeamPerformanceRow }) {
  const values = row.evolution.map(p => p.success_rate);
  const points = (values.length > 1 ? values : [...values, ...values])
    .map((v, i, all) => `${((i / (all.length - 1)) * 116 + 2).toFixed(1)},${(30 - (v / 100) * 28).toFixed(1)}`)
    .join(' ');
  const last = values.at(-1) ?? 0;
  return (
    <svg viewBox="0 0 120 32" className="h-8 w-28" role="img" aria-label={`Évolution du taux de réussite de ${row.project.name} : ${last} %`}>
      <title>{`${values[0] ?? 0} % → ${last} %`}</title>
      <polyline points={points} fill="none" stroke="#059669" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Niveau de performance et évolution de chaque projet de l'équipe. */
export function TeamPerformance({ teamSlug }: { teamSlug: string }) {
  const { data } = useQuery({
    queryKey: queryKeys.teamPerformance(teamSlug),
    queryFn: () => teamsApi.getTeamPerformance(teamSlug),
  });
  if (!data?.results?.length) return null;

  return (
    <Card className="mb-8">
      <h2 className="mb-3 text-headline-sm font-bold text-on-surface">Performance des projets</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-body-sm text-on-surface">
          <thead className="text-on-surface-variant">
            <tr>{['Projet', 'Niveau', 'Réussite', 'Avancement', 'Anomalies actives', 'Évolution'].map(h => <th key={h} className="py-2 pr-4 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.results.map(row => (
              <tr key={row.project.id} className="border-t border-outline-variant/50">
                <td className="py-2 pr-4">
                  <Link to={`/teams/${teamSlug}/projects/${row.project.slug}`} className="font-medium text-primary hover:underline">{row.project.name}</Link>
                </td>
                <td className="py-2 pr-4">
                  <Badge variant={LEVEL_VARIANTS[row.performance.level]}>
                    {row.performance.level_label}{row.performance.score === null ? '' : ` · ${row.performance.score}/100`}
                  </Badge>
                </td>
                <td className="py-2 pr-4">{row.performance.stats.success_rate} %</td>
                <td className="py-2 pr-4">{row.performance.stats.execution_rate} %</td>
                <td className="py-2 pr-4">{row.performance.defects.active ?? 0}</td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <Sparkline row={row} />
                    <span className="text-on-surface-variant">{row.trend > 0 ? '+' : ''}{row.trend} pt(s)</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
