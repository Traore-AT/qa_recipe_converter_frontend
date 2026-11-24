import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '../../api/teams';
import { getApiErrorMessage } from '../../lib/errors';
import { addDays, caseLabel, todayIso } from '../../lib/qa';
import { invalidateProjectScope } from '../../lib/queryKeys';
import type { Sprint } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Modal } from '../ui/Modal';

interface Props {
  teamSlug: string;
  projectSlug: string;
  sprint: Sprint;
  sprints: Sprint[];
  onClose: () => void;
  /** Sprint de destination, une fois le report effectué. */
  onDone: (target: Sprint) => void;
}

const NEW = 'new';

/** Report des cas non terminés vers un sprint existant ou nouveau. */
export function CarryOverModal({ teamSlug, projectSlug, sprint, sprints, onClose, onDone }: Props) {
  const queryClient = useQueryClient();
  const targets = sprints.filter(s => s.id !== sprint.id && (s.status === 'planned' || s.status === 'active'));
  const isOpen = sprint.status === 'planned' || sprint.status === 'active';
  const [target, setTarget] = useState(targets[0]?.id ?? NEW);
  const start = sprint.end_date >= todayIso() ? addDays(sprint.end_date, 1) : todayIso();
  const [draft, setDraft] = useState({ name: `${sprint.name} (suite)`, start_date: start, duration_days: '14' });
  const [includeFailed, setIncludeFailed] = useState(false);
  const [closeSource, setCloseSource] = useState(isOpen);
  // On retient les cas décochés : par défaut, tout ce qui est reportable est sélectionné.
  const [excluded, setExcluded] = useState<string[]>([]);

  const { data, error, isLoading } = useQuery({
    queryKey: ['carry-over', sprint.id, includeFailed],
    queryFn: () => teamsApi.getCarryOver(teamSlug, projectSlug, sprint.id, includeFailed),
  });
  const cases = data?.results ?? [];
  const selected = cases.filter(c => !excluded.includes(c.use_case));

  const mutation = useMutation({
    mutationFn: () => teamsApi.carryOver(teamSlug, projectSlug, sprint.id, {
      ...(target === NEW
        ? { new_sprint: { ...draft, name: draft.name.trim(), duration_days: Number(draft.duration_days) } }
        : { target_sprint: target }),
      case_ids: selected.map(c => c.use_case),
      include_failed: includeFailed,
      close_source: isOpen && closeSource,
    }),
    onSuccess: result => {
      invalidateProjectScope(queryClient, teamSlug, projectSlug);
      queryClient.invalidateQueries({ queryKey: ['carry-over'] });
      onDone(result.sprint);
    },
  });

  const draftValid = target !== NEW || (!!draft.name.trim() && !!draft.start_date && Number(draft.duration_days) >= 1);

  return (
    <Modal open onClose={onClose} labelledBy="carry-over-title" maxWidth="max-w-xl" className="p-4 sm:p-7">
      <h3 id="carry-over-title" className="text-headline-sm font-bold text-on-surface">Reporter les cas non terminés</h3>
      <p className="mb-4 mt-1 text-body-sm text-on-surface-variant">
        Les cas gardent leur responsable. « {sprint.name} » conserve une trace de ses résultats.
      </p>
      <div className="space-y-4">
        <Select
          label="Vers"
          value={target}
          onChange={e => setTarget(e.target.value)}
          options={[...targets.map(s => ({ value: s.id, label: s.name })), { value: NEW, label: '+ Nouveau sprint' }]}
        />
        {target === NEW && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input label="Nom *" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
            <Input label="Début *" type="date" value={draft.start_date} onChange={e => setDraft(d => ({ ...d, start_date: e.target.value }))} />
            <Input label="Durée (jours)" type="number" min={1} max={365} value={draft.duration_days} onChange={e => setDraft(d => ({ ...d, duration_days: e.target.value }))} />
          </div>
        )}
        <label className="flex items-center gap-2 text-body-sm text-on-surface">
          <input type="checkbox" checked={includeFailed} onChange={e => setIncludeFailed(e.target.checked)} />
          Inclure les cas échoués
        </label>
        <fieldset>
          <legend className="mb-1 text-label-md text-on-surface-variant">Cas à reporter ({selected.length}/{cases.length})</legend>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-outline-variant p-2">
            {cases.map(c => (
              <label key={c.use_case} className="flex items-center gap-2 text-body-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={!excluded.includes(c.use_case)}
                  onChange={e => setExcluded(x => (e.target.checked ? x.filter(id => id !== c.use_case) : [...x, c.use_case]))}
                />
                <span className="shrink-0 font-mono">{caseLabel(c.case_number)}</span>
                <span className="min-w-0 flex-1 truncate text-on-surface-variant">{c.title}</span>
                <Badge>{c.status}</Badge>
              </label>
            ))}
            {!isLoading && cases.length === 0 && <p className="py-3 text-center text-body-sm text-on-surface-variant">Aucun cas à reporter.</p>}
          </div>
        </fieldset>
        {isOpen && (
          <label className="flex items-center gap-2 text-body-sm text-on-surface">
            <input type="checkbox" checked={closeSource} onChange={e => setCloseSource(e.target.checked)} />
            Terminer « {sprint.name} » (fige ses résultats et envoie son rapport)
          </label>
        )}
      </div>
      {(error || mutation.isError) && <p role="alert" className="mt-3 text-error">{getApiErrorMessage(error ?? mutation.error, 'Report impossible.')}</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button disabled={!selected.length || !draftValid} loading={mutation.isPending} onClick={() => mutation.mutate()}>Reporter {selected.length} cas</Button>
      </div>
    </Modal>
  );
}
