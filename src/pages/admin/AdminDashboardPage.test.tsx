import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../../context/ThemeContext';
import AdminDashboardPage from './AdminDashboardPage';

const { mockAdminApi } = vi.hoisted(() => ({
  mockAdminApi: {
    getSummary: vi.fn(),
    getStatistics: vi.fn(),
  },
}));

vi.mock('../../api/admin', () => ({ adminApi: mockAdminApi }));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, username: 'root', full_name: 'Root Admin', is_superuser: true } }),
}));

vi.mock('recharts', () => {
  const passthrough = ({ children }: { children?: unknown }) => children;
  return {
    ResponsiveContainer: passthrough,
    AreaChart: ({ children }: { children?: unknown }) => children,
    Area: () => null,
    BarChart: ({ children }: { children?: unknown }) => children,
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
  };
});

const mockSummary = {
  users: { total: 12, active: 10, admins: 2, recent: 3 },
  teams: { total: 4, new_24h: 1 },
  projects: { total: 6, active: 5, archived: 1 },
  jobs: { total: 8, pending: 1, processing: 2, done: 4, error: 1, recent_24h: 2 },
  use_cases: {
    total: 100, passed: 70, failed: 10, blocked: 5,
    in_progress: 15, automated: 30, success_rate: 70,
  },
  defects: { total: 7, open: 3, critical: 1, resolved: 4 },
  sprints: { total: 2, active: 1 },
  reports: { total: 5, submitted: 5 },
  activity: 20,
  storage: {
    media: { total_files: 3, total_bytes: 1024, total_bytes_human: '1 Ko', categories: { jobs: 1024 } },
    database: { bytes: 2048, bytes_human: '2 Ko' },
  },
  recent_activity: [
    {
      id: 'a1', action_type: 'auth.login', description: 's\'est connecté(e)', created_at: '2026-09-20T10:00:00Z',
      actor: { id: 1, username: 'root', full_name: 'Root Admin', email: 'root@test.com', date_joined: '2026-01-01' },
      project: null, project_title: null, team: null, team_name: null,
      metadata: {}, is_read: false,
    },
  ],
};

const mockStats = {
  users: [{ date: '2026-09-20', count: 2 }],
  conversions: [{ date: '2026-09-20', count: 5 }],
  teams: [{ date: '2026-09-20', count: 1 }],
  projects: [{ date: '2026-09-20', count: 1 }],
  jobs_by_status: [{ status: 'DONE', count: 4 }],
  uc_by_status: [],
  defects_by_status: [],
  defects_by_severity: [],
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter>
          <AdminDashboardPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminApi.getSummary.mockResolvedValue(mockSummary);
    mockAdminApi.getStatistics.mockResolvedValue(mockStats);
  });

  it('affiche le titre de la page', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Administration système')).toBeInTheDocument();
    });
  });

  it('affiche les indicateurs clés', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Utilisateurs').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Équipes').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Projets').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Conversions').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('affiche les valeurs des indicateurs', async () => {
    renderPage();
    await waitFor(() => {
      const total = screen.getAllByText('12');
      expect(total.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('affiche les titres des graphiques', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Conversions (30 jours)')).toBeInTheDocument();
      expect(screen.getByText('Nouveaux utilisateurs (30 jours)')).toBeInTheDocument();
    });
  });

  it('affiche les liens de navigation admin', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Utilisateurs').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Équipes').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Journal d.audit/)).toBeInTheDocument();
    });
  });

  it('affiche la liste des activités récentes', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Activité récente')).toBeInTheDocument();
      expect(screen.getByText('root')).toBeInTheDocument();
    });
  });
});