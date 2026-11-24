import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import SprintBoardPage from './SprintBoardPage';

const mockUser = { id: 1, username: 'lead', email: 'lead@test.com', full_name: 'Lead QA', date_joined: '2025-01-01' };

const { mockTeamsApi, mockNavigate } = vi.hoisted(() => ({
  mockTeamsApi: {
    getTeam: vi.fn(),
    listSprints: vi.fn(),
    getSprintBoard: vi.fn(),
    listAssignableMembers: vi.fn(),
    listAssignments: vi.fn(),
    getProjectProgress: vi.fn(),
    createDefect: vi.fn(),
    updateSprint: vi.fn(),
    downloadProjectReport: vi.fn(),
    sendSprintReport: vi.fn(),
    getCarryOver: vi.fn(),
    carryOver: vi.fn(),
    importTestResults: vi.fn(),
    getUnassignedUseCases: vi.fn(),
    createSprint: vi.fn(),
    createAssignments: vi.fn(),
    updateUseCaseStatus: vi.fn(),
    getUseCaseDetail: vi.fn(),
    createSprintCase: vi.fn(),
    updateSprintCase: vi.fn(),
    deleteAssignment: vi.fn(),
    createUseCaseComment: vi.fn(),
  },
  mockNavigate: vi.fn(),
}));

vi.mock('../api/teams', () => ({ teamsApi: mockTeamsApi }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockSprints = {
  count: 2,
  results: [
    { id: 's1', project: 'p1', name: 'Sprint 1', goal: 'Test critical paths', start_date: '2026-06-01', end_date: '2026-06-14', status: 'active', duration_days: 13, created_by: mockUser, stats: { total: 3, passed: 1, failed: 0, blocked: 0, in_progress: 1, not_run: 1, progress_pct: 33.3 }, created_at: '2026-06-01', updated_at: '2026-06-01' },
    { id: 's2', project: 'p1', name: 'Sprint 0', goal: 'Setup', start_date: '2026-05-15', end_date: '2026-05-28', status: 'completed', duration_days: 13, created_by: mockUser, stats: { total: 2, passed: 2, failed: 0, blocked: 0, in_progress: 0, not_run: 0, progress_pct: 100 }, created_at: '2026-05-15', updated_at: '2026-05-28' },
  ],
};

const mockBoard = {
  sprint: mockSprints.results[0],
  columns: {
    'À tester': [
      { id: 'a1', use_case: 'uc1', case_number: 1, use_case_order: 1, use_case_text: 'TC001', use_case_id_str: 'TC001', use_case_desc: 'Login test', description: 'Login test', preconditions: '', steps: '', expected_results: '', observed_results: '', sprint: 's1', assigned_to: 'pm1', assigned_to_user: { id: 2, username: 'tester', full_name: 'Tester User', email: 'tester@test.com', date_joined: '' }, assigned_by: '1', assigned_by_user: mockUser, assigned_at: '2026-06-01', status: 'À tester', jira_ticket: 'QA-001', jira_url: 'https://jira.example/browse/QA-001' },
    ],
    'En cours': [
      { id: 'a2', use_case: 'uc2', case_number: 2, use_case_order: 2, use_case_text: 'TC002', use_case_id_str: 'TC002', use_case_desc: 'Logout test', description: 'Logout test', preconditions: '', steps: '', expected_results: '', observed_results: '', sprint: 's1', assigned_to: 'pm1', assigned_to_user: { id: 2, username: 'tester', full_name: 'Tester User', email: 'tester@test.com', date_joined: '' }, assigned_by: '1', assigned_by_user: mockUser, assigned_at: '2026-06-01', status: 'En cours' },
    ],
    'Passé': [{ id: 'a3', use_case: 'uc3', case_number: 3, use_case_order: 3, use_case_text: 'TC003', use_case_id_str: 'TC003', use_case_desc: 'Search test', description: 'Search test', preconditions: '', steps: '', expected_results: '', observed_results: '', sprint: 's1', assigned_to: 'pm1', assigned_to_user: { id: 2, username: 'tester', full_name: 'Tester User', email: 'tester@test.com', date_joined: '' }, assigned_by: '1', assigned_by_user: mockUser, assigned_at: '2026-06-01', status: 'Passé' }],
    'Échoué': [],
    'Bloqué': [],
  },
  stats: mockSprints.results[0].stats,
};

function renderPage(initialRoute = '/teams/qa-team/projects/qa-project/sprint-board') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/teams/:slug/projects/:projectSlug/sprint-board" element={<SprintBoardPage />} />
            <Route path="/teams/:slug/projects/:projectSlug/sprints/:sprintId" element={<SprintBoardPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('SprintBoardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamsApi.getTeam.mockResolvedValue({ id: 't1', name: 'QA Team', slug: 'qa-team', my_role: 'admin' });
    mockTeamsApi.listSprints.mockResolvedValue(mockSprints);
    mockTeamsApi.getSprintBoard.mockResolvedValue(mockBoard);
    mockTeamsApi.listAssignableMembers.mockResolvedValue({ count: 2, results: [
      { user: { id: 2, username: 'tester', full_name: 'Tester User' }, team_role: 'member', project_member_id: 'pm1', in_project: true },
      { user: { id: 3, username: 'nouveau', full_name: 'Moussa Camara' }, team_role: 'member', project_member_id: null, in_project: false },
    ] });
    mockTeamsApi.listAssignments.mockResolvedValue({ count: 1, results: mockBoard.columns['À tester'] });
    mockTeamsApi.getUnassignedUseCases.mockResolvedValue({ count: 2, results: [{ id: 'uc4', order: 4, use_case_text: 'TC004', description: 'Profile test', status: 'À tester' }, { id: 'uc5', order: 5, use_case_text: 'TC005', description: 'Settings test', status: 'À tester' }] });
  });

  it('renders page title', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Tableau Sprint')).toBeInTheDocument();
    });
  });

  it('renders sprint filter buttons', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      expect(screen.getByText('Sprint 0')).toBeInTheDocument();
    });
  });

  it('renders Kanban columns when sprint selected', async () => {
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await waitFor(() => {
      const atester = screen.getAllByText('À tester');
      expect(atester.length).toBeGreaterThanOrEqual(1);
      const encours = screen.getAllByText('En cours');
      expect(encours.length).toBeGreaterThanOrEqual(1);
      const passe = screen.getAllByText('Passé');
      expect(passe.length).toBeGreaterThanOrEqual(1);
      const echoue = screen.getAllByText('Échoué');
      expect(echoue.length).toBeGreaterThanOrEqual(1);
      const bloque = screen.getAllByText('Bloqué');
      expect(bloque.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('creates a case in the selected Kanban column using the shared case API', async () => {
    const user = userEvent.setup();
    mockTeamsApi.createSprintCase.mockResolvedValue({ id: 'assignment-1', case_number: 4 });
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await user.click(await screen.findByRole('button', { name: 'Créer un cas dans À tester' }));
    await user.type(screen.getByLabelText('Use Case (titre) *'), 'Connexion utilisateur');
    await user.click(screen.getByText('Enregistrer le cas'));
    await waitFor(() => expect(mockTeamsApi.createSprintCase).toHaveBeenCalledWith(
      'qa-team', 'qa-project', 's1', expect.objectContaining({ use_case_text: 'Connexion utilisateur', status: 'À tester' }),
    ));
  });

  it('renders use cases in correct columns', async () => {
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await waitFor(() => {
      expect(screen.getByText('CAS-001')).toBeInTheDocument();
      expect(screen.getByText('CAS-002')).toBeInTheDocument();
      expect(screen.getByText('CAS-003')).toBeInTheDocument();
    });
  });

  it('shows accessible edit and delete icon actions on each case card', async () => {
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    expect(await screen.findByRole('button', { name: 'Modifier CAS-001' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Supprimer CAS-001' })).toBeInTheDocument();
  });

  it('opens the case editor from the edit icon', async () => {
    const user = userEvent.setup();
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await user.click(await screen.findByRole('button', { name: 'Modifier CAS-001' }));
    expect(await screen.findByRole('dialog', { name: 'Modifier le cas' })).toBeInTheDocument();
  });

  it('shows assigned user names', async () => {
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await waitFor(() => {
      const names = screen.getAllByText('Tester User');
      expect(names.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows create sprint button for leads', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('+ Nouveau sprint')).toBeInTheDocument();
    });
  });

  it('shows assign button when sprint selected', async () => {
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await waitFor(() => {
      expect(screen.getByText('+ Assigner des cas')).toBeInTheDocument();
    });
  });

  it('opens create sprint modal on button click', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('+ Nouveau sprint'));
    await user.click(screen.getByText('+ Nouveau sprint'));
    expect(screen.getByText('+ Nouveau Sprint')).toBeInTheDocument();
  });

  it('creates a sprint via the modal', async () => {
    mockTeamsApi.createSprint.mockResolvedValue({ ...mockSprints.results[0], id: 's3' });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('+ Nouveau sprint'));
    await user.click(screen.getByText('+ Nouveau sprint'));
    await user.type(screen.getByLabelText('Nom *'), 'Sprint 3');
    await user.type(screen.getByLabelText('Début *'), '2026-06-15');
    await user.type(screen.getByLabelText('Fin *'), '2026-06-28');
    await user.click(screen.getByText('✅ Créer'));
    await waitFor(() => {
      expect(mockTeamsApi.createSprint).toHaveBeenCalled();
    });
  });

  it('handles empty sprints', async () => {
    mockTeamsApi.listSprints.mockResolvedValue({ count: 0, results: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Tableau Sprint')).toBeInTheDocument();
    });
  });

  it('renders stats on selected sprint card', async () => {
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await waitFor(() => {
      const sprint1Elements = screen.getAllByText('Sprint 1');
      expect(sprint1Elements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/33\.3/)).toBeInTheDocument();
    });
  });

  it('opens the ticket popup immediately on card click with board data', async () => {
    mockTeamsApi.getUseCaseDetail.mockResolvedValue({
      assignment: mockBoard.columns['À tester'][0],
      use_case: { id: 'uc1', project: 'p1', order: 1, use_case_text: 'TC001', description: 'Login test', preconditions: 'user registered', steps: '1. open app', expected_results: 'home page', observed_results: '', is_automated: false, jira_ticket: 'QA-001' },
      screenshots: [],
      comments: [{ id: 'c1', author: { id: 1, full_name: 'Lead QA' }, content: 'Test rapide', created_at: '2026-06-01' }],
    });
    const user = userEvent.setup();
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await waitFor(() => screen.getByText('CAS-001'));
    await user.click(screen.getByText('CAS-001'));
    await waitFor(() => {
      expect(screen.getByText(/CAS-001 — Détails/)).toBeInTheDocument();
      expect(screen.getByText('Assigné à :')).toBeInTheDocument();
      expect(screen.getByDisplayValue('QA-001')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('user registered')).toBeInTheDocument();
    });
  });

  it('lists every team member and assigns a case from the card', async () => {
    mockTeamsApi.updateSprintCase.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    const select = await screen.findByLabelText('Assigner CAS-001');
    await waitFor(() => expect(select).toHaveTextContent('Moussa Camara (équipe)'));
    await user.selectOptions(select, '3');
    await waitFor(() => expect(mockTeamsApi.updateSprintCase).toHaveBeenCalledWith('qa-team', 'qa-project', 'a1', { assigned_user_id: 3 }));
  });

  it('bulk-assigns cases to a team member', async () => {
    mockTeamsApi.createAssignments.mockResolvedValue({ count: 2 });
    const user = userEvent.setup();
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await user.click(await screen.findByText('+ Assigner des cas'));
    await user.selectOptions(screen.getByLabelText('Membre'), '3');
    await user.click(await screen.findByLabelText('Sélectionner tous les cas'));
    await user.click(screen.getByText('✅ Assigner (2)'));
    await waitFor(() => expect(mockTeamsApi.createAssignments).toHaveBeenCalledWith('qa-team', 'qa-project', { use_case_ids: ['uc4', 'uc5'], sprint_id: 's1', user_id: 3 }));
  });

  it('lets a simple member change a status but not manage cases', async () => {
    mockTeamsApi.getTeam.mockResolvedValue({ id: 't1', name: 'QA Team', slug: 'qa-team', my_role: 'member' });
    mockTeamsApi.updateUseCaseStatus.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await user.selectOptions(await screen.findByLabelText('Statut de CAS-001'), 'Passé');
    await waitFor(() => expect(mockTeamsApi.updateUseCaseStatus).toHaveBeenCalledWith('qa-team', 'qa-project', 'uc1', 'Passé', 's1'));
    expect(screen.queryByLabelText('Assigner CAS-001')).not.toBeInTheDocument();
    expect(screen.queryByText('✏️ Modifier le sprint')).not.toBeInTheDocument();
  });

  it('hides result edition for viewers', async () => {
    mockTeamsApi.getTeam.mockResolvedValue({ id: 't1', name: 'QA Team', slug: 'qa-team', my_role: 'viewer' });
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await screen.findByText('CAS-001');
    expect(screen.queryByLabelText('Statut de CAS-001')).not.toBeInTheDocument();
  });

  it('freezes results of a completed sprint', async () => {
    renderPage('/teams/qa-team/projects/qa-project/sprints/s2');
    expect(await screen.findByText(/ses résultats sont figés/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Statut de CAS-001')).not.toBeInTheDocument();
  });

  it('edits sprint name and duration', async () => {
    mockTeamsApi.updateSprint.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await user.click(await screen.findByText('✏️ Modifier le sprint'));
    const name = screen.getByLabelText('Nom *');
    await user.clear(name);
    await user.type(name, 'Sprint Alpha');
    const duration = screen.getByLabelText('Durée (jours)');
    await user.clear(duration);
    await user.type(duration, '20');
    expect(screen.getByLabelText('Fin *')).toHaveValue('2026-06-21');
    await user.click(screen.getByText('Enregistrer'));
    await waitFor(() => expect(mockTeamsApi.updateSprint).toHaveBeenCalledWith('qa-team', 'qa-project', 's1',
      expect.objectContaining({ name: 'Sprint Alpha', start_date: '2026-06-01', end_date: '2026-06-21' })));
  });

  it('downloads the sprint report', async () => {
    mockTeamsApi.downloadProjectReport.mockRejectedValue({ response: { status: 500, data: { error: 'Boum' } } });
    const user = userEvent.setup();
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await user.click(await screen.findByText('📄 Rapport PDF'));
    expect(mockTeamsApi.downloadProjectReport).toHaveBeenCalledWith('qa-team', 'qa-project', ['s1']);
    expect(await screen.findByText('Boum')).toBeInTheDocument();
  });

  it('reports a defect linked to the case and the sprint', async () => {
    mockTeamsApi.getUseCaseDetail.mockResolvedValue({ assignment: mockBoard.columns['À tester'][0], use_case: { id: 'uc1' }, screenshots: [], comments: [] });
    mockTeamsApi.createDefect.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await user.click(await screen.findByText('CAS-001'));
    await user.click(await screen.findByText('🐛 Signaler une anomalie'));
    await user.type(await screen.findByLabelText('Titre *'), 'Bug de connexion');
    await user.click(screen.getByText('✅ Signaler'));
    await waitFor(() => expect(mockTeamsApi.createDefect).toHaveBeenCalledWith('qa-team', 'qa-project',
      expect.objectContaining({ title: 'Bug de connexion', sprint: 's1', use_case: 'uc1' })));
  });

  it('shows linked defects and regressions on cards', async () => {
    const card = { ...mockBoard.columns['À tester'][0], is_regression: true, open_defects_count: 2, defects: [] };
    mockTeamsApi.getSprintBoard.mockResolvedValue({ ...mockBoard, columns: { ...mockBoard.columns, 'À tester': [card] } });
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    expect(await screen.findByText('↩ Régression')).toBeInTheDocument();
    expect(screen.getByText(/2 anomalies/)).toBeInTheDocument();
  });

  it('sends the sprint report by email', async () => {
    mockTeamsApi.sendSprintReport.mockResolvedValue({ recipients: 2 });
    const user = userEvent.setup();
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await user.click(await screen.findByText('✉️ Envoyer le rapport'));
    expect(await screen.findByText('Rapport en cours d’envoi à 2 responsables.')).toBeInTheDocument();
    expect(mockTeamsApi.sendSprintReport).toHaveBeenCalledWith('qa-team', 'qa-project', 's1');
  });

  it('carries unfinished cases over to a new sprint', async () => {
    mockTeamsApi.getCarryOver.mockResolvedValue({ count: 2, results: [
      { use_case: 'uc1', case_number: 1, title: 'TC001', status: 'À tester', assigned_to: null },
      { use_case: 'uc2', case_number: 2, title: 'TC002', status: 'Bloqué', assigned_to: 'X' },
    ] });
    mockTeamsApi.carryOver.mockResolvedValue({ created: 1, skipped: [], sprint: { id: 's2', name: 'Sprint 0' } });
    const user = userEvent.setup();
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await user.click(await screen.findByText('↪ Reporter les cas'));
    await user.click(await screen.findByRole('checkbox', { name: /CAS-002/ }));
    await user.click(screen.getByRole('button', { name: 'Reporter 1 cas' }));
    await waitFor(() => expect(mockTeamsApi.carryOver).toHaveBeenCalledWith('qa-team', 'qa-project', 's1', expect.objectContaining({
      case_ids: ['uc1'], close_source: true, include_failed: false,
      new_sprint: expect.objectContaining({ name: 'Sprint 1 (suite)', duration_days: 14 }),
    })));
    expect(await screen.findByText('Cas reportés vers « Sprint 0 ».')).toBeInTheDocument();
  });

  it('previews then applies automated results', async () => {
    const preview = { total: 3, passed: 1, failed: 1, skipped: 1, unmatched: ['Inconnu'], unmatched_count: 1, outside_sprint: [9], applied: false, updated: 0, defects_created: 0,
      cases: [{ use_case: 'uc1', case_number: 1, title: 'TC001', old_status: 'À tester', new_status: 'Échoué', tests: 1, message: 'boom' }] };
    mockTeamsApi.importTestResults.mockResolvedValueOnce(preview).mockResolvedValueOnce({ ...preview, applied: true, updated: 1, defects_created: 1 });
    const user = userEvent.setup();
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await user.click(await screen.findByText('⬆️ Importer des résultats'));
    await user.upload(screen.getByLabelText('Fichiers de résultats'), [new File(['<testsuites/>'], 'a.xml'), new File(['{}'], 'b.json')]);
    await user.click(screen.getByLabelText(/Créer une anomalie/));
    await user.click(screen.getByRole('button', { name: 'Analyser' }));
    expect(await screen.findByText('1 sans cas correspondant')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Appliquer à 1 cas' }));
    expect(await screen.findByText(/1 statut\(s\) modifié\(s\), 1 anomalie/)).toBeInTheDocument();
    const [first, second] = mockTeamsApi.importTestResults.mock.calls.map(c => c[2] as FormData);
    expect(first.get('dry_run')).toBe('true');
    expect(second.get('dry_run')).toBe('false');
    expect(second.getAll('files')).toHaveLength(2);
    expect(second.get('sprint')).toBe('s1');
    expect(second.get('create_defects')).toBe('true');
  });

  it('shows import errors', async () => {
    mockTeamsApi.importTestResults.mockRejectedValue({ response: { status: 400, data: { error: 'a.xml : XML invalide.' } } });
    const user = userEvent.setup();
    renderPage('/teams/qa-team/projects/qa-project/sprints/s1');
    await user.click(await screen.findByText('⬆️ Importer des résultats'));
    await user.upload(screen.getByLabelText('Fichiers de résultats'), new File(['x'], 'a.xml'));
    await user.click(screen.getByRole('button', { name: 'Analyser' }));
    expect(await screen.findByText('a.xml : XML invalide.')).toBeInTheDocument();
  });
});
