import type { Sprint } from '../../types';

interface Props {
  sprints: Sprint[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

/** Sélection d'un périmètre : projet entier, un sprint ou plusieurs. */
export function SprintPicker({ sprints, selected, onChange }: Props) {
  const chip = (active: boolean) =>
    `cursor-pointer rounded-lg px-3 py-1.5 text-body-sm transition-colors ${
      active ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
    }`;
  return (
    <div role="group" aria-label="Périmètre" className="flex flex-wrap gap-2">
      <button type="button" aria-pressed={selected.length === 0} className={chip(selected.length === 0)} onClick={() => onChange([])}>
        Projet complet
      </button>
      {sprints.map(s => {
        const active = selected.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={active}
            className={chip(active)}
            onClick={() => onChange(active ? selected.filter(id => id !== s.id) : [...selected, s.id])}
          >
            {active ? '✓ ' : ''}{s.name}
          </button>
        );
      })}
    </div>
  );
}
