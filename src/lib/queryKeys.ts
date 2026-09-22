import type { QueryClient } from '@tanstack/react-query';

/**
 * Fabrique centralisée des clés TanStack Query.
 *
 * Une seule source de vérité par domaine métier : toutes les vues qui lisent
 * la même ressource partagent donc le même cache et les invalidations sont
 * coordonnées (fin des doublons `['jobs']` / `['jobs','list',1]`).
 *
 * Les tableaux retournés gardent exactement les mêmes valeurs que les clés
 * historiques afin de préserver les tests et le cache existant.
 */
export const queryKeys = {
  // ── Conversion / recettes ─────────────────────────────────────────────────
  jobs: {
    /** Racine : invalide toutes les listes de recettes / suites. */
    all: ['jobs'] as const,
    list: (page: number) => ['jobs', 'list', page] as const,
  },
  job: (id?: string) => ['job', id] as const,

  // ── Équipes & projets ─────────────────────────────────────────────────────
  teams: ['teams'] as const,
  teamMembers: (teamSlug?: string) => ['team-members', teamSlug] as const,
  dashboard: (teamSlug?: string) => ['dashboard', teamSlug] as const,
  projects: (teamSlug?: string, page?: number) => ['projects', teamSlug, page ?? 1] as const,
  /** Racine de la liste des projets : invalide toutes les pages. */
  projectsRoot: (teamSlug?: string) => ['projects', teamSlug] as const,
  project: (teamSlug?: string, projectSlug?: string) => ['project', teamSlug, projectSlug] as const,
  projectMembers: (teamSlug?: string, projectSlug?: string) =>
    ['project-members', teamSlug, projectSlug] as const,
  projectJobs: (teamSlug?: string, projectSlug?: string) =>
    ['project-jobs', teamSlug, projectSlug] as const,
  invitation: (token?: string) => ['invitation', token] as const,

  // ── Suivi QA ──────────────────────────────────────────────────────────────
  sprints: (teamSlug?: string, projectSlug?: string) => ['sprints', teamSlug, projectSlug] as const,
  sprintBoard: (teamSlug?: string, projectSlug?: string, sprintId?: string) =>
    ['sprint-board', teamSlug, projectSlug, sprintId] as const,
  unassignedUcs: (teamSlug?: string, projectSlug?: string) =>
    ['unassigned-ucs', teamSlug, projectSlug] as const,
  ucDetail: (teamSlug?: string, projectSlug?: string, assignmentId?: string | null) =>
    ['uc-detail', teamSlug, projectSlug, assignmentId] as const,
  defects: (teamSlug?: string, projectSlug?: string, status?: string, page?: number) =>
    ['defects', teamSlug, projectSlug, status ?? 'all', page ?? 1] as const,
  /** Racine de la liste des défauts : invalide toutes les vues filtrées. */
  defectsRoot: (teamSlug?: string, projectSlug?: string) =>
    ['defects', teamSlug, projectSlug] as const,
  defectStats: (teamSlug?: string, projectSlug?: string) =>
    ['defect-stats', teamSlug, projectSlug] as const,
  memberProgress: (teamSlug?: string, projectSlug?: string) =>
    ['member-progress', teamSlug, projectSlug] as const,
  weeklyReports: (teamSlug?: string) => ['weekly-reports', teamSlug] as const,
  weeklyReportCurrent: (teamSlug?: string) => ['weekly-report-current', teamSlug] as const,

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: ['notifications'] as const,
  activity: (teamSlug?: string, projectSlug?: string) => ['activity', teamSlug, projectSlug] as const,
  fileSearch: (query: string, extensions?: string[]) => ['file-search', query, ...(extensions ?? [])] as const,

  // ── Super-Admin ──────────────────────────────────────────────────────────
  admin: {
    root: ['admin'] as const,
    summary: () => ['admin', 'summary'] as const,
    statistics: (days?: number) => ['admin', 'statistics', days ?? 30] as const,
    system: () => ['admin', 'system'] as const,
    usersRoot: ['admin', 'users'] as const,
    users: (page?: number, filters?: Pick<AdminListFilters, 'search' | 'active' | 'staff'>) =>
      ['admin', 'users', page ?? 1, filters?.search ?? '', filters?.active ?? '', filters?.staff ?? ''] as const,
    teamsRoot: ['admin', 'teams'] as const,
    teams: (page?: number, search?: string) => ['admin', 'teams', page ?? 1, search ?? ''] as const,
    team: (slug?: string) => ['admin', 'team', slug] as const,
    projectsRoot: ['admin', 'projects'] as const,
    projects: (page?: number, status?: string, search?: string) =>
      ['admin', 'projects', page ?? 1, status ?? '', search ?? ''] as const,
    project: (id?: string) => ['admin', 'project', id] as const,
    jobsRoot: ['admin', 'jobs'] as const,
    jobs: (page?: number, status?: string, search?: string) =>
      ['admin', 'jobs', page ?? 1, status ?? '', search ?? ''] as const,
    job: (id?: string) => ['admin', 'job', id] as const,
    activityRoot: ['admin', 'activity'] as const,
    activity: (page?: number, actionType?: string, userId?: number) =>
      ['admin', 'activity', page ?? 1, actionType ?? '', userId ?? ''] as const,
    useCasesRoot: ['admin', 'use-cases'] as const,
    useCases: (page?: number, status?: string, search?: string) =>
      ['admin', 'use-cases', page ?? 1, status ?? '', search ?? ''] as const,
    sprintsRoot: ['admin', 'sprints'] as const,
    sprints: (page?: number, status?: string, search?: string) =>
      ['admin', 'sprints', page ?? 1, status ?? '', search ?? ''] as const,
    defectsRoot: ['admin', 'defects'] as const,
    defects: (page?: number, status?: string, severity?: string, search?: string) =>
      ['admin', 'defects', page ?? 1, status ?? '', severity ?? '', search ?? ''] as const,
    reportsRoot: ['admin', 'reports'] as const,
    reports: (page?: number, status?: string, search?: string) =>
      ['admin', 'reports', page ?? 1, status ?? '', search ?? ''] as const,
  },
};

/** Filtres communs des listes super-admin. */
export interface AdminListFilters {
  search?: string;
  active?: string;
  staff?: string;
  status?: string;
}

/**
 * Invalidation centralisée après mutation d'une conversion : les listes
 * paginées, le détail affiché et les tableaux de bord sont rafraîchis ensemble.
 */
export function invalidateJobs(queryClient: QueryClient, jobId?: string): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
  if (jobId) queryClient.invalidateQueries({ queryKey: queryKeys.job(jobId) });
}

/** Invalidation des vues projet touchées par une mutation de suivi QA. */
export function invalidateProjectScope(
  queryClient: QueryClient,
  teamSlug?: string,
  projectSlug?: string,
): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.project(teamSlug, projectSlug) });
  queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers(teamSlug, projectSlug) });
  queryClient.invalidateQueries({ queryKey: queryKeys.defectStats(teamSlug, projectSlug) });
  queryClient.invalidateQueries({ queryKey: queryKeys.memberProgress(teamSlug, projectSlug) });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(teamSlug) });
}
