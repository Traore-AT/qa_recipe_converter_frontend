import type { ReactNode } from 'react';

export interface TooltipRow {
  name: string;
  value: ReactNode;
  color: string;
  /** Repère : trait (courbes) ou carré (barres). */
  shape?: 'line' | 'square';
}

/** Infobulle des graphiques : la valeur d'abord, le nom de la série ensuite, repère de couleur à gauche. */
export function ChartTooltipCard({ title, rows }: { title?: ReactNode; rows: TooltipRow[] }) {
  if (!rows.length) return null;
  return (
    <div role="status" className="min-w-40 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 py-2 shadow-lg">
      {title && <p className="mb-1.5 text-body-xs font-medium text-on-surface-variant">{title}</p>}
      <ul className="space-y-1">
        {rows.map(row => (
          <li key={row.name} className="flex items-center gap-2 text-body-sm">
            <span aria-hidden="true" className={row.shape === 'square' ? 'h-2.5 w-2.5 shrink-0 rounded-sm' : 'h-0.5 w-3 shrink-0 rounded-full'}
                  style={{ backgroundColor: row.color }} />
            <strong className="tabular-nums text-on-surface">{row.value}</strong>
            <span className="text-on-surface-variant">{row.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
