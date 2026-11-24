import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDay, type ChartSeries } from '../../lib/qa';
import type { EvolutionPoint } from '../../types';

const TICK = { fontSize: 11, fill: 'var(--color-on-surface-variant)' };

interface Props {
  title: string;
  points: EvolutionPoint[];
  series: ChartSeries[];
  percent?: boolean;
}

/** Courbe d'évolution avec infobulle, légende et table de données accessible. */
export function EvolutionChart({ title, points, series, percent = false }: Props) {
  const format = (value: unknown) => (percent ? `${value} %` : String(value));
  return (
    <figure aria-label={title}>
      <figcaption className="mb-2 text-label-md font-bold text-on-surface">{title}</figcaption>
      <div className="h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-outline-variant)" strokeOpacity={0.35} />
            <XAxis dataKey="date" tick={TICK} tickFormatter={(v: string) => formatDay(v).slice(0, 5)} minTickGap={24} />
            <YAxis tick={TICK} allowDecimals={false} domain={percent ? [0, 100] : [0, 'auto']} unit={percent ? ' %' : undefined} width={56} />
            <Tooltip
              labelFormatter={label => formatDay(String(label))}
              formatter={value => format(value)}
              contentStyle={{
                backgroundColor: 'var(--color-surface-container-lowest)',
                border: '1px solid var(--color-outline-variant)',
                borderRadius: 12,
                fontSize: 13,
                color: 'var(--color-on-surface)',
              }}
              itemStyle={{ color: 'var(--color-on-surface)' }}
            />
            <Legend iconType="plainline" formatter={label => <span className="text-body-sm text-on-surface">{label}</span>} />
            {series.map(s => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={points.length === 1 ? { r: 4 } : false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
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
                {series.map(s => <th key={s.key} className="py-1 pr-3">{s.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {points.map(p => (
                <tr key={p.date} className="border-t border-outline-variant/40">
                  <td className="py-1 pr-3">{formatDay(p.date)}</td>
                  {series.map(s => <td key={s.key} className="py-1 pr-3">{format(p[s.key])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
