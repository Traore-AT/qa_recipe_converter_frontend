interface Props {
  status: string;
  className?: string;
}

/**
 * Pastille de statut unifiée (tokens sémantiques).
 * Couvre les statuts de conversion (jobs), de test (cas/usages) et de défauts.
 */
const statusConfig: Record<string, { label: string; classes: string }> = {
  // Conversion (ConversionJob)
  pending: { label: 'À tester', classes: 'bg-surface-container-high text-on-surface-variant' },
  processing: { label: 'Traitement...', classes: 'bg-primary/15 text-primary' },
  done: { label: 'Terminé', classes: 'bg-success-container text-on-success-container' },
  error: { label: 'Erreur', classes: 'bg-error-container text-on-error-container' },

  // Exécution des cas de test
  passed: { label: 'Passé', classes: 'bg-success-container text-on-success-container' },
  failed: { label: 'Échoué', classes: 'bg-error-container text-on-error-container' },
  blocked: { label: 'Bloqué', classes: 'bg-warning-container text-on-warning-container' },
  in_progress: { label: 'En cours', classes: 'bg-primary-fixed text-primary' },
  not_run: { label: 'À tester', classes: 'bg-surface-container-high text-on-surface-variant' },

  // Libellés français renvoyés par le backend
  'Passé': { label: 'Passé', classes: 'bg-success-container text-on-success-container' },
  'Échoué': { label: 'Échoué', classes: 'bg-error-container text-on-error-container' },
  'Bloqué': { label: 'Bloqué', classes: 'bg-warning-container text-on-warning-container' },
  'En cours': { label: 'En cours', classes: 'bg-primary-fixed text-primary' },
  'À tester': { label: 'À tester', classes: 'bg-surface-container-high text-on-surface-variant' },

  // Défauts
  open: { label: 'Ouvert', classes: 'bg-error-container text-on-error-container' },
  resolved: { label: 'Résolu', classes: 'bg-success-container text-on-success-container' },
  closed: { label: 'Fermé', classes: 'bg-surface-container-high text-on-surface-variant' },
  reopened: { label: 'Réouvert', classes: 'bg-warning-container text-on-warning-container' },
};

export function StatusPill({ status, className = '' }: Props) {
  const config = statusConfig[status] ?? {
    label: status,
    classes: 'bg-surface-container-high text-on-surface-variant',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full whitespace-nowrap text-label-sm font-medium ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}

