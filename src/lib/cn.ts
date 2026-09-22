import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Concatène des classes CSS conditionnelles et dédoublonne les utilitaires
 * Tailwind en conflit (ex. `p-2 p-4` → `p-4`).
 *
 * À utiliser dans tous les composants du design system pour permettre
 * aux consommateurs de surcharger les styles sans effet de bord.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
