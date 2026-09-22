import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card, StatCard, KpiCard } from './Card';
import { describe, it, expect, vi } from 'vitest';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders as div by default', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content').tagName).toBe('DIV');
  });

  it('renders as button when onClick provided', () => {
    render(<Card onClick={vi.fn()}>Clickable</Card>);
    expect(screen.getByText('Clickable').tagName).toBe('BUTTON');
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>Clickable</Card>);
    await userEvent.click(screen.getByText('Clickable'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies padding class by default', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content').className).toContain('p-6');
  });

  it('removes padding when padding=false', () => {
    render(<Card padding={false}>Content</Card>);
    expect(screen.getByText('Content').className).not.toContain('p-6');
  });

  it('applies hover styles when hover=true', () => {
    render(<Card hover>Content</Card>);
    expect(screen.getByText('Content').className).toContain('hover:');
  });
});

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Tests" value={42} />);
    expect(screen.getByText('Tests')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders positive trend', () => {
    render(<StatCard label="Rate" value="95%" trend={{ value: '+5%', up: true }} />);
    expect(screen.getByText('+5%')).toBeInTheDocument();
  });

  it('renders negative trend', () => {
    render(<StatCard label="Rate" value="95%" trend={{ value: '-3%', up: false }} />);
    expect(screen.getByText('-3%')).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(<StatCard label="Tests" value={10} icon={<span data-testid="icon" />} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});

describe('KpiCard', () => {
  it('renders label and value', () => {
    render(<KpiCard label="Total" value={100} icon={<span data-testid="icon" />} color="#00288e" />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(<KpiCard label="Total" value={100} icon={<span data-testid="icon" />} color="#00288e" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
