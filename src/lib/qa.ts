import type { Defect, EvolutionPoint, PerformanceLevel, ScoreComponent, Sprint } from '../types';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

interface Option {
  label: string;
  variant: BadgeVariant;
}

export const SEVERITIES: Record<Defect['severity'], Option> = {
  critical: { label: 'Critique', variant: 'error' },
  major: { label: 'Majeure', variant: 'warning' },
  minor: { label: 'Mineure', variant: 'info' },
  trivial: { label: 'Triviale', variant: 'default' },
};

export const PRIORITIES: Record<Defect['priority'], string> = { high: 'Haute', medium: 'Moyenne', low: 'Basse' };

export const DEFECT_STATUS: Record<Defect['status'], Option> = {
  open: { label: 'Ouvert', variant: 'error' },
  in_progress: { label: 'En cours', variant: 'warning' },
  resolved: { label: 'Résolu', variant: 'info' },
  closed: { label: 'Fermé', variant: 'default' },
  reopened: { label: 'Réouvert', variant: 'error' },
};

export const SPRINT_STATUS_LABELS: Record<Sprint['status'], string> = {
  planned: 'Planifié',
  active: 'En cours',
  completed: 'Terminé',
  closed: 'Clôturé',
};

export const LEVEL_VARIANTS: Record<PerformanceLevel, BadgeVariant> = {
  excellent: 'success',
  good: 'info',
  average: 'warning',
  critical: 'error',
  not_evaluated: 'default',
};

export const COMPONENT_LABELS: Record<ScoreComponent, { label: string; hint: string }> = {
  pass_rate: { label: 'Réussite', hint: 'Cas passés / cas exécutés' },
  execution_rate: { label: 'Avancement', hint: 'Cas exécutés / cas prévus' },
  resolution_rate: { label: 'Résolution des anomalies', hint: 'Résolues ou fermées / total' },
  stability_rate: { label: 'Stabilité', hint: 'Cas exécutés sans régression' },
};

/** Numéro de cas tel qu'affiché partout : CAS-001. */
export const caseLabel = (caseNumber: number) => `CAS-${String(caseNumber).padStart(3, '0')}`;

const DAY = 86_400_000;
// Calcul en UTC : insensible aux changements d'heure.
const toUtc = (isoDate: string) => Date.parse(`${isoDate}T00:00:00Z`);

/** Date ISO décalée de `days` jours ; chaîne vide si la date est invalide. */
export function addDays(isoDate: string, days: number): string {
  const start = toUtc(isoDate);
  if (Number.isNaN(start) || !Number.isFinite(days)) return '';
  return new Date(start + days * DAY).toISOString().slice(0, 10);
}

/** Date du jour (fuseau de l'utilisateur) au format ISO. */
export function todayIso(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** Nombre de jours entre deux dates ISO (`null` si incomplet). */
export function daysBetween(start: string, end: string): number | null {
  const diff = (toUtc(end) - toUtc(start)) / DAY;
  return Number.isNaN(diff) ? null : Math.round(diff);
}

/** 2026-06-01 → 01/06/2026 */
export const formatDay = (isoDate: string) => isoDate.slice(0, 10).split('-').reverse().join('/');

export interface ChartSeries {
  key: keyof EvolutionPoint;
  label: string;
  color: string;
}

/** Séries validées (contraste et daltonisme) — un seul axe par graphique. */
// Couleurs de séries dans l'ordre fixe de la palette (jetons --chart-1, --chart-2 ; voir lib/chart.ts).
export const RATE_SERIES: ChartSeries[] = [
  { key: 'success_rate', label: 'Taux de réussite', color: 'var(--chart-1)' },
  { key: 'execution_rate', label: 'Avancement', color: 'var(--chart-2)' },
];
export const DEFECT_SERIES: ChartSeries[] = [
  { key: 'defects_open', label: 'Anomalies actives', color: 'var(--chart-1)' },
  { key: 'defects_resolved', label: 'Anomalies résolues (cumul)', color: 'var(--chart-2)' },
];
