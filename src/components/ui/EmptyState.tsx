import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Pictogramme ou illustration (SVG de préférence). */
  icon?: ReactNode;
  /** Action de reprise proposée à l'utilisateur. */
  action?: ReactNode;
  className?: string;
}

/** État vide uniforme : titre, explication et action de reprise. */
export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
          {icon}
        </div>
      )}
      <h2 className="text-headline-sm font-semibold text-on-surface">{title}</h2>
      {description && (
        <p className="mt-2 max-w-md text-body-sm text-on-surface-variant">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
