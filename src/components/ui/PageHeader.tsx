import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** Affiche le bouton « Retour » lorsque fourni. */
  onBack?: () => void;
  actions?: ReactNode;
  className?: string;
}

/** En-tête de page homogène : retour, titre, sous-titre et actions alignées. */
export function PageHeader({ title, subtitle, onBack, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 md:mb-8', className)}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 text-body-sm text-on-surface-variant transition-colors hover:text-primary"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Retour
        </button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-headline-lg font-bold text-on-surface">{title}</h1>
          {subtitle && <div className="mt-1 text-body-base text-on-surface-variant">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
