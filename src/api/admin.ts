import client from './client';
import type {
  PaginatedResponse,
  AdminUser, AdminTeam, AdminProject, AdminJob, AdminActivity,
  AdminSummary, AdminStatistics, AdminSystem, ResetPasswordResponse,
  AdminUseCase, AdminSprint, AdminDefect, AdminReport,
} from '../types';

/**
 * API de l'espace Super-Admin (authentifiée par session, réservée aux superusers
 * côté backend — erreur 403 sinon).
 */
export const adminApi = {
  // ── Vue globale ─────────────────────────────────────────────────────────
  getSummary: () =>
    client.get<AdminSummary>('/admin/summary/').then(r => r.data),

  getStatistics: (days = 30) =>
    client.get<AdminStatistics>('/admin/statistics/', { params: { days } }).then(r => r.data),

  getSystem: () =>
    client.get<AdminSystem>('/admin/system/').then(r => r.data),

  // ── Utilisateurs ─────────────────────────────────────────────────────────
  listUsers: (params?: { search?: string; active?: string; staff?: string; page?: number }) =>
    client.get<PaginatedResponse<AdminUser>>('/admin/users/', { params }).then(r => r.data),

  createUser: (data: Record<string, unknown>) =>
    client.post<AdminUser>('/admin/users/', data).then(r => r.data),

  updateUser: (id: number, data: Record<string, unknown>) =>
    client.patch<AdminUser>(`/admin/users/${id}/`, data).then(r => r.data),

  deleteUser: (id: number) =>
    client.delete(`/admin/users/${id}/`),

  resetUserPassword: (id: number, password?: string) =>
    client.post<ResetPasswordResponse>(
      `/admin/users/${id}/reset-password/`,
      password ? { password } : {},
    ).then(r => r.data),

  // ── Équipes ─────────────────────────────────────────────────────────────
  listTeams: (params?: { search?: string; page?: number }) =>
    client.get<PaginatedResponse<AdminTeam>>('/admin/teams/', { params }).then(r => r.data),

  updateTeam: (slug: string, data: Record<string, unknown>) =>
    client.patch<AdminTeam>(`/admin/teams/${slug}/`, data).then(r => r.data),

  deleteTeam: (slug: string) =>
    client.delete(`/admin/teams/${slug}/`),

  transferTeam: (slug: string, userId: number) =>
    client.post<AdminTeam>(`/admin/teams/${slug}/transfer/`, { user_id: userId }).then(r => r.data),

  // ── Projets ─────────────────────────────────────────────────────────────
  listProjects: (params?: { search?: string; status?: string; page?: number }) =>
    client.get<PaginatedResponse<AdminProject>>('/admin/projects/', { params }).then(r => r.data),

  updateProject: (id: string, data: Record<string, unknown>) =>
    client.patch<AdminProject>(`/admin/projects/${id}/`, data).then(r => r.data),

  deleteProject: (id: string) =>
    client.delete(`/admin/projects/${id}/`),

  // ── Conversions ─────────────────────────────────────────────────────────
  listJobs: (params?: { search?: string; status?: string; page?: number }) =>
    client.get<PaginatedResponse<AdminJob>>('/admin/jobs/', { params }).then(r => r.data),

  deleteJob: (id: string) =>
    client.delete(`/admin/jobs/${id}/`),

  // ── Journal d'activité ──────────────────────────────────────────────────
  listActivity: (params?: { action_type?: string; user_id?: number; page?: number }) =>
    client.get<PaginatedResponse<AdminActivity>>('/admin/activity/', { params }).then(r => r.data),

  // ── Cas de test extraits ────────────────────────────────────────────────
  listUseCases: (params?: { search?: string; status?: string; automated?: string; project?: string; page?: number }) =>
    client.get<PaginatedResponse<AdminUseCase>>('/admin/use-cases/', { params }).then(r => r.data),

  // ── Sprints ─────────────────────────────────────────────────────────────
  listSprints: (params?: { search?: string; status?: string; page?: number }) =>
    client.get<PaginatedResponse<AdminSprint>>('/admin/sprints/', { params }).then(r => r.data),

  // ── Anomalies ───────────────────────────────────────────────────────────
  listDefects: (params?: { search?: string; status?: string; severity?: string; page?: number }) =>
    client.get<PaginatedResponse<AdminDefect>>('/admin/defects/', { params }).then(r => r.data),

  // ── Rapports hebdomadaires ──────────────────────────────────────────────
  listReports: (params?: { search?: string; status?: string; page?: number }) =>
    client.get<PaginatedResponse<AdminReport>>('/admin/reports/', { params }).then(r => r.data),
};