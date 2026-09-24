import { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversionApi } from '../api/conversion';
import { PageLayout } from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import type { ExtractedUseCase } from '../types';
import excelIcon from '../assets/excel.svg';
import csvIcon from '../assets/CSV.png';
import cypressIcon from '../assets/cypress.svg';
import vscodeIcon from '../assets/vscode.svg';
import { invalidateJobs, queryKeys } from '../lib/queryKeys';
import { downloadBlob } from '../lib/download';
import { getApiErrorMessage } from '../lib/errors';

/** Statuts d'exécution d'un cas de test (tokens sémantiques). */
const UC_STATUS_CLASSES: Record<string, string> = {
  'À tester': 'bg-surface-container-high text-on-surface-variant',
  'En cours': 'bg-primary-fixed text-primary',
  'Passé': 'bg-success-container text-on-success-container',
  'Échoué': 'bg-error-container text-on-error-container',
  'Bloqué': 'bg-warning-container text-on-warning-container',
};

type UseCaseRow = ExtractedUseCase & { _dirty?: boolean };

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
    const toast = useToast();
  const { user } = useAuth();
  const isAnonymous = !user;
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

  const [useCases, setUseCases] = useState<UseCaseRow[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [excelFilename, setExcelFilename] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [filterAuto, setFilterAuto] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [headerModalOpen, setHeaderModalOpen] = useState(false);
  const [vscodeModalOpen, setVscodeModalOpen] = useState(false);
  const [vscodeStatus, setVscodeStatus] = useState<'loading' | 'success' | 'warn'>('loading');
  const [vscodeMsg, setVscodeMsg] = useState('');
  const [vscodePath, setVscodePath] = useState('');
  const [selectedUcIds, setSelectedUcIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const modalCompanyRef = useRef<HTMLInputElement>(null);
  const modalExcelRef = useRef<HTMLInputElement>(null);
  const modalLogoRef = useRef<HTMLInputElement>(null);

  const deleteMutation = useMutation({
    mutationFn: () => conversionApi.deleteJob(id!),
    onSuccess: () => {
      invalidateJobs(queryClient, id);
      toast.success('Recette supprimée');
      navigate('/recipes');
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.job(id),
    queryFn: () => conversionApi.getJob(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (data) {
      setUseCases(data.use_cases?.map(uc => ({ ...uc, _dirty: false })) || []); // eslint-disable-line react-hooks/set-state-in-effect
      setCompanyName(data.company_name || '');
      setExcelFilename(data.excel_filename || '');
    }
  }, [data]);

  const toggleSelection = (ucId: string) => {
    setSelectedUcIds(prev => {
      const next = new Set(prev);
      if (next.has(ucId)) next.delete(ucId); else next.add(ucId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUcIds.size === filteredUcs.length) {
      setSelectedUcIds(new Set());
    } else {
      setSelectedUcIds(new Set(filteredUcs.map(uc => uc.id)));
    }
  };

  const handleBulkStatusChange = (status: string) => {
    if (selectedUcIds.size === 0 || !status) return;
    bulkStatusMutation.mutate({ uc_ids: Array.from(selectedUcIds), status });
  };

  const autoCount = useCases.filter(uc => uc.is_automated).length;

  const saveMutation = useMutation({
    mutationFn: () => conversionApi.batchSave(id!, {
      company_name: companyName,
      excel_filename: excelFilename,
      use_cases: useCases.map(uc => ({
        id: uc.id,
        use_case_text: uc.use_case_text,
        description: uc.description,
        preconditions: uc.preconditions,
        steps: uc.steps,
        expected_results: uc.expected_results,
        observed_results: uc.observed_results,
        is_automated: uc.is_automated,
        status: uc.status,
        jira_ticket: uc.jira_ticket || '',
      })),
    }),
    onSuccess: () => {
      setSaveIndicator(true);
      setTimeout(() => setSaveIndicator(false), 3500);
      queryClient.invalidateQueries({ queryKey: queryKeys.job(id) });
    },
    onError: (err) => {
      toast.error('Enregistrement impossible', { description: getApiErrorMessage(err) });
    },
  });

  const vscodeMutation = useMutation({
    mutationFn: async () => {
      await saveMutation.mutateAsync();
      return conversionApi.openVscode(id!);
    },
    onSuccess: (data) => {
      setVscodeStatus(data.vscode_opened ? 'success' : 'warn');
      setVscodeMsg(data.message);
      setVscodePath(data.project_path || '');
    },
    onError: () => {
      setVscodeStatus('warn');
      setVscodeMsg('Erreur lors de la génération du projet.');
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: (payload: { uc_ids: string[]; status: string }) =>
      conversionApi.bulkUpdateStatus(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.job(id) });
      setSelectedUcIds(new Set());
      setBulkStatus('');
      toast.success('Statuts mis à jour');
    },
    onError: (err) => {
      toast.error('Mise à jour impossible', { description: getApiErrorMessage(err) });
    },
  });

  const updateUc = (ucId: string, field: keyof ExtractedUseCase, value: ExtractedUseCase[keyof ExtractedUseCase]) => {
    setUseCases(prev => prev.map(uc =>
      uc.id === ucId ? { ...uc, [field]: value, _dirty: true } : uc
    ));
  };

  const toggleAllAuto = () => {
    const target = autoCount < useCases.length;
    setUseCases(prev => prev.map(uc => ({ ...uc, is_automated: target, _dirty: true })));
  };

  const handleSave = () => saveMutation.mutate();

  const handleVscode = () => {
    if (isAnonymous) { setLoginPromptOpen(true); return; }
    if (autoCount === 0) return;
    setVscodeModalOpen(true);
    setVscodeStatus('loading');
    setVscodeMsg('Sauvegarde et génération du projet Cypress…');
    setVscodePath('');
    vscodeMutation.mutate();
  };

  const handleDownloadExcel = async () => {
    if (isAnonymous) { setLoginPromptOpen(true); return; }
    if (!id) return;
    try {
      await saveMutation.mutateAsync();
      const blob = await conversionApi.generateExcel(id);
      const name = data?.effective_excel_filename || `recette_${data?.source_filename?.replace(/\.docx?$/, '') || 'export'}.xlsx`;
      downloadBlob(blob, name);
      toast.success('Export Excel prêt', { description: name });
    } catch (err) {
      toast.error('Export Excel impossible', { description: getApiErrorMessage(err) });
    }
  };

  const handleDownloadGherkin = async () => {
    if (isAnonymous) { setLoginPromptOpen(true); return; }
    if (autoCount === 0 || !id) return;
    try {
      await saveMutation.mutateAsync();
      const blob = await conversionApi.generateGherkin(id);
      const base = data?.source_filename?.replace(/\.docx?$/, '') || 'features';
      downloadBlob(blob, `gherkin_features_${base}.zip`);
    } catch { /* handled by mutation */ }
  };

  const handleDownloadCypress = async () => {
    if (isAnonymous) { setLoginPromptOpen(true); return; }
    if (autoCount === 0 || !id) return;
    try {
      await saveMutation.mutateAsync();
      const blob = await conversionApi.generateGherkin(id, 'cypress');
      const base = data?.source_filename?.replace(/\.docx?$/, '') || 'cypress';
      downloadBlob(blob, `cypress_project_${base}.zip`);
    } catch { /* handled by mutation */ }
  };

  const handleDownloadCSV = async () => {
    if (isAnonymous) { setLoginPromptOpen(true); return; }
    if (!id) return;
    try {
      await saveMutation.mutateAsync();
      const blob = await conversionApi.generateCSV(id);
      const base = data?.source_filename?.replace(/\.docx?$/, '') || 'recettes';
      downloadBlob(blob, `recettes_${base}.csv`);
    } catch { /* handled by mutation */ }
  };

  const handleModalLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLogoDataUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="mb-8"><div className="h-8 w-48 bg-surface-container-high rounded-lg animate-pulse mb-2" /><div className="h-4 w-72 bg-surface-container-high rounded animate-pulse" /></div>
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-surface-container-high rounded-xl animate-pulse" />)}</div>
      </PageLayout>
    );
  }

  if (error || !data) {
    return (
      <PageLayout>
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-xl bg-error-container flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-error text-2xl">error</span>
          </div>
          <h2 className="text-headline-md font-bold text-on-surface mb-2">Résultat introuvable</h2>
          <p className="text-body-base text-on-surface-variant mb-6">Ce job de conversion n'existe pas ou a été supprimé.</p>
          <Link to="/convert"><Button>Nouvelle conversion</Button></Link>
        </div>
      </PageLayout>
    );
  }

  const filteredUcs = filterAuto ? useCases.filter(uc => uc.is_automated) : useCases;

  return (
    <PageLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-body-sm text-on-surface-variant mb-4">
        <Link to="/convert" className="hover:text-primary transition-colors">Conversion</Link>
        <span>/</span>
        <span className="text-on-surface font-medium">{data.source_filename}</span>
      </div>

      {/* Header banner */}
      <div className="rounded-xl overflow-hidden shadow-lg mb-6 border border-outline-variant/20">
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(135deg, #0f2342, #1a3a6e)' }}>
          <div>
            <div className="text-headline-sm font-bold text-white/90">{companyName || 'QA Recipe Converter'}</div>
            <div className="text-body-sm font-mono text-blue-200/60 mt-0.5">En-tête du document Excel</div>
          </div>
          <div className="flex items-center justify-end min-w-[80px]">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt="Logo" className="max-h-10 max-w-[140px] object-contain rounded" />
            ) : data.company_logo ? (
              <img src={data.company_logo} alt="Logo" className="max-h-10 max-w-[140px] object-contain rounded" />
            ) : (
              <span className="text-body-sm italic text-white/20">logo ici</span>
            )}
          </div>
        </div>
        <div className="px-6 py-2 flex items-center gap-3 flex-wrap" style={{ background: '#1a3a6e' }}>
          <span className="text-body-sm font-mono text-blue-200/80">📄 Source : <strong className="text-white/90">{data.source_filename}</strong></span>
          <span className="text-blue-200/40">·</span>
          <span className="text-body-sm font-mono text-blue-200/80">📊 Export : <strong className="text-white/90">{(excelFilename || `recette_${data.source_filename.replace(/\.docx?$/, '')}`) + '.xlsx'}</strong></span>
          <button onClick={() => setHeaderModalOpen(true)} className="text-body-sm font-mono text-blue-200/50 hover:text-white/80 border border-white/10 hover:border-white/30 rounded-lg px-3 py-1 transition-all cursor-pointer">
            ✏️ Modifier l'en-tête
          </button>
          <button onClick={() => setDeleteModalOpen(true)} className="text-body-sm font-mono text-red-300/50 hover:text-red-300 border border-red-900/20 hover:border-red-500/40 rounded-lg px-3 py-1 transition-all cursor-pointer">
            🗑️ Supprimer
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: 'description', label: 'Use Cases total', value: data.use_cases_count, bg: 'bg-primary-fixed', color: 'text-primary' },
          { icon: 'smart_toy', label: 'Cas automatisables', value: autoCount, bg: 'bg-success-container', color: 'text-success' },
          { icon: 'description', label: 'Fichiers .feature', value: autoCount, bg: 'bg-info-container', color: 'text-info' },
          { icon: 'table_rows', label: 'Lignes Excel', value: data.use_cases_count, bg: 'bg-tertiary-container', color: 'text-tertiary' },
        ].map(stat => (
          <Card key={stat.label} className="flex items-center gap-3 p-4">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
              <span className={`material-symbols-outlined ${stat.color}`}>{stat.icon}</span>
            </div>
            <div>
              <div className="text-headline-sm font-extrabold text-on-surface font-mono leading-none">{stat.value}</div>
              <div className="text-body-sm text-on-surface-variant mt-0.5">{stat.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Export panel */}
      <div className="rounded-xl mb-6 overflow-hidden relative bg-inverse-surface">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none bg-info/10" />
        <div className="relative p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <div className="text-label-md font-bold text-inverse-on-surface/90">⬇️ Exporter vos résultats</div>
              <div className="text-body-sm text-inverse-on-surface/50 font-mono">Sauvegardez d'abord vos modifications avant d'exporter</div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-body-sm font-bold font-mono bg-success/15 text-success/90 border border-success/30">
              <span>🤖</span>
              <span>{autoCount}</span> cas automatisables
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {[
              { icon: <img src={excelIcon} alt="" className="w-7 h-7" />, label: 'Excel complet', sub: '.xlsx · 2 feuilles', cls: 'eb-excel', onClick: handleDownloadExcel, disabled: false },
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, label: 'Scripts Gherkin', sub: '.feature · BDD/Cucumber', cls: 'eb-gherkin', onClick: handleDownloadGherkin, disabled: autoCount === 0, count: autoCount },
              { icon: <img src={cypressIcon} alt="" className="w-7 h-7" />, label: 'Projet Cypress', sub: '.zip · complet', cls: 'eb-cypress', onClick: handleDownloadCypress, disabled: autoCount === 0, count: autoCount },
              { icon: <img src={vscodeIcon} alt="" className="w-7 h-7" />, label: 'Ouvrir VS Code', sub: 'Cypress + éditeur', cls: 'eb-vscode', onClick: handleVscode, disabled: autoCount === 0, count: autoCount },
              { icon: <img src={csvIcon} alt="" className="w-7 h-7 object-contain" />, label: 'CSV', sub: '.csv · tableur', cls: 'eb-csv', onClick: handleDownloadCSV, disabled: false },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                disabled={btn.disabled || btn.cls === 'eb-disabled'}
                className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl text-inverse-on-surface text-center relative transition-all duration-150 ${btn.disabled || btn.cls === 'eb-disabled' ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer hover:-translate-y-0.5 animate-fade-in'}`}
                style={{ background: btn.disabled || btn.cls === 'eb-disabled' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}
                aria-label={btn.label}>
                <span className="flex items-center justify-center w-8 h-8">{btn.icon}</span>
                <span className="text-body-sm font-bold leading-tight">{btn.label}</span>
                <span className="text-body-xs font-mono text-inverse-on-surface/50">{btn.sub}</span>
                {'count' in btn && btn.count !== undefined && btn.count > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-success text-inverse-on-surface text-[0.6rem] font-extrabold px-1 py-0.5 rounded-full font-mono">{btn.count}</span>
                )}
              </button>
            ))}
          </div>

          {autoCount === 0 && (
            <div className="mt-3 px-3.5 py-2 rounded-lg text-body-sm bg-warning/10 text-warning border border-warning/25">
              ⚠️ Aucun cas marqué comme automatisable. Activez le toggle 🤖 sur les lignes souhaitées puis sauvegardez.
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant bg-surface-container-low flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-label-md font-bold text-on-surface">📋 Use Cases extraits</h2>
            <span className="text-body-sm text-on-surface-variant hidden sm:inline">Cliquez sur une cellule pour modifier</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterAuto(!filterAuto)}
              className={`px-3 py-1.5 rounded-full text-body-sm font-semibold border-2 transition-all cursor-pointer ${
                filterAuto ? 'bg-primary-fixed border-primary text-primary' : 'bg-surface border-outline-variant text-on-surface-variant hover:border-primary/50'
              }`}
            >
              🤖 Automatisés seuls
            </button>
            <button onClick={toggleAllAuto} className="btn-ghost text-body-sm px-3 py-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer">
              {autoCount < useCases.length ? '☑ Tout cocher' : '☐ Tout décocher'}
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-4 py-1.5 bg-primary text-white rounded-lg text-label-sm font-medium hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saveMutation.isPending ? '⏳ Sauvegarde…' : '💾 Sauvegarder'}
            </button>
            {saveIndicator && <span className="text-body-sm text-success font-semibold animate-fade-in">✅ Sauvegardé</span>}
          </div>
        </div>

          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2342)' }}>
                {['☐', '#', 'CAS', 'Tickets Jira', 'Use Case', 'Description', 'Préconditions', 'Étapes', 'Résultats Attendus', 'Résultats Observés', 'Statut', '🤖'].map(h => (
                  <th key={h} className="text-white px-3 py-3 text-left font-semibold text-body-xs whitespace-nowrap border-r border-white/10 last:border-r-0">
                    {h === '☐' ? (
                      <input type="checkbox" checked={selectedUcIds.size > 0 && selectedUcIds.size === filteredUcs.length} onChange={toggleSelectAll} className="w-4 h-4 rounded cursor-pointer accent-primary" />
                    ) : h}
                  </th>
                ))}
              </tr>
            </thead>
            {selectedUcIds.size > 0 && (
              <tbody>
                <tr className="bg-primary-fixed/40">
                  <td colSpan={12} className="px-3 py-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-body-sm font-semibold text-primary">{selectedUcIds.size} sélectionné(s)</span>
                      <select
                        value={bulkStatus}
                        onChange={e => { setBulkStatus(e.target.value); handleBulkStatusChange(e.target.value); }}
                        className="text-body-xs border border-outline-variant rounded px-2 py-1.5 bg-surface text-on-surface cursor-pointer outline-none focus:border-primary"
                      >
                        <option value="">Changer le statut…</option>
                        {['À tester', 'En cours', 'Passé', 'Échoué', 'Bloqué'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button onClick={() => setSelectedUcIds(new Set())} className="text-body-xs text-on-surface-variant hover:text-error transition-colors cursor-pointer">
                        ✕ Annuler
                      </button>
                      {bulkStatusMutation.isPending && <span className="text-body-xs text-primary font-medium">⏳ Mise à jour…</span>}
                    </div>
                  </td>
                </tr>
              </tbody>
            )}
            <tbody>
              {filteredUcs.map((uc, idx) => (
                <tr key={uc.id} className={`border-b border-outline-variant last:border-b-0 transition-colors ${uc.is_automated ? 'bg-success-container/30' : ''} hover:bg-primary-fixed/30`}>
                  <td className="px-3 py-2.5 text-center">
                    <input type="checkbox" checked={selectedUcIds.has(uc.id)} onChange={() => toggleSelection(uc.id)} className="w-4 h-4 rounded cursor-pointer accent-primary" />
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold font-mono text-on-surface-variant/40 text-body-xs">{uc.order || idx + 1}</td>
                  <td className="px-3 py-2.5 text-center font-bold font-mono text-primary text-body-xs">UC-{(uc.order || idx + 1).toString().padStart(3, '0')}</td>
                  <td className="px-3 py-2.5 max-w-[140px]">
                    <input
                      type="text"
                      defaultValue={uc.jira_ticket || ''}
                      placeholder="QA-123"
                      onBlur={e => updateUc(uc.id, 'jira_ticket', e.target.value.trim())}
                      aria-label={`Ticket Jira du cas ${uc.order}`}
                      className="w-full rounded px-1 py-0.5 text-left outline-none focus:bg-warning-container/60 focus:ring-2 focus:ring-warning text-body-xs font-mono text-info bg-transparent placeholder:text-on-surface-variant/40"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      contentEditable
                      suppressContentEditableWarning
                      className="block rounded px-1 py-0.5 outline-none focus:bg-warning-container/60 focus:ring-2 focus:ring-warning text-body-sm font-bold font-mono text-primary"
                      onBlur={e => updateUc(uc.id, 'use_case_text', e.currentTarget.textContent || '')}
                    >{uc.use_case_text}</span>
                  </td>
                  <td className="px-3 py-2.5 max-w-[200px]"><span contentEditable suppressContentEditableWarning className="block rounded px-1 py-0.5 outline-none focus:bg-warning-container/60 focus:ring-2 focus:ring-warning whitespace-pre-wrap break-words" onBlur={e => updateUc(uc.id, 'description', e.currentTarget.textContent || '')}>{uc.description}</span></td>
                  <td className="px-3 py-2.5 max-w-[200px]"><span contentEditable suppressContentEditableWarning className="block rounded px-1 py-0.5 outline-none focus:bg-warning-container/60 focus:ring-2 focus:ring-warning whitespace-pre-wrap break-words" onBlur={e => updateUc(uc.id, 'preconditions', e.currentTarget.textContent || '')}>{uc.preconditions}</span></td>
                  <td className="px-3 py-2.5 max-w-[200px]"><span contentEditable suppressContentEditableWarning className="block rounded px-1 py-0.5 outline-none focus:bg-warning-container/60 focus:ring-2 focus:ring-warning whitespace-pre-wrap break-words" onBlur={e => updateUc(uc.id, 'steps', e.currentTarget.textContent || '')}>{uc.steps}</span></td>
                  <td className="px-3 py-2.5 max-w-[200px]"><span contentEditable suppressContentEditableWarning className="block rounded px-1 py-0.5 outline-none focus:bg-warning-container/60 focus:ring-2 focus:ring-warning whitespace-pre-wrap break-words" onBlur={e => updateUc(uc.id, 'expected_results', e.currentTarget.textContent || '')}>{uc.expected_results}</span></td>
                  <td className="px-3 py-2.5 max-w-[200px]">
                    <span contentEditable suppressContentEditableWarning className="block rounded px-1 py-0.5 outline-none focus:bg-warning-container/60 focus:ring-2 focus:ring-warning whitespace-pre-wrap break-words" onBlur={e => updateUc(uc.id, 'observed_results', e.currentTarget.textContent || '')}>{uc.observed_results}</span>
                    {uc.comments && uc.comments.length > 0 && (
                      <div className="mt-2 space-y-1.5 border-t border-outline-variant/30 pt-2">
                        {uc.comments.map(c => (
                          <div key={c.id} className="rounded-lg bg-info-container/40 border border-info/20 px-2 py-1.5">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="material-symbols-outlined text-[14px] text-info">person</span>
                              <span className="text-body-xs font-semibold text-info">{c.author_full_name}</span>
                              <span className="text-body-xs text-on-surface-variant/50">· {new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-body-xs text-on-surface whitespace-pre-wrap break-words">{c.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="relative group">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-body-xs font-semibold cursor-pointer ${UC_STATUS_CLASSES[uc.status || 'À tester'] ?? 'bg-surface-container-high text-on-surface-variant'}`}>
                        {uc.status || 'À tester'}
                      </span>
                      <select
                        value={uc.status || 'À tester'}
                        onChange={e => updateUc(uc.id, 'status', e.target.value)}
                        aria-label={`Statut du cas ${uc.order}`}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        {['À tester', 'En cours', 'Passé', 'Échoué', 'Bloqué'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <label className="relative inline-flex items-center cursor-pointer w-9 h-5">
                      <input
                        type="checkbox"
                        checked={uc.is_automated}
                        onChange={e => updateUc(uc.id, 'is_automated', e.target.checked)}
                        aria-label={`Marquer le cas ${uc.order} comme automatisable`}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-surface-container-high rounded-full peer-checked:bg-success after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Header edit modal */}
      <Modal
        open={headerModalOpen}
        onClose={() => setHeaderModalOpen(false)}
        labelledBy="header-modal-title"
        maxWidth="max-w-lg"
        className="p-7"
      >
        <h3 id="header-modal-title" className="text-headline-sm font-extrabold text-on-surface mb-5 flex items-center gap-2">✏️ Modifier l'en-tête Excel</h3>

        <div className="mb-4">
          <label htmlFor="modal-company" className="text-label-md text-on-surface-variant block mb-1.5">Nom de l'entreprise</label>
          <input id="modal-company" ref={modalCompanyRef} defaultValue={companyName} className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-base text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Ex : AT-TechGN, Accenture…" />
        </div>

        <div className="mb-4">
          <label htmlFor="modal-excel" className="text-label-md text-on-surface-variant block mb-1.5">Nom du fichier Excel généré</label>
          <div className="flex">
            <input id="modal-excel" ref={modalExcelRef} defaultValue={excelFilename} className="flex-1 px-3 py-2.5 border border-outline-variant rounded-l-lg text-body-base text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" placeholder="recette_sprint3" />
            <span className="px-3 py-2.5 bg-surface-container-high border border-outline-variant border-l-0 rounded-r-lg text-body-sm font-mono text-on-surface-variant">.xlsx</span>
          </div>
        </div>

        <div className="mb-5">
          <label id="modal-logo-label" className="text-label-md text-on-surface-variant block mb-1.5">Logo entreprise <span className="text-on-surface-variant/50 font-normal">(PNG, JPG, SVG)</span></label>
          <div
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${logoDataUrl || data.company_logo ? 'border-info bg-info-container/40 border-solid' : 'border-outline-variant hover:border-primary/50 hover:bg-primary-fixed/30'}`}
            onClick={() => modalLogoRef.current?.click()}
          >
            <input ref={modalLogoRef} type="file" accept=".png,.jpg,.jpeg,.gif,.svg" className="hidden" aria-labelledby="modal-logo-label" onChange={handleModalLogoChange} />
            {(logoDataUrl || data.company_logo) ? (
              <div className="flex flex-col items-center gap-1.5">
                <img src={logoDataUrl || data.company_logo || ''} alt="Logo" className="max-h-12 max-w-[180px] object-contain rounded border border-outline-variant" />
                <button onClick={e => { e.stopPropagation(); setLogoDataUrl(null); if (modalLogoRef.current) modalLogoRef.current.value = ''; }} className="text-body-sm text-on-surface-variant hover:text-error transition-colors">✕ Retirer</button>
              </div>
            ) : (
              <div>
                <div className="text-2xl mb-1">🏢</div>
                <div className="text-body-sm text-on-surface-variant font-medium">Cliquer pour uploader un logo</div>
                <div className="text-body-xs text-on-surface-variant/50 mt-0.5">Affiché en haut à droite de l'en-tête</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setHeaderModalOpen(false)}>
            Annuler
          </Button>
          <Button onClick={() => {
            setCompanyName(modalCompanyRef.current?.value || '');
            setExcelFilename(modalExcelRef.current?.value || '');
            setHeaderModalOpen(false);
          }}>
            ✅ Appliquer
          </Button>
        </div>
      </Modal>

      {/* VS Code modal */}
      <Modal
        open={vscodeModalOpen}
        onClose={() => setVscodeModalOpen(false)}
        labelledBy="vscode-modal-title"
        maxWidth="max-w-lg"
        className="p-7"
      >
        <h3 id="vscode-modal-title" className="text-headline-sm font-extrabold text-on-surface mb-5 flex items-center gap-2">🖥️ Ouvrir dans VS Code</h3>

        <div className={`p-3 rounded-lg text-body-sm font-medium flex items-start gap-2 mb-4 ${
          vscodeStatus === 'loading' ? 'bg-primary-fixed text-primary border border-primary/20' :
          vscodeStatus === 'success' ? 'bg-success-container text-on-success-container border border-success/30' :
          'bg-warning-container text-on-warning-container border border-warning/30'
        }`}>
          <span>{vscodeStatus === 'loading' ? '⏳' : vscodeStatus === 'success' ? '✅' : '⚠️'}</span>
          <span>{vscodeMsg}</span>
        </div>

        {vscodePath && (
          <div className="p-3 rounded-lg mb-4 font-mono text-body-sm break-all bg-surface-container-high text-on-surface-variant">
            📁 {vscodePath}
          </div>
        )}

        <div className="p-3 rounded-lg mb-4 font-mono text-body-xs leading-relaxed bg-surface-container-high">
          <div className="text-on-surface-variant/70"># Si VS Code n'est pas détecté automatiquement :</div>
          <div className="text-on-surface-variant/70"># 1. Téléchargez le ZIP Cypress ci-dessous</div>
          <div className="text-on-surface-variant/70"># 2. Extrayez et ouvrez dans VS Code :</div>
          <div className="text-info">code {vscodePath || '/chemin/vers/cypress_project/'}</div>
          <div className="text-on-surface-variant/70"># 3. Installez les dépendances :</div>
          <div className="text-info">npm install</div>
          <div className="text-info">npm run cy:open</div>
        </div>

        <div className="flex gap-3 justify-end flex-wrap">
          <Button variant="secondary" onClick={handleDownloadCypress} disabled={autoCount === 0}>
            📥 Télécharger ZIP Cypress
          </Button>
          <Button variant="secondary" onClick={() => setVscodeModalOpen(false)}>
            Fermer
          </Button>
        </div>
      </Modal>

      <div className="mt-6 flex items-center justify-between">
        <Link to="/recipes" className="text-body-sm text-on-surface-variant hover:text-primary transition-colors">← Toutes les recettes</Link>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmDialog
        open={deleteModalOpen}
        title="Supprimer cette recette ?"
        description="Cette action est irréversible. Tous les cas de test associés seront supprimés."
        confirmLabel={deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
        loading={deleteMutation.isPending}
        error={deleteMutation.isError ? getApiErrorMessage(deleteMutation.error, 'Impossible de supprimer cette recette.') : undefined}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteModalOpen(false)}
      />

      {/* Login prompt (freemium) */}
      <Modal
        open={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
        labelledBy="login-prompt-title"
        maxWidth="max-w-md"
        className="p-7"
      >
        <h3 id="login-prompt-title" className="text-headline-sm font-extrabold text-on-surface mb-4 flex items-center gap-2">🔒 Export réservé aux membres</h3>
        <p className="text-body-sm text-on-surface-variant mb-5">
          La conversion et la prévisualisation sont gratuites. Pour télécharger les exports
          (Excel, Gherkin, Cypress, CSV ou VS Code), créez un compte <span className="font-semibold">gratuit</span> en quelques secondes.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button variant="secondary" onClick={() => setLoginPromptOpen(false)}>
            Plus tard
          </Button>
          <Link to="/register/*" className="btn-ghost no-underline inline-flex items-center justify-center py-3">
            Créer un compte gratuit
          </Link>
          <Link to="/login/*" className="no-underline inline-flex items-center justify-center">
            <Button>Se connecter</Button>
          </Link>
        </div>
      </Modal>

    </PageLayout>
  );
}
