import type { DailyCount } from '../types';

/** Complète une série quotidienne avec les jours manquants (zéro-filling) pour les graphes. */
export function fillDateSeries(data: DailyCount[], days: number): DailyCount[] {
  const counts = new Map(data.map((item) => [item.date, item.count]));
  const result: DailyCount[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    result.push({ date: d.toISOString().slice(0, 10), count: counts.get(d.toISOString().slice(0, 10)) ?? 0 });
  }
  return result;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR');
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('fr-FR');
}

export const JOB_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  PROCESSING: 'En cours',
  DONE: 'Terminé',
  ERROR: 'Erreur',
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  archived: 'Archivé',
  completed: 'Terminé',
};

export const UC_STATUS_LABELS: Record<string, string> = {
  'À tester': 'À tester',
  'En cours': 'En cours',
  'Passé': 'Passé',
  'Échoué': 'Échoué',
  'Bloqué': 'Bloqué',
};

/** Statut affiché en français pour une colonne `status` de défaut. */
export const DEFECT_STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  resolved: 'Résolu',
  closed: 'Fermé',
  reopened: 'Réouvert',
};

/** Sévérité d'une anomalie, affichée en français. */
export const DEFECT_SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critique',
  major: 'Majeure',
  minor: 'Mineure',
  trivial: 'Triviale',
};

/** Priorité d'une anomalie, affichée en français. */
export const DEFECT_PRIORITY_LABELS: Record<string, string> = {
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
};

/** Statut d'un sprint, affiché en français. */
export const SPRINT_STATUS_LABELS: Record<string, string> = {
  planned: 'Planifié',
  active: 'En cours',
  completed: 'Terminé',
  closed: 'Clôturé',
};

/** Statut d'un rapport hebdomadaire, affiché en français. */
export const REPORT_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  submitted: 'Soumis',
};

/** Initiale d'un nom (avatar) — repli sur « ? » si absent. */
export function getInitial(name?: string | null): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}