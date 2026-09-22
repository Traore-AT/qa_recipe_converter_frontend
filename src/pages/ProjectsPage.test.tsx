import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import ProjectsPage from './ProjectsPage';

const { mockTeamsApi, mockNavigate } = vi.hoisted(() => ({
  mockTeamsApi: { listProjects: vi.fn() },
  mockNavigate: vi.fn(),
}));

vi.mock('../api/teams', () => ({ teamsApi: mockTeamsApi }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, username: 'test', email: 'test@test.com', full_name: 'Test User', date_joined: '2025-01-01' } }) }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockProjects = {
  count: 2,
  results: [
    { id: 'p1', name: 'Alpha', slug: 'alpha', description: 'First project', visibility: 'team', status: 'active', color: '#1e40af', created_by: { full_name: 'Test User' }, created_at: '2025-01-01', stats: { total: 10, success_rate: 80 } },
    { id: 'p2', name: 'Beta', slug: 'beta', description: '', visibility: 'private', status: 'archived', color: '#059669', created_by: { full_name: 'Test User' }, created_at: '2025-01-01', stats: { total: 0, success_rate: 0 } },
  ],
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/teams/my-team/projects']}>
          <Routes>
            <Route path="/teams/:slug/projects" element={<ProjectsPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('ProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamsApi.listProjects.mockResolvedValue(mockProjects);
  });

  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('Projets')).toBeInTheDocument();
  });

  it('renders project count', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('2 projets')).toBeInTheDocument();
    });
  });

  it('renders project cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
    });
  });

  it('renders project badges', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Équipe')).toBeInTheDocument();
      expect(screen.getByText('Privé')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('archived')).toBeInTheDocument();
    });
  });

  it('renders new project button', () => {
    renderPage();
    expect(screen.getByText('+ Nouveau projet')).toBeInTheDocument();
  });

  it('navigates to new project page', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('+ Nouveau projet'));
    expect(mockNavigate).toHaveBeenCalledWith('/teams/my-team/projects/new');
  });

  it('shows empty state when no projects', async () => {
    mockTeamsApi.listProjects.mockResolvedValue({ count: 0, results: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Aucun projet')).toBeInTheDocument();
    });
  });

  it('shows stats for projects', async () => {
    renderPage();
    await waitFor(() => {
      const eighties = screen.getAllByText('80%');
      expect(eighties.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  it('renders pagination when more than 20 projects', async () => {
    mockTeamsApi.listProjects.mockResolvedValue({ count: 25, results: mockProjects.results });
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText('Pagination des projets')).toBeInTheDocument();
    });
  });

  it('requests page 2 when navigating to next page', async () => {
    const user = userEvent.setup();
    mockTeamsApi.listProjects.mockResolvedValue({ count: 25, results: mockProjects.results });
    renderPage();
    await waitFor(() => screen.getByLabelText('Page suivante'));
    await user.click(screen.getByLabelText('Page suivante'));
    await waitFor(() => {
      expect(mockTeamsApi.listProjects).toHaveBeenCalledWith('my-team', { page: 2 });
    });
  });
});
