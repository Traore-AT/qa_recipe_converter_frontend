import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../../context/ThemeContext';
import { ToastProvider } from '../../components/ui/Toast';
import AdminUsersPage from './AdminUsersPage';

const mockUser = { id: 1, username: 'root', email: 'root@test.com', full_name: 'Root Admin', is_superuser: true, is_staff: true };

const { mockAdminApi } = vi.hoisted(() => ({
  mockAdminApi: {
    listUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    resetUserPassword: vi.fn(),
  },
}));

vi.mock('../../api/admin', () => ({ adminApi: mockAdminApi }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

const mockUsers = {
  count: 2,
  results: [
    {
      id: 1, username: 'root', email: 'root@test.com', first_name: 'Root', last_name: 'Admin',
      full_name: 'Root Admin', is_active: true, is_staff: true, is_superuser: true,
      last_login: null, date_joined: '2026-01-10T00:00:00Z', teams_count: 0, projects_count: 0,
    },
    {
      id: 2, username: 'member', email: 'member@test.com', first_name: 'Jane', last_name: 'Doe',
      full_name: 'Jane Doe', is_active: false, is_staff: false, is_superuser: false,
      last_login: null, date_joined: '2026-02-15T00:00:00Z', teams_count: 2, projects_count: 3,
    },
  ],
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={['/admin/users']}>
            <AdminUsersPage />
          </MemoryRouter>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminApi.listUsers.mockResolvedValue(mockUsers);
  });

  it('affiche le titre de la page', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Gestion des utilisateurs')).toBeInTheDocument();
    });
  });

  it('affiche la liste des utilisateurs', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Root Admin').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Jane Doe').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('affiche les rôles et statuts', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Super admin')).toBeInTheDocument();
      expect(screen.getByText('Désactivé')).toBeInTheDocument();
    });
  });

  it('ouvre la modale de création d’utilisateur', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Gestion des utilisateurs')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /Nouvel utilisateur/ }));
    await waitFor(() => {
      expect(screen.getAllByText('Nouvel utilisateur').length).toBeGreaterThanOrEqual(2);
    });
  });
});