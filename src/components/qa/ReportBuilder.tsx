import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { teamsApi } from '../../api/teams';
import { getApiErrorMessage } from '../../lib/errors';
import type { Sprint } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SprintPicker } from './SprintPicker';

/** Génération du rapport PDF : projet complet, un sprint ou plusieurs sprints. */
export function ReportBuilder({ teamSlug, projectSlug, sprints }: { teamSlug: string; projectSlug: string; sprints: Sprint[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const mutation = useMutation({
    mutationFn: () => teamsApi.downloadProjectReport(teamSlug, projectSlug, selected),
  });
  const excel = useMutation({
    mutationFn: () => teamsApi.downloadProjectExcel(teamSlug, projectSlug, selected),
  });
  const label = selected.length === 0 ? 'du projet' : selected.length === 1 ? 'du sprint' : `de ${selected.length} sprints`;

  return (
    <Card className="mb-6">
      <h2 className="text-headline-sm font-bold text-on-surface">Rapport de projet et de sprint</h2>
      <p className="mb-4 mt-1 text-body-sm text-on-surface-variant">
        Performance, courbe d’évolution, anomalies, régressions et cas de test. Choisissez le projet complet, un sprint ou plusieurs sprints.
      </p>
      <SprintPicker sprints={sprints} selected={selected} onChange={setSelected} />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>📄 Télécharger le rapport {label}</Button>
        <Button variant="secondary" loading={excel.isPending} onClick={() => excel.mutate()}>📊 Exporter en Excel</Button>
      </div>
      {(mutation.isError || excel.isError) && <p role="alert" className="mt-3 text-body-sm text-error">{getApiErrorMessage(mutation.error ?? excel.error, 'Impossible de télécharger le rapport.')}</p>}
    </Card>
  );
}
