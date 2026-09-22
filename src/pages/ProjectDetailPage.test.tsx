import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import ProjectDetailPage from './ProjectDetailPage';

const { mockTeamsApi, mockConversionApi, mockNavigate } = vi.hoisted(() => ({
  mockTeamsApi: { getProject: vi.fn(), listProjectMembers: vi.fn(), getProjectProgress: vi.fn(), listMembers: vi.fn(), addProjectMember: vi.fn(), removeProjectMember: vi.fn(), downloadDailyScrum: vi.fn(), downloadWeeklyReport: vi.fn() },
  mockConversionApi: { listJobs: vi.fn() },
  mockNavigate: vi.fn(),
}));

vi.mock('../api/teams', () => ({ teamsApi: mockTeamsApi }));
vi.mock('../api/conversion', () => ({ conversionApi: mockConversionApi }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, username: 'test', email: 'test@test.com', full_name: 'Test User', date_joined: '2025-01-01' } }) }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockMembers = {
  count: 2,
  results: [
    { id: 'pm1', user: { id: 1, username: 'lead', full_name: 'Lead User', email: 'lead@example.com', date_joined: '2025-01-01' }, role: 'lead', added_at: '2025-01-01' },
    { id: 'pm2', user: { id: 2, username: 'tester', full_name: 'Tester User', email: 'tester@example.com', date_joined: '2025-01-01' }, role: 'tester', added_at: '2025-01-01' },
  ],
};

const mockProject = {
  id: 'p1', name: 'E-commerce', slug: 'e-commerce', description: 'Main e-commerce project', visibility: 'team', status: 'active', color: '#1e40af', icon: 'science',
  team_slug: 'qa-team', team_name: 'QA Team',
  created_by: { id: 1, full_name: 'Test User', username: 'testuser', email: 'test@example.com', date_joined: '2025-01-01' },
  avatar_url: null,
  stats: { total: 25, passed: 20, failed: 3, blocked: 1, not_run: 1, automated: 8, success_rate: 80 },
  my_role: 'lead', created_at: '2025-01-01', updated_at: '2025-01-01',
};

const mockJobs = {
  count: 2,
  results: [
    { id: 'j1', created_at: '2025-06-01T10:00:00Z', status: 'done', source_filename: 'recette_v1.docx', use_cases_count: 5, error_message: '' },
    { id: 'j2', created_at: '2025-06-02T12:00:00Z', status: 'pending', source_filename: 'test_auth.docx', use_cases_count: 3, error_message: '' },
  ],
};

const mockProgress = {
  project: mockProject,
  use_cases: [
    { id: 'uc1', order: 1, use_case_text: 'TC001', description: 'Login', status: 'Passé', is_automated: true },
    { id: 'uc2', order: 2, use_case_text: 'TC002', description: 'Logout', status: 'À tester', is_automated: false },
  ],
  status_counts: { 'À tester': 1, 'En cours': 0, 'Passé': 1, 'Échoué': 0, 'Bloqué': 0, total: 2, automated: 1 },
  members: [],
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/teams/qa-team/projects/e-commerce']}>
          <Routes>
            <Route path="/teams/:slug/projects/:projectSlug" element={<ProjectDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('ProjectDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamsApi.getProject.mockResolvedValue(mockProject);
    mockTeamsApi.listProjectMembers.mockResolvedValue(mockMembers);
    mockTeamsApi.getProjectProgress.mockResolvedValue(mockProgress);
    mockTeamsApi.listMembers.mockResolvedValue({ count: 1, results: [{ id: 'tm1', user: { id: 3, username: 'newbie', full_name: 'New Member', email: 'new@test.com', date_joined: '2025-01-01' }, role: 'member', joined_at: '2025-01-01' }] });
    mockConversionApi.listJobs.mockResolvedValue(mockJobs);
  });

  it('renders project name', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('E-commerce').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders breadcrumb', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('QA Team')).toBeInTheDocument();
    });
  });

  it('renders visibility and status badges', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('team')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });
  });

  it('renders description', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Main e-commerce project')).toBeInTheDocument();
    });
  });

  it('renders stat cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('Passés')).toBeInTheDocument();
      expect(screen.getByText('Échoués')).toBeInTheDocument();
      expect(screen.getByText('Bloqués')).toBeInTheDocument();
      expect(screen.getByText('Non joués')).toBeInTheDocument();
      expect(screen.getByText('Taux réussite')).toBeInTheDocument();
    });
  });

  it('renders correct stat values', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getAllByText('80%').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders success rate bar', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('🎯 Taux de succès global')).toBeInTheDocument();
    });
  });

  it('renders conversions list', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('recette_v1.docx')).toBeInTheDocument();
    });
  });

  it('renders members section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Lead User')).toBeInTheDocument();
      expect(screen.getByText('Tester User')).toBeInTheDocument();
    });
  });

  it('renders member count', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Membres (2)')).toBeInTheDocument();
    });
  });

  it('renders import button', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('+ Importer des cas')).toBeInTheDocument();
    });
  });

  it('shows error state when project fails', async () => {
    mockTeamsApi.getProject.mockRejectedValue(new Error('Not found'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Projet introuvable')).toBeInTheDocument();
    });
  });

  it('shows empty conversions state', async () => {
    mockConversionApi.listJobs.mockResolvedValue({ count: 0, results: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Importez un fichier Word pour voir les conversions')).toBeInTheDocument();
    });
  });

  it('renders progress breakdown by status', async () => {
    renderPage();
    await screen.findByText('🎯 Taux de succès global');
    expect(screen.getByText('Passés')).toBeInTheDocument();
    expect(screen.getByText('Échoués')).toBeInTheDocument();
  });

  it('shows PDF report buttons for lead role', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('📄 Rapports');
    await user.click(screen.getByText('📄 Rapports'));
    await screen.findByText('📋 Daily Scrum');
    expect(screen.getByText('📊 Weekly Report PDF')).toBeInTheDocument();
  });

  it('shows add member button for lead', async () => {
    renderPage();
    await screen.findByText('+ Ajouter');
  });

  it('shows remove member buttons for lead', async () => {
    renderPage();
    await screen.findByText('Lead User');
    const removeButtons = screen.getAllByText('✕');
    expect(removeButtons.length).toBeGreaterThanOrEqual(1);
  });
});
