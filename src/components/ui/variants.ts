import { cva } from 'class-variance-authority';

/**
 * Variantes visuelles des composants du design system.
 * Ce module ne contient aucun composant React : il est importable partout
 * (y compris dans des tests) sans casser le rafraîchissement à chaud.
 */

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary hover:brightness-110 shadow-sm',
        secondary:
          'bg-surface-container-low text-primary border border-outline-variant hover:bg-surface-container',
        ghost: 'bg-transparent text-on-surface-variant hover:text-primary hover:bg-surface-container-low',
        danger: 'bg-error text-on-error hover:brightness-110',
      },
      size: {
        sm: 'min-h-[36px] px-3 py-1.5 text-label-sm',
        md: 'min-h-[44px] px-4 py-2.5 text-label-md',
        lg: 'min-h-[48px] px-6 py-3 text-label-md',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export const badgeVariants = cva(
  'inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-label-sm font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-surface-container-low text-on-surface-variant',
        primary: 'bg-primary-fixed text-primary',
        success: 'bg-success-container text-on-success-container',
        warning: 'bg-warning-container text-on-warning-container',
        error: 'bg-error-container text-on-error-container',
        info: 'bg-info-container text-on-info-container',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);
