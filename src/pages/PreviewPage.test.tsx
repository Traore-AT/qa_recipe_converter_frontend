import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import PreviewPage from './PreviewPage';

const { mockConversionApi, mockNavigate } = vi.hoisted(() => ({
  mockConversionApi: { getJob: vi.fn(), batchSave: vi.fn(), openVscode: vi.fn(), generateExcel: vi.fn(), generateGherkin: vi.fn(), bulkUpdateStatus: vi.fn() },
  mockNavigate: vi.fn(),
}));

vi.mock('../api/conversion', () => ({ conversionApi: mockConversionApi }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockJobData = {
  id: 'job-123',
  created_at: '2025-06-01T10:00:00Z',
  status: 'done',
  source_filename: 'recette_v2.docx',
  use_cases_count: 3,
  error_message: '',
  company_name: 'ACME Corp',
  excel_filename: 'mon_fichier.xlsx',
  company_logo: null,
  use_cases: [
    { id: 'uc-1', order: 1, use_case_text: 'UC001', description: 'Login test', preconditions: 'User exists', steps: 'Open app\nEnter credentials', expected_results: 'Dashboard shown', observed_results: '', is_automated: true, status: 'Passé' },
    { id: 'uc-2', order: 2, use_case_text: 'UC002', description: 'Logout test', preconditions: 'User logged in', steps: 'Click logout', expected_results: 'Redirected to login', observed_results: '', is_automated: false, status: 'À tester' },
    { id: 'uc-3', order: 3, use_case_text: 'UC003', description: 'Password reset', preconditions: '', steps: 'Click forgot password', expected_results: 'Reset email sent', observed_results: '', is_automated: false, status: 'En cours' },
  ],
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/preview/job-123']}>
          <Routes>
            <Route path="/preview/:id" element={<PreviewPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('PreviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConversionApi.getJob.mockResolvedValue(mockJobData);
  });

  it('renders breadcrumb with filename', async () => {
    renderPage();
    const matches = await screen.findAllByText('recette_v2.docx');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('displays header banner with company name', async () => {
    renderPage();
    await screen.findByText('ACME Corp');
  });

  it('shows stats', async () => {
    renderPage();
    await screen.findByText('Use Cases total');
    expect(screen.getByText('Cas automatisables')).toBeInTheDocument();
    expect(screen.getByText('Lignes Excel')).toBeInTheDocument();
  });

  it('shows correct stat values', async () => {
    renderPage();
    await screen.findByText('Use Cases total');
    const values = screen.getAllByText('3');
    expect(values.length).toBeGreaterThanOrEqual(2);
  });

  it('displays export panel', async () => {
    renderPage();
    await screen.findByText(/Exporter vos résultats/);
  });

  it('shows export buttons', async () => {
    renderPage();
    await screen.findByText('Excel complet');
    expect(screen.getByText('Scripts Gherkin')).toBeInTheDocument();
    expect(screen.getByText('Projet Cypress')).toBeInTheDocument();
    expect(screen.getByText('Ouvrir VS Code')).toBeInTheDocument();
  });

  it('renders use cases table with all rows', async () => {
    renderPage();
    await screen.findByText('UC001');
    expect(screen.getByText('UC002')).toBeInTheDocument();
    expect(screen.getByText('UC003')).toBeInTheDocument();
  });

  it('shows status selects for each row', async () => {
    renderPage();
    await screen.findByText('UC001');
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBe(3);
  });

  it('shows save button', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('💾 Sauvegarder')).toBeInTheDocument();
    });
  });

  it('shows auto filter toggle', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('🤖 Automatisés seuls')).toBeInTheDocument();
    });
  });

  it('shows automated count badge', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('UC001')).toBeInTheDocument();
    });
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });

  it('opens header edit modal', async () => {
    renderPage();
    const btn = await screen.findByRole('button', { name: /Modifier l'en-tête/ });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText("✏️ Modifier l'en-tête Excel")).toBeInTheDocument();
    });
  });

  it('calls batchSave on save', async () => {
    const user = userEvent.setup();
    mockConversionApi.batchSave.mockResolvedValue({ success: true, automated_count: 1 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('💾 Sauvegarder')).toBeInTheDocument();
    });
    const btn = screen.getByText('💾 Sauvegarder');
    await user.click(btn);
    await waitFor(() => {
      expect(mockConversionApi.batchSave).toHaveBeenCalled();
    });
  });

  it('shows error state when job not found', async () => {
    mockConversionApi.getJob.mockRejectedValue(new Error('Not found'));
    renderPage();
    await screen.findByText('Résultat introuvable');
  });

  it('shows "Tout cocher" when not all automated', async () => {
    renderPage();
    await screen.findByText('☑ Tout cocher');
  });

  it('renders checkboxes for bulk selection', async () => {
    renderPage();
    await screen.findByText('UC001');
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(3);
  });

  it('shows bulk toolbar when a row is selected', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('UC001');
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await screen.findByText('1 sélectionné(s)');
  });

  it('calls bulkUpdateStatus when bulk status changed', async () => {
    const user = userEvent.setup();
    mockConversionApi.bulkUpdateStatus.mockResolvedValue({ updated: 1, status: 'Passé' });
    renderPage();
    await screen.findByText('UC001');
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await screen.findByText('1 sélectionné(s)');
    const statusSelect = screen.getByDisplayValue('Changer le statut…');
    await user.selectOptions(statusSelect, 'Passé');
    await waitFor(() => {
      expect(mockConversionApi.bulkUpdateStatus).toHaveBeenCalled();
    });
  });

  it('renders CAS column header in table', async () => {
    renderPage();
    await screen.findByText('UC001');
    expect(screen.getByText('CAS')).toBeInTheDocument();
  });

  it('renders CAS values in UC-xxx format', async () => {
    renderPage();
    await screen.findByText('UC001');
    expect(screen.getByText('UC-001')).toBeInTheDocument();
    expect(screen.getByText('UC-002')).toBeInTheDocument();
    expect(screen.getByText('UC-003')).toBeInTheDocument();
  });
});
