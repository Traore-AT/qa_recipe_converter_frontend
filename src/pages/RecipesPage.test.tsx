import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import RecipesPage from './RecipesPage';

const { mockConversionApi, mockAuth } = vi.hoisted(() => ({
  mockConversionApi: { listJobs: vi.fn(), deleteJob: vi.fn() },
  mockAuth: { user: null as { id: number; username: string; email: string; full_name: string; date_joined: string } | null },
}));

vi.mock('../api/conversion', () => ({ conversionApi: mockConversionApi }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockAuth.user }) }));

const mockJobs = [
  { id: 'j1', source_filename: 'test_cases.docx', use_cases_count: 15, status: 'done', created_at: '2025-06-01T10:00:00Z' },
  { id: 'j2', source_filename: 'sprint_24.docx', use_cases_count: 8, status: 'processing', created_at: '2025-06-02T14:00:00Z' },
  { id: 'j3', source_filename: 'regression.xlsx', use_cases_count: 42, status: 'done', created_at: '2025-05-28T09:00:00Z' },
];

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/recipes']}>
          <RecipesPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('RecipesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConversionApi.listJobs.mockResolvedValue({ results: mockJobs, count: 3 });
  });

  it('renders page title', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Recettes', level: 1 })).toBeInTheDocument();
    });
  });

  it('shows job count', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/3 recettes/)).toBeInTheDocument();
    });
  });

  it('renders job list from API', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('test_cases.docx')).toBeInTheDocument();
      expect(screen.getByText('sprint_24.docx')).toBeInTheDocument();
      expect(screen.getByText('regression.xlsx')).toBeInTheDocument();
    });
  });

  it('shows use case count for each job', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/cas de test/).length).toBeGreaterThanOrEqual(3);
    });
  });

  it('shows status pills for jobs', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Terminé').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Traitement...')).toBeInTheDocument();
    });
  });

  it('filters jobs by search', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('test_cases.docx')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Rechercher une recette...');
    await user.type(searchInput, 'sprint');
    await waitFor(() => {
      expect(screen.queryByText('test_cases.docx')).not.toBeInTheDocument();
      expect(screen.getByText('sprint_24.docx')).toBeInTheDocument();
    });
  });

  it('shows anonymous login prompt in empty state', async () => {
    mockConversionApi.listJobs.mockResolvedValue({ results: [], count: 0 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Connectez-vous pour retrouver vos recettes')).toBeInTheDocument();
    });
    expect(screen.getByText(/Créez un compte ou connectez-vous/)).toBeInTheDocument();
  });

  it('shows empty search state', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('test_cases.docx')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Rechercher une recette...');
    await user.type(searchInput, 'zzzzz');
    await waitFor(() => {
      expect(screen.getByText('Aucune recette trouvée')).toBeInTheDocument();
    });
  });

  it('shows loading skeleton', () => {
    mockConversionApi.listJobs.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByPlaceholderText('Rechercher une recette...')).toBeInTheDocument();
  });

  it('links to login from empty state', async () => {
    mockConversionApi.listJobs.mockResolvedValue({ results: [], count: 0 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Se connecter/)).toBeInTheDocument();
    });
    const loginLink = screen.getByRole('link', { name: /Se connecter/ });
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  // ── Delete recipe ─────────────────────────────────────────────────────────
  describe('delete recipe', () => {
    beforeEach(() => {
      mockConversionApi.deleteJob.mockResolvedValue(undefined);
    });

    it('shows delete button for each job', async () => {
      renderPage();
      await waitFor(() => {
        const buttons = screen.getAllByTitle('Supprimer cette recette');
        expect(buttons).toHaveLength(3);
      });
    });

    it('opens confirmation dialog on delete click', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('test_cases.docx')).toBeInTheDocument();
      });
      const deleteBtn = screen.getAllByTitle('Supprimer cette recette')[0];
      await user.click(deleteBtn);
      expect(screen.getByRole('heading', { name: 'Supprimer cette recette ?' })).toBeInTheDocument();
      expect(screen.getByText(/Cette action est irréversible/)).toBeInTheDocument();
    });

    it('calls deleteJob and refreshes on confirm', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('test_cases.docx')).toBeInTheDocument();
      });
      const deleteBtn = screen.getAllByTitle('Supprimer cette recette')[0];
      await user.click(deleteBtn);
      const confirmBtn = screen.getByText('Supprimer');
      await user.click(confirmBtn);
      await waitFor(() => {
        expect(mockConversionApi.deleteJob).toHaveBeenCalledWith('j1');
      });
    });

    it('closes dialog on cancel', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('test_cases.docx')).toBeInTheDocument();
      });
      const deleteBtn = screen.getAllByTitle('Supprimer cette recette')[0];
      await user.click(deleteBtn);
      expect(screen.getByText('Supprimer cette recette ?')).toBeInTheDocument();
      const cancelBtn = screen.getByText('Annuler');
      await user.click(cancelBtn);
      expect(screen.queryByText('Supprimer cette recette ?')).not.toBeInTheDocument();
    });

    it('shows error message on delete failure', async () => {
      mockConversionApi.deleteJob.mockRejectedValue({
        response: { data: { detail: 'Permission refusée.' } },
      });
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('test_cases.docx')).toBeInTheDocument();
      });
      const deleteBtn = screen.getAllByTitle('Supprimer cette recette')[0];
      await user.click(deleteBtn);
      const confirmBtn = screen.getByText('Supprimer');
      await user.click(confirmBtn);
      await waitFor(() => {
        expect(screen.getByText(/Permission refusée/)).toBeInTheDocument();
      });
    });
  });
});
