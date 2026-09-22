import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminRoute } from './AdminRoute';

const mockUseAuth = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('AdminRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(
      <MemoryRouter>
        <AdminRoute><div>Admin Content</div></AdminRoute>
      </MemoryRouter>,
    );
    expect(screen.getByText('Chargement...')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('redirects to /login when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminRoute><div>Admin Content</div></AdminRoute>
      </MemoryRouter>,
    );
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('redirects to / when user is not a superuser', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, username: 'member', is_superuser: false }, loading: false });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminRoute><div>Admin Content</div></AdminRoute>
      </MemoryRouter>,
    );
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('renders children when user is a superuser', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, username: 'root', is_superuser: true }, loading: false });
    render(
      <MemoryRouter>
        <AdminRoute><div>Admin Content</div></AdminRoute>
      </MemoryRouter>,
    );
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });
});