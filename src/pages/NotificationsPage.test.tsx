import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import NotificationsPage from './NotificationsPage';

const mockUser = { id: 1, username: 'lead', email: 'lead@test.com', full_name: 'Lead QA', date_joined: '2025-01-01' };

const { mockTeamsApi } = vi.hoisted(() => ({
  mockTeamsApi: {
    getNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
}));

vi.mock('../api/teams', () => ({ teamsApi: mockTeamsApi }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

const mockNotifications = {
  results: [
    {
      id: 'n1',
      actor: { id: 2, username: 'alice', email: 'alice@test.com', full_name: 'Alice Testeuse', date_joined: '2025-01-01' },
      description: 'Nouvelle anomalie signalée',
      project: 'Projet Application',
      is_read: false,
      created_at: '2026-09-01T10:00:00Z',
    },
    {
      id: 'n2',
      actor: { id: 2, username: 'alice', email: 'alice@test.com', full_name: 'Alice Testeuse', date_joined: '2025-01-01' },
      description: 'Cas assigné: TC001',
      project: 'Projet Application',
      is_read: true,
      created_at: '2026-09-02T14:00:00Z',
    },
  ],
  count: 2,
  unread_count: 1,
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/notifications']}>
          <NotificationsPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamsApi.getNotifications.mockResolvedValue(mockNotifications);
    mockTeamsApi.markNotificationRead.mockResolvedValue({});
    mockTeamsApi.markAllNotificationsRead.mockResolvedValue({});
  });

  it('renders notifications list', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Notifications', level: 1 })).toBeInTheDocument();
      expect(screen.getByText('Nouvelle anomalie signalée')).toBeInTheDocument();
      expect(screen.getByText('Cas assigné: TC001')).toBeInTheDocument();
    });
  });

  it('shows unread count label', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('1 notification non lue')).toBeInTheDocument();
    });
  });

  it('marks individual notification as read', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Nouvelle anomalie signalée')).toBeInTheDocument();
    });
    await user.click(screen.getAllByText('Marquer comme lu')[0]);
    await waitFor(() => {
      expect(mockTeamsApi.markNotificationRead).toHaveBeenCalledWith('n1');
    });
  });

  it('marks all notifications as read', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Tout marquer comme lu')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Tout marquer comme lu'));
    await waitFor(() => {
      expect(mockTeamsApi.markAllNotificationsRead).toHaveBeenCalled();
    });
  });

  it('shows empty state when no notifications', async () => {
    mockTeamsApi.getNotifications.mockResolvedValue({ results: [], count: 0, unread_count: 0 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Aucune notification')).toBeInTheDocument();
    });
  });

  it('shows error state on failure', async () => {
    mockTeamsApi.getNotifications.mockRejectedValue(new Error('Erreur réseau'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger les notifications/)).toBeInTheDocument();
    });
  });
});