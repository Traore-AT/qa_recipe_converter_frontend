import type { ReactNode } from 'react';
import { ChartTooltipCard } from './ChartTooltip';

interface RechartsPayload {
  name?: string | number;
  value?: unknown;
  color?: string;
  dataKey?: unknown;
}

/** Adaptateur pour le `content` de l'infobulle Recharts. */
export function rechartsTooltip(options: {
  title?: (label: unknown) => ReactNode;
  format?: (value: number, key: string) => ReactNode;
  shape?: 'line' | 'square';
}) {
  return function Content({ active, payload, label }: { active?: boolean; payload?: readonly RechartsPayload[]; label?: unknown }) {
    if (!active || !payload?.length) return null;
    return (
      <ChartTooltipCard
        title={options.title ? options.title(label) : (label as ReactNode)}
        rows={payload.map(item => ({
          name: String(item.name ?? item.dataKey ?? ''),
          value: options.format ? options.format(Number(item.value), String(item.dataKey)) : String(item.value),
          color: item.color ?? 'currentColor',
          shape: options.shape,
        }))}
      />
    );
  };
}
