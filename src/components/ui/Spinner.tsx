import { cn } from '../../lib/cn';

type SpinnerSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-9 w-9',
};

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  /** Libellé lu par les lecteurs d'écran (défaut : « Chargement… »). */
  label?: string;
}

/** Indicateur de chargement accessible, à utiliser pour les actions ponctuelles. */
export function Spinner({ size = 'md', className, label = 'Chargement…' }: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex items-center', className)}>
      <svg className={cn('animate-spin text-current', sizeClasses[size])} viewBox="0 0 24 24" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
