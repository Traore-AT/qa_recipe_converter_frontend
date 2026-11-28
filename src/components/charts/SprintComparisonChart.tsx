import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SprintSummary } from '../../types';
import { AXIS_TICK, CHART_AXIS, CHART_GRID, CHART_INK, formatPercent, SERIES_COLORS } from '../../lib/chart';
import { ChartLegend } from './ChartLegend';
import { rechartsTooltip } from './rechartsTooltip';

const SERIES = [
  { key: 'success_rate', label: 'Taux de réussite', color: SERIES_COLORS[0] },
  { key: 'execution_rate', label: 'Avancement', color: SERIES_COLORS[1] },
] as const;
const MAX_LABELLED_SPRINTS = 8;

/** Réussite et avancement par sprint (colonnes de 24 px max, même axe en %), dans l'ordre chronologique. */
export function SprintComparisonChart({ sprints }: { sprints: SprintSummary[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const rows = sprints.filter(s => s.stats.total).map(s => ({
    name: s.name, success_rate: s.stats.success_rate, execution_rate: s.stats.execution_rate,
  }));
  if (rows.length < 2) return null;
  const toggle = (key: string) => setHidden(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else if (next.size < SERIES.length - 1) next.add(key);
    return next;
  });

  return (
    <figure aria-label="Réussite et avancement par sprint" className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <figcaption className="text-label-md font-bold text-on-surface">Réussite et avancement par sprint</figcaption>
        <ChartLegend items={SERIES.map(s => ({ ...s }))} shape="square" hidden={hidden} onToggle={toggle} />
      </div>
      <div className="h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 20, right: 8, left: -8, bottom: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke={CHART_GRID} />
            <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART_AXIS }} interval={0}
                   tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]}
                   width={48} tickFormatter={(v: number) => `${v} %`} />
            <Tooltip cursor={{ fill: 'var(--chart-grid)', fillOpacity: 0.5 }}
                     content={rechartsTooltip({ format: v => formatPercent(v), shape: 'square' })} />
            {SERIES.filter(s => !hidden.has(s.key)).map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} maxBarSize={24} radius={[4, 4, 0, 0]}
                   animationDuration={500}>
                {/* Valeur sur la tête de colonne : uniquement pour la première série visible. */}
                {i === 0 && rows.length <= MAX_LABELLED_SPRINTS && (
                  <LabelList dataKey={s.key} position="top" fontSize={10} fill={CHART_INK}
                             formatter={(v: unknown) => formatPercent(Number(v))} />
                )}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
