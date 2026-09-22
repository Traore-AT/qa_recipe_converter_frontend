import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import SettingsPage from './SettingsPage';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, username: 'jdupont', email: 'jean@example.com', full_name: 'Jean Dupont', date_joined: '2025-01-01' } }) }));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('SettingsPage', () => {
  it('renders settings title', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Paramètres', level: 1 })).toBeInTheDocument();
  });

  it('shows user profile info', () => {
    renderPage();
    const names = screen.getAllByText('Jean Dupont');
    expect(names.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('jean@example.com').length).toBeGreaterThanOrEqual(1);
  });

  it('renders profile information in read-only mode', () => {
    renderPage();
    expect(screen.getByText('Prénom et nom')).toBeInTheDocument();
    expect(screen.getAllByText('jdupont').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('jean@example.com').length).toBeGreaterThanOrEqual(1);
  });

  it('shows preferences section', () => {
    renderPage();
    expect(screen.getByText('Mode sombre')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Activer ou désactiver le mode sombre' })).toBeInTheDocument();
  });

  it('shows language select', () => {
    renderPage();
    expect(screen.getByText('Langue')).toBeInTheDocument();
    expect(screen.getByText(/Français \(langue de l'application\)/)).toBeInTheDocument();
  });

  it('shows avatar section', () => {
    renderPage();
    expect(screen.getByText('Avatar')).toBeInTheDocument();
    expect(screen.getByText(/avatar de profil sera disponible/)).toBeInTheDocument();
  });

  it('does not expose a fake save action without a backend profile endpoint', async () => {
    renderPage();
    expect(screen.queryByText('Enregistrer')).not.toBeInTheDocument();
    expect(screen.getByText(/nécessite une évolution du backend/)).toBeInTheDocument();
  });

  it('explains avatar availability', () => {
    renderPage();
    expect(screen.getByText(/avatars de projet sont gérés/)).toBeInTheDocument();
  });
});
