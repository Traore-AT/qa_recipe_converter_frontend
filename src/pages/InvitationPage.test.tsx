import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InvitationPage from './InvitationPage';

const { mockAcceptInvitation, mockRejectInvitation, mockUseAuth, mockNavigate } = vi.hoisted(() => ({
  mockAcceptInvitation: vi.fn(),
  mockRejectInvitation: vi.fn(),
  mockUseAuth: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('../api/teams', () => ({
  teamsApi: {
    getInvitation: vi.fn().mockResolvedValue({
      team_name: 'Équipe Test',
      role: 'MEMBER',
      invited_by: { full_name: 'Jean Dupont' },
    }),
    acceptInvitation: (...args: never[]) => mockAcceptInvitation(...args),
    rejectInvitation: (...args: never[]) => mockRejectInvitation(...args),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/invitation/:token" element={<InvitationPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('InvitationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderAt('/invitation/abc-123');
    expect(mockNavigate).toHaveBeenCalledWith('/login?next=/invitation/abc-123', { replace: true });
  });

  it('renders invitation prompt with accept/reject buttons', async () => {
    mockUseAuth.mockReturnValue({ user: { email: 'test@test.com' }, loading: false });
    renderAt('/invitation/abc-123');
    await waitFor(() => {
      expect(screen.getByText('Accepter')).toBeInTheDocument();
      expect(screen.getByText('Refuser')).toBeInTheDocument();
    });
  });

  it('calls acceptInvitation on accept click', async () => {
    mockUseAuth.mockReturnValue({ user: { email: 'test@test.com' }, loading: false });
    mockAcceptInvitation.mockResolvedValue({ detail: 'OK', team_slug: 'equipe-test' });
    renderAt('/invitation/abc-123');
    await waitFor(() => expect(screen.getByText('Accepter')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Accepter'));
    await waitFor(() => {
      expect(mockAcceptInvitation).toHaveBeenCalledWith('abc-123');
    });
  });

  it('shows success page after accept', async () => {
    mockUseAuth.mockReturnValue({ user: { email: 'test@test.com' }, loading: false });
    mockAcceptInvitation.mockResolvedValue({ detail: 'OK', team_slug: 'equipe-test' });
    renderAt('/invitation/abc-123');
    await waitFor(() => expect(screen.getByText('Accepter')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Accepter'));
    await waitFor(() => {
      expect(screen.getByText('Invitation acceptée')).toBeInTheDocument();
    });
  });

  it('calls rejectInvitation on reject click', async () => {
    mockUseAuth.mockReturnValue({ user: { email: 'test@test.com' }, loading: false });
    mockRejectInvitation.mockResolvedValue({ detail: 'OK' });
    renderAt('/invitation/abc-123');
    await waitFor(() => expect(screen.getByText('Refuser')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Refuser'));
    await waitFor(() => {
      expect(mockRejectInvitation).toHaveBeenCalledWith('abc-123');
    });
  });

  it('shows rejection page after reject', async () => {
    mockUseAuth.mockReturnValue({ user: { email: 'test@test.com' }, loading: false });
    mockRejectInvitation.mockResolvedValue({ detail: 'OK' });
    renderAt('/invitation/abc-123');
    await waitFor(() => expect(screen.getByText('Refuser')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Refuser'));
    await waitFor(() => {
      expect(screen.getByText('Invitation refusée')).toBeInTheDocument();
    });
  });

  it('shows error page on failure', async () => {
    mockUseAuth.mockReturnValue({ user: { email: 'test@test.com' }, loading: false });
    mockAcceptInvitation.mockRejectedValue({
      response: { data: { error: 'Invitation expirée.' } },
    });
    renderAt('/invitation/abc-123');
    await waitFor(() => expect(screen.getByText('Accepter')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Accepter'));
    await waitFor(() => {
      expect(screen.getByText('Erreur')).toBeInTheDocument();
      expect(screen.getByText('Invitation expirée.')).toBeInTheDocument();
    });
  });
});
