import client from './client';
import type {
  Team, Project, TeamMember, ProjectMember, DashboardData,
  PaginatedResponse, TeamInvitation, ProjectProgress,
  AssignMemberInput, AssignMembersResponse,
  Sprint, SprintBoard, UseCaseAssignment, Defect, DefectStats,
  WeeklyReport, ActivityLog, UseCaseComment, MemberProgress,
  UseCaseDetail, UseCaseScreenshot,
} from '../types';

export const teamsApi = {
  listTeams: () =>
    client.get<PaginatedResponse<Team>>('/teams/').then(r => r.data),

  getTeam: (slug: string) =>
    client.get<Team>(`/teams/${slug}/`).then(r => r.data),

  createTeam: (data: FormData | { name: string; description?: string }) =>
    client.post<Team>('/teams/', data).then(r => r.data),

  updateTeam: (slug: string, data: FormData | Partial<Team>) =>
    client.patch<Team>(`/teams/${slug}/`, data).then(r => r.data),

  deleteTeam: (slug: string) =>
    client.delete(`/teams/${slug}/`),

  listMembers: (slug: string) =>
    client.get<PaginatedResponse<TeamMember>>(`/teams/${slug}/members/`).then(r => r.data),

  inviteMember: (slug: string, email: string, role: string) =>
    client.post<TeamInvitation>(`/teams/${slug}/members/`, { email, role }).then(r => r.data),

  updateMemberRole: (slug: string, userId: number, role: string) =>
    client.patch<TeamMember>(`/teams/${slug}/members/${userId}/`, { role }).then(r => r.data),

  removeMember: (slug: string, userId: number) =>
    client.delete(`/teams/${slug}/members/${userId}/`),

  getInvitation: (token: string) =>
    client.get<TeamInvitation>(`/teams/invitations/${token}/`).then(r => r.data),

  acceptInvitation: (token: string) =>
    client.post(`/teams/invitations/${token}/accept/`).then(r => r.data),

  rejectInvitation: (token: string) =>
    client.post(`/teams/invitations/${token}/reject/`).then(r => r.data),

  getDashboard: (slug: string) =>
    client.get<DashboardData>(`/teams/${slug}/dashboard/`).then(r => r.data),

  listProjects: (slug: string, params?: { status?: string; visibility?: string; page?: number }) =>
    client.get<PaginatedResponse<Project>>(`/teams/${slug}/projects/`, { params }).then(r => r.data),

  getProject: (teamSlug: string, projectSlug: string) =>
    client.get<Project>(`/teams/${teamSlug}/projects/${projectSlug}/`).then(r => r.data),

  createProject: (teamSlug: string, data: FormData | Record<string, unknown>) =>
    client.post<Project>(`/teams/${teamSlug}/projects/`, data).then(r => r.data),

  updateProject: (teamSlug: string, projectSlug: string, data: FormData | Record<string, unknown>) =>
    client.patch<Project>(`/teams/${teamSlug}/projects/${projectSlug}/`, data).then(r => r.data),

  deleteProject: (teamSlug: string, projectSlug: string) =>
    client.delete(`/teams/${teamSlug}/projects/${projectSlug}/`),

  listProjectMembers: (teamSlug: string, projectSlug: string) =>
    client.get<PaginatedResponse<ProjectMember>>(`/teams/${teamSlug}/projects/${projectSlug}/members/`).then(r => r.data),

  addProjectMember: (teamSlug: string, projectSlug: string, userId: number, role: string) =>
    client.post<ProjectMember>(`/teams/${teamSlug}/projects/${projectSlug}/members/`, { user_id: userId, role }).then(r => r.data),

  removeProjectMember: (teamSlug: string, projectSlug: string, userId: number) =>
    client.delete(`/teams/${teamSlug}/projects/${projectSlug}/members/${userId}/`),

  getProjectProgress: (teamSlug: string, projectSlug: string) =>
    client.get<ProjectProgress>(`/teams/${teamSlug}/projects/${projectSlug}/progress/`).then(r => r.data),

  assignProjectMembers: (teamSlug: string, projectSlug: string, members: AssignMemberInput[]) =>
    client.post<AssignMembersResponse>(`/teams/${teamSlug}/projects/${projectSlug}/assign-members/`, { members }).then(r => r.data),

  downloadDailyScrum: (teamSlug: string) =>
    client.get(`/teams/${teamSlug}/reports/daily-scrum/`, { responseType: 'blob' }).then(r => r.data),

  downloadWeeklyReport: (teamSlug: string) =>
    client.get(`/teams/${teamSlug}/reports/weekly/`, { responseType: 'blob' }).then(r => r.data),

  // ── Sprints ────────────────────────────────────────────────────────────────
  listSprints: (teamSlug: string, projectSlug: string, params?: { status?: string }) =>
    client.get<PaginatedResponse<Sprint>>(`/teams/${teamSlug}/projects/${projectSlug}/sprints/`, { params }).then(r => r.data),

  getSprint: (teamSlug: string, projectSlug: string, sprintId: string) =>
    client.get<Sprint>(`/teams/${teamSlug}/projects/${projectSlug}/sprints/${sprintId}/`).then(r => r.data),

  createSprint: (teamSlug: string, projectSlug: string, data: Record<string, unknown>) =>
    client.post<Sprint>(`/teams/${teamSlug}/projects/${projectSlug}/sprints/`, data).then(r => r.data),

  updateSprint: (teamSlug: string, projectSlug: string, sprintId: string, data: Record<string, unknown>) =>
    client.patch<Sprint>(`/teams/${teamSlug}/projects/${projectSlug}/sprints/${sprintId}/`, data).then(r => r.data),

  deleteSprint: (teamSlug: string, projectSlug: string, sprintId: string) =>
    client.delete(`/teams/${teamSlug}/projects/${projectSlug}/sprints/${sprintId}/`),

  getSprintBoard: (teamSlug: string, projectSlug: string, sprintId: string) =>
    client.get<SprintBoard>(`/teams/${teamSlug}/projects/${projectSlug}/sprints/${sprintId}/board/`).then(r => r.data),

  // ── Use Case Assignments ───────────────────────────────────────────────────
  listAssignments: (teamSlug: string, projectSlug: string, params?: { sprint?: string; user_id?: number }) =>
    client.get<PaginatedResponse<UseCaseAssignment>>(`/teams/${teamSlug}/projects/${projectSlug}/assignments/`, { params }).then(r => r.data),

  createAssignments: (teamSlug: string, projectSlug: string, data: { use_case_ids: string[]; sprint_id?: string | null; user_id: number }) =>
    client.post(`/teams/${teamSlug}/projects/${projectSlug}/assignments/`, data).then(r => r.data),

  deleteAssignment: (teamSlug: string, projectSlug: string, assignmentId: string) =>
    client.delete(`/teams/${teamSlug}/projects/${projectSlug}/assignments/${assignmentId}/`),

  getUnassignedUseCases: (teamSlug: string, projectSlug: string) =>
    client.get<PaginatedResponse<{ id: string; order: number; use_case_text: string; description: string; status: string }>>(
      `/teams/${teamSlug}/projects/${projectSlug}/unassigned-ucs/`
    ).then(r => r.data),

  // ── Use Case Execution ─────────────────────────────────────────────────────
  updateUseCaseStatus: (teamSlug: string, projectSlug: string, ucId: string, status: string, observedResults?: string) =>
    client.patch(`/teams/${teamSlug}/projects/${projectSlug}/use-cases/${ucId}/status/`, { status, observed_results: observedResults }).then(r => r.data),

  listUseCaseComments: (teamSlug: string, projectSlug: string, ucId: string) =>
    client.get<PaginatedResponse<UseCaseComment>>(`/teams/${teamSlug}/projects/${projectSlug}/use-cases/${ucId}/comments/`).then(r => r.data),

  createUseCaseComment: (teamSlug: string, projectSlug: string, ucId: string, content: string) =>
    client.post<UseCaseComment>(`/teams/${teamSlug}/projects/${projectSlug}/use-cases/${ucId}/comments/`, { content }).then(r => r.data),

  // ── Defects ────────────────────────────────────────────────────────────────
  listDefects: (teamSlug: string, projectSlug: string, params?: { status?: string; severity?: string; priority?: string; assigned_to?: string; page?: number }) =>
    client.get<PaginatedResponse<Defect>>(`/teams/${teamSlug}/projects/${projectSlug}/defects/`, { params }).then(r => r.data),

  getDefect: (teamSlug: string, projectSlug: string, defectId: string) =>
    client.get<Defect>(`/teams/${teamSlug}/projects/${projectSlug}/defects/${defectId}/`).then(r => r.data),

  createDefect: (teamSlug: string, projectSlug: string, data: FormData | Record<string, unknown>) =>
    client.post<Defect>(`/teams/${teamSlug}/projects/${projectSlug}/defects/`, data).then(r => r.data),

  updateDefect: (teamSlug: string, projectSlug: string, defectId: string, data: FormData | Record<string, unknown>) =>
    client.patch<Defect>(`/teams/${teamSlug}/projects/${projectSlug}/defects/${defectId}/`, data).then(r => r.data),

  deleteDefect: (teamSlug: string, projectSlug: string, defectId: string) =>
    client.delete(`/teams/${teamSlug}/projects/${projectSlug}/defects/${defectId}/`),

  getDefectStats: (teamSlug: string, projectSlug: string) =>
    client.get<DefectStats>(`/teams/${teamSlug}/projects/${projectSlug}/defects/stats/`).then(r => r.data),

  // ── Weekly Reports ─────────────────────────────────────────────────────────
  listWeeklyReports: (teamSlug: string, params?: { user_id?: number }) =>
    client.get<PaginatedResponse<WeeklyReport>>(`/teams/${teamSlug}/weekly-reports/`, { params }).then(r => r.data),

  getCurrentWeeklyReport: (teamSlug: string) =>
    client.get<WeeklyReport>(`/teams/${teamSlug}/weekly-reports/current/`).then(r => r.data),

  getWeeklyReport: (teamSlug: string, reportId: string) =>
    client.get<WeeklyReport>(`/teams/${teamSlug}/weekly-reports/${reportId}/`).then(r => r.data),

  saveWeeklyReport: (teamSlug: string, data: Record<string, unknown>) =>
    client.post<WeeklyReport>(`/teams/${teamSlug}/weekly-reports/`, data).then(r => r.data),

  updateWeeklyReport: (teamSlug: string, reportId: string, data: Record<string, unknown>) =>
    client.patch<WeeklyReport>(`/teams/${teamSlug}/weekly-reports/${reportId}/`, data).then(r => r.data),

  // ── Member Progress ────────────────────────────────────────────────────────
  getMemberProgress: (teamSlug: string, projectSlug: string) =>
    client.get<PaginatedResponse<MemberProgress>>(`/teams/${teamSlug}/projects/${projectSlug}/member-progress/`).then(r => r.data),

  // ── Activity / Notifications ───────────────────────────────────────────────
  getNotifications: () =>
    client.get<{ results: ActivityLog[]; unread_count: number }>('/notifications/').then(r => r.data),

  markNotificationRead: (notificationId: string) =>
    client.patch(`/notifications/${notificationId}/read/`).then(r => r.data),

  markAllNotificationsRead: () =>
    client.post('/notifications/mark-all-read/').then(r => r.data),

  getTeamActivity: (teamSlug: string) =>
    client.get<PaginatedResponse<ActivityLog>>(`/teams/${teamSlug}/activity/`).then(r => r.data),

  getProjectActivity: (teamSlug: string, projectSlug: string) =>
    client.get<PaginatedResponse<ActivityLog>>(`/teams/${teamSlug}/projects/${projectSlug}/activity/`).then(r => r.data),

  // ── Use Case Detail ──────────────────────────────────────────────────────────
  getUseCaseDetail: (teamSlug: string, projectSlug: string, assignmentId: string) =>
    client.get<UseCaseDetail>(`/teams/${teamSlug}/projects/${projectSlug}/assignments/${assignmentId}/detail/`).then(r => r.data),

  // ── Screenshots ───────────────────────────────────────────────────────────────
  listScreenshots: (teamSlug: string, projectSlug: string, assignmentId: string) =>
    client.get<PaginatedResponse<UseCaseScreenshot>>(`/teams/${teamSlug}/projects/${projectSlug}/assignments/${assignmentId}/screenshots/`).then(r => r.data),

  uploadScreenshot: (teamSlug: string, projectSlug: string, assignmentId: string, formData: FormData) =>
    client.post<UseCaseScreenshot>(`/teams/${teamSlug}/projects/${projectSlug}/assignments/${assignmentId}/screenshots/`, formData).then(r => r.data),

  deleteScreenshot: (teamSlug: string, projectSlug: string, assignmentId: string, screenshotId: string) =>
    client.delete(`/teams/${teamSlug}/projects/${projectSlug}/assignments/${assignmentId}/screenshots/${screenshotId}/`).then(r => r.data),

  // ── CSV Export ────────────────────────────────────────────────────────────────
  exportSprintCSV: (teamSlug: string, projectSlug: string, sprintId: string) =>
    client.get(`/teams/${teamSlug}/projects/${projectSlug}/sprints/${sprintId}/export/csv/`, { responseType: 'blob' }).then(r => {
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement('a');
      link.href = url;
      const disposition = r.headers['content-disposition'];
      const match = disposition?.match(/filename="?([^";\n]+)"?/);
      link.download = match?.[1] || `sprint_${sprintId}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    }),
};
