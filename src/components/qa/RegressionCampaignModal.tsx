import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '../../api/teams';
import { getApiErrorMessage } from '../../lib/errors';
import { formatDay, todayIso } from '../../lib/qa';
import { invalidateProjectScope } from '../../lib/queryKeys';
import type { Sprint } from '../../types';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Modal } from '../ui/Modal';

interface Props {
  teamSlug: string;
  projectSlug: string;
  onClose: () => void;
  onDone: (sprint: Sprint) => void;
}

/** Campagne de non-régression : pré-remplie, un clic suffit. */
export function RegressionCampaignModal({ teamSlug, projectSlug, onClose, onDone }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => {
    const start = todayIso();
    return { name: `Non-régression du ${formatDay(start)}`, start_date: start, duration_days: '7', scope: 'all', reset_status: true };
  });
  const { data: counts, error } = useQuery({
    queryKey: ['regression-campaign', teamSlug, projectSlug],
    queryFn: () => teamsApi.getRegressionCampaign(teamSlug, projectSlug),
  });
  const count = counts ? (form.scope === 'active' ? counts.active : counts.all) : 0;
  const mutation = useMutation({
    mutationFn: () => teamsApi.createRegressionCampaign(teamSlug, projectSlug, { ...form, name: form.name.trim(), duration_days: Number(form.duration_days) }),
    onSuccess: result => {
      invalidateProjectScope(queryClient, teamSlug, projectSlug);
      queryClient.invalidateQueries({ queryKey: ['regression-campaign', teamSlug, projectSlug] });
      onDone(result.sprint);
    },
  });

  return (
    <Modal open onClose={onClose} labelledBy="campaign-title" maxWidth="max-w-md" className="p-4 sm:p-7">
      <h3 id="campaign-title" className="text-headline-sm font-bold text-on-surface">Campagne de non-régression</h3>
      <p className="mb-4 mt-1 text-body-sm text-on-surface-variant">Crée un sprint avec les cas déjà en régression, confiés à leur dernier responsable.</p>
      <div className="space-y-4">
        <Input label="Nom *" maxLength={200} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Début *" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
          <Input label="Durée (jours)" type="number" min={1} max={365} value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: e.target.value }))} />
        </div>
        <Select
          label="Cas à rejouer"
          value={form.scope}
          onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
          options={[
            { value: 'all', label: `Tous les cas ayant régressé (${counts?.all ?? '…'})` },
            { value: 'active', label: `Seulement ceux encore en échec (${counts?.active ?? '…'})` },
          ]}
        />
        <label className="flex items-center gap-2 text-body-sm text-on-surface">
          <input type="checkbox" checked={form.reset_status} onChange={e => setForm(f => ({ ...f, reset_status: e.target.checked }))} />
          Remettre ces cas « À tester » (y compris dans les autres sprints ouverts)
        </label>
      </div>
      {(error || mutation.isError) && <p role="alert" className="mt-3 text-error">{getApiErrorMessage(error ?? mutation.error, 'Création impossible.')}</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button
          disabled={!count || !form.name.trim() || !form.start_date || Number(form.duration_days) < 1}
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Lancer la campagne ({count} cas)
        </Button>
      </div>
    </Modal>
  );
}
