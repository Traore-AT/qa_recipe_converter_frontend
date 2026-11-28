import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { CaseStats, EvolutionPoint, SprintSummary } from '../../types';
import { formatPercent, STATUS_META } from '../../lib/chart';
import { RATE_SERIES } from '../../lib/qa';
import { EvolutionChart } from '../qa/EvolutionChart';
import { ChartTooltipCard } from './ChartTooltip';
import { SprintComparisonChart } from './SprintComparisonChart';
import { StatusBreakdown } from './StatusBreakdown';

const stats: CaseStats = {
  total: 20, passed: 12, failed: 3, blocked: 1, in_progress: 0, not_run: 4,
  executed: 16, execution_rate: 80, success_rate: 60, pass_rate: 75,
};

describe('chart helpers', () => {
  it('formats French percentages', () => {
    expect(formatPercent(75)).toBe('75 %');
    expect(formatPercent(7.46)).toBe('7,5 %');
    expect(formatPercent(null)).toBe('—');
  });

  it('never puts the pass and fail colours side by side', () => {
    const order = STATUS_META.map(s => s.key);
    expect(Math.abs(order.indexOf('passed') - order.indexOf('failed'))).toBeGreaterThan(1);
  });
});

describe('StatusBreakdown', () => {
  it('renders one labelled block per non-empty status, in the fixed order', () => {
    render(<StatusBreakdown stats={stats} />);
    const blocks = screen.getAllByRole('listitem').filter(el => el.hasAttribute('aria-label'));
    expect(blocks.map(b => b.getAttribute('aria-label'))).toEqual([
      'Passés : 12 cas (60 %)', 'Bloqués : 1 cas (5 %)', 'Échoués : 3 cas (15 %)', 'À tester : 4 cas (20 %)',
    ]);
    // Part écrite seulement dans les blocs assez larges.
    expect(screen.getByText('60 %')).toBeInTheDocument();
    expect(screen.queryByText('5 %')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Légende')).toHaveTextContent('Bloqués 1');
  });

  it('announces the hovered status', async () => {
    const user = userEvent.setup();
    render(<StatusBreakdown stats={stats} />);
    await user.hover(screen.getByLabelText('Échoués : 3 cas (15 %)'));
    expect(screen.getByText('Échoués : 3 cas (15 %)', { selector: 'span' })).toBeInTheDocument();
  });

  it('handles an empty scope', () => {
    render(<StatusBreakdown stats={{ ...stats, total: 0, passed: 0, failed: 0, blocked: 0, not_run: 0 }} />);
    expect(screen.getByText('Aucun cas de test sur ce périmètre.')).toBeInTheDocument();
  });
});

const points: EvolutionPoint[] = [
  { date: '2026-11-01', total: 10, passed: 2, failed: 1, success_rate: 20, execution_rate: 30, regressions: 0, defects_created: 1, defects_resolved: 0, defects_open: 1 },
  { date: '2026-11-02', total: 10, passed: 6, failed: 1, success_rate: 60, execution_rate: 70, regressions: 0, defects_created: 0, defects_resolved: 1, defects_open: 0 },
];

describe('EvolutionChart', () => {
  it('toggles series from the legend but always keeps one visible', async () => {
    const user = userEvent.setup();
    render(<EvolutionChart title="Réussite" points={points} series={RATE_SERIES} percent />);
    const success = screen.getByRole('button', { name: 'Taux de réussite' });
    const progress = screen.getByRole('button', { name: 'Avancement' });
    expect(success).toHaveAttribute('aria-pressed', 'true');
    await user.click(success);
    expect(success).toHaveAttribute('aria-pressed', 'false');
    await user.click(progress);
    expect(progress).toHaveAttribute('aria-pressed', 'true');  // la dernière série visible ne se masque pas
    await user.click(success);
    expect(success).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps a data table with formatted values', async () => {
    const user = userEvent.setup();
    render(<EvolutionChart title="Réussite" points={points} series={RATE_SERIES} percent />);
    await user.click(screen.getByText('Voir les données'));
    expect(screen.getByRole('table')).toHaveTextContent('02/11/2026');
    expect(screen.getByRole('table')).toHaveTextContent('60 %');
  });
});

describe('SprintComparisonChart', () => {
  const sprint = (id: string, success: number): SprintSummary => ({
    id, name: `Sprint ${id}`, status: 'completed', status_label: 'Terminé', start_date: '2026-11-01', end_date: '2026-11-14',
    duration_days: 13, stats: { ...stats, success_rate: success }, defects: {} as SprintSummary['defects'],
    regressed_cases: 0, score: null, level: 'not_evaluated', level_label: 'Non évalué',
  });

  it('needs at least two sprints with cases', () => {
    const { container } = render(<SprintComparisonChart sprints={[sprint('1', 50)]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a square-keyed legend for both measures', () => {
    render(<SprintComparisonChart sprints={[sprint('1', 50), sprint('2', 80)]} />);
    expect(screen.getByRole('figure', { name: 'Réussite et avancement par sprint' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Taux de réussite' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Avancement' })).toBeInTheDocument();
  });
});

describe('ChartTooltipCard', () => {
  it('leads with the value, then the series name', () => {
    render(<ChartTooltipCard title="02/11/2026" rows={[{ name: 'Taux de réussite', value: '60 %', color: 'red' }]} />);
    const row = screen.getByRole('listitem');
    expect(row.querySelector('strong')).toHaveTextContent('60 %');
    expect(row).toHaveTextContent('60 %Taux de réussite');
  });
});
