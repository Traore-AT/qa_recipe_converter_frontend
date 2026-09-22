import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import TeamDashboardPage from './TeamDashboardPage';

const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', full_name: 'Test User', date_joined: '2025-01-01' };

const { mockTeamsApi, mockNavigate } = vi.hoisted(() => ({
  mockTeamsApi: { getDashboard: vi.fn(), inviteMember: vi.fn() },
  mockNavigate: vi.fn(),
}));

vi.mock('../api/teams', () => ({ teamsApi: mockTeamsApi }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockDashboard = {
  team: { id: '1', name: 'QA Team', slug: 'qa-team', description: 'Main QA team', owner: { id: 1, username: 'testuser', full_name: 'Test User', email: 'test@example.com', date_joined: '2025-01-01' }, members_count: 5, my_role: 'owner', created_at: '2025-01-01', updated_at: '2025-01-01', avatar_url: null },
  stats: { projects_total: 3, projects_active: 2, projects_archived: 1, projects_completed: 0, use_cases_total: 42, use_cases_passed: 35, success_rate: 83, members_count: 5 },
  projects: [
    { id: 'p1', name: 'Sprint 24', slug: 'sprint-24', description: 'Current sprint', visibility: 'team', status: 'active', color: '#1e40af', icon: 'science', team_slug: 'qa-team', team_name: 'QA Team', created_by: { id: 1, full_name: 'Test User', username: 'testuser', email: 'test@example.com', date_joined: '2025-01-01' }, avatar_url: null, stats: { total: 20, passed: 18, failed: 1, blocked: 0, not_run: 1, automated: 5, success_rate: 90 }, my_role: 'lead', created_at: '2025-01-01', updated_at: '2025-01-01' },
  ],
  members: [
    { id: 'm1', user: { id: 1, username: 'testuser', full_name: 'Test User', email: 'test@example.com', date_joined: '2025-01-01' }, role: 'owner', joined_at: '2025-01-01' },
    { id: 'm2', user: { id: 2, username: 'alice', full_name: 'Alice Doe', email: 'alice@example.com', date_joined: '2025-01-01' }, role: 'admin', joined_at: '2025-01-01' },
  ],
  recent_activity: [
    { type: 'conversion', job_id: 'j1', filename: 'test_cases.docx', project: null, use_cases_count: 5, status: 'done', date: '2025-06-01' },
  ],
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/teams/qa-team']}>
          <Routes>
            <Route path="/teams/:slug" element={<TeamDashboardPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('TeamDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamsApi.getDashboard.mockResolvedValue(mockDashboard);
  });

  it('renders team name', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('QA Team')).toBeInTheDocument();
    });
  });

  it('renders team description', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Main QA team')).toBeInTheDocument();
    });
  });

  it('renders KPI cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Projets').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Tests').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Taux de réussite')).toBeInTheDocument();
      expect(screen.getAllByText('Membres').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows correct KPI values', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getAllByText('83%').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('renders projects list', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Sprint 24')).toBeInTheDocument();
    });
  });

  it('renders members list', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Alice Doe')).toBeInTheDocument();
    });
  });

  it('renders member role badges', async () => {
    renderPage();
    await waitFor(() => {
      const owners = screen.getAllByText('owner');
      expect(owners.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders recent activity', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('test_cases.docx')).toBeInTheDocument();
    });
  });

  it('renders success rate bar', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('🎯 Taux de succès global')).toBeInTheDocument();
    });
  });

  it('renders new project and invite buttons', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('➕ Nouveau projet')).toBeInTheDocument();
      expect(screen.getByText('✉️ Inviter')).toBeInTheDocument();
    });
  });

  it('opens invite modal', async () => {
    const user = userEvent.setup();
    renderPage();
    const inviteBtn = await screen.findByText('✉️ Inviter');
    await user.click(inviteBtn);
    await waitFor(() => {
      expect(screen.getByText('✉️ Inviter un membre')).toBeInTheDocument();
    });
  });

  it('shows error state when dashboard fails', async () => {
    mockTeamsApi.getDashboard.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Erreur de chargement')).toBeInTheDocument();
    });
  });

  it('shows empty project state', async () => {
    mockTeamsApi.getDashboard.mockResolvedValue({ ...mockDashboard, projects: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Aucun projet pour le moment')).toBeInTheDocument();
    });
  });
});
