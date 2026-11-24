import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import DefectTrackerPage from './DefectTrackerPage';

const mockUser = { id: 1, username: 'lead', email: 'lead@test.com', full_name: 'Lead QA', date_joined: '2025-01-01' };

const { mockTeamsApi } = vi.hoisted(() => ({
  mockTeamsApi: {
    listDefects: vi.fn(),
    getDefectStats: vi.fn(),
    listAssignableMembers: vi.fn(),
    getProject: vi.fn(),
    listSprints: vi.fn(),
    listAssignments: vi.fn(),
    getProjectProgress: vi.fn(),
    listRegressions: vi.fn(),
    listDefectComments: vi.fn(),
    getDefectHistory: vi.fn(),
    createDefectComment: vi.fn(),
    deleteDefect: vi.fn(),
    getQaSettings: vi.fn(),
    pushDefectToJira: vi.fn(),
    downloadDefectsExcel: vi.fn(),
    getRegressionCampaign: vi.fn(),
    createRegressionCampaign: vi.fn(),
    createDefect: vi.fn(),
    updateDefect: vi.fn(),
  },
}));

vi.mock('../api/teams', () => ({ teamsApi: mockTeamsApi }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

const mockDefects = {
  count: 2,
  results: [
    { id: 'd1', use_case: null, project: 'p1', title: 'Login bug', description: 'Cannot login with valid credentials', severity: 'critical', priority: 'high', status: 'open', reported_by: 1, reported_by_user: mockUser, assigned_to: 2, assigned_to_user: { id: 2, username: 'tester', full_name: 'Tester User', email: 'tester@test.com', date_joined: '' }, steps_to_reproduce: '1. Go to login\n2. Enter valid credentials\n3. Click login', expected_behavior: 'Should login', actual_behavior: 'Error 500', environment: '', attachment: null, created_at: '2026-06-01T10:00:00Z', updated_at: '2026-06-01T10:00:00Z' },
    { id: 'd2', use_case: null, project: 'p1', title: 'UI glitch', description: 'Button misaligned on mobile', severity: 'minor', priority: 'low', status: 'resolved', reported_by: 2, reported_by_user: { id: 2, username: 'tester', full_name: 'Tester User', email: 'tester@test.com', date_joined: '' }, assigned_to: null, assigned_to_user: null, steps_to_reproduce: '', expected_behavior: '', actual_behavior: '', environment: 'Chrome mobile', attachment: null, created_at: '2026-05-30T10:00:00Z', updated_at: '2026-06-01T10:00:00Z' },
  ],
};

const mockStats = {
  total: 2, open: 1, in_progress: 0, resolved: 1, closed: 0,
  critical: 1, major: 0, minor: 1,
  by_severity: { critical: 1, major: 0, minor: 1, trivial: 0 },
  by_priority: { high: 1, medium: 0, low: 1 },
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/teams/qa-team/projects/qa-project/defects']}>
          <Routes>
            <Route path="/teams/:slug/projects/:projectSlug/defects" element={<DefectTrackerPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('DefectTrackerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamsApi.listDefects.mockResolvedValue(mockDefects);
    mockTeamsApi.getDefectStats.mockResolvedValue(mockStats);
    mockTeamsApi.listAssignableMembers.mockResolvedValue({ count: 1, results: [{ user: { id: 2, username: 'tester', full_name: 'Tester User' }, team_role: 'member', project_member_id: null, in_project: false }] });
    mockTeamsApi.getProject.mockResolvedValue({ id: 'p1', can_write: true, can_manage: true });
    mockTeamsApi.getQaSettings.mockResolvedValue({ jira_configured: true, jira_enabled: true });
    mockTeamsApi.getRegressionCampaign.mockResolvedValue({ all: 3, active: 1 });
    mockTeamsApi.listSprints.mockResolvedValue({ count: 1, results: [{ id: 's1', name: 'Sprint 1' }] });
    mockTeamsApi.getProjectProgress.mockResolvedValue({ use_cases: [{ id: 'uc1', case_number: 1, use_case_text: 'Connexion' }] });
    mockTeamsApi.listAssignments.mockResolvedValue({ count: 3, results: [
      { use_case: 'uc7', case_number: 7, use_case_text: 'Paiement' }, { use_case: 'uc7', case_number: 7, use_case_text: 'Paiement' },
      { use_case: 'uc8', case_number: 8, use_case_text: 'Facture' },
    ] });
    mockTeamsApi.listRegressions.mockResolvedValue({ count: 1, active: 1, results: [{ use_case: 'uc7', case_number: 7, title: 'Paiement', current_status: 'Échoué', is_active: true, occurrences: 2, last_detected_at: '2026-06-03T10:00:00Z', detected_by: 'Binta', sprint: 's1', sprint_name: 'Sprint 1', defects: [] }] });
    mockTeamsApi.listDefectComments.mockResolvedValue({ count: 1, results: [{ id: 'c1', author: mockUser, content: 'Reproduit en recette', created_at: '2026-06-02T10:00:00Z' }] });
    mockTeamsApi.getDefectHistory.mockResolvedValue({ count: 1, results: [{ id: 'h1', actor: mockUser, field: 'Statut', old_value: 'Ouvert', new_value: 'En cours', created_at: '2026-06-02T10:00:00Z' }] });
  });

  it('renders page title', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Suivi des anomalies')).toBeInTheDocument();
    });
  });

  it('renders stats cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('Ouverts')).toBeInTheDocument();
      expect(screen.getByText('Résolus')).toBeInTheDocument();
      expect(screen.getByText('Fermés')).toBeInTheDocument();
    });
  });

  it('renders stat values', async () => {
    renderPage();
    await waitFor(() => {
      const totalElements = screen.getAllByText('2');
      expect(totalElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders defect cards with titles', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Login bug')).toBeInTheDocument();
      expect(screen.getByText('UI glitch')).toBeInTheDocument();
    });
  });

  it('renders severity badges', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Critique').length).toBeGreaterThan(1);
      expect(screen.getAllByText('Mineure').length).toBeGreaterThan(1);
    });
  });

  it('shows reported by info', async () => {
    renderPage();
    await waitFor(() => {
      const elements = screen.getAllByText(/Signalé par/);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows filter buttons', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Tous')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ouvert' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Résolu' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Réouvert' })).toBeInTheDocument();
    });
  });

  it('opens create modal on button click', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('+ Signaler une anomalie'));
    await user.click(screen.getByText('+ Signaler une anomalie'));
    expect(screen.getByText('Signaler une anomalie')).toBeInTheDocument();
  });

  it('creates a defect via modal', async () => {
    mockTeamsApi.createDefect.mockResolvedValue({ id: 'd3', title: 'New bug', severity: 'major', status: 'open', reported_by_user: mockUser });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('+ Signaler une anomalie'));
    await user.click(screen.getByText('+ Signaler une anomalie'));
    await user.type(screen.getByLabelText('Titre *'), 'New bug');
    await user.click(screen.getByText('✅ Signaler'));
    await waitFor(() => {
      expect(mockTeamsApi.createDefect).toHaveBeenCalled();
    });
  });

  it('filters by status', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Résolu' }));
    await waitFor(() => {
      expect(mockTeamsApi.listDefects).toHaveBeenCalledWith(
        'qa-team', 'qa-project', { status: 'resolved', page: 1 }
      );
    });
  });

  it('renders pagination when more than 20 defects', async () => {
    mockTeamsApi.listDefects.mockResolvedValue({
      count: 25,
      results: mockDefects.results,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText('Pagination des anomalies')).toBeInTheDocument();
    });
  });

  it('navigates to next page via pagination', async () => {
    mockTeamsApi.listDefects.mockResolvedValue({
      count: 25,
      results: mockDefects.results,
    });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByLabelText('Page suivante'));
    await user.click(screen.getByLabelText('Page suivante'));
    await waitFor(() => {
      expect(mockTeamsApi.listDefects).toHaveBeenCalledWith(
        'qa-team', 'qa-project', { page: 2 }
      );
    });
  });

  it('updates defect status via dropdown', async () => {
    mockTeamsApi.updateDefect.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage();
    const select = await screen.findByLabelText('Statut de Login bug');
    await waitFor(() => expect(select).toBeEnabled());
    await user.selectOptions(select, 'resolved');
    await waitFor(() => expect(mockTeamsApi.updateDefect).toHaveBeenCalledWith('qa-team', 'qa-project', 'd1', { status: 'resolved' }));
  });

  it('is read-only for viewers', async () => {
    mockTeamsApi.getProject.mockResolvedValue({ id: 'p1', can_write: false, can_manage: false });
    renderPage();
    expect(await screen.findByLabelText('Statut de Login bug')).toBeDisabled();
    expect(screen.queryByText('+ Signaler une anomalie')).not.toBeInTheDocument();
  });

  it('associates a defect with cases of a given sprint', async () => {
    mockTeamsApi.createDefect.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByText('+ Signaler une anomalie'));
    await user.type(screen.getByLabelText('Titre *'), 'Paiement refusé');
    await user.selectOptions(await screen.findByLabelText('Sprint'), 's1');
    await screen.findByRole('option', { name: 'CAS-007 — Paiement' });
    await user.selectOptions(screen.getByLabelText('Cas de test'), 'uc7');
    await user.click(await screen.findByRole('checkbox', { name: /CAS-008/ }));
    await user.click(screen.getByText('✅ Signaler'));
    await waitFor(() => expect(mockTeamsApi.createDefect).toHaveBeenCalledWith('qa-team', 'qa-project',
      expect.objectContaining({ sprint: 's1', use_case: 'uc7', related_use_cases: ['uc8'], assigned_to: null })));
    expect(mockTeamsApi.listAssignments).toHaveBeenCalledWith('qa-team', 'qa-project', { sprint: 's1' });
  });

  it('shows API validation errors in the form', async () => {
    mockTeamsApi.createDefect.mockRejectedValue({ response: { status: 400, data: { use_case: 'Cas absent du sprint' } } });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByText('+ Signaler une anomalie'));
    await user.type(screen.getByLabelText('Titre *'), 'X');
    await user.click(screen.getByText('✅ Signaler'));
    expect((await screen.findAllByText('Cas absent du sprint')).length).toBeGreaterThan(0);
  });

  it('opens the detail with comments and history, then comments', async () => {
    mockTeamsApi.createDefectComment.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Login bug' }));
    expect(await screen.findByText('Reproduit en recette')).toBeInTheDocument();
    expect(screen.getByText(/Ouvert → En cours/)).toBeInTheDocument();
    await user.type(await screen.findByLabelText('Nouveau commentaire'), 'Corrigé');
    await user.click(screen.getByText('Envoyer'));
    await waitFor(() => expect(mockTeamsApi.createDefectComment).toHaveBeenCalledWith('qa-team', 'qa-project', 'd1', 'Corrigé'));
  });

  it('edits a defect', async () => {
    mockTeamsApi.updateDefect.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Login bug' }));
    await user.click(await screen.findByRole('button', { name: 'Modifier' }));
    await user.type(screen.getByLabelText('Résolution / cause racine'), 'Jeton expiré');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(mockTeamsApi.updateDefect).toHaveBeenCalledWith('qa-team', 'qa-project', 'd1',
      expect.objectContaining({ title: 'Login bug', resolution: 'Jeton expiré', assigned_to: '2' })));
  });

  it('asks for confirmation before deleting', async () => {
    mockTeamsApi.deleteDefect.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Login bug' }));
    await user.click(await screen.findByRole('button', { name: 'Supprimer' }));
    expect(mockTeamsApi.deleteDefect).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(mockTeamsApi.deleteDefect).toHaveBeenCalledWith('qa-team', 'qa-project', 'd1'));
  });

  it('filters by sprint and regression', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('option', { name: 'Sprint 1' });
    await user.selectOptions(screen.getByLabelText('Filtrer par sprint'), 's1');
    await user.selectOptions(screen.getByLabelText('Filtrer les régressions'), 'true');
    await waitFor(() => expect(mockTeamsApi.listDefects).toHaveBeenLastCalledWith('qa-team', 'qa-project', { sprint: 's1', regression: 'true', page: 1 }));
  });

  it('lists regressions and creates the linked defect', async () => {
    mockTeamsApi.createDefect.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('tab', { name: 'Régressions (1)' }));
    expect(screen.getByText('2 occurrences')).toBeInTheDocument();
    await user.click(await screen.findByText('🐛 Créer l’anomalie'));
    await user.click(screen.getByText('✅ Signaler'));
    await waitFor(() => expect(mockTeamsApi.createDefect).toHaveBeenCalledWith('qa-team', 'qa-project',
      expect.objectContaining({ title: 'Régression CAS-007 — Paiement', sprint: 's1', use_case: 'uc7', is_regression: true })));
  });

  it('handles empty defects', async () => {
    mockTeamsApi.listDefects.mockResolvedValue({ count: 0, results: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Aucune anomalie signalée')).toBeInTheDocument();
    });
  });

  it('exports the filtered defects to Excel', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(await screen.findByLabelText('Filtrer par sévérité'), 'critical');
    await user.click(screen.getByText('📊 Exporter en Excel'));
    await waitFor(() => expect(mockTeamsApi.downloadDefectsExcel).toHaveBeenCalledWith('qa-team', 'qa-project', { severity: 'critical' }));
  });

  it('launches a regression campaign in one click', async () => {
    mockTeamsApi.createRegressionCampaign.mockRejectedValueOnce({ response: { status: 400, data: { error: 'Refusé' } } });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('tab', { name: 'Régressions (1)' }));
    await user.click(await screen.findByText(/Lancer une campagne de non-régression/));
    await user.click(await screen.findByRole('button', { name: 'Lancer la campagne (3 cas)' }));
    expect(await screen.findByText('Refusé')).toBeInTheDocument();
    expect(mockTeamsApi.createRegressionCampaign).toHaveBeenCalledWith('qa-team', 'qa-project',
      expect.objectContaining({ scope: 'all', duration_days: 7, reset_status: true }));
    await user.selectOptions(screen.getByLabelText('Cas à rejouer'), 'active');
    expect(screen.getByRole('button', { name: 'Lancer la campagne (1 cas)' })).toBeEnabled();
  });

  it('shows the Jira link, sends and retries', async () => {
    mockTeamsApi.pushDefectToJira.mockRejectedValue({ response: { status: 502, data: { error: 'Jira est injoignable.' } } });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Login bug' }));
    await user.click(await screen.findByText('Envoyer vers Jira'));
    expect(await screen.findByText('Jira est injoignable.')).toBeInTheDocument();
    expect(mockTeamsApi.pushDefectToJira).toHaveBeenCalledWith('qa-team', 'qa-project', 'd1');
  });

  it('links an already synchronised defect and shows external comments', async () => {
    mockTeamsApi.listDefects.mockResolvedValue({ count: 1, results: [{ ...mockDefects.results[0], jira_key: 'QA-9', jira_url: 'https://jira/browse/QA-9', jira_sync_error: 'Transition absente' }] });
    mockTeamsApi.listDefectComments.mockResolvedValue({ count: 1, results: [{ id: 'c', author: null, external_author: 'Awa (Jira)', content: 'Ok', created_at: '2026-06-02T10:00:00Z' }] });
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('Jira : erreur')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Login bug' }));
    expect(await screen.findByRole('link', { name: 'QA-9' })).toHaveAttribute('href', 'https://jira/browse/QA-9');
    expect(await screen.findByText(/Awa \(Jira\)/)).toBeInTheDocument();
    expect(await screen.findByText('Réessayer l’envoi')).toBeInTheDocument();
  });
});
