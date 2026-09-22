import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../../context/ThemeContext';
import { Topbar } from './Topbar';

const { mockTeamsApi, mockToggleSidebar } = vi.hoisted(() => ({
  mockTeamsApi: {
    getNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
  mockToggleSidebar: vi.fn(),
}));

vi.mock('../../api/teams', () => ({ teamsApi: mockTeamsApi }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, username: 'qa', email: 'qa@test.com', full_name: 'QA User', date_joined: '2025-01-01' } }),
}));
vi.mock('../../context/SidebarContext', () => ({ useSidebar: () => ({ toggle: mockToggleSidebar }) }));

function renderTopbar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter>
          <Topbar />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('Topbar notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamsApi.getNotifications.mockResolvedValue({
      unread_count: 2,
      results: [{
        id: 'notification-1',
        project: null,
        team: null,
        actor: { id: 2, username: 'lead', email: 'lead@test.com', full_name: 'Lead QA', date_joined: '2025-01-01' },
        action_type: 'assignment',
        description: 'Un cas vous a été assigné.',
        metadata: {},
        created_at: '2026-09-20T10:00:00Z',
        is_read: false,
      }],
    });
    mockTeamsApi.markAllNotificationsRead.mockResolvedValue({ detail: 'Tout marqué comme lu.' });
    mockTeamsApi.markNotificationRead.mockResolvedValue({ detail: 'Marqué comme lu.' });
  });

  it('affiche le compteur et les notifications', async () => {
    renderTopbar();
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }));

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Un cas vous a été assigné.')).toBeInTheDocument();
  });

  it('marque toutes les notifications comme lues', async () => {
    const user = userEvent.setup();
    renderTopbar();
    await user.click(await screen.findByRole('button', { name: 'Notifications' }));
    await user.click(screen.getByRole('button', { name: 'Tout marquer comme lu' }));

    await waitFor(() => {
      expect(mockTeamsApi.markAllNotificationsRead).toHaveBeenCalledTimes(1);
    });
  });
});
