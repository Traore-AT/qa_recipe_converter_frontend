import { useId } from 'react';
import { cn } from '../../lib/cn';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  /** Identifiant explicite (sinon généré automatiquement). */
  id?: string;
  className?: string;
}

/**
 * Interrupteur accessible : la case à cocher native reste dans le DOM
 * (`sr-only`) pour conserver le clavier, le rôle et l'état ; la zone tactile
 * fait au moins 44 px de haut.
 */
export function Toggle({ checked, onChange, label, disabled, id, className }: Props) {
  const generatedId = useId();
  const toggleId = id || generatedId;

  return (
    <label
      htmlFor={toggleId}
      className={cn(
        'inline-flex min-h-[44px] items-center gap-2.5 cursor-pointer select-none',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <span className="relative inline-flex h-6 w-10 shrink-0 items-center">
        <input
          id={toggleId}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
        />
        <span
          aria-hidden="true"
          className={cn(
            'h-6 w-10 rounded-full transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50',
            checked ? 'bg-primary' : 'bg-outline-variant',
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150',
            checked && 'translate-x-4',
          )}
        />
      </span>
      {label && <span className="text-body-sm text-on-surface">{label}</span>}
    </label>
  );
}

