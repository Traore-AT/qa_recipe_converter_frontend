import { useState } from 'react';
import type { CaseStats } from '../../types';
import { formatPercent, STATUS_META } from '../../lib/chart';

const LABEL_MIN_SHARE = 9; // en dessous, la part n'est pas écrite dans le bloc (infobulle + légende)

/**
 * Répartition des cas par statut : barre segmentée de 28 px (un bloc par statut, 2 px d'écart),
 * part en % dans les blocs assez larges, légende avec icône + libellé + effectif.
 */
export function StatusBreakdown({ stats, title = 'Répartition des cas par statut' }: { stats: CaseStats; title?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const parts = STATUS_META.map(meta => ({ ...meta, count: stats[meta.key] ?? 0 })).filter(p => p.count > 0);
  const total = stats.total || 0;
  if (!total) {
    return <p className="text-body-sm text-on-surface-variant">Aucun cas de test sur ce périmètre.</p>;
  }
  const describe = (p: (typeof parts)[number]) => `${p.label} : ${p.count} cas (${formatPercent((p.count / total) * 100)})`;
  const current = parts.find(p => p.key === active);

  return (
    <figure aria-label={title} className="min-w-0">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <figcaption className="text-label-md font-bold text-on-surface">{title}</figcaption>
        <span className="text-body-xs text-on-surface-variant" aria-live="polite">
          {current ? describe(current) : `${total} cas`}
        </span>
      </div>
      <div className="flex h-7 w-full gap-[2px]" role="list">
        {parts.map(p => {
          const share = (p.count / total) * 100;
          const darkText = p.key === 'blocked';
          return (
            <div
              key={p.key}
              role="listitem"
              tabIndex={0}
              aria-label={describe(p)}
              title={describe(p)}
              onMouseEnter={() => setActive(p.key)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(p.key)}
              onBlur={() => setActive(null)}
              className={`flex min-w-[3px] items-center overflow-hidden rounded px-2 text-[0.6875rem] font-semibold transition-[filter] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active && active !== p.key ? 'brightness-110 saturate-50' : ''}`}
              style={{ flexGrow: p.count, flexBasis: 0, backgroundColor: p.color, color: darkText ? '#0b0b0b' : '#ffffff' }}
            >
              {share >= LABEL_MIN_SHARE && <span className="whitespace-nowrap">{formatPercent(share)}</span>}
            </div>
          );
        })}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1" aria-label="Légende">
        {parts.map(p => (
          <li key={p.key} className="flex items-center gap-1.5 text-body-xs text-on-surface">
            <span aria-hidden="true" className="flex h-3.5 w-3.5 items-center justify-center rounded-sm text-[0.5625rem] leading-none"
                  style={{ backgroundColor: p.color, color: p.key === 'blocked' ? '#0b0b0b' : '#ffffff' }}>{p.icon}</span>
            {p.label} <span className="tabular-nums text-on-surface-variant">{p.count}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
