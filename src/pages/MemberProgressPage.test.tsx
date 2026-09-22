import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import MemberProgressPage from './MemberProgressPage';

const mockUser = { id: 1, username: 'lead', email: 'lead@test.com', full_name: 'Lead QA', date_joined: '2025-01-01' };

const { mockTeamsApi } = vi.hoisted(() => ({
  mockTeamsApi: { getMemberProgress: vi.fn() },
}));

vi.mock('../api/teams', () => ({ teamsApi: mockTeamsApi }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

const mockProgress = {
  results: [
    {
      user: { id: 2, username: 'alice', email: 'alice@test.com', full_name: 'Alice Testeuse', date_joined: '2025-01-01' },
      total_ucs: 5, passed: 3, failed: 1, blocked: 0, in_progress: 1, not_run: 0, progress_pct: 80,
      assigned_ucs: [
        { id: 'a1', use_case: 'uc1', use_case_order: 1, use_case_id_str: 'TC001', use_case_desc: 'Login test', sprint: null, assigned_to: 'pm1', assigned_to_user: { id: 2, username: 'alice', email: 'alice@test.com', full_name: 'Alice Testeuse', date_joined: '2025-01-01' }, assigned_by: '1', assigned_by_user: mockUser, assigned_at: '2026-06-01', status: 'Passé' },
        { id: 'a2', use_case: 'uc2', use_case_order: 2, use_case_id_str: 'TC002', use_case_desc: 'Logout test', sprint: null, assigned_to: 'pm1', assigned_to_user: { id: 2, username: 'alice', email: 'alice@test.com', full_name: 'Alice Testeuse', date_joined: '2025-01-01' }, assigned_by: '1', assigned_by_user: mockUser, assigned_at: '2026-06-01', status: 'Passé' },
        { id: 'a3', use_case: 'uc3', use_case_order: 3, use_case_id_str: 'TC003', use_case_desc: 'Search test', sprint: null, assigned_to: 'pm1', assigned_to_user: { id: 2, username: 'alice', email: 'alice@test.com', full_name: 'Alice Testeuse', date_joined: '2025-01-01' }, assigned_by: '1', assigned_by_user: mockUser, assigned_at: '2026-06-01', status: 'Passé' },
        { id: 'a4', use_case: 'uc4', use_case_order: 4, use_case_id_str: 'TC004', use_case_desc: 'Profile test', sprint: null, assigned_to: 'pm1', assigned_to_user: { id: 2, username: 'alice', email: 'alice@test.com', full_name: 'Alice Testeuse', date_joined: '2025-01-01' }, assigned_by: '1', assigned_by_user: mockUser, assigned_at: '2026-06-01', status: 'Échoué' },
        { id: 'a5', use_case: 'uc5', use_case_order: 5, use_case_id_str: 'TC005', use_case_desc: 'Settings test', sprint: null, assigned_to: 'pm1', assigned_to_user: { id: 2, username: 'alice', email: 'alice@test.com', full_name: 'Alice Testeuse', date_joined: '2025-01-01' }, assigned_by: '1', assigned_by_user: mockUser, assigned_at: '2026-06-01', status: 'En cours' },
      ],
    },
    {
      user: { id: 3, username: 'bob', email: 'bob@test.com', full_name: 'Bob Testeur', date_joined: '2025-01-01' },
      total_ucs: 3, passed: 0, failed: 0, blocked: 1, in_progress: 0, not_run: 2, progress_pct: 0,
      assigned_ucs: [
        { id: 'a6', use_case: 'uc6', use_case_order: 6, use_case_id_str: 'TC006', use_case_desc: 'Admin test', sprint: null, assigned_to: 'pm2', assigned_to_user: { id: 3, username: 'bob', email: 'bob@test.com', full_name: 'Bob Testeur', date_joined: '2025-01-01' }, assigned_by: '1', assigned_by_user: mockUser, assigned_at: '2026-06-01', status: 'Bloqué' },
        { id: 'a7', use_case: 'uc7', use_case_order: 7, use_case_id_str: 'TC007', use_case_desc: 'Permission test', sprint: null, assigned_to: 'pm2', assigned_to_user: { id: 3, username: 'bob', email: 'bob@test.com', full_name: 'Bob Testeur', date_joined: '2025-01-01' }, assigned_by: '1', assigned_by_user: mockUser, assigned_at: '2026-06-01', status: 'À tester' },
        { id: 'a8', use_case: 'uc8', use_case_order: 8, use_case_id_str: 'TC008', use_case_desc: 'Role test', sprint: null, assigned_to: 'pm2', assigned_to_user: { id: 3, username: 'bob', email: 'bob@test.com', full_name: 'Bob Testeur', date_joined: '2025-01-01' }, assigned_by: '1', assigned_by_user: mockUser, assigned_at: '2026-06-01', status: 'À tester' },
      ],
    },
  ],
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/teams/qa-team/projects/qa-project/member-progress']}>
          <Routes>
            <Route path="/teams/:slug/projects/:projectSlug/member-progress" element={<MemberProgressPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('MemberProgressPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamsApi.getMemberProgress.mockResolvedValue(mockProgress);
  });

  it('renders page title', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Progression des membres')).toBeInTheDocument();
    });
  });

  it('renders overview KPI cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Total assignés')).toBeInTheDocument();
      expect(screen.getByText('Réussis')).toBeInTheDocument();
      expect(screen.getByText('Échoués')).toBeInTheDocument();
      expect(screen.getByText('Progression')).toBeInTheDocument();
    });
  });

  it('renders member filter buttons', async () => {
    renderPage();
    await waitFor(() => {
      const aliceElements = screen.getAllByText(/Alice Testeuse/);
      expect(aliceElements.length).toBeGreaterThanOrEqual(1);
      const bobElements = screen.getAllByText(/Bob Testeur/);
      expect(bobElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows member progress percentages', async () => {
    renderPage();
    await waitFor(() => {
      const pct80 = screen.getAllByText(/80%/);
      expect(pct80.length).toBeGreaterThanOrEqual(1);
      const pct0 = screen.getAllByText(/0%/);
      expect(pct0.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows overview stats', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('8')).toBeInTheDocument(); // total 5+3
    });
  });

  it('shows member cards in overview', async () => {
    renderPage();
    await waitFor(() => {
      const cards = screen.getAllByText(/Alice Testeuse|Bob Testeur/);
      expect(cards.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('drills into member detail on click', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      const elements = screen.getAllByText(/Alice Testeuse/);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
    const aliceBtn = screen.getAllByText(/Alice Testeuse/)[0];
    await user.click(aliceBtn);
    await waitFor(() => {
      const elements = screen.getAllByText('Alice Testeuse');
      expect(elements.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows assigned UCs in member detail', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      const elements = screen.getAllByText(/Alice Testeuse/);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
    const aliceBtn = screen.getAllByText(/Alice Testeuse/)[0];
    await user.click(aliceBtn);
    await waitFor(() => {
      expect(screen.getByText(/Login test/)).toBeInTheDocument();
      expect(screen.getByText(/Settings test/)).toBeInTheDocument();
    });
  });

  it('shows UC count in member detail', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      const elements = screen.getAllByText(/Alice Testeuse/);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
    const aliceBtn = screen.getAllByText(/Alice Testeuse/)[0];
    await user.click(aliceBtn);
    await waitFor(() => {
      expect(screen.getByText('Cas assignés (5)')).toBeInTheDocument();
    });
  });

  it('shows back to overview button when detail selected', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      const elements = screen.getAllByText(/Alice Testeuse/);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
    const aliceBtn = screen.getAllByText(/Alice Testeuse/)[0];
    await user.click(aliceBtn);
    await waitFor(() => {
      expect(screen.getByText("📊 Vue d'ensemble")).toBeInTheDocument();
    });
  });

  it('handles empty progress', async () => {
    mockTeamsApi.getMemberProgress.mockResolvedValue({ results: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Progression des membres')).toBeInTheDocument();
    });
  });
});
