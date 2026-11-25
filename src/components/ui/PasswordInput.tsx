import { useState, type ComponentProps, type KeyboardEvent } from 'react';
import { Input } from './Input';

/** Champ mot de passe : affichage à la demande et avertissement de verrouillage majuscule. */
export function PasswordInput({ hint, ...props }: Omit<ComponentProps<typeof Input>, 'type' | 'trailing'>) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const detectCapsLock = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState('CapsLock'));
  const label = visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe';

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      onKeyDown={detectCapsLock}
      onKeyUp={detectCapsLock}
      hint={capsLock ? 'Verrouillage des majuscules activé.' : hint}
      trailing={
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={label}
          title={label}
          aria-pressed={visible}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:text-primary"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
            <circle cx="12" cy="12" r="2.8" />
            {visible && <path d="M4 4l16 16" />}
          </svg>
        </button>
      }
    />
  );
}
