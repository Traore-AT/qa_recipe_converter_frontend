import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import TeamReportsPage from './TeamReportsPage';

const { api } = vi.hoisted(() => ({ api: { getTeamPerformance: vi.fn(), getPortfolio: vi.fn(), downloadPortfolioReport: vi.fn() } }));
vi.mock('../api/teams', () => ({ teamsApi: api }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, username: 'lead', full_name: 'Lead QA' } }) }));

const stats = (total: number, passed: number) => ({
  total, passed, failed: 1, blocked: 0, in_progress: 0, not_run: total - passed - 1, executed: passed + 1,
  execution_rate: ((passed + 1) / total) * 100, success_rate: (passed / total) * 100, pass_rate: 90,
});
const perf = (score: number | null, level: string, label: string, total = 10, passed = 8) => ({
  score, level, level_label: label, components: {}, weights: {}, stats: stats(total, passed),
  defects: { active: 1 }, regressed_cases: 0, automation_rate: 0, automated: 0, defect_density: 0,
});
const row = (id: string, name: string, status: string, p: ReturnType<typeof perf>) => ({
  project: { id, name, slug: name.toLowerCase(), color: '', status }, performance: p, trend: 5,
  evolution: [{ date: '2026-11-01', success_rate: 40, execution_rate: 50 }, { date: '2026-11-02', success_rate: 80, execution_rate: 90 }],
});

const ROWS = [
  row('p2', 'Portail', 'active', perf(46.1, 'critical', 'Critique')),
  row('p1', 'Intranet', 'active', perf(93.8, 'excellent', 'Excellent')),
  row('p3', 'Archives', 'archived', perf(null, 'not_evaluated', 'Non évalué', 0, 0)),
];

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/teams/qa/reports']}>
          <Routes><Route path="/teams/:slug/reports" element={<TeamReportsPage />} /></Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('TeamReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getTeamPerformance.mockResolvedValue({ count: 3, results: ROWS });
    api.getPortfolio.mockImplementation((_slug: string, ids: string[]) => Promise.resolve({
      team: { name: 'QA', slug: 'qa' },
      performance: perf(ids.length === 1 ? 93.8 : 61.5, ids.length === 1 ? 'excellent' : 'average', ids.length === 1 ? 'Excellent' : 'Moyen', 20, 14),
      projects: ROWS.filter(r => ids.includes(r.project.id)).map(r => ({ id: r.project.id, name: r.project.name, slug: r.project.slug, status: r.project.status, status_label: '', sprints: 1, performance: r.performance })),
    }));
    api.downloadPortfolioReport.mockResolvedValue(undefined);
  });

  it('lists the team projects alphabetically and preselects the active ones', async () => {
    renderPage();
    const boxes = await screen.findAllByRole('checkbox', { name: /^Inclure/ });
    expect(boxes.map(b => b.getAttribute('aria-label'))).toEqual(['Inclure Archives', 'Inclure Intranet', 'Inclure Portail']);
    expect(boxes.map(b => (b as HTMLInputElement).checked)).toEqual([false, true, true]);
    expect(screen.getByText(/2 \/ 3 sélectionnés/)).toBeInTheDocument();
    await waitFor(() => expect(api.getPortfolio).toHaveBeenCalledWith('qa', ['p1', 'p2']));
  });

  it('shows the live global level of the selection', async () => {
    renderPage();
    expect(await screen.findByText('61,5/100')).toBeInTheDocument();
    expect(screen.getByText('Moyen')).toBeInTheDocument();
    expect(screen.getByRole('figure', { name: 'Score de performance par projet' })).toHaveTextContent('Intranet93,8/100');
    expect(screen.getByRole('figure', { name: 'Répartition globale' })).toBeInTheDocument();
  });

  it('updates the preview when the selection changes, then generates the PDF', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('61,5/100');
    await user.click(screen.getByRole('checkbox', { name: 'Inclure Portail' }));
    await waitFor(() => expect(api.getPortfolio).toHaveBeenLastCalledWith('qa', ['p1']));
    expect(await screen.findByText('Excellent', { selector: 'span' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Générer le rapport PDF \(1 projet\)/ }));
    expect(api.downloadPortfolioReport).toHaveBeenCalledWith('qa', ['p1']);
  });

  it('filters, selects all and requires at least one project', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByRole('checkbox', { name: /^Inclure/ });
    await user.click(screen.getByRole('button', { name: 'Tout sélectionner' }));
    expect(screen.getByText(/3 \/ 3 sélectionnés/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tout désélectionner' }));
    expect(screen.getByText('Sélectionnez au moins un projet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Générer le rapport PDF/ })).toBeDisabled();
    await user.click(screen.getByLabelText('Actifs uniquement'));
    expect(screen.queryByRole('checkbox', { name: 'Inclure Archives' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Rechercher un projet'), 'intra');
    expect(screen.getAllByRole('checkbox', { name: /^Inclure/ })).toHaveLength(1);
  });

  it('reports a generation error and keeps the weekly reports reachable', async () => {
    api.downloadPortfolioReport.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('61,5/100');
    await user.click(screen.getByRole('button', { name: /Générer le rapport PDF/ }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ouvrir les rapports hebdomadaires/ })).toHaveAttribute('href', '/teams/qa/weekly-reports');
  });

  it('handles a team without projects', async () => {
    api.getTeamPerformance.mockResolvedValue({ count: 0, results: [] });
    renderPage();
    expect(await screen.findByText('Cette équipe n’a encore aucun projet.')).toBeInTheDocument();
  });
});
