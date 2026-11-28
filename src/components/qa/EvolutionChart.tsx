import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDay, type ChartSeries } from '../../lib/qa';
import { AXIS_TICK, CHART_AXIS, CHART_GRID, CHART_INK, CHART_SURFACE, formatNumber, formatPercent } from '../../lib/chart';
import type { EvolutionPoint } from '../../types';
import { ChartLegend } from '../charts/ChartLegend';
import { rechartsTooltip } from '../charts/rechartsTooltip';

interface Props {
  title: string;
  points: EvolutionPoint[];
  series: ChartSeries[];
  percent?: boolean;
}

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
  value?: number;
}

/**
 * Courbe d'évolution : traits de 2 px, point et valeur en fin de courbe, repère vertical au survol,
 * légende cliquable (masquer / afficher une série) et table de données accessible.
 */
export function EvolutionChart({ title, points, series, percent = false }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const format = (value: number) => (percent ? formatPercent(value) : formatNumber(value));
  const visible = series.filter(s => !hidden.has(String(s.key)));
  const last = points.length - 1;

  // Libellés de fin seulement s'ils ne se chevauchent pas (sinon : légende + infobulle).
  const endLabels = useMemo(() => {
    if (last < 0 || visible.length > 4) return false;
    const values = visible.map(s => Number(points[last][s.key])).sort((a, b) => a - b);
    const range = percent ? 100 : Math.max(1, ...points.flatMap(p => visible.map(s => Number(p[s.key]))));
    return values.every((v, i) => i === 0 || v - values[i - 1] >= range * 0.08);
  }, [points, visible, last, percent]);

  const toggle = (key: string) => setHidden(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else if (next.size < series.length - 1) next.add(key);  // au moins une série reste visible
    return next;
  });

  const endDot = (color: string) => function EndDot({ cx, cy, index, value }: DotProps) {
    if (index !== last || cx === undefined || cy === undefined) return <g />;
    return (
      <g>
        <circle cx={cx} cy={cy} r={4} fill={color} stroke={CHART_SURFACE} strokeWidth={2} />
        {endLabels && value !== undefined && (
          <text x={cx - 8} y={cy - 9} textAnchor="end" fontSize={11} fontWeight={600} fill={CHART_INK}>{format(value)}</text>
        )}
      </g>
    );
  };

  return (
    <figure aria-label={title} className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <figcaption className="text-label-md font-bold text-on-surface">{title}</figcaption>
        <ChartLegend items={series.map(s => ({ key: String(s.key), label: s.label, color: s.color }))}
                     hidden={hidden} onToggle={series.length > 1 ? toggle : undefined} />
      </div>
      <div className="h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 22, right: 16, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_GRID} strokeWidth={1} />
            <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART_AXIS }}
                   tickFormatter={(v: string) => formatDay(v).slice(0, 5)} minTickGap={28} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} width={48}
                   domain={percent ? [0, 100] : [0, 'auto']} ticks={percent ? [0, 25, 50, 75, 100] : undefined}
                   tickFormatter={(v: number) => (percent ? `${v} %` : formatNumber(v))} />
            <Tooltip
              cursor={{ stroke: CHART_AXIS, strokeWidth: 1 }}
              content={rechartsTooltip({ title: label => formatDay(String(label)), format: v => format(v) })}
            />
            {visible.map(s => (
              <Line
                key={String(s.key)}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={endDot(s.color)}
                activeDot={{ r: 5, fill: s.color, stroke: CHART_SURFACE, strokeWidth: 2 }}
                animationDuration={500}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-body-xs text-on-surface-variant">Voir les données</summary>
        <div className="mt-2 max-h-56 overflow-auto">
          <table className="w-full text-left text-body-xs text-on-surface">
            <thead>
              <tr>
                <th className="py-1 pr-3">Date</th>
                {series.map(s => <th key={String(s.key)} className="py-1 pr-3">{s.label}</th>)}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {points.map(p => (
                <tr key={p.date} className="border-t border-outline-variant/40">
                  <td className="py-1 pr-3">{formatDay(p.date)}</td>
                  {series.map(s => <td key={String(s.key)} className="py-1 pr-3">{format(Number(p[s.key]))}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
