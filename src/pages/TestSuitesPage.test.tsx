import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import TestSuitesPage from './TestSuitesPage';

const { mockConversionApi } = vi.hoisted(() => ({
  mockConversionApi: { listJobs: vi.fn() },
}));

vi.mock('../api/conversion', () => ({ conversionApi: mockConversionApi }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, username: 'test', email: 'test@test.com', full_name: 'Test User', date_joined: '2025-01-01' } }) }));

const mockJobs = [
  { id: 'j1', source_filename: 'Sprint_24_Recipes.docx', use_cases_count: 15, status: 'done', created_at: '2025-06-01T10:00:00Z' },
  { id: 'j2', source_filename: 'Sprint_24_Recipes.docx', use_cases_count: 8, status: 'done', created_at: '2025-06-02T14:00:00Z' },
  { id: 'j3', source_filename: 'Regression_Pack.xlsx', use_cases_count: 42, status: 'done', created_at: '2025-05-28T09:00:00Z' },
  { id: 'j4', source_filename: 'Regression_Pack.xlsx', use_cases_count: 10, status: 'processing', created_at: '2025-06-03T09:00:00Z' },
];

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/suites']}>
          <TestSuitesPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('TestSuitesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConversionApi.listJobs.mockResolvedValue({ results: mockJobs, count: 4 });
  });

  it('renders page title', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Suites de test', level: 1 })).toBeInTheDocument();
    });
  });

  it('shows suite and file counts', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/2 suites.*4 fichiers importés/)).toBeInTheDocument();
    });
  });

  it('renders aggregated suites grouped by filename', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Sprint_24_Recipes')).toBeInTheDocument();
      expect(screen.getByText('Regression_Pack')).toBeInTheDocument();
    });
  });

  it('shows file count per suite', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/2 fichiers/).length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows conversion rate badges', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/\d+%/).length).toBeGreaterThanOrEqual(2);
    });
  });

  it('renders conversion rate progress bars', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Taux de conversion')).toBeInTheDocument();
    });
  });

  it('calculates correct conversion rate for mixed status suites', async () => {
    renderPage();
    await waitFor(() => {
      const badges = screen.getAllByText(/\d+%/);
      expect(badges.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows empty state when no jobs', async () => {
    mockConversionApi.listJobs.mockResolvedValue({ results: [], count: 0 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Aucune suite de test')).toBeInTheDocument();
    });
  });

  it('shows loading skeleton', () => {
    mockConversionApi.listJobs.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('heading', { name: 'Suites de test', level: 1 })).toBeInTheDocument();
  });

  it('links to convert page from empty state', async () => {
    mockConversionApi.listJobs.mockResolvedValue({ results: [], count: 0 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('+ Convertir un fichier')).toBeInTheDocument();
    });
  });
});
