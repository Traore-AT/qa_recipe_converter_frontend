import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import DashboardPage from './DashboardPage';

const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', full_name: 'Test User', date_joined: '2025-01-01' };

const { mockTeamsApi, mockConversionApi, mockNavigate } = vi.hoisted(() => ({
  mockTeamsApi: { listTeams: vi.fn() },
  mockConversionApi: { listJobs: vi.fn() },
  mockNavigate: vi.fn(),
}));

vi.mock('../api/teams', () => ({ teamsApi: mockTeamsApi }));
vi.mock('../api/conversion', () => ({ conversionApi: mockConversionApi }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockTeamsData = {
  count: 2,
  results: [
    { id: '1', name: 'Alpha QA', slug: 'alpha-qa', description: 'Main team', members_count: 4, owner: mockUser, avatar_url: null, my_role: 'owner', created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: '2', name: 'Beta Test', slug: 'beta-test', description: '', members_count: 2, owner: mockUser, avatar_url: null, my_role: 'admin', created_at: '2025-01-01', updated_at: '2025-01-01' },
  ],
};

const mockJobsData = {
  count: 3,
  results: [
    { id: 'j1', created_at: '2025-06-01T10:00:00Z', status: 'done', source_filename: 'recette_v1.docx', use_cases_count: 5, error_message: '' },
    { id: 'j2', created_at: '2025-06-02T12:00:00Z', status: 'done', source_filename: 'test_auth.docx', use_cases_count: 3, error_message: '' },
    { id: 'j3', created_at: '2025-06-03T14:00:00Z', status: 'error', source_filename: 'broken.docx', use_cases_count: 0, error_message: 'Parse error' },
  ],
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamsApi.listTeams.mockResolvedValue(mockTeamsData);
    mockConversionApi.listJobs.mockResolvedValue(mockJobsData);
  });

  it('renders welcome header with user name', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Bonjour, Test')).toBeInTheDocument();
    });
  });

  it('displays team count and stats', async () => {
    renderPage();
    await waitFor(() => {
      const twos = screen.getAllByText('2');
      expect(twos.length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Équipes').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Cas de test')).toBeInTheDocument();
      expect(screen.getByText('Conversions réussies')).toBeInTheDocument();
    });
  });

  it('renders team cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Alpha QA')).toBeInTheDocument();
      expect(screen.getByText('Beta Test')).toBeInTheDocument();
    });
  });

  it('renders recent activity', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('recette_v1.docx')).toBeInTheDocument();
      expect(screen.getByText('test_auth.docx')).toBeInTheDocument();
    });
  });

  it('navigates to convert page on quick action click', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Convertir une recette').length).toBeGreaterThanOrEqual(1);
    });
    await userEvent.click(screen.getAllByText('Convertir une recette')[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/convert');
  });

  it('navigates to team create page', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Créer une équipe')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Créer une équipe'));
    expect(mockNavigate).toHaveBeenCalledWith('/teams/new');
  });

  it('shows empty state when no teams', async () => {
    mockTeamsApi.listTeams.mockResolvedValue({ count: 0, results: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Bienvenue sur QA Recipe')).toBeInTheDocument();
    });
  });

  it('shows tip card', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Astuce')).toBeInTheDocument();
    });
  });

  it('shows profile card with user info', async () => {
    renderPage();
    await waitFor(() => {
      const names = screen.getAllByText('Test User');
      expect(names.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });
});
