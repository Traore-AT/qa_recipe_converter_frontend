import { describe, expect, it } from 'vitest';
import { cn } from './cn';
import { badgeVariants, buttonVariants } from '../components/ui/variants';

describe('cn', () => {
  it('keeps both the text colour and the design-system text size', () => {
    expect(cn('text-on-primary', 'text-label-md')).toBe('text-on-primary text-label-md');
    expect(cn(buttonVariants())).toContain('text-on-primary');
    expect(cn(badgeVariants({ variant: 'error' }))).toContain('text-label-sm');
  });

  it('still resolves real conflicts', () => {
    expect(cn('text-label-sm', 'text-label-md')).toBe('text-label-md');
    expect(cn('text-error', 'text-on-primary')).toBe('text-on-primary');
  });
});
