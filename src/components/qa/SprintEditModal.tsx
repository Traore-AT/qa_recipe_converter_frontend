import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '../../api/teams';
import { getApiErrorMessage } from '../../lib/errors';
import { addDays, daysBetween, SPRINT_STATUS_LABELS } from '../../lib/qa';
import { invalidateProjectScope } from '../../lib/queryKeys';
import type { Sprint } from '../../types';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { Modal } from '../ui/Modal';

interface Props {
  teamSlug: string;
  projectSlug: string;
  sprint: Sprint;
  onClose: () => void;
}

/** Modification du nom, de l'objectif, de la période/durée et du statut d'un sprint. */
export function SprintEditModal({ teamSlug, projectSlug, sprint, onClose }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: sprint.name,
    goal: sprint.goal ?? '',
    start_date: sprint.start_date,
    end_date: sprint.end_date,
    status: sprint.status,
  });
  // La durée est saisie librement (champ vide compris) ; elle pilote la date de fin.
  const [duration, setDuration] = useState(String(daysBetween(sprint.start_date, sprint.end_date) ?? ''));

  const mutation = useMutation({
    mutationFn: () => teamsApi.updateSprint(teamSlug, projectSlug, sprint.id, { ...form, name: form.name.trim() }),
    onSuccess: () => {
      invalidateProjectScope(queryClient, teamSlug, projectSlug);
      onClose();
    },
  });

  const onDuration = (value: string) => {
    setDuration(value);
    const days = Number(value);
    if (Number.isInteger(days) && days >= 1) setForm(f => ({ ...f, end_date: addDays(f.start_date, days) || f.end_date }));
  };
  const onStart = (start: string) => {
    // Décaler le début conserve la durée du sprint.
    const days = Number(duration);
    const end = Number.isInteger(days) && days >= 1 ? addDays(start, days) : '';
    setForm(f => ({ ...f, start_date: start, end_date: end || f.end_date }));
  };
  const onEnd = (end: string) => {
    setForm(f => ({ ...f, end_date: end }));
    setDuration(String(daysBetween(form.start_date, end) ?? ''));
  };

  const days = daysBetween(form.start_date, form.end_date);
  const datesError = days === null ? 'Renseignez les deux dates.' : days < 1 ? 'La date de fin doit être après la date de début.' : '';

  return (
    <Modal open onClose={onClose} labelledBy="edit-sprint-title" maxWidth="max-w-md" className="p-4 sm:p-7">
      <form
        onSubmit={e => {
          e.preventDefault();
          if (!datesError && form.name.trim()) mutation.mutate();
        }}
      >
        <h3 id="edit-sprint-title" className="text-headline-sm font-bold text-on-surface mb-5">Modifier le sprint</h3>
        <div className="space-y-4">
          <Input label="Nom *" maxLength={200} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Textarea label="Objectif" rows={3} value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Début *" type="date" value={form.start_date} onChange={e => onStart(e.target.value)} />
            <Input label="Fin *" type="date" value={form.end_date} error={datesError || undefined} onChange={e => onEnd(e.target.value)} />
            <Input label="Durée (jours)" type="number" min={1} max={365} value={duration} onChange={e => onDuration(e.target.value)} />
            <Select
              label="Statut"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as Sprint['status'] }))}
              options={Object.entries(SPRINT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </div>
        </div>
        {mutation.isError && <p role="alert" className="mt-3 text-error">{getApiErrorMessage(mutation.error, 'Modification impossible.')}</p>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={!form.name.trim() || !!datesError} loading={mutation.isPending}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}
