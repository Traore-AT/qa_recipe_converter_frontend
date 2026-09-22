import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', full_name: 'Test User', date_joined: '2025-01-01' };

const { mockAuthApi } = vi.hoisted(() => ({
  mockAuthApi: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../api/auth', () => ({
  authApi: mockAuthApi,
}));

function TestComponent() {
  const { user, loading, login, register, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? 'loading' : 'loaded'}</span>
      <span data-testid="user">{user ? user.username : 'null'}</span>
      <button data-testid="login-btn" onClick={() => login('u', 'p')}>Login</button>
      <button data-testid="register-btn" onClick={() => register({ username: 'u', email: 'e@e.com', password: 'p' })}>Register</button>
      <button data-testid="logout-btn" onClick={() => logout()}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls authApi.me on mount and sets user', async () => {
    mockAuthApi.me.mockResolvedValue({ data: mockUser });
    render(<AuthProvider><TestComponent /></AuthProvider>);
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    });
    expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
  });

  it('sets user to null when me() fails', async () => {
    mockAuthApi.me.mockRejectedValue(new Error('Unauthorized'));
    render(<AuthProvider><TestComponent /></AuthProvider>);
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });
  });

  it('login sets user', async () => {
    mockAuthApi.me.mockRejectedValue(new Error('Unauthorized'));
    mockAuthApi.login.mockResolvedValue({ data: mockUser });
    render(<AuthProvider><TestComponent /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('loaded'));
    await userEvent.click(screen.getByTestId('login-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    });
  });

  it('register sets user', async () => {
    mockAuthApi.me.mockRejectedValue(new Error('Unauthorized'));
    mockAuthApi.register.mockResolvedValue({ data: mockUser });
    render(<AuthProvider><TestComponent /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('loaded'));
    await userEvent.click(screen.getByTestId('register-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    });
  });

  it('logout clears user', async () => {
    mockAuthApi.me.mockResolvedValue({ data: mockUser });
    mockAuthApi.logout.mockResolvedValue({});
    render(<AuthProvider><TestComponent /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('testuser'));
    await userEvent.click(screen.getByTestId('logout-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });
  });
});

describe('useAuth', () => {
  it('throws error when used outside provider', () => {
    expect(() => render(<TestComponent />)).toThrow('useAuth must be used within AuthProvider');
  });
});
