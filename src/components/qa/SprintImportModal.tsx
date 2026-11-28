import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '../../api/teams';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FileDropzone } from '../ui/FileDropzone';
import type { AssignableMember, JiraValidation, SprintImportPreview, SprintImportResult } from '../../types';
import { invalidateProjectScope, queryKeys } from '../../lib/queryKeys';
import { caseLabel } from '../../lib/qa';
import { getApiErrorMessage } from '../../lib/errors';
import { ImportAnalysisSummary } from './ImportAnalysisPanel';
import { JiraCheckResult } from './JiraCheck';

const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;
const STEPS = ['Fichier', 'Aperçu', 'Responsables'] as const;
type AssignMode = 'none' | 'one' | 'distribute';

interface Props {
  teamSlug: string;
  projectSlug: string;
  sprint: { id: string; name: string };
  members: AssignableMember[];
  onClose: () => void;
  onDone: (result: SprintImportResult) => void;
}

/**
 * Import de cas de test depuis un document Word directement dans un sprint, en trois étapes
 * (fichier → aperçu → responsables). Les cas importés appartiennent à ce seul sprint.
 */
export function SprintImportModal({ teamSlug, projectSlug, sprint, members, onClose, onDone }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [preview, setPreview] = useState<SprintImportPreview | null>(null);
  const [mode, setMode] = useState<AssignMode>('none');
  const [userId, setUserId] = useState(0);
  const [userIds, setUserIds] = useState<number[]>([]);
  const [jiraCheck, setJiraCheck] = useState<JiraValidation | null>(null);

  const previewMutation = useMutation({
    mutationFn: (f: File) => teamsApi.previewSprintImport(teamSlug, projectSlug, sprint.id, f),
    onSuccess: data => { setPreview(data); setStep(1); },
  });
  const jiraMutation = useMutation({
    mutationFn: () => teamsApi.validateJiraTickets(teamSlug, projectSlug, newRows.map(r => r.jira_ticket).filter(Boolean)),
    onSuccess: setJiraCheck,
  });
  const targets = mode === 'distribute' ? userIds : mode === 'one' && userId ? [userId] : [];
  const importMutation = useMutation({
    mutationFn: () => teamsApi.importSprintCases(teamSlug, projectSlug, sprint.id, file!, targets),
    onSuccess: result => {
      invalidateProjectScope(queryClient, teamSlug, projectSlug);
      queryClient.invalidateQueries({ queryKey: queryKeys.unassignedUcs(teamSlug, projectSlug, sprint.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignableMembers(teamSlug, projectSlug) });
      onDone(result);
    },
  });

  const chooseFile = (f: File) => {
    setFile(f);
    setFileError('');
    setJiraCheck(null);
    previewMutation.mutate(f);
  };

  const newRows = preview?.rows.filter(r => !r.duplicate_of && !r.duplicate_row) ?? [];
  const duplicates = preview?.rows.filter(r => r.duplicate_of || r.duplicate_row) ?? [];
  const canImport = !!preview?.new_cases && (mode === 'none' || targets.length > 0) && !importMutation.isPending;
  const fieldClass = 'w-full border border-outline-variant rounded-lg bg-surface px-3 py-2.5 outline-none focus:border-primary';

  return (
    <Modal open onClose={onClose} labelledBy="sprint-import-title" maxWidth="max-w-2xl" className="p-4 sm:p-7">
      <h3 id="sprint-import-title" className="text-headline-sm font-bold text-on-surface">📥 Importer des cas dans « {sprint.name} »</h3>
      <p className="mt-1 mb-4 text-body-sm text-on-surface-variant">Les cas importés appartiendront uniquement à ce sprint.</p>

      <ol className="mb-5 flex gap-2" aria-label="Étapes de l'import">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? 'step' : undefined}
              className={`flex-1 rounded-lg px-3 py-1.5 text-center text-label-sm ${i === step ? 'bg-primary text-white' : i < step ? 'bg-primary-fixed text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="max-h-[60vh] overflow-y-auto pr-1">
        {step === 0 && (
          <div className="space-y-3">
            <FileDropzone
              inputId="sprint-import-file"
              inputAriaLabel="Document Word des cas à importer"
              accept={['.doc', '.docx']}
              maxSizeBytes={MAX_UPLOAD_SIZE_BYTES}
              onFileSelected={chooseFile}
              onError={setFileError}
              label="Déposer le document Word des cas de test"
              hint="ou cliquer pour parcourir (.doc, .docx · 50 Mo max)"
              disabled={previewMutation.isPending}
            />
            {previewMutation.isPending && <p role="status" className="text-body-sm text-on-surface-variant animate-pulse">Analyse de « {file?.name} »…</p>}
            {(fileError || previewMutation.isError) && (
              <p role="alert" className="text-body-sm text-error">{fileError || getApiErrorMessage(previewMutation.error, 'Analyse impossible.')}</p>
            )}
          </div>
        )}

        {step === 1 && preview && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-body-sm">
              <span className="rounded-full bg-success-container px-3 py-1 font-semibold text-on-success-container">{preview.new_cases} nouveau{preview.new_cases > 1 ? 'x' : ''} cas</span>
              {!!preview.duplicates && <span className="rounded-full bg-warning-container px-3 py-1 font-semibold text-on-warning-container">{preview.duplicates} doublon{preview.duplicates > 1 ? 's' : ''} ignoré{preview.duplicates > 1 ? 's' : ''}</span>}
            </div>
            {!preview.new_cases && (
              <p role="alert" className="rounded-lg bg-warning-container/50 px-3 py-2 text-body-sm text-on-warning-container">
                Aucun nouveau cas à importer : tous les cas de ce document existent déjà dans le projet.
              </p>
            )}
            {!!duplicates.length && (
              <details>
                <summary className="cursor-pointer text-body-sm text-on-surface-variant">Doublons ignorés ({duplicates.length})</summary>
                <ul className="mt-1 space-y-0.5 pl-5 text-body-xs text-on-surface-variant list-disc">
                  {duplicates.map(d => (
                    <li key={d.row}>
                      Ligne {d.row} « {d.title} »{d.jira_ticket ? ` (${d.jira_ticket})` : ''} — {d.duplicate_of ? `existe déjà : ${caseLabel(d.duplicate_of)}` : `répète la ligne ${d.duplicate_row}`}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <ImportAnalysisSummary data={preview} />
            {newRows.some(r => r.jira_ticket) && (
              <div>
                <Button size="sm" variant="secondary" loading={jiraMutation.isPending} onClick={() => jiraMutation.mutate()}>🔎 Vérifier les tickets dans Jira</Button>
                {jiraMutation.isError && <p role="alert" className="mt-1 text-body-xs text-error">{getApiErrorMessage(jiraMutation.error, 'Vérification Jira impossible.')}</p>}
                {jiraCheck && <JiraCheckResult check={jiraCheck} />}
              </div>
            )}
          </div>
        )}

        {step === 2 && preview && (
          <fieldset className="space-y-3">
            <legend className="mb-2 text-body-sm text-on-surface">Qui exécutera les {preview.new_cases} cas importés ?</legend>
            {([['none', 'Ne pas assigner pour l’instant'], ['one', 'Un seul membre'], ['distribute', 'Répartir entre plusieurs testeurs']] as const).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-body-sm text-on-surface">
                <input type="radio" name="assign-mode" value={value} checked={mode === value} onChange={() => setMode(value)} />
                {label}
              </label>
            ))}
            {mode === 'one' && (
              <select aria-label="Membre responsable" value={userId} onChange={e => setUserId(Number(e.target.value))} className={fieldClass}>
                <option value={0}>Sélectionner…</option>
                {members.map(m => <option key={m.user.id} value={m.user.id}>{m.user.full_name}{m.in_project ? '' : ' (équipe)'}</option>)}
              </select>
            )}
            {mode === 'distribute' && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-outline-variant p-2 space-y-1">
                {members.map(m => (
                  <label key={m.user.id} className="flex items-center gap-2 rounded p-1 text-body-sm hover:bg-surface-container-low">
                    <input type="checkbox" checked={userIds.includes(m.user.id)}
                           onChange={e => setUserIds(p => e.target.checked ? [...p, m.user.id] : p.filter(id => id !== m.user.id))} />
                    {m.user.full_name}{m.in_project ? '' : ' (équipe)'}
                  </label>
                ))}
              </div>
            )}
            {mode === 'none' && <p className="text-body-xs text-on-surface-variant">Les cas arriveront « Non assignés » dans la colonne « À tester » ; vous pourrez les assigner depuis le tableau.</p>}
            {importMutation.isError && <p role="alert" className="text-body-sm text-error">{getApiErrorMessage(importMutation.error, 'Import impossible.')}</p>}
          </fieldset>
        )}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between [&>*]:w-full sm:[&>*]:w-auto">
        <Button variant="secondary" onClick={step === 0 ? onClose : () => setStep(s => s - 1)}>
          {step === 0 ? 'Annuler' : '← Retour'}
        </Button>
        {step === 1 && (
          <Button onClick={() => setStep(2)} disabled={!preview?.new_cases}>Continuer →</Button>
        )}
        {step === 2 && (
          <Button onClick={() => importMutation.mutate()} disabled={!canImport}>
            {importMutation.isPending ? '⏳ Import…' : `✅ Importer ${preview?.new_cases ?? 0} cas`}
          </Button>
        )}
      </div>
    </Modal>
  );
}
