import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import TeamCreatePage from './TeamCreatePage';

const { mockTeamsApi, mockNavigate } = vi.hoisted(() => ({
  mockTeamsApi: { createTeam: vi.fn() },
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
        <MemoryRouter>
          <TeamCreatePage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('TeamCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('Créer une équipe')).toBeInTheDocument();
  });

  it('renders breadcrumb', () => {
    renderPage();
    expect(screen.getByText('Nouvelle équipe')).toBeInTheDocument();
    expect(screen.getAllByText('Équipes').length).toBeGreaterThanOrEqual(1);
  });

  it('renders form inputs', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Ex : QA Frontend Team')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Description de l\'équipe…')).toBeInTheDocument();
  });

  it('disables submit when name is empty', () => {
    renderPage();
    const btn = screen.getByText("✅ Créer l'équipe").closest('button');
    expect(btn).toBeDisabled();
  });

  it('calls createTeam and navigates on success', async () => {
    const user = userEvent.setup();
    mockTeamsApi.createTeam.mockResolvedValue({ slug: 'new-team' });
    renderPage();
    await user.type(screen.getByPlaceholderText('Ex : QA Frontend Team'), 'My Team');
    await user.type(screen.getByPlaceholderText('Description de l\'équipe…'), 'A description');
    await user.click(screen.getByText("✅ Créer l'équipe"));
    await waitFor(() => {
      expect(mockTeamsApi.createTeam).toHaveBeenCalledWith({ name: 'My Team', description: 'A description' });
      expect(mockNavigate).toHaveBeenCalledWith('/teams/new-team');
    });
  });

  it('shows error on create failure', async () => {
    const user = userEvent.setup();
    mockTeamsApi.createTeam.mockRejectedValue({ response: { data: { name: ['Ce nom existe déjà'] } } });
    renderPage();
    await user.type(screen.getByPlaceholderText('Ex : QA Frontend Team'), 'Existing');
    await user.click(screen.getByText("✅ Créer l'équipe"));
    await waitFor(() => {
      expect(screen.getByText('Ce nom existe déjà')).toBeInTheDocument();
    });
  });

  it('navigates back on cancel', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Annuler'));
    expect(mockNavigate).toHaveBeenCalledWith('/teams');
  });
});
