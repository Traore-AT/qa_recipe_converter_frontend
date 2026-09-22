import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import WeeklyReportPage from './WeeklyReportPage';

const mockUser = { id: 1, username: 'tester', email: 'tester@test.com', full_name: 'Tester User', date_joined: '2025-01-01' };

const { mockTeamsApi } = vi.hoisted(() => ({
  mockTeamsApi: {
    getCurrentWeeklyReport: vi.fn(),
    listWeeklyReports: vi.fn(),
    saveWeeklyReport: vi.fn(),
    updateWeeklyReport: vi.fn(),
  },
}));

vi.mock('../api/teams', () => ({ teamsApi: mockTeamsApi }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

const mockCurrentReport = {
  id: 'r1', user: mockUser, team: 'team1',
  week_start: '2026-06-08', week_end: '2026-06-14',
  week_label: 'Semaine du 08/06 au 14/06/2026',
  accomplishments: 'Tested login feature\nFixed search bug',
  blockers: 'Database connection timeout in staging',
  next_week_plans: 'Test profile page\nWrite automation scripts',
  additional_notes: 'Waiting for API fix from dev team',
  status: 'draft', submitted_at: null,
  created_at: '2026-06-08T08:00:00Z', updated_at: '2026-06-08T08:00:00Z',
};

const mockPastReports = {
  count: 2,
  results: [
    { id: 'r2', user: mockUser, team: 'team1', week_start: '2026-06-01', week_end: '2026-06-07', week_label: 'Semaine du 01/06 au 07/06/2026', accomplishments: 'Completed testing', blockers: 'None', next_week_plans: '-', additional_notes: '', status: 'submitted', submitted_at: '2026-06-07T16:00:00Z', created_at: '2026-06-01T08:00:00Z', updated_at: '2026-06-07T16:00:00Z' },
    { id: 'r3', user: mockUser, team: 'team1', week_start: '2026-05-25', week_end: '2026-05-31', week_label: 'Semaine du 25/05 au 31/05/2026', accomplishments: 'Initial setup', blockers: '', next_week_plans: 'Start testing', additional_notes: '', status: 'submitted', submitted_at: '2026-05-31T16:00:00Z', created_at: '2026-05-25T08:00:00Z', updated_at: '2026-05-31T16:00:00Z' },
  ],
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/teams/qa-team/weekly-reports']}>
          <Routes>
            <Route path="/teams/:slug/weekly-reports" element={<WeeklyReportPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('WeeklyReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamsApi.getCurrentWeeklyReport.mockResolvedValue(mockCurrentReport);
    mockTeamsApi.listWeeklyReports.mockResolvedValue(mockPastReports);
  });

  it('renders page title', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Rapport hebdomadaire')).toBeInTheDocument();
    });
  });

  it('renders current week label', async () => {
    renderPage();
    await waitFor(() => {
      const elements = screen.getAllByText(/Semaine du/);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders all report sections', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Accomplissements/)).toBeInTheDocument();
      expect(screen.getByText(/Blocages/)).toBeInTheDocument();
      expect(screen.getByText(/Prévisions/)).toBeInTheDocument();
      expect(screen.getByText(/Notes supplémentaires/)).toBeInTheDocument();
    });
  });

  it('pre-fills saved content', async () => {
    renderPage();
    await waitFor(() => {
      const textareas = screen.getAllByRole('textbox');
      const allText = textareas.map(t => (t as HTMLTextAreaElement).value).join(' ');
      expect(allText).toContain('Tested login feature');
      expect(allText).toContain('Database connection timeout');
      expect(allText).toContain('Test profile page');
    });
  });

  it('shows draft status badge', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Brouillon')).toBeInTheDocument();
    });
  });

  it('shows submit button when draft', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('📤 Soumettre')).toBeInTheDocument();
    });
  });

  it('submits report on button click', async () => {
    mockTeamsApi.updateWeeklyReport.mockResolvedValue({ ...mockCurrentReport, status: 'submitted' });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('📤 Soumettre'));
    await user.click(screen.getByText('📤 Soumettre'));
    await waitFor(() => {
      expect(mockTeamsApi.updateWeeklyReport).toHaveBeenCalled();
    });
  });

  it('auto-saves when typing', async () => {
    mockTeamsApi.updateWeeklyReport.mockResolvedValue(mockCurrentReport);
    const user = userEvent.setup();
    renderPage();
    await waitFor(async () => {
      const textareas = screen.getAllByRole('textbox');
      if (textareas.length > 0) {
        await user.type(textareas[0], ' new content');
      }
    });
  });

  it('shows historical reports when toggled', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText("Voir historique"));
    await user.click(screen.getByText("Voir historique"));
    await waitFor(() => {
      expect(screen.getByText('Historique')).toBeInTheDocument();
    });
  });

  it('renders past reports in history', async () => {
    mockTeamsApi.listWeeklyReports.mockResolvedValue(mockPastReports);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText("Voir historique"));
    await user.click(screen.getByText("Voir historique"));
    await waitFor(() => {
      const semaines = screen.getAllByText(/Semaine du/);
      expect(semaines.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows submitted status for past reports', async () => {
    mockTeamsApi.listWeeklyReports.mockResolvedValue(mockPastReports);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText("Voir historique"));
    await user.click(screen.getByText("Voir historique"));
    await waitFor(() => {
      const submitted = screen.getAllByText('Soumis');
      expect(submitted.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('handles loading state', async () => {
    mockTeamsApi.getCurrentWeeklyReport.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Rapport hebdomadaire')).toBeInTheDocument();
  });

  it('disables textareas when submitted', async () => {
    mockTeamsApi.getCurrentWeeklyReport.mockResolvedValue({ ...mockCurrentReport, status: 'submitted' });
    renderPage();
    await waitFor(() => {
      const textareas = screen.getAllByRole('textbox').filter(el => el.tagName === 'TEXTAREA');
      expect(textareas.length).toBeGreaterThanOrEqual(4);
      textareas.forEach(ta => {
        expect(ta).toBeDisabled();
      });
    });
  });
});
