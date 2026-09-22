import { cn } from '../../lib/cn';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  /** Message d'erreur lisible (issu de `getApiErrorMessage`). */
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/** État d'erreur récupérable : message explicite + action « Réessayer ». */
export function ErrorState({
  title = 'Impossible de charger les données',
  message,
  onRetry,
  retryLabel = 'Réessayer',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-error/30 bg-error-container/40 px-6 py-10 text-center',
        className,
      )}
    >
      <span className="material-symbols-outlined text-3xl text-on-error-container" aria-hidden="true">
        error
      </span>
      <h2 className="mt-3 text-headline-sm font-semibold text-on-error-container">{title}</h2>
      {message && <p className="mt-2 max-w-md text-body-sm text-on-error-container/90">{message}</p>}
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
