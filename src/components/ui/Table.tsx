import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

/**
 * Conteneur de tableau : garantit le défilement horizontal contrôlé sur mobile
 * (jamais de débordement de page) et un cadre visuel homogène.
 */
export function TableWrapper({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  /** Description lue par les lecteurs d'écran (caption masqué visuellement). */
  label?: string;
}) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border border-outline-variant', className)}>
      <table className="w-full min-w-[36rem] border-collapse text-left">{label && <caption className="sr-only">{label}</caption>}{children}</table>
    </div>
  );
}

export function THead({ children, className }: { children: ReactNode; className?: string }) {
  return <thead className={cn('bg-surface-container-low', className)}>{children}</thead>;
}

export function TBody({ children, className }: { children: ReactNode; className?: string }) {
  return <tbody className={cn('divide-y divide-outline-variant', className)}>{children}</tbody>;
}

export function TR({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn('transition-colors hover:bg-surface-container-low/60', className)}>{children}</tr>;
}

interface CellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode;
}

export function TH({ children, className, scope = 'col', ...rest }: CellProps) {
  return (
    <th
      scope={scope}
      className={cn(
        'px-4 py-3 text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant whitespace-nowrap',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode;
}

export function TD({ children, className, ...rest }: TdProps) {
  return (
    <td className={cn('px-4 py-3 text-body-sm text-on-surface align-middle', className)} {...rest}>
      {children}
    </td>
  );
}

/**
 * Vue cartes empilées d'un tableau, affichée sur mobile à la place du tableau
 * (évite le scroll horizontal subi et les colonnes tronquées).
 * Chaque carte reçoit un libellé et une valeur.
 */
export function DataCardList({
  items,
  className,
}: {
  items: Array<{ key: string; label: string; value: ReactNode; action?: ReactNode }>;
  className?: string;
}) {
  return (
    <dl className={cn('space-y-2', className)}>
      {items.map((item) => (
        <div key={item.key} className="flex items-start justify-between gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3">
          <dt className="text-label-sm uppercase tracking-wide text-on-surface-variant">{item.label}</dt>
          <dd className="min-w-0 text-right text-body-sm text-on-surface">{item.value}{item.action}</dd>
        </div>
      ))}
    </dl>
  );
}
