import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

function TestComponent() {
  const { dark, toggle } = useTheme();
  return (
    <div>
      <span data-testid="dark">{dark ? 'dark' : 'light'}</span>
      <button data-testid="toggle-btn" onClick={toggle}>Toggle</button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to light mode when no stored preference', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({ matches: false })),
    });
    render(<ThemeProvider><TestComponent /></ThemeProvider>);
    expect(screen.getByTestId('dark')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('reads dark mode from localStorage', () => {
    localStorage.setItem('theme', 'dark');
    render(<ThemeProvider><TestComponent /></ThemeProvider>);
    expect(screen.getByTestId('dark')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles theme on button click', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({ matches: false })),
    });
    render(<ThemeProvider><TestComponent /></ThemeProvider>);
    expect(screen.getByTestId('dark')).toHaveTextContent('light');
    await userEvent.click(screen.getByTestId('toggle-btn'));
    expect(screen.getByTestId('dark')).toHaveTextContent('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});

describe('useTheme', () => {
  it('throws error when used outside provider', () => {
    expect(() => render(<TestComponent />)).toThrow('useTheme must be used within ThemeProvider');
  });
});
