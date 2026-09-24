export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  date_joined: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
}

export interface TeamMember {
  id: string;
  user: User;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string;
  owner: User;
  avatar_url: string | null;
  members_count: number;
  my_role: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamInvitation {
  id: string;
  token: string;
  team_name: string;
  team_slug: string;
  invited_by: User;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
  expires_at: string;
}

export interface ProjectStats {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  not_run: number;
  automated: number;
  success_rate: number;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  team_slug: string;
  team_name: string;
  created_by: User;
  avatar_url: string | null;
  icon: string;
  color: string;
  visibility: 'private' | 'team' | 'public';
  status: 'active' | 'archived' | 'completed';
  stats: ProjectStats;
  my_role: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  user: User;
  role: 'lead' | 'tester' | 'viewer';
  added_at: string;
}

export interface DashboardData {
  team: Team;
  stats: {
    projects_total: number;
    projects_active: number;
    projects_archived: number;
    projects_completed: number;
    use_cases_total: number;
    use_cases_passed: number;
    success_rate: number;
    members_count: number;
  };
  projects: Project[];
  members: TeamMember[];
  recent_activity: RecentActivity[];
}

export interface RecentActivity {
  type: 'conversion';
  job_id: string;
  filename: string;
  project: string | null;
  use_cases_count: number;
  status: string;
  date: string;
}

export interface ExtractedUseCaseComment {
  id: string;
  author: number;
  author_full_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ExtractedUseCase {
  id: string;
  order: number;
  use_case_text: string;
  description: string;
  preconditions: string;
  steps: string;
  expected_results: string;
  observed_results: string;
  is_automated: boolean;
  status: string;
  jira_ticket?: string;
  comments?: ExtractedUseCaseComment[];
}

export interface ConversionJob {
  id: string;
  created_at: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  source_filename: string;
  use_cases_count: number;
  error_message: string;
  company_name?: string;
  excel_filename?: string;
  company_logo?: string | null;
  use_cases?: ExtractedUseCase[];
  effective_excel_filename?: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
}

// ── Recherche fichiers locale (F08) ─────────────────────────────────────────
export interface FileSearchResult {
  name: string;
  path: string;
  size: number;
  size_human: string;
  extension: string;
}

export interface FileSearchResponse {
  results: FileSearchResult[];
  count?: number;
  error?: string;
}

export interface ProjectProgress {
  project: Project;
  use_cases: ExtractedUseCase[];
  status_counts: {
    'À tester': number;
    'En cours': number;
    'Passé': number;
    'Échoué': number;
    'Bloqué': number;
    total: number;
    automated: number;
  };
  members: ProjectMember[];
}

export interface AssignMemberInput {
  user_id: number;
  role: 'lead' | 'tester' | 'viewer';
}

export interface AssignMembersResponse {
  added: Array<{ user_id: number; role: string }>;
  count: number;
}

export interface BulkStatusUpdatePayload {
  uc_ids: string[];
  status: string;
}

export interface BulkStatusUpdateResponse {
  updated: number;
  status: string;
}

// ── Sprint ──────────────────────────────────────────────────────────────────
export interface SprintStats {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  in_progress: number;
  not_run: number;
  progress_pct: number;
}

export interface Sprint {
  id: string;
  project: string;
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  status: 'planned' | 'active' | 'completed' | 'closed';
  created_by: User;
  duration_days: number;
  stats: SprintStats;
  created_at: string;
  updated_at: string;
}

export interface SprintBoard {
  sprint: Sprint;
  columns: Record<string, UseCaseAssignment[]>;
  stats: SprintStats;
}

// ── Use Case Assignment ─────────────────────────────────────────────────────
export interface UseCaseAssignment {
  id: string;
  use_case: string;
  use_case_order: number;
  use_case_id_str: string;
  use_case_desc: string;
  jira_ticket?: string;
  jira_url?: string | null;
  sprint: string | null;
  assigned_to: string;
  assigned_to_user: User;
  assigned_by: string | null;
  assigned_by_user: User | null;
  assigned_at: string;
  status: string;
}

// ── Defect ──────────────────────────────────────────────────────────────────
export interface Defect {
  id: string;
  use_case: string | null;
  project: string;
  title: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'trivial';
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
  reported_by: number;
  reported_by_user: User;
  assigned_to: number | null;
  assigned_to_user: User | null;
  steps_to_reproduce: string;
  expected_behavior: string;
  actual_behavior: string;
  environment: string;
  attachment: string | null;
  created_at: string;
  updated_at: string;
}

export interface DefectStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  critical: number;
  major: number;
  minor: number;
  by_severity: Record<string, number>;
  by_priority: Record<string, number>;
}

// ── Weekly Report ───────────────────────────────────────────────────────────
export interface WeeklyReport {
  id: string;
  user: User;
  team: string;
  week_start: string;
  week_end: string;
  week_label: string;
  accomplishments: string;
  blockers: string;
  next_week_plans: string;
  additional_notes: string;
  status: 'draft' | 'submitted';
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Activity / Notification ─────────────────────────────────────────────────
export interface ActivityLog {
  id: string;
  project: string | null;
  team: string | null;
  actor: User;
  action_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  is_read: boolean;
}

// ── Use Case Comment ────────────────────────────────────────────────────────
export interface UseCaseComment {
  id: string;
  use_case: string;
  author: User;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface UseCaseScreenshot {
  id: string;
  assignment: string;
  image: string;
  caption: string;
  uploaded_by: number;
  uploaded_by_user: User;
  uploaded_at: string;
}

export interface UseCaseDetail {
  assignment: UseCaseAssignment;
  use_case: ExtractedUseCase;
  screenshots: UseCaseScreenshot[];
  comments: UseCaseComment[];
}

// ── Member Progress ─────────────────────────────────────────────────────────
export interface MemberProgress {
  user: User;
  total_ucs: number;
  passed: number;
  failed: number;
  blocked: number;
  in_progress: number;
  not_run: number;
  progress_pct: number;
  assigned_ucs: UseCaseAssignment[];
}

// ── Super-Admin ─────────────────────────────────────────────────────────────
export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  last_login: string | null;
  date_joined: string;
  teams_count: number;
  projects_count: number;
}

export interface AdminTeam {
  id: string;
  name: string;
  slug: string;
  description: string;
  owner: User;
  members: User[];
  members_count: number;
  projects_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminProject {
  id: string;
  name: string;
  slug: string;
  description: string;
  team_name: string;
  team_slug: string;
  created_by: User;
  visibility: 'private' | 'team' | 'public';
  status: 'active' | 'archived' | 'completed';
  color: string;
  stats: ProjectStats;
  defects_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminJob {
  id: string;
  source_filename: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'ERROR';
  uploaded_by: User;
  project: string | null;
  project_name: string | null;
  team_name: string | null;
  use_cases_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminActivity {
  id: string;
  project: string | null;
  project_title: string | null;
  team: string | null;
  team_name: string | null;
  actor: User;
  action_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  is_read: boolean;
}

export interface AdminSummary {
  users: { total: number; active: number; admins: number; recent: number };
  teams: { total: number; new_24h: number };
  projects: { total: number; active: number; archived: number };
  jobs: { total: number; pending: number; processing: number; done: number; error: number; recent_24h: number };
  use_cases: {
    total: number; passed: number; failed: number; blocked: number;
    in_progress: number; automated: number; success_rate: number;
  };
  defects: { total: number; open: number; critical: number; resolved: number };
  sprints: { total: number; active: number };
  reports: { total: number; submitted: number };
  activity: number;
  storage: {
    media: { total_files: number; total_bytes: number; total_bytes_human: string; categories: Record<string, number> };
    database: { bytes: number; bytes_human: string };
  };
  recent_activity: AdminActivity[];
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface AdminStatistics {
  users: DailyCount[];
  conversions: DailyCount[];
  teams: DailyCount[];
  projects: DailyCount[];
  jobs_by_status: Array<{ status: string; count: number }>;
  uc_by_status: Array<{ status: string; count: number }>;
  defects_by_status: Array<{ status: string; count: number }>;
  defects_by_severity: Array<{ severity: string; count: number }>;
}

export interface AdminSystem {
  media: {
    total_files: number;
    total_bytes: number;
    total_bytes_human: string;
    categories: Record<string, number>;
  };
  database: { bytes: number; bytes_human: string };
}

export interface AdminUseCase {
  id: string;
  order: number;
  use_case_text: string;
  description: string;
  status: string;
  is_automated: boolean;
  job: string;
  source_filename: string | null;
  project_id: string | null;
  project_name: string | null;
  team_name: string | null;
  assigned_users: string[];
}

export interface AdminSprint {
  id: string;
  name: string;
  goal: string;
  status: 'planned' | 'active' | 'completed' | 'closed';
  project: string;
  project_name: string;
  project_slug: string;
  team_name: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  stats: {
    total: number; passed: number; failed: number; blocked: number;
    in_progress: number; not_run: number; progress_pct: number;
  };
  created_at: string;
}

export interface AdminDefect {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
  severity: 'critical' | 'major' | 'minor' | 'trivial';
  priority: 'high' | 'medium' | 'low';
  project: string;
  project_name: string;
  team_name: string;
  use_case: string | null;
  use_case_order: number | null;
  reported_by: User;
  assigned_to: User | null;
  created_at: string;
  updated_at: string;
}

export interface AdminReport {
  id: string;
  user: User;
  team: string;
  team_name: string;
  week_start: string;
  week_end: string;
  status: 'draft' | 'submitted';
  submitted_at: string | null;
  created_at: string;
}

export interface ResetPasswordResponse {
  detail: string;
  temp_password?: string;
}
