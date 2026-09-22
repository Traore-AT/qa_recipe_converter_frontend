import type { ReactNode } from 'react';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';
import { badgeVariants } from './variants';

interface Props extends VariantProps<typeof badgeVariants> {
  children: ReactNode;
  className?: string;
}

export function Badge({ children, variant, className }: Props) {
  return <span className={cn(badgeVariants({ variant }), className)}>{children}</span>;
}

