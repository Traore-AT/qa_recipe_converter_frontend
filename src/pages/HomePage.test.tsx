import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import HomePage from './HomePage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders hero title', () => {
    renderPage();
    expect(screen.getByText(/Transformez vos Recettes QA/)).toBeInTheDocument();
  });

  it('renders hero subtitle', () => {
    renderPage();
    expect(screen.getByText(/Passez de documents Word fastidieux/)).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderPage();
    expect(screen.getAllByText('Fonctionnalités').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Processus').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tarifs').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Aide')).toBeInTheDocument();
  });

  it('renders "Commencer gratuitement" button in hero', () => {
    renderPage();
    expect(screen.getAllByRole('button', { name: 'Commencer gratuitement' }).length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to /convert on hero CTA click', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getAllByRole('button', { name: 'Commencer gratuitement' })[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/convert');
  });

  it('navigates to /login on Connexion click', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Connexion'));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('renders features section', () => {
    renderPage();
    expect(screen.getByText('Précision accrue')).toBeInTheDocument();
    expect(screen.getByText('Gain de productivité')).toBeInTheDocument();
    expect(screen.getByText('Collaboration simplifiée')).toBeInTheDocument();
  });

  it('renders process steps', () => {
    renderPage();
    expect(screen.getByText('1. Importez votre Word')).toBeInTheDocument();
    expect(screen.getByText('2. Analyse Intelligente')).toBeInTheDocument();
    expect(screen.getByText('3. Exportation Excel')).toBeInTheDocument();
  });

  it('renders collaborative space section', () => {
    renderPage();
    expect(screen.getByText('Pensé pour les QA Managers')).toBeInTheDocument();
    expect(screen.getByText('Gestion centralisée des référentiels')).toBeInTheDocument();
  });

  it('renders footer', () => {
    renderPage();
    expect(screen.getByText(/2026 QA Recipe Converter/)).toBeInTheDocument();
  });

  it('renders theme toggle button', () => {
    renderPage();
    expect(screen.getByTitle('Mode sombre')).toBeInTheDocument();
  });

  it('renders brand logo', () => {
    renderPage();
    expect(screen.getAllByText('QA Recipe Converter').length).toBeGreaterThanOrEqual(1);
  });

  it('renders "Voir la démo" button', () => {
    renderPage();
    expect(screen.getByText('Voir la démo')).toBeInTheDocument();
  });

  it('renders "Découvrir l\'espace Alpha" button', () => {
    renderPage();
    expect(screen.getByText("Découvrir l'espace Alpha")).toBeInTheDocument();
  });

  it('renders badge with IA mention', () => {
    renderPage();
    expect(screen.getByText(/Conversion par IA/)).toBeInTheDocument();
  });
});
