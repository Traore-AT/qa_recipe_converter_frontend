import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import ComponentsPage from './ComponentsPage';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, username: 'test', email: 'test@test.com', full_name: 'Test User', date_joined: '2025-01-01' } }) }));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter>
          <ComponentsPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('ComponentsPage', () => {
  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('Planche de composants')).toBeInTheDocument();
  });

  it('renders typography section', () => {
    renderPage();
    expect(screen.getByText('Typographie')).toBeInTheDocument();
    expect(screen.getByText('Headline LG (32px Bold)')).toBeInTheDocument();
    expect(screen.getByText('Headline MD (24px Bold)')).toBeInTheDocument();
    expect(screen.getByText('Headline SM (18px Semi-Bold)')).toBeInTheDocument();
  });

  it('renders buttons section', () => {
    renderPage();
    expect(screen.getByText('Boutons')).toBeInTheDocument();
    expect(screen.getAllByText('Primary').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Secondary')).toBeInTheDocument();
    expect(screen.getByText('Ghost')).toBeInTheDocument();
    expect(screen.getByText('Danger')).toBeInTheDocument();
  });

  it('renders button size variants', () => {
    renderPage();
    expect(screen.getByText('Small')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Large')).toBeInTheDocument();
  });

  it('renders button states', () => {
    renderPage();
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('renders badges section', () => {
    renderPage();
    expect(screen.getByText('Badges & Status')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('renders StatusPill variants', () => {
    renderPage();
    expect(screen.getByText('Passé')).toBeInTheDocument();
    expect(screen.getByText('Échoué')).toBeInTheDocument();
    expect(screen.getByText('Bloqué')).toBeInTheDocument();
  });

  it('renders forms section', () => {
    renderPage();
    expect(screen.getByText('Formulaires')).toBeInTheDocument();
    expect(screen.getByText('Texte')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Mot de passe')).toBeInTheDocument();
  });

  it('renders toggle section', () => {
    renderPage();
    expect(screen.getByText('Toggle')).toBeInTheDocument();
    expect(screen.getByText('Option activée')).toBeInTheDocument();
    expect(screen.getByText('Option désactivée')).toBeInTheDocument();
  });

  it('renders cards section', () => {
    renderPage();
    expect(screen.getByText('Cartes')).toBeInTheDocument();
    expect(screen.getByText('Card standard avec padding')).toBeInTheDocument();
    expect(screen.getByText('Card sans padding')).toBeInTheDocument();
    expect(screen.getByText('Card survolable')).toBeInTheDocument();
  });

  it('renders section with error state', () => {
    renderPage();
    expect(screen.getByText('Avec erreur')).toBeInTheDocument();
    expect(screen.getByText('Ce champ est requis')).toBeInTheDocument();
  });
});
