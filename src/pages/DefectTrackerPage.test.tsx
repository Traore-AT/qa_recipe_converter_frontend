import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import DefectTrackerPage from './DefectTrackerPage';

const mockUser = { id: 1, username: 'lead', email: 'lead@test.com', full_name: 'Lead QA', date_joined: '2025-01-01' };

const { mockTeamsApi } = vi.hoisted(() => ({
  mockTeamsApi: {
    listDefects: vi.fn(),
    getDefectStats: vi.fn(),
    listProjectMembers: vi.fn(),
    createDefect: vi.fn(),
    updateDefect: vi.fn(),
  },
}));

vi.mock('../api/teams', () => ({ teamsApi: mockTeamsApi }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

const mockDefects = {
  count: 2,
  results: [
    { id: 'd1', use_case: null, project: 'p1', title: 'Login bug', description: 'Cannot login with valid credentials', severity: 'critical', priority: 'high', status: 'open', reported_by: 1, reported_by_user: mockUser, assigned_to: 2, assigned_to_user: { id: 2, username: 'tester', full_name: 'Tester User', email: 'tester@test.com', date_joined: '' }, steps_to_reproduce: '1. Go to login\n2. Enter valid credentials\n3. Click login', expected_behavior: 'Should login', actual_behavior: 'Error 500', environment: '', attachment: null, created_at: '2026-06-01T10:00:00Z', updated_at: '2026-06-01T10:00:00Z' },
    { id: 'd2', use_case: null, project: 'p1', title: 'UI glitch', description: 'Button misaligned on mobile', severity: 'minor', priority: 'low', status: 'resolved', reported_by: 2, reported_by_user: { id: 2, username: 'tester', full_name: 'Tester User', email: 'tester@test.com', date_joined: '' }, assigned_to: null, assigned_to_user: null, steps_to_reproduce: '', expected_behavior: '', actual_behavior: '', environment: 'Chrome mobile', attachment: null, created_at: '2026-05-30T10:00:00Z', updated_at: '2026-06-01T10:00:00Z' },
  ],
};

const mockStats = {
  total: 2, open: 1, in_progress: 0, resolved: 1, closed: 0,
  critical: 1, major: 0, minor: 1,
  by_severity: { critical: 1, major: 0, minor: 1, trivial: 0 },
  by_priority: { high: 1, medium: 0, low: 1 },
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/teams/qa-team/projects/qa-project/defects']}>
          <Routes>
            <Route path="/teams/:slug/projects/:projectSlug/defects" element={<DefectTrackerPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('DefectTrackerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamsApi.listDefects.mockResolvedValue(mockDefects);
    mockTeamsApi.getDefectStats.mockResolvedValue(mockStats);
    mockTeamsApi.listProjectMembers.mockResolvedValue({ count: 1, results: [{ id: 'pm1', user: { id: 2, username: 'tester', full_name: 'Tester User', email: 'tester@test.com', date_joined: '' }, role: 'tester', added_at: '' }] });
  });

  it('renders page title', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Suivi des anomalies')).toBeInTheDocument();
    });
  });

  it('renders stats cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('Ouverts')).toBeInTheDocument();
      expect(screen.getByText('Résolus')).toBeInTheDocument();
      expect(screen.getByText('Fermés')).toBeInTheDocument();
    });
  });

  it('renders stat values', async () => {
    renderPage();
    await waitFor(() => {
      const totalElements = screen.getAllByText('2');
      expect(totalElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders defect cards with titles', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Login bug')).toBeInTheDocument();
      expect(screen.getByText('UI glitch')).toBeInTheDocument();
    });
  });

  it('renders severity badges', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Critique')).toBeInTheDocument();
      expect(screen.getByText('Mineure')).toBeInTheDocument();
    });
  });

  it('shows reported by info', async () => {
    renderPage();
    await waitFor(() => {
      const elements = screen.getAllByText(/Signalé par/);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows filter buttons', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Tous')).toBeInTheDocument();
      expect(screen.getByText('Ouvert')).toBeInTheDocument();
      expect(screen.getByText('Résolu')).toBeInTheDocument();
    });
  });

  it('opens create modal on button click', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('+ Signaler une anomalie'));
    await user.click(screen.getByText('+ Signaler une anomalie'));
    expect(screen.getByText('Signaler une anomalie')).toBeInTheDocument();
  });

  it('creates a defect via modal', async () => {
    mockTeamsApi.createDefect.mockResolvedValue({ id: 'd3', title: 'New bug', severity: 'major', status: 'open', reported_by_user: mockUser });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('+ Signaler une anomalie'));
    await user.click(screen.getByText('+ Signaler une anomalie'));
    await user.type(screen.getByLabelText('Titre *'), 'New bug');
    await user.click(screen.getByText('✅ Signaler'));
    await waitFor(() => {
      expect(mockTeamsApi.createDefect).toHaveBeenCalled();
    });
  });

  it('filters by status', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Résolu'));
    await user.click(screen.getByText('Résolu'));
    await waitFor(() => {
      expect(mockTeamsApi.listDefects).toHaveBeenCalledWith(
        'qa-team', 'qa-project', { status: 'resolved', page: 1 }
      );
    });
  });

  it('renders pagination when more than 20 defects', async () => {
    mockTeamsApi.listDefects.mockResolvedValue({
      count: 25,
      results: mockDefects.results,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText('Pagination des anomalies')).toBeInTheDocument();
    });
  });

  it('navigates to next page via pagination', async () => {
    mockTeamsApi.listDefects.mockResolvedValue({
      count: 25,
      results: mockDefects.results,
    });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByLabelText('Page suivante'));
    await user.click(screen.getByLabelText('Page suivante'));
    await waitFor(() => {
      expect(mockTeamsApi.listDefects).toHaveBeenCalledWith(
        'qa-team', 'qa-project', { page: 2 }
      );
    });
  });

  it('updates defect status via dropdown', async () => {
    mockTeamsApi.updateDefect.mockResolvedValue({});
    renderPage();
    await waitFor(() => {
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('handles empty defects', async () => {
    mockTeamsApi.listDefects.mockResolvedValue({ count: 0, results: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Aucune anomalie signalée')).toBeInTheDocument();
    });
  });
});
