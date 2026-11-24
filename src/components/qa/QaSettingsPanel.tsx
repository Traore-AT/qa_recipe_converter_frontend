import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '../../api/teams';
import { getApiErrorMessage, getApiFieldErrors } from '../../lib/errors';
import { invalidateProjectScope, queryKeys } from '../../lib/queryKeys';
import type { QaSettings } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ErrorState } from '../ui/ErrorState';
import { Input } from '../ui/Input';
import { Skeleton } from '../ui/Skeleton';

interface Props {
  teamSlug: string;
  projectSlug: string;
  canManage: boolean;
}

const ALERTS = [
  ['alert_on_regression', 'Régression détectée', 'Un cas passé échoue de nouveau.'],
  ['alert_on_critical_defect', 'Anomalie critique', 'Une anomalie devient critique ou est réouverte.'],
  ['auto_report_on_close', 'Rapport à la clôture d’un sprint', 'Le PDF du sprint est envoyé dès qu’il est terminé.'],
] as const;

/** Réglages du projet : alertes e-mail et synchronisation Jira. */
export function QaSettingsPanel({ teamSlug, projectSlug, canManage }: Props) {
  const { data, error, refetch } = useQuery({
    queryKey: queryKeys.qaSettings(teamSlug, projectSlug),
    queryFn: () => teamsApi.getQaSettings(teamSlug, projectSlug),
  });
  if (error) return <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} />;
  if (!data) return <Skeleton className="h-64 rounded-xl" />;
  return (
    <div className="space-y-6">
      <AlertsCard teamSlug={teamSlug} projectSlug={projectSlug} canManage={canManage} settings={data} />
      <JiraCard key={data.updated_at} teamSlug={teamSlug} projectSlug={projectSlug} canManage={canManage} settings={data} />
    </div>
  );
}

function useSaveSettings(teamSlug: string, projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: Partial<QaSettings>) => teamsApi.updateQaSettings(teamSlug, projectSlug, changes),
    onSuccess: saved => queryClient.setQueryData(queryKeys.qaSettings(teamSlug, projectSlug), saved),
  });
}

function AlertsCard({ teamSlug, projectSlug, canManage, settings }: Props & { settings: QaSettings }) {
  const save = useSaveSettings(teamSlug, projectSlug);
  return (
    <Card>
      <h2 className="text-headline-sm font-bold text-on-surface">Alertes par e-mail</h2>
      <p className="mb-4 mt-1 text-body-sm text-on-surface-variant">
        Envoyées au propriétaire, aux administrateurs et aux leads QA ({settings.recipients_count} destinataire{settings.recipients_count > 1 ? 's' : ''}).
      </p>
      {settings.recipients_count === 0 && <p className="mb-3 text-body-sm text-warning">Aucun responsable n’a d’adresse e-mail : aucune alerte ne sera envoyée.</p>}
      <ul className="space-y-3">
        {ALERTS.map(([key, label, hint]) => (
          <li key={key}>
            <label className="flex items-start gap-3 text-body-base text-on-surface">
              <input
                type="checkbox"
                className="mt-1"
                checked={settings[key]}
                disabled={!canManage || save.isPending}
                onChange={e => save.mutate({ [key]: e.target.checked })}
              />
              <span>{label}<span className="block text-body-sm text-on-surface-variant">{hint}</span></span>
            </label>
          </li>
        ))}
      </ul>
      {save.isError && <p role="alert" className="mt-3 text-error">{getApiErrorMessage(save.error)}</p>}
    </Card>
  );
}

function JiraCard({ teamSlug, projectSlug, canManage, settings }: Props & { settings: QaSettings }) {
  const queryClient = useQueryClient();
  const save = useSaveSettings(teamSlug, projectSlug);
  const [form, setForm] = useState({
    jira_enabled: settings.jira_enabled,
    jira_project_key: settings.jira_project_key,
    jira_issue_type: settings.jira_issue_type,
    jira_import: settings.jira_import,
  });
  const sync = useMutation({
    mutationFn: () => teamsApi.syncJira(teamSlug, projectSlug),
    onSuccess: () => invalidateProjectScope(queryClient, teamSlug, projectSlug),
  });
  const editable = canManage && settings.can_edit_jira;
  const errors = save.isError ? getApiFieldErrors(save.error) : {};

  return (
    <Card>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h2 className="text-headline-sm font-bold text-on-surface">Synchronisation Jira</h2>
        <Badge variant={settings.jira_configured && settings.jira_enabled ? 'success' : 'default'}>
          {!settings.jira_configured ? 'Non configurée sur le serveur' : settings.jira_enabled ? `Active · ${settings.jira_project_key}` : 'Inactive'}
        </Badge>
      </div>
      <p className="mb-4 text-body-sm text-on-surface-variant">
        Titre, priorité, statut et commentaires des anomalies sont synchronisés dans les deux sens.
        {!settings.can_edit_jira && ' La liaison est gérée par un super-administrateur.'}
      </p>
      <div className="space-y-4">
        <label className="flex items-center gap-3 text-body-base text-on-surface">
          <input type="checkbox" checked={form.jira_enabled} disabled={!editable} onChange={e => setForm(f => ({ ...f, jira_enabled: e.target.checked }))} />
          Activer pour ce projet
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Clé du projet Jira" placeholder="QA" value={form.jira_project_key} disabled={!editable} error={errors.jira_project_key}
                 onChange={e => setForm(f => ({ ...f, jira_project_key: e.target.value.trim().toUpperCase() }))} />
          <Input label="Type de ticket" value={form.jira_issue_type} disabled={!editable} error={errors.jira_issue_type}
                 onChange={e => setForm(f => ({ ...f, jira_issue_type: e.target.value }))} />
        </div>
        <label className="flex items-center gap-3 text-body-base text-on-surface">
          <input type="checkbox" checked={form.jira_import} disabled={!editable} onChange={e => setForm(f => ({ ...f, jira_import: e.target.checked }))} />
          Importer les nouveaux tickets Jira comme anomalies
        </label>
      </div>
      {save.isError && <p role="alert" className="mt-3 text-error">{getApiErrorMessage(save.error)}</p>}
      {sync.isError && <p role="alert" className="mt-3 text-error">{getApiErrorMessage(sync.error)}</p>}
      {sync.data && (
        <p role="status" className="mt-3 text-body-sm text-on-surface">
          {sync.data.pushed} envoyée(s), {sync.data.updated} mise(s) à jour, {sync.data.imported} importée(s)
          {sync.data.errors > 0 && <span className="text-error">, {sync.data.errors} en erreur (voir les anomalies)</span>}
        </p>
      )}
      {canManage && (
        <div className="mt-4 flex flex-wrap gap-3">
          {settings.can_edit_jira && <Button loading={save.isPending} onClick={() => save.mutate(form)}>Enregistrer</Button>}
          {settings.jira_configured && settings.jira_enabled && (
            <Button variant="secondary" loading={sync.isPending} onClick={() => sync.mutate()}>🔄 Synchroniser maintenant</Button>
          )}
        </div>
      )}
    </Card>
  );
}
