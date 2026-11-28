export interface LegendItem {
  key: string;
  label: string;
  color: string;
}

interface Props {
  items: LegendItem[];
  /** Repère : trait (courbes) ou carré (barres). */
  shape?: 'line' | 'square';
  /** Séries masquées ; si `onToggle` est fourni, chaque entrée devient un bouton. */
  hidden?: Set<string>;
  onToggle?: (key: string) => void;
}

/** Légende au-dessus du graphique ; cliquable pour masquer / afficher une série. */
export function ChartLegend({ items, shape = 'line', hidden, onToggle }: Props) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Légende">
      {items.map(item => {
        const off = hidden?.has(item.key);
        const swatch = (
          <span aria-hidden="true" className={shape === 'square' ? 'h-2.5 w-2.5 rounded-sm' : 'h-0.5 w-4 rounded-full'}
                style={{ backgroundColor: off ? 'var(--chart-axis)' : item.color }} />
        );
        return (
          <li key={item.key}>
            {onToggle ? (
              <button
                type="button"
                aria-pressed={!off}
                onClick={() => onToggle(item.key)}
                title={off ? `Afficher « ${item.label} »` : `Masquer « ${item.label} »`}
                className={`flex items-center gap-1.5 rounded px-1 py-0.5 text-body-xs transition-opacity hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${off ? 'text-on-surface-variant line-through opacity-70' : 'text-on-surface'}`}
              >
                {swatch}{item.label}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-body-xs text-on-surface">{swatch}{item.label}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
