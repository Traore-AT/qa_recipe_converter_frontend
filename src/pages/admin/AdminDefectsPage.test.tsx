import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../../context/ThemeContext';
import AdminDefectsPage from './AdminDefectsPage';

const mockUser = { id: 1, username: 'root', full_name: 'Root Admin', is_superuser: true };

const { mockAdminApi } = vi.hoisted(() => ({
  mockAdminApi: {
    listDefects: vi.fn(),
  },
}));

vi.mock('../../api/admin', () => ({ adminApi: mockAdminApi }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

const mockUserRef = {
  id: 2, username: 'qa_tester', email: 'qa@test.com', first_name: '', last_name: '',
  full_name: 'qa_tester', is_active: true, is_staff: false, is_superuser: false,
  last_login: null, date_joined: '2026-01-10T00:00:00Z',
};

const mockDefects = {
  count: 2,
  results: [
    {
      id: 'd1', title: 'Bouton cassé', status: 'open', severity: 'critical', priority: 'high',
      project: 'p1', project_name: 'Projet A', team_name: 'Équipe A',
      use_case: 'uc1', use_case_order: 3,
      reported_by: mockUserRef, assigned_to: null,
      created_at: '2026-09-18T10:00:00Z', updated_at: '2026-09-18T10:00:00Z',
    },
    {
      id: 'd2', title: 'Texte tronqué', status: 'resolved', severity: 'minor', priority: 'low',
      project: 'p2', project_name: 'Projet B', team_name: 'Équipe B',
      use_case: null, use_case_order: null,
      reported_by: mockUserRef, assigned_to: null,
      created_at: '2026-09-17T09:00:00Z', updated_at: '2026-09-18T10:00:00Z',
    },
  ],
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/admin/defects']}>
          <AdminDefectsPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('AdminDefectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminApi.listDefects.mockResolvedValue(mockDefects);
  });

  it('affiche le titre de la page', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Anomalies').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('affiche la liste des anomalies', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Bouton cassé')).toBeInTheDocument();
      expect(screen.getByText('Texte tronqué')).toBeInTheDocument();
    });
  });

  it('affiche sévérités et statuts', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Critique').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Ouvert').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Résolu').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('affiche les numéros de cas de test liés', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('UC#3')).toBeInTheDocument();
    });
  });
});