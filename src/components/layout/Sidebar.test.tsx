import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Sidebar } from './Sidebar';

const mockUseAuth = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../context/SidebarContext', () => ({
  useSidebar: () => ({ isOpen: false, toggle: () => {}, close: () => {} }),
}));

describe('Sidebar — section Administration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('masque la section Administration pour un simple utilisateur', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, username: 'member', is_superuser: false } });
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
    expect(screen.queryByText('Utilisateurs')).not.toBeInTheDocument();
  });

  it('affiche la section Administration pour un super admin', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, username: 'root', is_superuser: true } });
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByText('Vue d’ensemble')).toBeInTheDocument();
    expect(screen.getAllByText('Utilisateurs').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Équipes').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Projets').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Cas de test')).toBeInTheDocument();
    expect(screen.getByText('Sprints')).toBeInTheDocument();
    expect(screen.getByText('Anomalies')).toBeInTheDocument();
    expect(screen.getByText('Rapports')).toBeInTheDocument();
    expect(screen.getByText('Activité')).toBeInTheDocument();
    expect(screen.getByText('Système')).toBeInTheDocument();
  });

  it('masque la navigation classique pour un super admin', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, username: 'root', is_superuser: true } });
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Tableau de bord')).not.toBeInTheDocument();
    expect(screen.queryByText('Recettes')).not.toBeInTheDocument();
    expect(screen.queryByText('Suites de test')).not.toBeInTheDocument();
    expect(screen.queryByText('Conversion')).not.toBeInTheDocument();
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    expect(screen.queryByText('Paramètres')).not.toBeInTheDocument();
  });
});