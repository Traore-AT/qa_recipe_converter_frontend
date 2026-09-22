import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface Props {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  hover?: boolean;
  onClick?: () => void;
  /** Élément HTML de rendu (par défaut `div`, ou `button` si `onClick`). */
  as?: 'div' | 'article' | 'section';
}

/**
 * Surface de contenu standard (fond, bordure, rayon, ombre).
 * Devient un `button` accessible lorsque `onClick` est fourni.
 */
export function Card({ children, className, padding = true, hover = false, onClick, as = 'div' }: Props) {
  const baseClasses = cn(
    'bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm text-left w-full',
    padding && 'p-4 sm:p-6',
    hover
      ? 'hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer'
      : 'transition-shadow duration-200',
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(baseClasses, 'block')}>
        {children}
      </button>
    );
  }

  const Tag = as;
  return <Tag className={baseClasses}>{children}</Tag>;
}

export function StatCard({
  label,
  value,
  trend,
  icon,
}: {
  label: string;
  value: string | number;
  trend?: { value: string; up: boolean };
  icon?: ReactNode;
}) {
  return (
    <Card className="flex items-center gap-4">
      {icon && (
        <div className="w-12 h-12 rounded-lg bg-primary-fixed flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-body-sm text-on-surface-variant truncate">{label}</p>
        <p className="text-headline-sm font-bold text-on-surface mt-0.5">{value}</p>
        {trend && (
          <p className={cn('text-body-sm mt-0.5 flex items-center gap-0.5', trend.up ? 'text-success' : 'text-error')}>
            <span aria-hidden="true">{trend.up ? '↑' : '↓'}</span>
            <span>{trend.value}</span>
          </p>
        )}
      </div>
    </Card>
  );
}

export function KpiCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  /** Couleur d'accent (hexadécimal) fournie par les données projet. */
  color: string;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-body-sm text-on-surface-variant truncate">{label}</p>
        <p className="text-headline-md font-bold text-on-surface leading-tight">{value}</p>
      </div>
    </div>
  );
}
