import { cn } from '../../lib/cn';

interface PaginationProps {
  page: number;
  count: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  ariaLabel?: string;
  /** Affiche un état « chargement » sur les commandes pendant la requête. */
  isFetching?: boolean;
}

/** Construit la liste de pages à afficher autour de la page courante (avec ellipses). */
function buildPageList(page: number, totalPages: number): Array<number | 'ellipsis-start' | 'ellipsis-end'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);

  const result: Array<number | 'ellipsis-start' | 'ellipsis-end'> = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - (sorted[index - 1] as number) > 1) {
      result.push(value <= page ? 'ellipsis-start' : 'ellipsis-end');
    }
    result.push(value);
  });
  return result;
}

/** Pagination compatible avec le format DRF (`count`, 20/page). */
export function Pagination({
  page,
  count,
  pageSize = 20,
  onPageChange,
  ariaLabel = 'Pagination',
  isFetching = false,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, count);
  const pages = buildPageList(page, totalPages);

  const navButtonClasses =
    'min-h-[44px] min-w-[44px] px-3 inline-flex items-center justify-center rounded-lg border border-outline-variant text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <nav
      aria-label={ariaLabel}
      aria-busy={isFetching || undefined}
      className="mt-6 flex flex-wrap items-center justify-center gap-2"
    >
      <button type="button" className={navButtonClasses} onClick={() => onPageChange(page - 1)} disabled={page <= 1 || isFetching} aria-label="Page précédente">
        ← Précédent
      </button>

      <ul className="flex flex-wrap items-center gap-1">
        {pages.map((item) =>
          typeof item === 'number' ? (
            <li key={item}>
              <button
                type="button"
                onClick={() => onPageChange(item)}
                disabled={isFetching}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Page ${item}`}
                className={cn(
                  navButtonClasses,
                  item === page && 'border-primary bg-primary text-on-primary hover:bg-primary hover:text-on-primary',
                )}
              >
                {item}
              </button>
            </li>
          ) : (
            <li key={item} aria-hidden="true" className="px-1 text-on-surface-variant">
              …
            </li>
          ),
        )}
      </ul>

      <button type="button" className={navButtonClasses} onClick={() => onPageChange(page + 1)} disabled={page >= totalPages || isFetching} aria-label="Page suivante">
        Suivant →
      </button>

      <span className="basis-full text-center text-body-sm text-on-surface-variant" aria-live="polite">
        {start}–{end} sur {count}
      </span>
    </nav>
  );
}

