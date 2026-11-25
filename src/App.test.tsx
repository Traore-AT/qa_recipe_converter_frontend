import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const { me } = vi.hoisted(() => ({ me: vi.fn() }));
vi.mock('./api/client', async () => ({
  ...(await vi.importActual('./api/client')),
  default: { get: vi.fn().mockResolvedValue({ data: {} }) },
}));
vi.mock('./api/auth', () => ({ authApi: { me } }));
vi.mock('./pages/DashboardPage', () => ({ default: () => <h1>Tableau de bord connecté</h1> }));

describe('App', () => {
  beforeEach(() => window.history.pushState({}, '', '/'));

  it('sends visitors straight to the login page', async () => {
    me.mockRejectedValue(new Error('anonyme'));
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('shows the dashboard to a connected user', async () => {
    me.mockResolvedValue({ data: { id: 1, username: 'a' } });
    render(<App />);
    expect(await screen.findByText('Tableau de bord connecté')).toBeInTheDocument();
  });

  it.each(['/convert', '/recipes', '/suites', '/recherche?q=test', '/convert?project=p1'])('requires a connection for %s', async path => {
    me.mockRejectedValue(new Error('anonyme'));
    window.history.pushState({}, '', path);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    expect(window.location.pathname + window.location.search).toBe(`/login?next=${encodeURIComponent(path)}`);
  });
});
