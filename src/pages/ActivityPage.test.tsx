import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import ActivityPage from './ActivityPage';

const mockUser = { id: 1, username: 'lead', email: 'lead@test.com', full_name: 'Lead QA', date_joined: '2025-01-01' };

const { mockTeamsApi } = vi.hoisted(() => ({
  mockTeamsApi: {
    getTeamActivity: vi.fn(),
    getProjectActivity: vi.fn(),
    getNotifications: vi.fn(),
  },
}));

vi.mock('../api/teams', () => ({ teamsApi: mockTeamsApi }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

const mockActivity = [
  {
    id: 1,
    actor: { id: 2, username: 'alice', email: 'alice@test.com', full_name: 'Alice Testeuse', date_joined: '2025-01-01' },
    action_type: 'defect_created',
    description: 'Nouvelle anomalie: "Crash au login"',
    project: 'Projet Application',
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 2,
    actor: { id: 2, username: 'alice', email: 'alice@test.com', full_name: 'Alice Testeuse', date_joined: '2025-01-01' },
    action_type: 'sprint_created',
    description: 'Sprint 24 démarré',
    project: 'Projet Application',
    created_at: '2026-09-02T14:00:00Z',
  },
];

function renderPage(route: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/teams/:slug/activity" element={<ActivityPage />} />
            <Route path="/teams/:slug/projects/:projectSlug/activity" element={<ActivityPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('ActivityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamsApi.getNotifications.mockResolvedValue({ results: [], unread_count: 0 });
  });

  it('renders team activity', async () => {
    mockTeamsApi.getTeamActivity.mockResolvedValue({ results: mockActivity, count: 2 });
    renderPage('/teams/qa-team/activity');
    expect(mockTeamsApi.getTeamActivity).toHaveBeenCalledWith('qa-team');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: "Fil d'activité", level: 1 })).toBeInTheDocument();
      expect(screen.getAllByText('Alice Testeuse').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('Anomalie créée')).toBeInTheDocument();
    expect(screen.getByText('Sprint créé')).toBeInTheDocument();
    expect(screen.getAllByText('Projet Application').length).toBeGreaterThanOrEqual(1);
  });

  it('renders project activity', async () => {
    mockTeamsApi.getProjectActivity.mockResolvedValue({ results: mockActivity, count: 2 });
    renderPage('/teams/qa-team/projects/qa-project/activity');
    expect(mockTeamsApi.getProjectActivity).toHaveBeenCalledWith('qa-team', 'qa-project');
    await waitFor(() => {
      expect(screen.getByText("Activité récente du projet")).toBeInTheDocument();
    });
  });

  it('shows empty state when no activity', async () => {
    mockTeamsApi.getTeamActivity.mockResolvedValue({ results: [], count: 0 });
    renderPage('/teams/qa-team/activity');
    await waitFor(() => {
      expect(screen.getByText('Aucune activité')).toBeInTheDocument();
    });
  });

  it('shows error state on failure', async () => {
    mockTeamsApi.getTeamActivity.mockRejectedValue(new Error('Erreur réseau'));
    renderPage('/teams/qa-team/activity');
    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger l'activité/)).toBeInTheDocument();
    });
  });
});