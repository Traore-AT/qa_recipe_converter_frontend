import { render, screen } from '@testing-library/react';
import { StatusPill } from './StatusPill';
import { describe, it, expect } from 'vitest';

describe('StatusPill', () => {
  const cases = [
    { status: 'Passé', expected: 'Passé' },
    { status: 'passed', expected: 'Passé' },
    { status: 'Échoué', expected: 'Échoué' },
    { status: 'failed', expected: 'Échoué' },
    { status: 'Bloqué', expected: 'Bloqué' },
    { status: 'blocked', expected: 'Bloqué' },
    { status: 'En cours', expected: 'En cours' },
    { status: 'in_progress', expected: 'En cours' },
    { status: 'À tester', expected: 'À tester' },
    { status: 'pending', expected: 'À tester' },
    { status: 'done', expected: 'Terminé' },
    { status: 'error', expected: 'Erreur' },
    { status: 'processing', expected: 'Traitement...' },
  ];

  it.each(cases)('renders "$status" as "$expected"', ({ status, expected }) => {
    render(<StatusPill status={status} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('falls back to raw status for unknown values', () => {
    render(<StatusPill status="unknown_status" />);
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });
});
