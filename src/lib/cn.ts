import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Les tailles de texte du design system (`text-label-md`…) doivent être déclarées :
 * sinon tailwind-merge les prend pour des couleurs et supprime `text-on-primary`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [(value: string) => /^(headline|body|label|title)-(xs|sm|md|lg|base)$/.test(value)] }],
    },
  },
});

/** Fusionne des classes conditionnelles en résolvant les conflits Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
