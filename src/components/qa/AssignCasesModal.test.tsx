import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssignableMember } from '../../types';
import { AssignCasesModal } from './AssignCasesModal';

const { api } = vi.hoisted(() => ({ api: { getUnassignedUseCases: vi.fn(), createAssignments: vi.fn() } }));
vi.mock('../../api/teams', () => ({ teamsApi: api }));

const members = [
  { user: { id: 2, username: 'tester', full_name: 'Tester User' }, team_role: 'member', project_member_id: 'pm1', in_project: true },
  { user: { id: 3, username: 'awa', full_name: 'Awa Diallo' }, team_role: 'member', project_member_id: null, in_project: false },
] as unknown as AssignableMember[];

const cases = [
  { id: 'uc4', order: 4, case_number: 4, ticket_number: 'CAS-004', use_case_text: 'Connexion', description: '', status: 'À tester', jira_ticket: 'QA-10' },
  { id: 'uc5', order: 5, case_number: 5, ticket_number: 'CAS-005', use_case_text: 'Paiement', description: '', status: 'Échoué', jira_ticket: '' },
  { id: 'uc6', order: 6, case_number: 6, ticket_number: 'CAS-006', use_case_text: 'Profil', description: '', status: 'Échoué', jira_ticket: 'QA-12' },
];

function renderModal(onDone = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AssignCasesModal teamSlug="t" projectSlug="p" sprintId="s1" members={members} onClose={vi.fn()} onDone={onDone} />
    </QueryClientProvider>,
  );
  return onDone;
}

describe('AssignCasesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getUnassignedUseCases.mockResolvedValue({ count: 3, hidden_other_sprints: 0, results: cases });
  });

  it('filters cases by Jira ticket, title and status', async () => {
    const user = userEvent.setup();
    renderModal();
    await screen.findByText('Connexion');
    await user.type(screen.getByLabelText('Rechercher un cas à assigner'), 'qa-12');
    expect(screen.queryByText('Connexion')).not.toBeInTheDocument();
    expect(screen.getByText('Profil')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Rechercher un cas à assigner'));
    await user.selectOptions(screen.getByLabelText('Filtrer par statut'), 'Échoué');
    expect(screen.getByText('Sélectionner les 2 cas affichés')).toBeInTheDocument();
    expect(screen.queryByText('Connexion')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Rechercher un cas à assigner'), 'zzz');
    expect(screen.getByText('Aucun cas ne correspond aux filtres.')).toBeInTheDocument();
  });

  it('selecting the filtered cases keeps the hidden ones untouched', async () => {
    api.createAssignments.mockResolvedValue({ created: ['uc5', 'uc6'], count: 2, errors: [] });
    const user = userEvent.setup();
    renderModal();
    await screen.findByText('Connexion');
    await user.selectOptions(screen.getByLabelText('Membre'), '2');
    await user.selectOptions(screen.getByLabelText('Filtrer par statut'), 'Échoué');
    await user.click(screen.getByLabelText('Sélectionner les 2 cas affichés'));
    await user.click(screen.getByText('✅ Assigner (2)'));
    await waitFor(() => expect(api.createAssignments).toHaveBeenCalledWith('t', 'p', { use_case_ids: ['uc5', 'uc6'], sprint_id: 's1', user_id: 2 }));
  });

  it('distributes the selection between several testers', async () => {
    api.createAssignments.mockResolvedValue({
      created: ['uc4', 'uc5', 'uc6'], count: 3, errors: [],
      distribution: [{ user_id: 2, username: 'tester', full_name: 'Tester User', count: 1 }, { user_id: 3, username: 'awa', full_name: 'Awa Diallo', count: 2 }],
    });
    const user = userEvent.setup();
    const onDone = renderModal();
    await screen.findByText('Connexion');
    await user.click(screen.getByLabelText('Répartir automatiquement entre plusieurs testeurs'));
    expect(screen.queryByLabelText('Membre')).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('Sélectionner tous les cas'));
    const submit = screen.getByText('✅ Assigner (3)');
    expect(submit.closest('button')).toBeDisabled();
    await user.click(screen.getByLabelText('Tester User'));
    await user.click(screen.getByLabelText('Awa Diallo (équipe)'));
    await user.click(submit);
    await waitFor(() => expect(api.createAssignments).toHaveBeenCalledWith('t', 'p', { use_case_ids: ['uc4', 'uc5', 'uc6'], sprint_id: 's1', user_ids: [2, 3] }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('3 cas assignés. Répartition : Tester User 1, Awa Diallo 2.'));
  });

  it('shows the server error when nothing could be assigned', async () => {
    api.createAssignments.mockRejectedValue(new Error('refus'));
    const user = userEvent.setup();
    renderModal();
    await screen.findByText('Connexion');
    await user.selectOptions(screen.getByLabelText('Membre'), '2');
    await user.click(screen.getByLabelText('Sélectionner tous les cas'));
    await user.click(screen.getByText('✅ Assigner (3)'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
