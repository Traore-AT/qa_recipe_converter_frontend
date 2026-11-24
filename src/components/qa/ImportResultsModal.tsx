import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '../../api/teams';
import { getApiErrorMessage } from '../../lib/errors';
import { caseLabel } from '../../lib/qa';
import { invalidateProjectScope } from '../../lib/queryKeys';
import type { TestImportResult } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

interface Props {
  teamSlug: string;
  projectSlug: string;
  sprintId: string;
  sprintName: string;
  onClose: () => void;
}

/** Import de résultats automatisés : aperçu obligatoire avant toute modification. */
export function ImportResultsModal({ teamSlug, projectSlug, sprintId, sprintName, onClose }: Props) {
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [createDefects, setCreateDefects] = useState(false);
  const [preview, setPreview] = useState<TestImportResult | null>(null);

  const mutation = useMutation({
    mutationFn: (dryRun: boolean) => {
      const body = new FormData();
      files.forEach(f => body.append('files', f));
      body.append('sprint', sprintId);
      body.append('create_defects', String(createDefects));
      body.append('dry_run', String(dryRun));
      return teamsApi.importTestResults(teamSlug, projectSlug, body);
    },
    onSuccess: result => {
      setPreview(result);
      if (result.applied) invalidateProjectScope(queryClient, teamSlug, projectSlug);
    },
  });
  const applied = preview?.applied;

  return (
    <Modal open onClose={onClose} labelledBy="import-title" maxWidth="max-w-2xl" className="p-4 sm:p-7">
      <h3 id="import-title" className="text-headline-sm font-bold text-on-surface">Importer des résultats automatisés</h3>
      <p className="mb-4 mt-1 text-body-sm text-on-surface-variant">
        Sprint « {sprintName} ». Formats : JUnit XML, Mochawesome, Mocha, Cypress et Cucumber JSON. Un test est relié à son cas par le numéro présent dans son titre (ex. CAS-001).
      </p>
      {!applied && (
        <div className="space-y-4">
          <Input
            label="Fichiers de résultats"
            type="file"
            multiple
            accept=".xml,.json"
            onChange={e => { setFiles([...(e.target.files ?? [])]); setPreview(null); mutation.reset(); }}
          />
          <label className="flex items-center gap-2 text-body-sm text-on-surface">
            <input type="checkbox" checked={createDefects} onChange={e => setCreateDefects(e.target.checked)} />
            Créer une anomalie pour chaque cas en échec (si aucune n’est déjà ouverte)
          </label>
        </div>
      )}
      {preview && (
        <div className="mt-4 space-y-3" role="status">
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">{preview.passed} passé(s)</Badge>
            <Badge variant="error">{preview.failed} échoué(s)</Badge>
            {preview.skipped > 0 && <Badge>{preview.skipped} ignoré(s)</Badge>}
            {preview.unmatched_count > 0 && <Badge variant="warning">{preview.unmatched_count} sans cas correspondant</Badge>}
            {preview.outside_sprint.length > 0 && <Badge variant="warning">{preview.outside_sprint.length} hors sprint</Badge>}
          </div>
          {applied && (
            <p className="text-body-base font-medium text-on-surface">
              ✅ Import terminé : {preview.updated} statut(s) modifié(s), {preview.defects_created} anomalie(s) créée(s).
            </p>
          )}
          <ul className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-outline-variant p-2">
            {preview.cases.map(c => (
              <li key={c.use_case} className="text-body-sm text-on-surface">
                <span className="font-mono text-primary">{caseLabel(c.case_number)}</span> {c.title}
                <span className="text-on-surface-variant"> — {c.old_status} → </span>
                <strong className={c.new_status === 'Passé' ? 'text-success' : 'text-error'}>{c.new_status}</strong>
                {c.message && <span className="block truncate text-body-xs text-on-surface-variant" title={c.message}>{c.message}</span>}
              </li>
            ))}
            {preview.cases.length === 0 && <li className="py-3 text-center text-body-sm text-on-surface-variant">Aucun test ne correspond à un cas de ce sprint.</li>}
          </ul>
          {preview.unmatched.length > 0 && (
            <details>
              <summary className="cursor-pointer text-body-sm text-on-surface-variant">Tests sans cas correspondant</summary>
              <ul className="mt-1 max-h-32 overflow-y-auto text-body-xs text-on-surface-variant">{preview.unmatched.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </details>
          )}
        </div>
      )}
      {mutation.isError && <p role="alert" className="mt-3 text-error">{getApiErrorMessage(mutation.error, 'Import impossible.')}</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>{applied ? 'Fermer' : 'Annuler'}</Button>
        {!applied && (preview
          ? <Button disabled={!preview.cases.length} loading={mutation.isPending} onClick={() => mutation.mutate(false)}>Appliquer à {preview.cases.length} cas</Button>
          : <Button disabled={!files.length} loading={mutation.isPending} onClick={() => mutation.mutate(true)}>Analyser</Button>)}
      </div>
    </Modal>
  );
}
