import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportAnalysisPanel } from './ImportAnalysisPanel';

const { api } = vi.hoisted(() => ({ api: { analyze: vi.fn() } }));
vi.mock('../../api/conversion', () => ({ conversionApi: api }));

const empty = { use_case_text: '', description: '', preconditions: '', steps: '', expected_results: '', observed_results: '', jira_ticket: '' };
const analysis = {
  total_cases: 3, fields: ['use_case_text', 'jira_ticket'], jira_column: true, with_jira: 2,
  invalid_jira: [{ row: 2, ticket: 'qa 2' }],
  warnings: ['1 référence(s) Jira au format inattendu (attendu : PROJET-123).'],
  tables: [
    { index: 1, rows: 3, skipped_rows: 1, ignored: '', columns: [
      { header: 'Use Case', field: 'use_case_text', label: 'Use Case' },
      { header: 'Tikets jira', field: 'jira_ticket', label: 'Tickets Jira' },
      { header: 'Remarque', field: null, label: null },
    ] },
    { index: 2, rows: 0, skipped_rows: 0, ignored: 'Aucune colonne reconnue', columns: [] },
  ],
  sample: [{ ...empty, use_case_text: 'UC01', jira_ticket: 'QA-1' }],
};

const file = new File(['x'], 'recette.docx');
const renderPanel = () => render(
  <QueryClientProvider client={new QueryClient()}><ImportAnalysisPanel file={file} /></QueryClientProvider>,
);

describe('ImportAnalysisPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('summarises detected columns, Jira tickets and ignored tables', async () => {
    api.analyze.mockResolvedValue(analysis);
    const user = userEvent.setup();
    renderPanel();
    expect(await screen.findByText('3 cas de test')).toBeInTheDocument();
    expect(screen.getByText('Tickets Jira ✔ 2/3')).toBeInTheDocument();
    expect(screen.getByText('Tikets jira → Tickets Jira ✔')).toBeInTheDocument();
    expect(screen.getByText('Remarque')).toHaveAttribute('title', 'Colonne non reconnue : non importée');
    expect(screen.getByText(/ignoré \(Aucune colonne reconnue\)/)).toBeInTheDocument();
    expect(screen.getByText(/1 ligne vide ignorée/)).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('format inattendu');
    await user.click(screen.getByText('Premiers cas extraits'));
    expect(screen.getByText('QA-1')).toBeInTheDocument();
    expect(api.analyze).toHaveBeenCalledWith(file);
  });

  it('flags a missing Jira column', async () => {
    api.analyze.mockResolvedValue({ ...analysis, jira_column: false, with_jira: 0, invalid_jira: [], warnings: [] });
    renderPanel();
    expect(await screen.findByText('Tickets Jira ✘ colonne absente')).toBeInTheDocument();
  });

  it('degrades gracefully when the analysis fails', async () => {
    api.analyze.mockRejectedValue(new Error('boom'));
    renderPanel();
    expect(await screen.findByText(/Aperçu indisponible/)).toHaveTextContent('La conversion reste possible.');
  });
});
