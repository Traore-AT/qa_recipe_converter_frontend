import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssignableMember } from '../../types';
import { SprintImportModal } from './SprintImportModal';

const { api } = vi.hoisted(() => ({ api: { previewSprintImport: vi.fn(), importSprintCases: vi.fn(), validateJiraTickets: vi.fn() } }));
vi.mock('../../api/teams', () => ({ teamsApi: api }));

const members = [
  { user: { id: 2, username: 'tester', full_name: 'Tester User' }, team_role: 'member', project_member_id: 'pm1', in_project: true },
  { user: { id: 3, username: 'awa', full_name: 'Awa Diallo' }, team_role: 'member', project_member_id: null, in_project: false },
] as unknown as AssignableMember[];

const empty = { use_case_text: '', description: '', preconditions: '', steps: '', expected_results: '', observed_results: '', jira_ticket: '' };
const preview = {
  total_cases: 3, fields: ['use_case_text', 'jira_ticket'], jira_column: true, with_jira: 3, invalid_jira: [], warnings: [],
  tables: [{ index: 1, rows: 3, skipped_rows: 0, ignored: '', columns: [{ header: 'Tickets Jira', field: 'jira_ticket', label: 'Tickets Jira' }] }],
  sample: [{ ...empty, use_case_text: 'Connexion', jira_ticket: 'QA-1' }],
  rows: [
    { row: 1, title: 'Connexion', jira_ticket: 'QA-1', duplicate_of: null, duplicate_row: null },
    { row: 2, title: 'Paiement', jira_ticket: 'QA-2', duplicate_of: null, duplicate_row: null },
    { row: 3, title: 'Profil', jira_ticket: 'QA-3', duplicate_of: 4, duplicate_row: null },
  ],
  new_cases: 2, duplicates: 1, sprint: { id: 's1', name: 'Sprint 1' },
};
const result = { imported: 2, skipped: [preview.rows[2]], job_id: 'j1', assignment_ids: ['a9', 'a10'], case_numbers: [7, 8], distribution: [] };
const file = new File(['docx'], 'recette.docx');

function renderModal(onDone = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SprintImportModal teamSlug="t" projectSlug="p" sprint={{ id: 's1', name: 'Sprint 1' }} members={members} onClose={vi.fn()} onDone={onDone} />
    </QueryClientProvider>,
  );
  return onDone;
}

const chooseFile = async (user: ReturnType<typeof userEvent.setup>) =>
  user.upload(document.getElementById('sprint-import-file') as HTMLInputElement, file);

describe('SprintImportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.previewSprintImport.mockResolvedValue(preview);
    api.importSprintCases.mockResolvedValue(result);
  });

  it('previews the document, then imports the new cases unassigned', async () => {
    const user = userEvent.setup();
    const onDone = renderModal();
    expect(screen.getByText('1. Fichier')).toHaveAttribute('aria-current', 'step');
    await chooseFile(user);
    expect(await screen.findByText('2 nouveaux cas')).toBeInTheDocument();
    expect(screen.getByText('1 doublon ignoré')).toBeInTheDocument();
    await user.click(screen.getByText('Doublons ignorés (1)'));
    expect(screen.getByText(/Ligne 3 « Profil » \(QA-3\) — existe déjà : CAS-004/)).toBeInTheDocument();
    expect(api.previewSprintImport).toHaveBeenCalledWith('t', 'p', 's1', file);
    await user.click(screen.getByText('Continuer →'));
    expect(screen.getByLabelText('Ne pas assigner pour l’instant')).toBeChecked();
    await user.click(screen.getByText('✅ Importer 2 cas'));
    await waitFor(() => expect(api.importSprintCases).toHaveBeenCalledWith('t', 'p', 's1', file, []));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(result));
  });

  it('distributes the imported cases between several testers', async () => {
    const user = userEvent.setup();
    renderModal();
    await chooseFile(user);
    await user.click(await screen.findByText('Continuer →'));
    await user.click(screen.getByLabelText('Répartir entre plusieurs testeurs'));
    const submit = screen.getByText('✅ Importer 2 cas').closest('button')!;
    expect(submit).toBeDisabled();
    await user.click(screen.getByLabelText('Tester User'));
    await user.click(screen.getByLabelText('Awa Diallo (équipe)'));
    await user.click(submit);
    await waitFor(() => expect(api.importSprintCases).toHaveBeenCalledWith('t', 'p', 's1', file, [2, 3]));
  });

  it('assigns everything to one member and can go back', async () => {
    const user = userEvent.setup();
    renderModal();
    await chooseFile(user);
    await user.click(await screen.findByText('Continuer →'));
    await user.click(screen.getByText('← Retour'));
    expect(screen.getByText('2. Aperçu')).toHaveAttribute('aria-current', 'step');
    await user.click(screen.getByText('Continuer →'));
    await user.click(screen.getByLabelText('Un seul membre'));
    await user.selectOptions(screen.getByLabelText('Membre responsable'), '3');
    await user.click(screen.getByText('✅ Importer 2 cas'));
    await waitFor(() => expect(api.importSprintCases).toHaveBeenCalledWith('t', 'p', 's1', file, [3]));
  });

  it('blocks the import when every case already exists', async () => {
    api.previewSprintImport.mockResolvedValue({ ...preview, new_cases: 0, duplicates: 3 });
    const user = userEvent.setup();
    renderModal();
    await chooseFile(user);
    expect(await screen.findByText(/Aucun nouveau cas à importer/)).toBeInTheDocument();
    expect(screen.getByText('Continuer →').closest('button')).toBeDisabled();
  });

  it('checks the Jira tickets of the new cases only', async () => {
    api.validateJiraTickets.mockResolvedValue({ jira_checked: true, error: '', results: [{ ticket: 'QA-1', valid_format: true, exists: true, summary: 'Login' }] });
    const user = userEvent.setup();
    renderModal();
    await chooseFile(user);
    await user.click(await screen.findByText('🔎 Vérifier les tickets dans Jira'));
    expect(await screen.findByText(/Login/)).toBeInTheDocument();
    expect(api.validateJiraTickets).toHaveBeenCalledWith('t', 'p', ['QA-1', 'QA-2']);
  });

  it('reports analysis and import errors', async () => {
    api.previewSprintImport.mockRejectedValueOnce(new Error('illisible'));
    const user = userEvent.setup();
    renderModal();
    await chooseFile(user);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('1. Fichier')).toHaveAttribute('aria-current', 'step');
  });
});
