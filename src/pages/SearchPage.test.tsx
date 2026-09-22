import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import SearchPage from './SearchPage';

const { mockConversionApi, mockTeamsApi, mockAuth } = vi.hoisted(() => ({
  mockConversionApi: { listJobs: vi.fn(), searchFiles: vi.fn() },
  mockTeamsApi: {
    listTeams: vi.fn(),
    listProjects: vi.fn(),
    getNotifications: vi.fn(),
  },
  mockAuth: { user: null as { id: number; username: string; email: string; full_name: string; date_joined: string } | null },
}));

vi.mock('../api/conversion', () => ({ conversionApi: mockConversionApi }));
vi.mock('../api/teams', () => ({ teamsApi: mockTeamsApi }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockAuth.user }) }));

const mockJobs = [
  { id: 'j1', source_filename: 'test_cases.docx', use_cases_count: 15, status: 'done', created_at: '2025-06-01T10:00:00Z' },
  { id: 'j2', source_filename: 'sprint_24.docx', use_cases_count: 8, status: 'processing', created_at: '2025-06-02T14:00:00Z' },
];

const mockFiles = [
  { name: 'recette_final.docx', path: 'C:/docs/recette_final.docx', size: 1024, size_human: '1.0 KB', extension: '.docx' },
];

const mockTeams = [{ id: 't1', name: 'Équipe QA', slug: 'qa-team', members_count: 2 }];

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/recherche']}>
          <SearchPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.user = null;
    mockConversionApi.listJobs.mockResolvedValue({ results: mockJobs, count: 2 });
    mockConversionApi.searchFiles.mockResolvedValue({ results: mockFiles, count: 1 });
    mockTeamsApi.listTeams.mockResolvedValue({ results: mockTeams, count: 1 });
    mockTeamsApi.listProjects.mockResolvedValue({ results: [], count: 0 });
    mockTeamsApi.getNotifications.mockResolvedValue({ results: [], unread_count: 0 });
  });

  it('renders page title', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Recherche', level: 1 })).toBeInTheDocument();
  });

  it('shows empty state without a query', () => {
    renderPage();
    expect(screen.getByText('Lancez une recherche')).toBeInTheDocument();
  });

  it('filters recipes by query', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByLabelText('Recherche globale');
    await user.type(input, 'sprint');
    await waitFor(() => {
      expect(screen.getByText('sprint_24.docx')).toBeInTheDocument();
      expect(screen.queryByText('test_cases.docx')).not.toBeInTheDocument();
    });
  });

  it('shows local file results via searchFiles', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByLabelText('Recherche globale');
    await user.type(input, 'recette');
    await waitFor(() => {
      expect(mockConversionApi.searchFiles).toHaveBeenCalledWith('recette', []);
      expect(screen.getByText('recette_final.docx')).toBeInTheDocument();
    });
  });

  it('requires at least 2 characters for file search', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByLabelText('Recherche globale');
    await user.type(input, 'a');
    await waitFor(() => {
      expect(screen.getByText('Saisissez au moins 2 caractères')).toBeInTheDocument();
    });
    expect(mockConversionApi.searchFiles).not.toHaveBeenCalled();
  });

  it('filters projects for connected users', async () => {
    mockAuth.user = { id: 1, username: 'qa', email: 'qa@test.com', full_name: 'QA User', date_joined: '2025-01-01' };
    mockTeamsApi.listProjects.mockResolvedValue({
      results: [
        { id: 'p1', name: 'Projet Application', slug: 'app', team_slug: 'qa-team', team_name: 'Équipe QA', color: '#1e40af' },
      ],
      count: 1,
    });
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByLabelText('Recherche globale');
    await user.type(input, 'application');
    await waitFor(() => {
      expect(screen.getByText('Projet Application')).toBeInTheDocument();
    });
  });

  it('prompts login for projects section when anonymous', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByLabelText('Recherche globale');
    await user.type(input, 'projet');
    await waitFor(() => {
      expect(screen.getByText(/Connectez-vous pour rechercher dans vos projets/)).toBeInTheDocument();
    });
  });

  it('shows no-results state when nothing matches', async () => {
    mockConversionApi.listJobs.mockResolvedValue({ results: [], count: 0 });
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByLabelText('Recherche globale');
    await user.type(input, 'xyz');
    await waitFor(() => {
      expect(screen.getByText('Aucun résultat')).toBeInTheDocument();
    });
  });
});