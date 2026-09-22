import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import CreateProjectPage from './CreateProjectPage';

const { mockTeamsApi, mockNavigate } = vi.hoisted(() => ({
  mockTeamsApi: { createProject: vi.fn() },
  mockNavigate: vi.fn(),
}));

vi.mock('../api/teams', () => ({ teamsApi: mockTeamsApi }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, username: 'test', email: 'test@test.com', full_name: 'Test User', date_joined: '2025-01-01' } }) }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/teams/my-team/projects/new']}>
          <Routes>
            <Route path="/teams/:slug/projects/new" element={<CreateProjectPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('CreateProjectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('Créer un projet')).toBeInTheDocument();
  });

  it('renders breadcrumb', () => {
    renderPage();
    expect(screen.getByText('Nouveau projet')).toBeInTheDocument();
    expect(screen.getAllByText('Équipe').length).toBeGreaterThanOrEqual(1);
  });

  it('shows live preview banner', () => {
    renderPage();
    expect(screen.getAllByText('Nom du projet').length).toBeGreaterThanOrEqual(1);
  });

  it('renders form inputs', () => {
    renderPage();
    expect(screen.getByPlaceholderText('ex: Système E-commerce v2')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Description du projet...')).toBeInTheDocument();
  });

  it('updates preview when name changes', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByPlaceholderText('ex: Système E-commerce v2');
    await user.type(input, 'My Project');
    expect(screen.getByText('My Project')).toBeInTheDocument();
  });

  it('renders icon selector', () => {
    renderPage();
    expect(screen.getByText('Icône')).toBeInTheDocument();
  });

  it('renders color selector', () => {
    renderPage();
    expect(screen.getByText('Couleur')).toBeInTheDocument();
  });

  it('renders visibility options', () => {
    renderPage();
    expect(screen.getByText('Privé')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.getAllByText('Équipe').length).toBeGreaterThanOrEqual(1);
  });

  it('calls createProject and navigates on success', async () => {
    const user = userEvent.setup();
    mockTeamsApi.createProject.mockResolvedValue({ slug: 'new-project' });
    renderPage();
    await user.type(screen.getByPlaceholderText('ex: Système E-commerce v2'), 'Test Project');
    await user.click(screen.getByText('Créer le projet'));
    await waitFor(() => {
      expect(mockTeamsApi.createProject).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/teams/my-team/projects/new-project');
    });
  });

  it('shows error on create failure', async () => {
    const user = userEvent.setup();
    mockTeamsApi.createProject.mockRejectedValue({ response: { data: { name: ['Ce nom existe déjà'] } } });
    renderPage();
    await user.type(screen.getByPlaceholderText('ex: Système E-commerce v2'), 'Existing');
    await user.click(screen.getByText('Créer le projet'));
    await waitFor(() => {
      expect(screen.getByText('Ce nom existe déjà')).toBeInTheDocument();
    });
  });

  it('navigates back on cancel', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Annuler'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
