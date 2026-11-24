import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '../../api/teams';
import { getApiErrorMessage, getApiFieldErrors } from '../../lib/errors';
import { caseLabel, DEFECT_STATUS, PRIORITIES, SEVERITIES } from '../../lib/qa';
import { invalidateProjectScope, queryKeys } from '../../lib/queryKeys';
import type { Defect } from '../../types';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { Modal } from '../ui/Modal';

interface Props {
  teamSlug: string;
  projectSlug: string;
  /** Anomalie à modifier ; absente = création. */
  defect?: Defect;
  /** Valeurs pré-remplies à la création (ex. depuis une carte du Kanban). */
  initial?: Partial<Pick<FormState, 'sprint' | 'use_case' | 'is_regression' | 'title'>>;
  onClose: () => void;
}

interface FormState {
  title: string;
  description: string;
  severity: string;
  priority: string;
  status: string;
  sprint: string;
  use_case: string;
  related_use_cases: string[];
  is_regression: boolean;
  regression_of: string;
  assigned_to: string;
  steps_to_reproduce: string;
  expected_behavior: string;
  actual_behavior: string;
  environment: string;
  resolution: string;
}

const toOptions = (entries: Record<string, string | { label: string }>) =>
  Object.entries(entries).map(([value, o]) => ({ value, label: typeof o === 'string' ? o : o.label }));

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/** Formulaire complet d'anomalie : création et modification. */
export function DefectFormModal({ teamSlug, projectSlug, defect, initial, onClose }: Props) {
  const queryClient = useQueryClient();
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [form, setForm] = useState<FormState>({
    title: defect?.title ?? initial?.title ?? '',
    description: defect?.description ?? '',
    severity: defect?.severity ?? 'major',
    priority: defect?.priority ?? 'medium',
    status: defect?.status ?? 'open',
    sprint: defect?.sprint ?? initial?.sprint ?? '',
    use_case: defect?.use_case ?? initial?.use_case ?? '',
    related_use_cases: defect?.related_use_cases ?? [],
    is_regression: defect?.is_regression ?? initial?.is_regression ?? false,
    regression_of: defect?.regression_of ?? '',
    assigned_to: defect?.assigned_to ? String(defect.assigned_to) : '',
    steps_to_reproduce: defect?.steps_to_reproduce ?? '',
    expected_behavior: defect?.expected_behavior ?? '',
    actual_behavior: defect?.actual_behavior ?? '',
    environment: defect?.environment ?? '',
    resolution: defect?.resolution ?? '',
  });
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(f => ({ ...f, [key]: value }));

  const { data: sprints } = useQuery({
    queryKey: queryKeys.sprints(teamSlug, projectSlug),
    queryFn: () => teamsApi.listSprints(teamSlug, projectSlug),
  });
  const { data: members } = useQuery({
    queryKey: queryKeys.assignableMembers(teamSlug, projectSlug),
    queryFn: () => teamsApi.listAssignableMembers(teamSlug, projectSlug),
  });
  // Sprint choisi : seuls ses cas sont associables ; sinon tous les cas du projet.
  const { data: cases } = useQuery({
    queryKey: form.sprint
      ? queryKeys.sprintCases(teamSlug, projectSlug, form.sprint)
      : queryKeys.projectCases(teamSlug, projectSlug),
    queryFn: async () => {
      if (!form.sprint) {
        const progress = await teamsApi.getProjectProgress(teamSlug, projectSlug);
        return progress.use_cases.map(c => ({ id: c.id, number: c.case_number, title: c.use_case_text || c.description }));
      }
      const { results } = await teamsApi.listAssignments(teamSlug, projectSlug, { sprint: form.sprint });
      // Un cas confié à plusieurs membres n'apparaît qu'une fois.
      const unique = new Map(results.map(a => [a.use_case, { id: a.use_case, number: a.case_number, title: a.use_case_text || a.description }]));
      return [...unique.values()].sort((a, b) => a.number - b.number);
    },
  });
  const { data: origins } = useQuery({
    queryKey: [...queryKeys.defectsRoot(teamSlug, projectSlug), 'origins'],
    queryFn: () => teamsApi.listDefects(teamSlug, projectSlug),
    enabled: form.is_regression,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const data: Record<string, unknown> = { ...form, title: form.title.trim() };
      for (const key of ['sprint', 'use_case', 'regression_of', 'assigned_to'] as const) data[key] = form[key] || null;
      data.related_use_cases = form.related_use_cases.filter(id => id !== form.use_case);
      if (!form.is_regression) {
        data.regression_of = null;
        // À la création, une case non cochée laisse le serveur détecter la régression.
        if (!defect) delete data.is_regression;
      }
      if (!attachment) {
        return defect
          ? teamsApi.updateDefect(teamSlug, projectSlug, defect.id, data)
          : teamsApi.createDefect(teamSlug, projectSlug, data);
      }
      const body = new FormData();
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) value.forEach(v => body.append(key, String(v)));
        else body.append(key, value === null ? '' : String(value));
      }
      body.append('attachment', attachment);
      return defect
        ? teamsApi.updateDefect(teamSlug, projectSlug, defect.id, body)
        : teamsApi.createDefect(teamSlug, projectSlug, body);
    },
    onSuccess: () => {
      invalidateProjectScope(queryClient, teamSlug, projectSlug);
      if (defect) queryClient.invalidateQueries({ queryKey: queryKeys.defectHistory(defect.id) });
      onClose();
    },
  });

  const onAttachment = (file: File | null) => {
    const tooBig = !!file && file.size > MAX_ATTACHMENT_BYTES;
    setAttachmentError(tooBig ? 'Fichier trop volumineux (5 Mo maximum).' : '');
    setAttachment(tooBig ? null : file);
  };

  const onSprint = (sprint: string) =>
    // Les cas d'un autre périmètre ne sont plus valides.
    setForm(f => ({ ...f, sprint, use_case: '', related_use_cases: [] }));

  const caseOptions = [
    { value: '', label: 'Aucun' },
    ...(cases ?? []).map(c => ({ value: c.id, label: `${caseLabel(c.number)} — ${c.title}`.slice(0, 90) })),
  ];
  const errors = mutation.isError ? getApiFieldErrors(mutation.error) : {};

  return (
    <Modal open onClose={onClose} labelledBy="defect-modal-title" maxWidth="max-w-2xl" className="p-4 sm:p-7">
      <form
        onSubmit={e => {
          e.preventDefault();
          if (form.title.trim()) mutation.mutate();
        }}
      >
        <h3 id="defect-modal-title" className="text-headline-sm font-bold text-on-surface mb-5">
          {defect ? `Modifier ${defect.ticket_number}` : 'Signaler une anomalie'}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Titre *" maxLength={300} value={form.title} error={errors.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Description" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <Select label="Sévérité" value={form.severity} onChange={e => set('severity', e.target.value)} options={toOptions(SEVERITIES)} />
          <Select label="Priorité" value={form.priority} onChange={e => set('priority', e.target.value)} options={toOptions(PRIORITIES)} />
          <Select
            label="Sprint"
            value={form.sprint}
            error={errors.sprint}
            onChange={e => onSprint(e.target.value)}
            options={[{ value: '', label: 'Hors sprint' }, ...(sprints?.results ?? []).map(s => ({ value: s.id, label: s.name }))]}
          />
          <Select
            label="Cas de test"
            value={form.use_case}
            error={errors.use_case}
            hint={form.sprint ? 'Cas joués dans ce sprint' : undefined}
            onChange={e => set('use_case', e.target.value)}
            options={caseOptions}
          />
          {(cases?.length ?? 0) > 1 && (
            <fieldset className="sm:col-span-2">
              <legend className="mb-1 text-label-md text-on-surface-variant">
                Autres cas impactés ({form.related_use_cases.filter(id => id !== form.use_case).length})
              </legend>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-outline-variant p-2">
                {cases!.filter(c => c.id !== form.use_case).map(c => (
                  <label key={c.id} className="flex items-center gap-2 text-body-sm text-on-surface">
                    <input
                      type="checkbox"
                      checked={form.related_use_cases.includes(c.id)}
                      onChange={e => set('related_use_cases', e.target.checked
                        ? [...form.related_use_cases, c.id]
                        : form.related_use_cases.filter(id => id !== c.id))}
                    />
                    <span className="shrink-0 font-mono">{caseLabel(c.number)}</span>
                    <span className="truncate text-on-surface-variant">{c.title}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <Select
            label="Assigné à"
            value={form.assigned_to}
            error={errors.assigned_to}
            onChange={e => set('assigned_to', e.target.value)}
            options={[
              { value: '', label: 'Non assigné' },
              ...(defect?.assigned_to_user && !members?.results?.some(m => m.user.id === defect.assigned_to)
                ? [{ value: String(defect.assigned_to_user.id), label: defect.assigned_to_user.full_name }] : []),
              ...(members?.results ?? []).map(m => ({ value: String(m.user.id), label: m.user.full_name })),
            ]}
          />
          <Input label="Environnement" maxLength={200} placeholder="Navigateur, OS, version…" value={form.environment} onChange={e => set('environment', e.target.value)} />
          <label className="flex items-center gap-2 text-body-base text-on-surface sm:col-span-2">
            <input type="checkbox" checked={form.is_regression} onChange={e => set('is_regression', e.target.checked)} />
            Il s’agit d’une régression
          </label>
          {form.is_regression && (
            <div className="sm:col-span-2">
              <Select
                label="Anomalie d’origine"
                value={form.regression_of}
                error={errors.regression_of}
                onChange={e => set('regression_of', e.target.value)}
                options={[
                  { value: '', label: 'Inconnue' },
                  ...(origins?.results ?? []).filter(d => d.id !== defect?.id).map(d => ({ value: d.id, label: `${d.ticket_number} — ${d.title}`.slice(0, 90) })),
                ]}
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <Textarea label="Étapes de reproduction" rows={3} value={form.steps_to_reproduce} onChange={e => set('steps_to_reproduce', e.target.value)} />
          </div>
          <Textarea label="Comportement attendu" rows={2} value={form.expected_behavior} onChange={e => set('expected_behavior', e.target.value)} />
          <Textarea label="Comportement observé" rows={2} value={form.actual_behavior} onChange={e => set('actual_behavior', e.target.value)} />
          {defect && (
            <>
              <Select label="Statut" value={form.status} onChange={e => set('status', e.target.value)} options={toOptions(DEFECT_STATUS)} />
              <Textarea label="Résolution / cause racine" rows={2} value={form.resolution} onChange={e => set('resolution', e.target.value)} />
            </>
          )}
          <div className="sm:col-span-2">
            <Input
              label="Pièce jointe (image, PDF, texte, MP4 — 5 Mo max)"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.mp4"
              error={attachmentError || errors.attachment}
              onChange={e => onAttachment(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        {mutation.isError && <p role="alert" className="mt-3 text-error">{getApiErrorMessage(mutation.error, 'Enregistrement impossible.')}</p>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={!form.title.trim()} loading={mutation.isPending}>{defect ? 'Enregistrer' : '✅ Signaler'}</Button>
        </div>
      </form>
    </Modal>
  );
}
