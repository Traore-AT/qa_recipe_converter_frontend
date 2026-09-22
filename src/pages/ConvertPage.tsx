import { useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { conversionApi } from '../api/conversion';
import { PageLayout } from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusPill } from '../components/ui/StatusPill';
import { FileDropzone } from '../components/ui/FileDropzone';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { invalidateJobs, queryKeys } from '../lib/queryKeys';
import { getApiErrorMessage } from '../lib/errors';
import { ANONYMOUS_CONVERSION_LIMIT, canConvertAnonymously, getAnonymousConversionsRemaining, incrementAnonymousConversionCount } from '../lib/anonymousUsage';

/** Limite d'upload Word — alignée sur MAX_UPLOAD_SIZE côté backend (50 MB). */
const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;
const WORD_EXTENSIONS = ['.doc', '.docx'];
const TEMPLATE_EXTENSIONS = ['.xlsx'];
const LOGO_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg'];

function hasAllowedExtension(file: File, extensions: string[]): boolean {
  const name = file.name.toLowerCase();
  return extensions.some(extension => name.endsWith(extension));
}

export default function ConvertPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const projectId = searchParams.get('project');

  const logoInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [excelFilename, setExcelFilename] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const { user } = useAuth();
  const isAnonymous = !user;

  const { data: recentJobs } = useQuery({
    queryKey: queryKeys.jobs.list(1),
    queryFn: () => conversionApi.listJobs(1),
    staleTime: 30000,
  });

  // useMutation appelé de façon inconditionnelle à chaque render (Rules of Hooks respectées)
  const mutation = useMutation({
    mutationFn: () => {
      if (!file) return Promise.reject(new Error('Aucun fichier sélectionné'));
      return conversionApi.upload(file, templateFile ?? undefined, projectId || undefined, {
        companyName: companyName || undefined,
        excelFilename: excelFilename || undefined,
        companyLogo: logoFile || undefined,
        onUploadProgress: setUploadProgress,
      });
    },
    onSuccess: (job) => {
      setUploadProgress(null);
      setIsSubmitting(false);
      if (isAnonymous) incrementAnonymousConversionCount();
      invalidateJobs(queryClient);
      toast.success('Conversion terminée', {
        description: `${job.use_cases_count ?? 0} cas de test extraits de « ${file?.name ?? 'document'} ».`,
      });
      navigate(`/preview/${job.id}`);
    },
    onError: (err) => {
      const message = getApiErrorMessage(err, 'Erreur lors de la conversion. Veuillez réessayer.');
      setError(message);
      toast.error('Conversion impossible', { description: message });
      setUploadProgress(null);
      setIsSubmitting(false);
    },
  });

  const selectFile = useCallback((f: File) => {
    if (!hasAllowedExtension(f, WORD_EXTENSIONS)) {
      setError('Seuls les fichiers Word (.doc, .docx) sont acceptés.');
      setFile(null);
      return;
    }
    if (f.size > MAX_UPLOAD_SIZE_BYTES) {
      setError('Fichier trop volumineux : la taille maximale est de 50 Mo.');
      setFile(null);
      return;
    }
    setFile(f);
    setError('');
  }, []);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && !hasAllowedExtension(f, TEMPLATE_EXTENSIONS)) {
      setError('Le template doit être un fichier Excel (.xlsx).');
      setTemplateFile(null);
      return;
    }
    if (f && f.size > MAX_UPLOAD_SIZE_BYTES) {
      setError('Template trop volumineux : la taille maximale est de 50 Mo.');
      setTemplateFile(null);
      return;
    }
    setTemplateFile(f);
    if (f) setError('');
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (!hasAllowedExtension(f, LOGO_EXTENSIONS)) {
        setError('Le logo doit être une image PNG, JPG, GIF ou SVG.');
        setLogoFile(null);
        setLogoPreview(null);
        return;
      }
      if (f.type && !f.type.startsWith('image/') && f.type !== 'image/svg+xml') {
        setError('Le fichier sélectionné n’est pas une image valide.');
        setLogoFile(null);
        setLogoPreview(null);
        return;
      }
      setLogoFile(f);
      setError('');
      const reader = new FileReader();
      reader.onload = ev => setLogoPreview(ev.target?.result as string);
      reader.onerror = () => setError("Impossible de lire l'image du logo.");
      reader.readAsDataURL(f);
    }
  };

  // Nom du fichier Excel généré (aperçu)
  const previewExcelName = excelFilename || (file ? `recette_${file.name.replace(/\.[^.]+$/, '')}.xlsx` : 'recette_document.xlsx');

  const handleSubmit = () => {
    if (!file) return;
    if (isAnonymous && !canConvertAnonymously()) {
      setLoginPromptOpen(true);
      return;
    }
    setIsSubmitting(true);
    mutation.mutate();
  };

  const isBusy = isSubmitting || mutation.isPending;

  return (
    <PageLayout>
      <div className="mb-8">
        <h1 className="text-headline-lg font-bold text-on-surface">Outil de conversion</h1>
        <p className="text-body-base text-on-surface-variant mt-1">
          Importez un fichier Word (.doc, .docx) pour extraire et convertir vos cas de test
        </p>
      </div>

      {/* Pipeline steps with advanced animations */}
      <div className="flex items-center justify-center gap-1 mb-8 flex-wrap">
        {[
          { icon: '📄', label: 'Word' },
          { icon: '📊', label: 'Excel' },
          { icon: '📋', label: 'CSV' },
          { icon: '🌿', label: 'Gherkin' },
          { icon: '🌲', label: 'Cypress' },
          { icon: '🖥️', label: 'VS Code' },
        ].map((step, i) => (
          <div key={step.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-body-xs font-bold font-mono whitespace-nowrap bg-primary/10 text-primary shadow-sm transition-colors">
            <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center">{step.icon}</span>
            <span>{step.label}</span>
            {i < 5 && <span className="ml-1 text-primary/30">→</span>}
          </div>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-6 p-4 rounded-lg border border-error/30 bg-error-container text-on-error-container flex items-center gap-3">
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">error</span>
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Fermer le message d'erreur" className="cursor-pointer hover:opacity-70 material-symbols-outlined">close</button>
        </div>
      )}

      {isBusy && uploadProgress !== null && (
        <div className="mb-6" aria-live="polite">
          <div className="flex items-center justify-between text-body-sm text-on-surface-variant mb-1">
            <span>Envoi du fichier Word…</span>
            <span className="font-mono">{uploadProgress}%</span>
          </div>
          <div
            className="h-2 rounded-full bg-surface-container-high overflow-hidden"
            role="progressbar"
            aria-valuenow={uploadProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progression de l'envoi du fichier"
          >
            <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Word file */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center">1</span>
              <h2 className="text-label-md font-bold text-on-surface uppercase tracking-widest">Fichier Word source</h2>
            </div>
            {file ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-success/50 bg-success-container/20 p-6 text-center sm:p-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-container">
                  <span className="material-symbols-outlined text-2xl text-on-success-container" aria-hidden="true">
                    description
                  </span>
                </div>
                <p className="font-mono text-body-base font-semibold text-on-surface">{file.name}</p>
                <p className="text-body-sm text-on-surface-variant">{(file.size / 1024).toFixed(1)} KB</p>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="mt-1">
                  Changer de fichier
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <FileDropzone
                  inputId="fileInput"
                  inputAriaLabel="Sélectionner un fichier Word"
                  accept={WORD_EXTENSIONS}
                  maxSizeBytes={MAX_UPLOAD_SIZE_BYTES}
                  onFileSelected={selectFile}
                  onError={setError}
                  label="Déposer votre fichier Word ici"
                  hint="ou cliquer pour parcourir"
                  disabled={isBusy}
                />
                <div className="flex justify-center gap-2">
                  <span className="rounded border border-outline-variant bg-surface px-2 py-0.5 font-mono text-body-xs text-on-surface-variant">
                    .doc / .docx
                  </span>
                  <span className="rounded border border-outline-variant bg-surface px-2 py-0.5 font-mono text-body-xs text-on-surface-variant">
                    ≤ 50 MB
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* Step 2: Header options */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center">2</span>
              <h2 className="text-label-md font-bold text-on-surface uppercase tracking-widest">En-tête du document Excel</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-3 mb-3 items-start">
              <div>
                <label className="text-label-sm text-on-surface-variant block mb-1">Logo <span className="text-on-surface-variant/50 font-normal">(optionnel)</span></label>
                <div
                  className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all ${logoPreview ? 'border-primary bg-primary-fixed/30 border-solid' : 'border-outline-variant hover:border-primary/50 hover:bg-primary-fixed/30'}`}
                  onClick={() => logoInputRef.current?.click()}
                  style={{ transition: 'all 0.2s ease' }}
                >
                  <input
                    ref={logoInputRef}
                    id="logoInput"
                    type="file"
                    accept=".png,.jpg,.jpeg,.gif,.svg"
                    className="hidden"
                    onChange={handleLogoChange}
                    aria-label="Sélectionner un logo"
                  />
                  {logoPreview ? (
                    <div>
                      <img src={logoPreview} alt="Logo" className="max-h-10 max-w-full object-contain mx-auto rounded" />
                      <button onClick={e => { e.stopPropagation(); setLogoFile(null); setLogoPreview(null); }} className="text-body-xs text-on-surface-variant hover:text-error mt-1">✕ Retirer</button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-lg">🏢</div>
                      <div className="text-body-xs text-on-surface-variant font-medium">Logo</div>
                      <div className="text-body-xs text-on-surface-variant/50 font-mono">PNG · JPG · SVG</div>
                    </div>
                  )}
                </div>
                <p className="text-body-xs text-on-surface-variant/50 text-center mt-1">Affiché en haut à droite de l'Excel</p>
              </div>

              <div>
                <label className="text-label-sm text-on-surface-variant block mb-1">Nom de l'entreprise</label>
                <input
                  className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Ex : AT-TechGN, Accenture…"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  maxLength={200}
                />
                <p className="text-body-xs text-on-surface-variant/50 mt-1">Affiché en titre de l'en-tête Excel</p>
              </div>
            </div>

            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1">Nom du fichier Excel généré</label>
              <div className="flex">
                <input
                  className="flex-1 px-3 py-2.5 border border-outline-variant rounded-l-lg text-body-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="recette_sprint3 (sans .xlsx)"
                  value={excelFilename}
                  onChange={e => setExcelFilename(e.target.value)}
                  maxLength={255}
                />
                <span className="px-3 py-2.5 bg-surface-container-high border border-outline-variant border-l-0 rounded-r-lg text-body-sm font-mono text-on-surface-variant">.xlsx</span>
              </div>
              <p className="text-body-xs text-on-surface-variant/50 mt-1">Laissez vide pour un nom automatique basé sur le fichier Word</p>
            </div>
          </Card>

          {/* Step 3: Excel template */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center">3</span>
              <h2 className="text-label-md font-bold text-on-surface uppercase tracking-widest">Template Excel <span className="font-normal text-on-surface-variant/50">(optionnel)</span></h2>
            </div>
            <input
              id="templateInput"
              type="file"
              accept=".xlsx"
              onChange={handleTemplateChange}
              aria-label="Sélectionner un template Excel"
              className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-sm font-mono text-on-surface-variant bg-surface-container-low cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-white file:text-label-sm file:font-medium file:cursor-pointer"
            />
            {templateFile && (
              <button
                type="button"
                onClick={() => setTemplateFile(null)}
                className="mt-2 text-body-xs text-on-surface-variant hover:text-error transition-colors cursor-pointer"
              >
                ✕ Retirer le template ({templateFile.name})
              </button>
            )}
            <p className="text-body-xs text-on-surface-variant/50 mt-1">Template personnalisé pour la mise en forme de l'Excel.</p>
          </Card>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Summary */}
            <Card>
              <h2 className="text-headline-sm font-semibold text-on-surface mb-3">Résumé</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-body-sm">
                  <span className="text-on-surface-variant">Fichier</span>
                  <span className="text-on-surface font-medium">{file ? file.name : '—'}</span>
                </div>
                <div className="flex justify-between text-body-sm">
                  <span className="text-on-surface-variant">Taille</span>
                  <span className="text-on-surface font-medium">{file ? `${(file.size / 1024).toFixed(1)} KB` : '—'}</span>
                </div>
                <div className="flex justify-between text-body-sm">
                  <span className="text-on-surface-variant">Projet lié</span>
                  <span className="text-on-surface font-medium">{projectId ? 'Oui' : 'Non'}</span>
                </div>
              </div>
              <hr className="my-4 border-outline-variant" />
              <Button
                className="w-full"
                disabled={!file || isBusy}
                loading={isBusy}
                onClick={handleSubmit}
              >
                {isBusy ? '⏳ Conversion en cours…' : 'Lancer la conversion'}
              </Button>
              {!file && (
                <p className="text-body-sm text-on-surface-variant text-center mt-2">Sélectionnez un fichier pour commencer</p>
              )}
              {isAnonymous && (
                <p className="text-body-xs text-on-surface-variant text-center mt-3 flex items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-3 py-1 border border-outline-variant">
                    ⚡ {getAnonymousConversionsRemaining()} conversion{getAnonymousConversionsRemaining() > 1 ? 's' : ''} anonyme{getAnonymousConversionsRemaining() > 1 ? 's' : ''} restante{getAnonymousConversionsRemaining() > 1 ? 's' : ''}
                  </span>
                  <Link to="/login/*" className="text-primary hover:underline">{loginPromptOpen ? '' : 'Se connecter pour plus'}</Link>
                </p>
              )}
            </Card>

            {/* Live header preview */}
            <Card>
              <h2 className="text-headline-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
                <span className="animate-fade-in-up">👁️</span> Aperçu en-tête Excel
              </h2>
              <div className="overflow-hidden rounded-lg border border-outline-variant font-mono text-body-xs">
                <div className="flex items-center justify-between bg-inverse-surface px-3 py-2 text-inverse-on-surface">
                  <span className="text-body-sm font-bold">{companyName || 'QA Recipe Converter'}</span>
                  <div className="flex h-6 items-center">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo de l'entreprise" className="h-5 w-auto rounded-sm object-contain" />
                    ) : (
                      <span className="text-body-xs italic opacity-40">logo ici</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between bg-surface-container-high px-3 py-1 text-on-surface-variant">
                  <span>Source : <span className="opacity-70">{file?.name || 'document.docx'}</span></span>
                  <span>Export : <span className="opacity-70">{previewExcelName}</span></span>
                </div>
                <div className="grid grid-cols-[30px_1fr_1fr_1fr] gap-1 bg-primary-container px-2 py-1 text-body-xs font-bold text-on-primary">
                  <span>N°</span><span>Use Case</span><span>Description</span><span>…</span>
                </div>
                <div className="bg-surface-container-low px-2 py-1.5 text-center text-on-surface-variant">
                  Données des cas de tests…
                </div>
              </div>
            </Card>

            {/* Features */}
            <Card>
              <h2 className="text-headline-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
                <span className="shrink-0 text-sm">✨</span> Ce que vous obtenez
              </h2>
              <div className="space-y-2">
                {[
                  { icon: '📊', text: 'Excel professionnel avec en-tête personnalisée et logo' },
                  { icon: '📋', text: 'CSV compatible tableur (Excel, LibreOffice, Google Sheets)' },
                  { icon: '📝', text: 'Scripts Gherkin (.feature) par cas automatisable' },
                  { icon: '🌲', text: 'Projet Cypress complet avec step definitions' },
                  { icon: '🖥️', text: 'Ouverture automatique dans VS Code' },
                  { icon: '✏️', text: 'Édition inline avant export — aucune perte de données' },
                ].map(f => (
                  <div key={f.icon} className="flex items-start gap-2 text-body-sm text-on-surface-variant">
                    <span className="shrink-0 text-sm animate-fade-in">{f.icon}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent jobs */}
            {recentJobs && recentJobs.results.length > 0 && (
              <Card>
                <h2 className="text-headline-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
                  <span className="animate-fade-in-up">🕒</span> Conversions récentes
                </h2>
                <div className="space-y-2">
                  {recentJobs.results.slice(0, 5).map(job => (
                    <div key={job.id} className="flex items-center justify-between py-1.5 border-b border-outline-variant/50 last:border-b-0 gap-2">
                      <div className="min-w-0">
                        <div className="text-body-sm font-semibold text-on-surface font-mono truncate max-w-[150px]" title={job.source_filename}>
                          {job.source_filename.length > 20 ? job.source_filename.substring(0, 20) + '…' : job.source_filename}
                        </div>
                        <div className="text-body-xs text-on-surface-variant">
                          <StatusPill status={job.status} />
                          <span className="ml-1">{job.use_cases_count} UC</span>
                        </div>
                      </div>
                      {job.status === 'done' && (
                        <Link to={`/preview/${job.id}`} className="text-body-xs text-primary hover:underline shrink-0 animate-fade-in">
                          Voir →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Login prompt (quota freemium épuisé) */}
      <Modal
        open={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
        labelledBy="login-prompt-title"
        maxWidth="max-w-md"
        className="p-7"
      >
        <h3 id="login-prompt-title" className="text-headline-sm font-extrabold text-on-surface mb-4 flex items-center gap-2">🔒 Quota anonyme épuisé</h3>
        <p className="text-body-sm text-on-surface-variant mb-5">
          Vous avez utilisé vos {ANONYMOUS_CONVERSION_LIMIT} conversions gratuites. Créez un compte
          gratuit pour continuer à convertir sans limite.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button variant="secondary" onClick={() => setLoginPromptOpen(false)}>
            Plus tard
          </Button>
          <Link to="/register/*" className="no-underline inline-flex items-center justify-center">
            <Button>Créer un compte gratuit</Button>
          </Link>
          <Link to="/login/*" className="no-underline inline-flex items-center justify-center">
            <Button>Se connecter</Button>
          </Link>
        </div>
      </Modal>
    </PageLayout>
  );
}