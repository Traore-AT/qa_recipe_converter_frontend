import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from './LoginPage';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock('../context/ThemeContext', () => ({ useTheme: () => ({ dark: false, toggle: vi.fn() }) }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Connexion')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('exemple@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument();
  });

  it('calls login and navigates on success', async () => {
    mockLogin.mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    await userEvent.type(screen.getByPlaceholderText('exemple@email.com'), 'admin');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'password');
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('shows error message on failed login', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    await userEvent.type(screen.getByPlaceholderText('exemple@email.com'), 'admin');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('renders link to register page', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Pas encore de compte ?')).toBeInTheDocument();
  });

  const renderAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><LoginPage /></MemoryRouter>);
  const submit = async () => {
    await userEvent.type(screen.getByLabelText("Email ou nom d'utilisateur"), ' admin ');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
  };

  it('returns to the requested page and keeps it on the register link', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderAt('/login?next=%2Fteams%2Fqa%3Ftab%3D1');
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute('href', '/register?next=%2Fteams%2Fqa%3Ftab%3D1');
    await submit();
    expect(mockLogin).toHaveBeenCalledWith('admin', 'password');
    expect(mockNavigate).toHaveBeenCalledWith('/teams/qa?tab=1', { replace: true });
  });

  it.each(['//evil.example', 'https://evil.example', '/\\evil.example', '/login'])('ignores unsafe destination %s', async next => {
    mockLogin.mockResolvedValue(undefined);
    renderAt(`/login?next=${encodeURIComponent(next)}`);
    await submit();
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('toggles password visibility accessibly', async () => {
    renderAt('/login');
    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }));
    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Masquer le mot de passe' })).toBeInTheDocument();
  });

  it('warns about caps lock and announces errors', async () => {
    mockLogin.mockRejectedValue(new Error('Refusé'));
    renderAt('/login');
    await userEvent.type(screen.getByLabelText('Mot de passe'), '{CapsLock}a');
    expect(screen.getByText('Verrouillage des majuscules activé.')).toBeInTheDocument();
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Refusé');
  });
});
