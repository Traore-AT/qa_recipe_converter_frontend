/**
 * Conventions graphiques communes (voir les jetons --chart-* de index.css).
 *
 * - séries : couleurs dans un ordre fixe (slot 1, 2, 3), jamais recalculées après un filtre ;
 * - statuts : couleurs réservées, toujours accompagnées d'une icône et d'un libellé ;
 * - un seul axe par graphique, grille en trait fin continu.
 */
export const SERIES_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)'] as const;

export const CHART_INK = 'var(--chart-ink)';
export const CHART_INK_MUTED = 'var(--chart-ink-muted)';
export const CHART_GRID = 'var(--chart-grid)';
export const CHART_AXIS = 'var(--chart-axis)';
export const CHART_SURFACE = 'var(--chart-surface)';

export const AXIS_TICK = { fontSize: 11, fill: CHART_INK_MUTED };

/** Statuts d'exécution, dans l'ordre d'affichage (vert et rouge jamais adjacents). */
export const STATUS_META = [
  { key: 'passed', status: 'Passé', label: 'Passés', color: 'var(--status-good)', icon: '✓' },
  { key: 'in_progress', status: 'En cours', label: 'En cours', color: 'var(--chart-1)', icon: '▶' },
  { key: 'blocked', status: 'Bloqué', label: 'Bloqués', color: 'var(--status-warning)', icon: '⏸' },
  { key: 'failed', status: 'Échoué', label: 'Échoués', color: 'var(--status-critical)', icon: '✕' },
  { key: 'not_run', status: 'À tester', label: 'À tester', color: 'var(--status-neutral)', icon: '○' },
] as const;

export type StatusKey = (typeof STATUS_META)[number]['key'];

/** 75.04 → « 75 % », 7.5 → « 7,5 % ». */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${Number(value.toFixed(1)).toLocaleString('fr-FR')} %`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString('fr-FR');
}
