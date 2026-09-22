import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RegisterPage from './RegisterPage';

const mockRegister = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ register: mockRegister }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Créer un compte')).toBeInTheDocument();
    expect(screen.getByLabelText('Prénom')).toBeInTheDocument();
    expect(screen.getByLabelText('Nom')).toBeInTheDocument();
    expect(screen.getByLabelText("Nom d'utilisateur")).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmer le mot de passe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer mon compte' })).toBeInTheDocument();
  });

  it('calls register and navigates on success', async () => {
    mockRegister.mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );
    await userEvent.type(screen.getByLabelText('Prénom'), 'John');
    await userEvent.type(screen.getByLabelText('Nom'), 'Doe');
    await userEvent.type(screen.getByLabelText("Nom d'utilisateur"), 'johndoe');
    await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'password123');
    await userEvent.type(screen.getByLabelText('Confirmer le mot de passe'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'johndoe',
        email: 'john@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows error message on failed register', async () => {
    mockRegister.mockRejectedValue({ response: { data: { username: ['This username is already taken.'] } } });
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );
    await userEvent.type(screen.getByLabelText("Nom d'utilisateur"), 'existing');
    await userEvent.type(screen.getByLabelText('Email'), 'e@e.com');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'password123');
    await userEvent.type(screen.getByLabelText('Confirmer le mot de passe'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() => {
      expect(screen.getByText('This username is already taken.')).toBeInTheDocument();
    });
  });

  it('shows generic error when response has no data', async () => {
    mockRegister.mockRejectedValue(new Error('Network error'));
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );
    await userEvent.type(screen.getByLabelText("Nom d'utilisateur"), 'johndoe');
    await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'password123');
    await userEvent.type(screen.getByLabelText('Confirmer le mot de passe'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('renders link to login page', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Se connecter')).toBeInTheDocument();
  });
});
