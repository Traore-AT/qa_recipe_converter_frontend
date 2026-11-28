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
  in_progress?: number;
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
  /** Droits effectifs de l'utilisateur connecté (rôle d'équipe inclus). */
  can_manage?: boolean;
  can_write?: boolean;
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
  case_number: number;
  ticket_number: string;
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
  kind?: 'standard' | 'regression';
  report_sent_at?: string | null;
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
  ticket_number: string;
  use_case_order: number;
  case_number: number;
  use_case_id_str: string;
  use_case_desc: string;
  use_case_text: string;
  description: string;
  preconditions: string;
  steps: string;
  expected_results: string;
  observed_results: string;
  jira_ticket?: string;
  jira_url?: string | null;
  sprint: string | null;
  assigned_to: string | null;
  assigned_to_user: User | null;
  assigned_by: string | null;
  assigned_by_user: User | null;
  assigned_at: string;
  status: string;
  defects?: LinkedDefect[];
  open_defects_count?: number;
  carried_from_name?: string | null;
  is_regression?: boolean;
  /** Autres sprints contenant ce cas, avec son résultat dans chacun. */
  other_sprints?: OtherSprint[];
}

export interface OtherSprint {
  id: string;
  name: string;
  status: Sprint['status'];
  case_status: string;
}

/** Vérification d'une référence Jira (format PROJET-123, existence si Jira est configuré). */
export interface JiraTicketCheck {
  ticket: string;
  valid_format: boolean;
  exists: boolean | null;
  summary: string;
}

export interface JiraValidation {
  jira_checked: boolean;
  error: string;
  results: JiraTicketCheck[];
}

/** Aperçu d'import dans un sprint : analyse + doublons détectés ligne par ligne. */
export interface SprintImportPreview extends ImportAnalysis {
  rows: Array<{ row: number; title: string; jira_ticket: string; duplicate_of: number | null; duplicate_row: number | null }>;
  new_cases: number;
  duplicates: number;
  sprint: { id: string; name: string };
}

export interface SprintImportResult {
  imported: number;
  skipped: SprintImportPreview['rows'];
  job_id: string;
  assignment_ids: string[];
  case_numbers: number[];
  distribution: Array<{ user_id: number; username: string; full_name: string; count: number }>;
}

/** Aperçu d'import d'un document Word (rien n'est enregistré). */
export interface ImportAnalysis {
  tables: Array<{
    index: number;
    columns: Array<{ header: string; field: string | null; label: string | null }>;
    rows: number;
    skipped_rows: number;
    ignored: string;
  }>;
  total_cases: number;
  fields: string[];
  jira_column: boolean;
  with_jira: number;
  invalid_jira: Array<{ row: number; ticket: string }>;
  warnings: string[];
  sample: Array<Record<'use_case_text' | 'description' | 'preconditions' | 'steps' | 'expected_results' | 'observed_results' | 'jira_ticket', string>>;
}

/** Membre de l'équipe pouvant recevoir des cas de test. */
export interface AssignableMember {
  user: User;
  team_role: string;
  project_member_id: string | null;
  in_project: boolean;
}

// ── Defect ──────────────────────────────────────────────────────────────────
export interface LinkedDefect {
  id: string;
  ticket_number: string;
  title: string;
  severity: Defect['severity'];
  status: Defect['status'];
  is_regression?: boolean;
}

export interface CaseSummary {
  id: string;
  case_number: number;
  title: string;
  status: string;
}

export interface Defect {
  id: string;
  ticket_number: string;
  sprint: string | null;
  sprint_name: string | null;
  use_case: string | null;
  use_case_detail: CaseSummary | null;
  related_use_cases: string[];
  related_cases: CaseSummary[];
  is_regression: boolean;
  regression_of: string | null;
  regression_of_ticket: string | null;
  resolution: string;
  resolved_at: string | null;
  closed_at: string | null;
  reopen_count: number;
  jira_key?: string | null;
  jira_url?: string | null;
  jira_sync_error?: string;
  comments_count: number;
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

export interface DefectComment {
  id: string;
  defect: string;
  /** Nul pour un commentaire venu de Jira (voir `external_author`). */
  author: User | null;
  external_author?: string;
  content: string;
  created_at: string;
}

export interface DefectHistoryEntry {
  id: string;
  actor: User | null;
  field: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

export interface QaSettings {
  alert_on_regression: boolean;
  alert_on_critical_defect: boolean;
  auto_report_on_close: boolean;
  jira_enabled: boolean;
  jira_project_key: string;
  jira_issue_type: string;
  jira_import: boolean;
  jira_configured: boolean;
  can_edit_jira: boolean;
  recipients_count: number;
  updated_at: string;
}

export interface CarryOverCase {
  use_case: string;
  case_number: number;
  title: string;
  status: string;
  assigned_to: string | null;
}

export interface CarryOverPayload {
  target_sprint?: string;
  new_sprint?: { name: string; start_date: string; duration_days: number };
  case_ids: string[];
  include_failed: boolean;
  close_source: boolean;
}

export interface TestImportResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  unmatched: string[];
  unmatched_count: number;
  outside_sprint: number[];
  applied: boolean;
  updated: number;
  defects_created: number;
  cases: Array<{ use_case: string; case_number: number; title: string; old_status: string; new_status: string; tests: number; message: string }>;
}

export interface Regression {
  use_case: string;
  case_number: number;
  title: string;
  current_status: string;
  is_active: boolean;
  occurrences: number;
  last_detected_at: string;
  detected_by: string | null;
  sprint: string | null;
  sprint_name: string | null;
  defects: LinkedDefect[];
}

// ── Performance, évolution, rapports ────────────────────────────────────────
export type PerformanceLevel = 'excellent' | 'good' | 'average' | 'critical' | 'not_evaluated';

export interface CaseStats {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  in_progress: number;
  not_run: number;
  executed: number;
  execution_rate: number;
  success_rate: number;
  pass_rate: number;
}

export interface SprintSummary {
  id: string;
  name: string;
  status: Sprint['status'];
  status_label: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  stats: CaseStats;
  defects: DefectStats;
  regressed_cases: number;
  score: number | null;
  level: PerformanceLevel;
  level_label: string;
}

export type ScoreComponent = 'pass_rate' | 'execution_rate' | 'resolution_rate' | 'stability_rate';

export interface Performance {
  score: number | null;
  level: PerformanceLevel;
  level_label: string;
  components: Record<ScoreComponent, number>;
  weights: Record<ScoreComponent, number>;
  stats: CaseStats;
  defects: DefectStats;
  regressed_cases: number;
  automation_rate: number;
  automated: number;
  defect_density: number;
}

export interface ProjectPerformance extends Performance {
  sprints: SprintSummary[];
}

export interface EvolutionPoint {
  date: string;
  total: number;
  passed: number;
  failed: number;
  success_rate: number;
  execution_rate: number;
  regressions: number;
  defects_created: number;
  defects_resolved: number;
  defects_open: number;
}

export interface Evolution {
  granularity: 'day' | 'week';
  start: string;
  end: string;
  trend: number;
  points: EvolutionPoint[];
}

/** Aperçu du rapport global : niveau de chaque projet choisi et de l'ensemble. */
export interface Portfolio {
  team: { name: string; slug: string };
  performance: Performance;
  projects: Array<{ id: string; name: string; slug: string; status: string; status_label: string; sprints: number; performance: Performance }>;
}

export interface TeamPerformanceRow {
  project: Pick<Project, 'id' | 'name' | 'slug' | 'color' | 'status'>;
  performance: Performance;
  trend: number;
  evolution: Array<{ date: string; success_rate: number; execution_rate: number }>;
}

export interface DefectStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  reopened?: number;
  active?: number;
  regressions?: number;
  resolution_rate?: number;
  avg_resolution_days?: number | null;
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
  /** Nul pour une action automatique (ex. Jira). */
  actor: User | null;
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
  case_number: number;
  ticket_number: string;
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
