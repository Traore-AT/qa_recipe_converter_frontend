import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '../../api/teams';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { AssignableMember } from '../../types';
import { invalidateProjectScope, queryKeys } from '../../lib/queryKeys';
import { caseLabel } from '../../lib/qa';
import { getApiErrorMessage } from '../../lib/errors';

const STATUSES = ['À tester', 'En cours', 'Passé', 'Échoué', 'Bloqué'];

interface Props {
  teamSlug: string;
  projectSlug: string;
  sprintId: string;
  members: AssignableMember[];
  onClose: () => void;
  /** Résumé affiché sur le tableau après l'assignation. */
  onDone: (notice: string) => void;
}

/**
 * Assignation des cas d'un sprint : à un membre, ou répartis équitablement entre plusieurs.
 * Seuls les cas de ce sprint ou jamais planifiés sont proposés (filtrables par statut et par recherche).
 */
export function AssignCasesModal({ teamSlug, projectSlug, sprintId, members, onClose, onDone }: Props) {
  const queryClient = useQueryClient();
  const [distribute, setDistribute] = useState(false);
  const [userId, setUserId] = useState(0);
  const [userIds, setUserIds] = useState<number[]>([]);
  const [caseIds, setCaseIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: unassigned } = useQuery({
    queryKey: queryKeys.unassignedUcs(teamSlug, projectSlug, sprintId),
    queryFn: () => teamsApi.getUnassignedUseCases(teamSlug, projectSlug, sprintId),
  });
  const cases = useMemo(() => unassigned?.results ?? [], [unassigned]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter(uc => (!statusFilter || uc.status === statusFilter) && (!q
      || `${caseLabel(uc.case_number)} ${uc.ticket_number ?? ''} ${uc.jira_ticket ?? ''} ${uc.use_case_text} ${uc.description}`
        .toLowerCase().includes(q)));
  }, [cases, search, statusFilter]);
  const allVisibleSelected = visible.length > 0 && visible.every(uc => caseIds.includes(uc.id));

  const toggleAllVisible = (checked: boolean) => {
    const ids = new Set(visible.map(uc => uc.id));
    setCaseIds(prev => checked ? [...new Set([...prev, ...ids])] : prev.filter(id => !ids.has(id)));
  };
  const toggle = (list: string[], id: string, checked: boolean) => checked ? [...list, id] : list.filter(x => x !== id);

  const targets = distribute ? userIds : (userId ? [userId] : []);
  const mutation = useMutation({
    mutationFn: () => teamsApi.createAssignments(teamSlug, projectSlug, {
      use_case_ids: caseIds,
      sprint_id: sprintId,
      ...(distribute ? { user_ids: userIds } : { user_id: userId }),
    }),
    onSuccess: ({ count, errors, distribution }) => {
      invalidateProjectScope(queryClient, teamSlug, projectSlug);
      queryClient.invalidateQueries({ queryKey: queryKeys.assignableMembers(teamSlug, projectSlug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.unassignedUcs(teamSlug, projectSlug, sprintId) });
      const split = distribute && distribution?.length
        ? ` Répartition : ${distribution.map(d => `${d.full_name} ${d.count}`).join(', ')}.` : '';
      onDone(`${count} cas assigné${count > 1 ? 's' : ''}.${split}${errors?.length ? ` Non assignés : ${errors.join(' ; ')}.` : ''}`);
    },
  });

  const hidden = unassigned?.hidden_other_sprints ?? 0;
  const fieldClass = 'w-full border border-outline-variant rounded-lg bg-surface px-3 py-2.5 outline-none focus:border-primary';

  return (
    <Modal open onClose={onClose} labelledBy="assign-modal-title" maxWidth="max-w-lg" className="p-4 sm:p-7">
      <h3 id="assign-modal-title" className="text-headline-sm font-bold text-on-surface mb-5">+ Assigner des cas à un membre</h3>
      <div className="space-y-4">
        <div>
          <label className="mb-2 flex items-center gap-2 text-body-sm text-on-surface">
            <input type="checkbox" checked={distribute} onChange={e => setDistribute(e.target.checked)} />
            Répartir automatiquement entre plusieurs testeurs
          </label>
          {distribute ? (
            <fieldset>
              <legend className="text-label-md text-on-surface-variant mb-1">Testeurs ({userIds.length})</legend>
              <div className="max-h-36 overflow-y-auto rounded-lg border border-outline-variant p-2 space-y-1">
                {members.map(m => (
                  <label key={m.user.id} className="flex items-center gap-2 rounded p-1 text-body-sm hover:bg-surface-container-low">
                    <input type="checkbox" checked={userIds.includes(m.user.id)}
                           onChange={e => setUserIds(p => e.target.checked ? [...p, m.user.id] : p.filter(id => id !== m.user.id))} />
                    {m.user.full_name}{m.in_project ? '' : ' (équipe)'}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-body-xs text-on-surface-variant">Les cas sont répartis équitablement, en tenant compte des cas déjà confiés à chacun dans ce sprint.</p>
            </fieldset>
          ) : (
            <>
              <label htmlFor="assign-member" className="text-label-md text-on-surface-variant block mb-1">Membre</label>
              <select id="assign-member" value={userId} onChange={e => setUserId(Number(e.target.value))} className={fieldClass}>
                <option value={0}>Sélectionner…</option>
                {members.map(m => <option key={m.user.id} value={m.user.id}>{m.user.full_name}{m.in_project ? '' : ' (équipe)'}</option>)}
              </select>
            </>
          )}
          <p className="mt-1 text-body-xs text-on-surface-variant">Tous les membres de l’équipe sont proposés ; ceux marqués « (équipe) » rejoindront automatiquement le projet.</p>
        </div>

        <div>
          <label className="text-label-md text-on-surface-variant block mb-1">Cas non assignés ({cases.length})</label>
          {!!hidden && (
            <p role="note" className="mb-2 rounded-lg bg-info-container px-3 py-2 text-body-xs text-on-info-container">
              {hidden} cas déjà planifié{hidden > 1 ? 's' : ''} dans d’autres sprints {hidden > 1 ? 'sont masqués' : 'est masqué'}. Pour rejouer un cas, utilisez « Reporter les cas » depuis son sprint.
            </p>
          )}
          {!!cases.length && (
            <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <input type="search" aria-label="Rechercher un cas à assigner" placeholder="N° CAS, ticket Jira ou titre"
                     value={search} onChange={e => setSearch(e.target.value)} className={fieldClass} />
              <select aria-label="Filtrer par statut" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={fieldClass}>
                <option value="">Tous les statuts</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div className="max-h-60 overflow-y-auto border border-outline-variant rounded-lg p-2 space-y-1">
            {unassigned && !cases.length && <p className="p-1.5 text-body-sm italic text-on-surface-variant">Aucun cas disponible pour ce sprint.</p>}
            {!!cases.length && !visible.length && <p className="p-1.5 text-body-sm italic text-on-surface-variant">Aucun cas ne correspond aux filtres.</p>}
            {!!visible.length && (
              <label className="flex items-center gap-2 p-1.5 border-b border-outline-variant font-semibold">
                <input type="checkbox" checked={allVisibleSelected} onChange={e => toggleAllVisible(e.target.checked)} />
                {visible.length === cases.length ? 'Sélectionner tous les cas' : `Sélectionner les ${visible.length} cas affichés`}
              </label>
            )}
            {visible.map(uc => (
              <label key={uc.id} className="flex items-center gap-2 p-1.5 hover:bg-surface-container-low rounded cursor-pointer">
                <input type="checkbox" checked={caseIds.includes(uc.id)} onChange={e => setCaseIds(p => toggle(p, uc.id, e.target.checked))} />
                <span className="text-body-sm text-on-surface shrink-0">{caseLabel(uc.case_number)}</span>
                <span className="text-body-sm text-on-surface-variant truncate flex-1">{uc.use_case_text || uc.description}</span>
                {uc.jira_ticket && <span className="shrink-0 font-mono text-body-xs text-info">{uc.jira_ticket}</span>}
                <span className="shrink-0 text-body-xs text-on-surface-variant">{uc.status}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      {mutation.isError && <p role="alert" className="text-error mt-3">{getApiErrorMessage(mutation.error, 'Assignation impossible.')}</p>}
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end mt-6 [&>button]:w-full sm:[&>button]:w-auto">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button onClick={() => mutation.mutate()} disabled={!targets.length || !caseIds.length || mutation.isPending}>
          {mutation.isPending ? '⏳…' : `✅ Assigner (${caseIds.length})`}
        </Button>
      </div>
    </Modal>
  );
}
