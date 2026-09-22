import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import ConvertPage from './ConvertPage';

const { mockConversionApi, mockNavigate } = vi.hoisted(() => ({
  mockConversionApi: { upload: vi.fn(), listJobs: vi.fn() },
  mockNavigate: vi.fn(),
}));

vi.mock('../api/conversion', () => ({ conversionApi: mockConversionApi }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockJobsData = {
  count: 2,
  results: [
    { id: 'j1', created_at: '2025-06-01T10:00:00Z', status: 'done', source_filename: 'recette_v1.docx', use_cases_count: 5, error_message: '' },
    { id: 'j2', created_at: '2025-06-02T12:00:00Z', status: 'pending', source_filename: 'test_auth.docx', use_cases_count: 3, error_message: '' },
  ],
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter>
          <ConvertPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function getFileInput(): HTMLInputElement {
  return document.getElementById('fileInput') as HTMLInputElement;
}

describe('ConvertPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConversionApi.listJobs.mockResolvedValue(mockJobsData);
  });

  it('renders the conversion tool title', async () => {
    renderPage();
    expect(screen.getByText('Outil de conversion')).toBeInTheDocument();
  });

  it('shows pipeline steps', () => {
    renderPage();
    const words = screen.getAllByText(/Word/);
    expect(words.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Excel/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Gherkin/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Cypress/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/VS Code/).length).toBeGreaterThanOrEqual(1);
  });

  it('displays drag-and-drop zone', () => {
    renderPage();
    expect(screen.getByText('Déposer votre fichier Word ici')).toBeInTheDocument();
  });

  it('displays header options section', () => {
    renderPage();
    expect(screen.getByText('En-tête du document Excel')).toBeInTheDocument();
  });

  it('shows recent jobs', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('recette_v1.docx')).toBeInTheDocument();
    });
  });

  it('shows summary with no file initially', () => {
    renderPage();
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Sélectionnez un fichier pour commencer')).toBeInTheDocument();
  });

  it('disables convert button when no file', () => {
    renderPage();
    const btn = screen.getByRole('button', { name: 'Lancer la conversion' });
    expect(btn).toBeDisabled();
  });

  it('shows live header preview', () => {
    renderPage();
    expect(screen.getByText('QA Recipe Converter')).toBeInTheDocument();
  });

  it('calls upload and navigates on success', async () => {
    const user = userEvent.setup();
    mockConversionApi.upload.mockResolvedValue({ id: 'new-job-id' });

    renderPage();

    const input = getFileInput();
    const fakeFile = new File(['test'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    await user.upload(input, fakeFile);

    await waitFor(() => {
      expect(screen.getAllByText('test.docx').length).toBeGreaterThanOrEqual(1);
    });

    await user.click(screen.getByRole('button', { name: 'Lancer la conversion' }));

    await waitFor(() => {
      expect(mockConversionApi.upload).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/preview/new-job-id');
    });
  });

  it('shows error message on upload failure', async () => {
    const user = userEvent.setup();
    mockConversionApi.upload.mockRejectedValue({ response: { data: { error: 'Fichier invalide.' } } });

    renderPage();

    const input = getFileInput();
    const fakeFile = new File(['test'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    await user.upload(input, fakeFile);

    await waitFor(() => {
      expect(screen.getAllByText('test.docx').length).toBeGreaterThanOrEqual(1);
    });

    await user.click(screen.getByRole('button', { name: 'Lancer la conversion' }));

    await waitFor(() => {
      expect(screen.getByText('Fichier invalide.')).toBeInTheDocument();
    });
  });

  it('allows setting company name', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByPlaceholderText('Ex : AT-TechGN, Accenture…');
    await user.type(input, 'ACME Corp');
    expect(input).toHaveValue('ACME Corp');
  });

  it('updates preview when company name changes', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByPlaceholderText('Ex : AT-TechGN, Accenture…');
    await user.type(input, 'ACME Corp');
    await waitFor(() => {
      expect(screen.getByText('ACME Corp')).toBeInTheDocument();
    });
  });

  it('shows features list', () => {
    renderPage();
    expect(screen.getByText(/Excel professionnel/)).toBeInTheDocument();
    expect(screen.getByText(/Scripts Gherkin/)).toBeInTheDocument();
    expect(screen.getByText(/Projet Cypress/)).toBeInTheDocument();
    expect(screen.getByText(/Ouverture automatique/)).toBeInTheDocument();
    expect(screen.getByText(/Édition inline/)).toBeInTheDocument();
  });

  it('rejects a template with an unsupported extension', async () => {
    renderPage();
    const template = new File(['not excel'], 'template.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    fireEvent.change(screen.getByLabelText('Sélectionner un template Excel'), { target: { files: [template] } });

    expect(screen.getByText('Le template doit être un fichier Excel (.xlsx).')).toBeInTheDocument();
  });

  it('rejects a logo that is not an image', async () => {
    renderPage();
    const logo = new File(['not an image'], 'logo.txt', { type: 'text/plain' });

    fireEvent.change(screen.getByLabelText('Sélectionner un logo'), { target: { files: [logo] } });

    expect(screen.getByText('Le logo doit être une image PNG, JPG, GIF ou SVG.')).toBeInTheDocument();
  });
});
