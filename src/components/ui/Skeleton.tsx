import { cn } from '../../lib/cn';

interface SkeletonProps {
  className?: string;
  /** Nombre de lignes à afficher (utile pour simuler du texte). */
  lines?: number;
}

/**
 * Bloc de chargement neutre (aucun spinner plein écran).
 * Les lecteurs d'écran ignorent le contenu et annoncent « Chargement… ».
 */
export function Skeleton({ className, lines }: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className="space-y-2" role="status" aria-label="Chargement…">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'h-4 rounded bg-surface-container-high animate-pulse',
              index === lines - 1 && 'w-2/3',
              className,
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Chargement…"
      className={cn('rounded bg-surface-container-high animate-pulse', className ?? 'h-4 w-full')}
    />
  );
}

/** Squelette de carte statistique (tableau de bord, listes de KPI). */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Chargement…"
      className={cn('rounded-xl border border-outline-variant bg-surface-container-lowest p-5', className)}
    >
      <div className="h-3 w-24 rounded bg-surface-container-high animate-pulse" />
      <div className="mt-3 h-6 w-16 rounded bg-surface-container-high animate-pulse" />
      <div className="mt-4 h-2 w-full rounded-full bg-surface-container-high animate-pulse" />
    </div>
  );
}

/** Squelette de liste : `rows` lignes avec avatar, libellé et valeur. */
export function SkeletonList({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Chargement de la liste…">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
        >
          <div className="h-10 w-10 shrink-0 rounded-lg bg-surface-container-high animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-surface-container-high animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-surface-container-high animate-pulse" />
          </div>
          <div className="h-6 w-20 rounded-full bg-surface-container-high animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/** Squelette de tableau (en-tête + lignes), affiché pendant le chargement. */
export function SkeletonTable({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant" role="status" aria-label="Chargement du tableau…">
      <div className="flex gap-4 bg-surface-container-low px-4 py-3">
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="h-3 flex-1 rounded bg-surface-container-high animate-pulse" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 border-t border-outline-variant px-4 py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="h-4 flex-1 rounded bg-surface-container-high animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}
