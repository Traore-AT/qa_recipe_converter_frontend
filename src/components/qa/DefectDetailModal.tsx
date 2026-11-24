import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '../../api/teams';
import { getApiErrorMessage } from '../../lib/errors';
import { caseLabel, DEFECT_STATUS, PRIORITIES, SEVERITIES } from '../../lib/qa';
import { queryKeys } from '../../lib/queryKeys';
import type { Defect } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Input';
import { Modal } from '../ui/Modal';

interface Props {
  teamSlug: string;
  projectSlug: string;
  defect: Defect;
  canWrite: boolean;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const formatDate = (value: string) => new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

function Block({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-label-md text-on-surface-variant">{label}</p>
      <p className="mt-1 whitespace-pre-wrap rounded-lg bg-surface-container-low px-3 py-2 text-body-base text-on-surface">{value}</p>
    </div>
  );
}

/** Fiche d'anomalie : informations, cas associés, commentaires et historique. */
export function DefectDetailModal({ teamSlug, projectSlug, defect, canWrite, canManage, onEdit, onDelete, onClose }: Props) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');

  const { data: comments } = useQuery({
    queryKey: queryKeys.defectComments(defect.id),
    queryFn: () => teamsApi.listDefectComments(teamSlug, projectSlug, defect.id),
  });
  const { data: history } = useQuery({
    queryKey: queryKeys.defectHistory(defect.id),
    queryFn: () => teamsApi.getDefectHistory(teamSlug, projectSlug, defect.id),
  });
  const commentMutation = useMutation({
    mutationFn: () => teamsApi.createDefectComment(teamSlug, projectSlug, defect.id, comment.trim()),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: queryKeys.defectComments(defect.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.defectsRoot(teamSlug, projectSlug) });
    },
  });

  const { data: settings } = useQuery({
    queryKey: queryKeys.qaSettings(teamSlug, projectSlug),
    queryFn: () => teamsApi.getQaSettings(teamSlug, projectSlug),
  });
  const jiraMutation = useMutation({
    mutationFn: () => teamsApi.pushDefectToJira(teamSlug, projectSlug, defect.id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.defectsRoot(teamSlug, projectSlug) }),
  });
  const jiraActive = !!settings?.jira_configured && settings.jira_enabled;
  const jiraError = jiraMutation.isError ? getApiErrorMessage(jiraMutation.error) : defect.jira_sync_error;

  const cases = [...(defect.use_case_detail ? [defect.use_case_detail] : []), ...(defect.related_cases ?? [])];

  return (
    <Modal open onClose={onClose} labelledBy="defect-detail-title" maxWidth="max-w-2xl" className="p-4 sm:p-7">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-label-sm text-on-surface-variant">{defect.ticket_number}</p>
          <h3 id="defect-detail-title" className="text-headline-sm font-bold text-on-surface">{defect.title}</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer" className="h-11 w-11 shrink-0 cursor-pointer rounded-lg text-on-surface-variant hover:bg-surface-container-low">✕</button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant={DEFECT_STATUS[defect.status].variant}>{DEFECT_STATUS[defect.status].label}</Badge>
        <Badge variant={SEVERITIES[defect.severity].variant}>{SEVERITIES[defect.severity].label}</Badge>
        <Badge>Priorité {PRIORITIES[defect.priority].toLowerCase()}</Badge>
        {defect.is_regression && <Badge variant="warning">↩ Régression{defect.regression_of_ticket ? ` de ${defect.regression_of_ticket}` : ''}</Badge>}
        {defect.reopen_count > 0 && <Badge variant="error">Réouverte {defect.reopen_count}×</Badge>}
      </div>

      <dl className="mb-4 grid grid-cols-1 gap-2 text-body-sm sm:grid-cols-2">
        {[
          ['Sprint', defect.sprint_name || 'Hors sprint'],
          ['Assignée à', defect.assigned_to_user?.full_name || 'Non assignée'],
          ['Signalée par', defect.reported_by_user?.full_name || '—'],
          ['Signalée le', formatDate(defect.created_at)],
          ['Résolue le', defect.resolved_at ? formatDate(defect.resolved_at) : '—'],
          ['Environnement', defect.environment || '—'],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="inline font-medium text-on-surface-variant">{label} : </dt>
            <dd className="inline text-on-surface">{value}</dd>
          </div>
        ))}
      </dl>

      {(defect.jira_key || jiraActive || jiraError) && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-surface-container-low px-3 py-2 text-body-sm text-on-surface">
          <span className="font-medium">Jira :</span>
          {defect.jira_key
            ? <a href={defect.jira_url ?? undefined} target="_blank" rel="noreferrer" className="font-mono text-primary underline">{defect.jira_key}</a>
            : <span className="text-on-surface-variant">non envoyée</span>}
          {canWrite && jiraActive && (!defect.jira_key || jiraError) && (
            <Button size="sm" variant="secondary" loading={jiraMutation.isPending} onClick={() => jiraMutation.mutate()}>
              {defect.jira_key ? 'Réessayer l’envoi' : 'Envoyer vers Jira'}
            </Button>
          )}
          {jiraError && <span role="alert" className="w-full text-error">{jiraError}</span>}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <p className="mb-1 text-label-md text-on-surface-variant">Cas de test associés ({cases.length})</p>
          {cases.length === 0 && <p className="text-body-sm text-on-surface-variant">Aucun cas associé.</p>}
          <ul className="space-y-1">
            {cases.map(c => (
              <li key={c.id} className="flex items-center gap-2 text-body-sm">
                <span className="font-mono text-primary">{caseLabel(c.case_number)}</span>
                <span className="min-w-0 flex-1 truncate text-on-surface">{c.title}</span>
                <Badge>{c.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
        <Block label="Description" value={defect.description} />
        <Block label="Étapes de reproduction" value={defect.steps_to_reproduce} />
        <Block label="Comportement attendu" value={defect.expected_behavior} />
        <Block label="Comportement observé" value={defect.actual_behavior} />
        <Block label="Résolution / cause racine" value={defect.resolution} />
        {defect.attachment && (
          <a href={defect.attachment} target="_blank" rel="noreferrer" className="inline-block text-body-sm text-primary underline">📎 Ouvrir la pièce jointe</a>
        )}

        <section aria-label="Commentaires">
          <p className="mb-2 text-label-md font-bold text-on-surface-variant">Commentaires ({comments?.count ?? 0})</p>
          <div className="mb-3 max-h-48 space-y-2 overflow-y-auto">
            {comments?.results?.map(c => (
              <div key={c.id} className="rounded-lg bg-surface-container-low p-3">
                <p className="text-body-xs text-on-surface-variant">{c.author?.full_name ?? c.external_author ?? 'Système'} · {formatDate(c.created_at)}</p>
                <p className="whitespace-pre-wrap text-body-sm text-on-surface">{c.content}</p>
              </div>
            ))}
          </div>
          {canWrite && (
            <div className="space-y-2">
              <Textarea aria-label="Nouveau commentaire" placeholder="Ajouter un commentaire…" rows={2} value={comment} onChange={e => setComment(e.target.value)} />
              {commentMutation.isError && <p role="alert" className="text-body-sm text-error">{getApiErrorMessage(commentMutation.error)}</p>}
              <Button size="sm" disabled={!comment.trim()} loading={commentMutation.isPending} onClick={() => commentMutation.mutate()}>Envoyer</Button>
            </div>
          )}
        </section>

        <details>
          <summary className="cursor-pointer text-label-md font-bold text-on-surface-variant">Historique ({history?.count ?? 0})</summary>
          <ul className="mt-2 space-y-1 text-body-sm text-on-surface">
            {history?.results?.map(h => (
              <li key={h.id}>
                <span className="text-on-surface-variant">{formatDate(h.created_at)} · {h.actor?.full_name ?? 'Système'} — </span>
                {h.field} : {h.old_value || '—'} → {h.new_value || '—'}
              </li>
            ))}
          </ul>
        </details>
      </div>

      {(canWrite || canManage) && (
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {canManage && <Button variant="danger" onClick={onDelete}>Supprimer</Button>}
          {canWrite && <Button onClick={onEdit}>Modifier</Button>}
        </div>
      )}
    </Modal>
  );
}
