import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import SprintBoardPage from './SprintBoardPage';

const mockUser = { id: 1, username: 'lead', email: 'lead@test.com', full_name: 'Lead QA', date_joined: '2025-01-01' };

const { mockTeamsApi, mockNavigate } = vi.hoisted(() => ({
  mockTeamsApi: {
    listSprints: vi.fn(),
    getSprintBoard: vi.fn(),
    listProjectMembers: vi.fn(),
    getUnassignedUseCases: vi.fn(),
    createSprint: vi.fn(),
    createAssignments: vi.fn(),
    updateUseCaseStatus: vi.fn(),
    getUseCaseDetail: vi.fn(),
  },
  mockNavigate: vi.fn(),
}));

vi.mock('../api/teams', () => ({ teamsApi: mockTeamsApi }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockSprints = {
  count: 2,
  results: [
    { id: 's1', project: 'p1', name: 'Sprint 1', goal: 'Test critical paths', start_date: '2026-06-01', end_date: '2026-06-14', status: 'active', duration_days: 13, created_by: mockUser, stats: { total: 3, passed: 1, failed: 0, blocked: 0, in_progress: 1, not_run: 1, progress_pct: 33.3 }, created_at: '2026-06-01', updated_at: '2026-06-01' },
    { id: 's2', project: 'p1', name: 'Sprint 0', goal: 'Setup', start_date: '2026-05-15', end_date: '2026-05-28', status: 'completed', duration_days: 13, created_by: mockUser, stats: { total: 2, passed: 2, failed: 0, blocked: 0, in_progress: 0, not_run: 0, progress_pct: 100 }, created_at: '2026-05-15', updated_at: '2026-05-28' },
  ],
};

const mockBoard = {
  sprint: mockSprints.results[0],
  columns: {
    'À tester': [
      { id: 'a1', use_case: 'uc1', use_case_order: 1, use_case_id_str: 'TC001', use_case_desc: 'Login test', sprint: 's1', assigned_to: 'pm1', assigned_to_user: { id: 2, username: 'tester', full_name: 'Tester User', email: 'tester@test.com', date_joined: '' }, assigned_by: '1', assigned_by_user: mockUser, assigned_at: '2026-06-01', status: 'À tester', jira_ticket: 'QA-001', jira_url: 'https://jira.example/browse/QA-001' },
    ],
    'En cours': [
      { id: 'a2', use_case: 'uc2', use_case_order: 2, use_case_id_str: 'TC002', use_case_desc: 'Logout test', sprint: 's1', assigned_to: 'pm1', assigned_to_user: { id: 2, username: 'tester', full_name: 'Tester User', email: 'tester@test.com', date_joined: '' }, assigned_by: '1', assigned_by_user: mockUser, assigned_at: '2026-06-01', status: 'En cours' },
    ],
    'Passé': [{ id: 'a3', use_case: 'uc3', use_case_order: 3, use_case_id_str: 'TC003', use_case_desc: 'Search test', sprint: 's1', assigned_to: 'pm1', assigned_to_user: { id: 2, username: 'tester', full_name: 'Tester User', email: 'tester@test.com', date_joined: '' }, assigned_by: '1', assigned_by_user: mockUser, assigned_at: '2026-06-01', status: 'Passé' }],
    'Échoué': [],
    'Bloqué': [],
  },
  stats: mockSprints.results[0].stats,
};

function renderPage(initialRoute = '/teams/qa-team/projects/qa-project/sprint-board') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/teams/:slug/projects/:projectSlug/sprint-board" element={<SprintBoardPage />} />
            <Route path="/teams/:slug/projects/:projectSlug/sprints/:sprintId" element={<SprintBoardPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('SprintBoardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamsApi.listSprints.mockResolvedValue(mockSprints);
    mockTeamsApi.getSprintBoard.mockResolvedValue(mockBoard);
    mockTeamsApi.listProjectMembers.mockResolvedValue({ count: 2, results: [{ id: 'pm1', user: { id: 2, username: 'tester', full_name: 'Tester User', email: 'tester@test.com', date_joined: '' }, role: 'tester', added_at: '' }] });
    mockTeamsApi.getUnassignedUseCases.mockResolvedValue({ count: 2, results: [{ id: 'uc4', order: 4, use_case_text: 'TC004', description: 'Profile test', status: 'À tester' }, { id: 'uc5', order: 5, use_case_text: 'TC005', description: 'Settings test', status: 'À tester' }] });
  });

  it('renders page title', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Tableau Sprint')).toBeInTheDocument();
    });
  });

  it('renders sprint filter buttons', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      expect(screen.getByText('Sprint 0')).toBeInTheDocument();
    });
  });

  it('renders Kanban columns when sprint selected', async () => {
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await waitFor(() => {
      const atester = screen.getAllByText('À tester');
      expect(atester.length).toBeGreaterThanOrEqual(1);
      const encours = screen.getAllByText('En cours');
      expect(encours.length).toBeGreaterThanOrEqual(1);
      const passe = screen.getAllByText('Passé');
      expect(passe.length).toBeGreaterThanOrEqual(1);
      const echoue = screen.getAllByText('Échoué');
      expect(echoue.length).toBeGreaterThanOrEqual(1);
      const bloque = screen.getAllByText('Bloqué');
      expect(bloque.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders use cases in correct columns', async () => {
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await waitFor(() => {
      expect(screen.getByText('CAS-001')).toBeInTheDocument();
      expect(screen.getByText('CAS-002')).toBeInTheDocument();
      expect(screen.getByText('CAS-003')).toBeInTheDocument();
    });
  });

  it('shows assigned user names', async () => {
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await waitFor(() => {
      const names = screen.getAllByText('Tester User');
      expect(names.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows create sprint button for leads', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('+ Nouveau sprint')).toBeInTheDocument();
    });
  });

  it('shows assign button when sprint selected', async () => {
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await waitFor(() => {
      expect(screen.getByText('+ Assigner des cas')).toBeInTheDocument();
    });
  });

  it('opens create sprint modal on button click', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('+ Nouveau sprint'));
    await user.click(screen.getByText('+ Nouveau sprint'));
    expect(screen.getByText('+ Nouveau Sprint')).toBeInTheDocument();
  });

  it('creates a sprint via the modal', async () => {
    mockTeamsApi.createSprint.mockResolvedValue({ ...mockSprints.results[0], id: 's3' });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('+ Nouveau sprint'));
    await user.click(screen.getByText('+ Nouveau sprint'));
    await user.type(screen.getByLabelText('Nom *'), 'Sprint 3');
    await user.type(screen.getByLabelText('Début *'), '2026-06-15');
    await user.type(screen.getByLabelText('Fin *'), '2026-06-28');
    await user.click(screen.getByText('✅ Créer'));
    await waitFor(() => {
      expect(mockTeamsApi.createSprint).toHaveBeenCalled();
    });
  });

  it('handles empty sprints', async () => {
    mockTeamsApi.listSprints.mockResolvedValue({ count: 0, results: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Tableau Sprint')).toBeInTheDocument();
    });
  });

  it('renders stats on selected sprint card', async () => {
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await waitFor(() => {
      const sprint1Elements = screen.getAllByText('Sprint 1');
      expect(sprint1Elements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/33\.3/)).toBeInTheDocument();
    });
  });

  it('opens the ticket popup immediately on card click with board data', async () => {
    mockTeamsApi.getUseCaseDetail.mockResolvedValue({
      assignment: mockBoard.columns['À tester'][0],
      use_case: { id: 'uc1', project: 'p1', order: 1, use_case_text: 'TC001', description: 'Login test', preconditions: 'user registered', steps: '1. open app', expected_results: 'home page', observed_results: '', is_automated: false, jira_ticket: 'QA-001' },
      screenshots: [],
      comments: [{ id: 'c1', author: { id: 1, full_name: 'Lead QA' }, content: 'Test rapide', created_at: '2026-06-01' }],
    });
    const user = userEvent.setup();
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await waitFor(() => screen.getByText('CAS-001'));
    await user.click(screen.getByText('CAS-001'));
    await waitFor(() => {
      expect(screen.getByText(/UC#1 — Détails/)).toBeInTheDocument();
      expect(screen.getByText('Assigné à :')).toBeInTheDocument();
      expect(screen.getByDisplayValue('QA-001')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('user registered')).toBeInTheDocument();
    });
  });
});
