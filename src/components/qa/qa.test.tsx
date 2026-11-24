import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { Sprint } from '../../types';
import { addDays, caseLabel, daysBetween, formatDay } from '../../lib/qa';
import { PerformancePanel } from './PerformancePanel';
import { QaSettingsPanel } from './QaSettingsPanel';
import { ReportBuilder } from './ReportBuilder';
import { SprintEditModal } from './SprintEditModal';
import { TeamPerformance } from './TeamPerformance';

const { api } = vi.hoisted(() => ({
  api: {
    getProjectPerformance: vi.fn(), getProjectEvolution: vi.fn(), getTeamPerformance: vi.fn(),
    downloadProjectReport: vi.fn(), updateSprint: vi.fn(),
    downloadProjectExcel: vi.fn(), getQaSettings: vi.fn(), updateQaSettings: vi.fn(), syncJira: vi.fn(),
  },
}));
vi.mock('../../api/teams', () => ({ teamsApi: api }));

const sprints = [
  { id: 's1', name: 'Sprint 1', goal: '', start_date: '2026-03-20', end_date: '2026-04-03', status: 'active' },
  { id: 's2', name: 'Sprint 2', goal: '', start_date: '2026-04-04', end_date: '2026-04-18', status: 'planned' },
] as Sprint[];

const stats = { total: 4, passed: 3, failed: 1, blocked: 0, in_progress: 0, not_run: 0, executed: 4, execution_rate: 100, success_rate: 75, pass_rate: 75 };
const performance = {
  score: 82.5, level: 'good', level_label: 'Bon', stats, regressed_cases: 1, automation_rate: 50, automated: 2, defect_density: 0.5,
  components: { pass_rate: 75, execution_rate: 100, resolution_rate: 50, stability_rate: 75 },
  weights: { pass_rate: 40, execution_rate: 25, resolution_rate: 20, stability_rate: 15 },
  defects: { total: 2, active: 1, avg_resolution_days: null },
  sprints: [{ ...sprints[0], status_label: 'En cours', duration_days: 14, stats, defects: { total: 2 }, regressed_cases: 1, score: null, level: 'not_evaluated', level_label: 'Non évalué' }],
};
const point = { total: 4, passed: 3, failed: 1, regressions: 1, defects_created: 2, defects_resolved: 1, defects_open: 1 };
const evolution = {
  granularity: 'day', start: '2026-03-20', end: '2026-03-21', trend: 25,
  points: [
    { ...point, date: '2026-03-20', success_rate: 50, execution_rate: 80 },
    { ...point, date: '2026-03-21', success_rate: 75, execution_rate: 100 },
  ],
};

const wrap = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.getProjectPerformance.mockResolvedValue(performance);
  api.getProjectEvolution.mockResolvedValue(evolution);
});

describe('lib/qa', () => {
  it('computes dates across daylight saving changes and leap years', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('', 2)).toBe('');
    expect(daysBetween('2026-03-20', '2026-04-03')).toBe(14);
    expect(daysBetween('2026-03-20', '')).toBeNull();
  });
  it('formats labels', () => {
    expect(caseLabel(7)).toBe('CAS-007');
    expect(formatDay('2026-06-01T10:00:00Z')).toBe('01/06/2026');
  });
});

describe('PerformancePanel', () => {
  it('shows score, trend, sprint comparison and data tables', async () => {
    wrap(<PerformancePanel teamSlug="t" projectSlug="p" sprints={sprints} />);
    expect(await screen.findByText('82.5/100')).toBeInTheDocument();
    expect(screen.getByText('Bon')).toBeInTheDocument();
    expect(screen.getByText(/\+25 pt/)).toBeInTheDocument();
    expect(screen.getByText('Non évalué')).toBeInTheDocument();
    expect(screen.getByRole('figure', { name: 'Réussite et avancement' })).toBeInTheDocument();
    expect(screen.getAllByText('21/03/2026').length).toBeGreaterThan(0);
  });

  it('restricts the scope to selected sprints', async () => {
    const user = userEvent.setup();
    wrap(<PerformancePanel teamSlug="t" projectSlug="p" sprints={sprints} />);
    await screen.findByText('82.5/100');
    await user.click(screen.getByRole('button', { name: 'Sprint 2' }));
    await waitFor(() => expect(api.getProjectEvolution).toHaveBeenLastCalledWith('t', 'p', ['s2']));
    expect(api.getProjectPerformance).toHaveBeenLastCalledWith('t', 'p', ['s2']);
  });

  it('handles unevaluated projects and errors', async () => {
    api.getProjectPerformance.mockResolvedValue({ ...performance, score: null, level: 'not_evaluated', level_label: 'Non évalué', sprints: [] });
    const { unmount } = wrap(<PerformancePanel teamSlug="t" projectSlug="p" sprints={[]} />);
    expect(await screen.findByText('Aucun sprint')).toBeInTheDocument();
    unmount();
    api.getProjectPerformance.mockRejectedValue({ response: { status: 500, data: { error: 'Panne' } } });
    wrap(<PerformancePanel teamSlug="t" projectSlug="p" sprints={[]} />);
    expect(await screen.findByText('Panne')).toBeInTheDocument();
  });
});

describe('ReportBuilder', () => {
  it('generates project, single and multi sprint reports', async () => {
    api.downloadProjectReport.mockResolvedValue(undefined);
    const user = userEvent.setup();
    wrap(<ReportBuilder teamSlug="t" projectSlug="p" sprints={sprints} />);
    await user.click(screen.getByText(/Télécharger le rapport du projet/));
    expect(api.downloadProjectReport).toHaveBeenLastCalledWith('t', 'p', []);
    await user.click(screen.getByRole('button', { name: 'Sprint 1' }));
    await user.click(screen.getByText(/rapport du sprint/));
    expect(api.downloadProjectReport).toHaveBeenLastCalledWith('t', 'p', ['s1']);
    await user.click(screen.getByRole('button', { name: 'Sprint 2' }));
    await user.click(screen.getByText(/rapport de 2 sprints/));
    expect(api.downloadProjectReport).toHaveBeenLastCalledWith('t', 'p', ['s1', 's2']);
    await user.click(screen.getByRole('button', { name: 'Projet complet' }));
    expect(screen.getByText(/rapport du projet/)).toBeInTheDocument();
  });

  it('reports download failures', async () => {
    api.downloadProjectReport.mockRejectedValue({ response: { status: 403, data: { detail: 'Interdit' } } });
    const user = userEvent.setup();
    wrap(<ReportBuilder teamSlug="t" projectSlug="p" sprints={[]} />);
    await user.click(screen.getByText(/Télécharger/));
    expect(await screen.findByText('Interdit')).toBeInTheDocument();
  });
});

describe('SprintEditModal', () => {
  const open = (onClose = vi.fn()) => {
    wrap(<SprintEditModal teamSlug="t" projectSlug="p" sprint={sprints[0]} onClose={onClose} />);
    return onClose;
  };

  it('keeps the duration when the start moves and syncs it when the end moves', async () => {
    const user = userEvent.setup();
    open();
    const set = async (label: string, value: string) => {
      const field = screen.getByLabelText(label);
      await user.clear(field);
      await user.type(field, value);
    };
    await set('Début *', '2026-05-01');
    expect(screen.getByLabelText('Fin *')).toHaveValue('2026-05-15');
    await set('Fin *', '2026-05-11');
    expect(screen.getByLabelText('Durée (jours)')).toHaveValue(10);
  });

  it('blocks invalid periods and empty names', async () => {
    const user = userEvent.setup();
    open();
    const end = screen.getByLabelText('Fin *');
    await user.clear(end);
    await user.type(end, '2026-03-01');
    expect(screen.getByText(/doit être après/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  });

  it('saves then closes, or shows the API error', async () => {
    const user = userEvent.setup();
    const onClose = open();
    api.updateSprint.mockRejectedValueOnce({ response: { status: 400, data: { error: 'Refusé' } } });
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Refusé')).toBeInTheDocument();
    api.updateSprint.mockResolvedValueOnce({});
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe('TeamPerformance', () => {
  it('compares projects with their evolution', async () => {
    api.getTeamPerformance.mockResolvedValue({ count: 1, results: [{ project: { id: 'p', name: 'Portail', slug: 'portail' }, performance, trend: 12.5, evolution: [{ date: '2026-03-20', success_rate: 75, execution_rate: 80 }] }] });
    wrap(<TeamPerformance teamSlug="t" />);
    expect(await screen.findByRole('link', { name: 'Portail' })).toHaveAttribute('href', '/teams/t/projects/portail');
    expect(screen.getByText('Bon · 82.5/100')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Portail : 75 %/ })).toBeInTheDocument();
    expect(screen.getByText('+12.5 pt(s)')).toBeInTheDocument();
  });

  it('stays hidden without projects', async () => {
    api.getTeamPerformance.mockResolvedValue({ count: 0, results: [] });
    const { container } = wrap(<TeamPerformance teamSlug="t" />);
    await waitFor(() => expect(api.getTeamPerformance).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Export Excel', () => {
  it('follows the selected scope', async () => {
    api.downloadProjectExcel.mockRejectedValue({ response: { status: 500, data: { error: 'Panne' } } });
    const user = userEvent.setup();
    wrap(<ReportBuilder teamSlug="t" projectSlug="p" sprints={sprints} />);
    await user.click(screen.getByRole('button', { name: 'Sprint 2' }));
    await user.click(screen.getByText('📊 Exporter en Excel'));
    expect(api.downloadProjectExcel).toHaveBeenCalledWith('t', 'p', ['s2']);
    expect(await screen.findByText('Panne')).toBeInTheDocument();
  });
});

describe('QaSettingsPanel', () => {
  const settings = {
    alert_on_regression: true, alert_on_critical_defect: true, auto_report_on_close: true, jira_enabled: false, jira_project_key: '',
    jira_issue_type: 'Bug', jira_import: false, jira_configured: true, can_edit_jira: true, recipients_count: 2, updated_at: '1',
  };
  const open = (values = {}, canManage = true) => {
    api.getQaSettings.mockResolvedValue({ ...settings, ...values });
    wrap(<QaSettingsPanel teamSlug="t" projectSlug="p" canManage={canManage} />);
  };

  it('toggles alerts', async () => {
    api.updateQaSettings.mockResolvedValue({ ...settings, alert_on_regression: false });
    const user = userEvent.setup();
    open();
    const box = await screen.findByRole('checkbox', { name: /Régression détectée/ });
    await user.click(box);
    expect(api.updateQaSettings).toHaveBeenCalledWith('t', 'p', { alert_on_regression: false });
    await waitFor(() => expect(box).not.toBeChecked());
  });

  it('links a Jira project, shows field errors, then synchronises', async () => {
    api.updateQaSettings.mockRejectedValueOnce({ response: { status: 400, data: { jira_project_key: ['Clé déjà liée.'] } } });
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByLabelText('Activer pour ce projet'));
    await user.type(screen.getByLabelText('Clé du projet Jira'), 'qa');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect((await screen.findAllByText('Clé déjà liée.')).length).toBeGreaterThan(0);
    expect(api.updateQaSettings).toHaveBeenCalledWith('t', 'p', expect.objectContaining({ jira_enabled: true, jira_project_key: 'QA' }));
    api.updateQaSettings.mockResolvedValueOnce({ ...settings, jira_enabled: true, jira_project_key: 'QA', updated_at: '2' });
    api.syncJira.mockResolvedValue({ pushed: 1, updated: 2, imported: 3, errors: 1 });
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await user.click(await screen.findByText(/Synchroniser maintenant/));
    expect(await screen.findByText(/1 envoyée\(s\), 2 mise\(s\) à jour, 3 importée/)).toBeInTheDocument();
  });

  it('is read-only without rights and warns about missing recipients', async () => {
    open({ can_edit_jira: false, recipients_count: 0, jira_configured: false }, false);
    expect(await screen.findByRole('checkbox', { name: /Anomalie critique/ })).toBeDisabled();
    expect(screen.getByLabelText('Clé du projet Jira')).toBeDisabled();
    expect(screen.getByText(/aucune alerte ne sera envoyée/)).toBeInTheDocument();
    expect(screen.getByText('Non configurée sur le serveur')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
  });
});
