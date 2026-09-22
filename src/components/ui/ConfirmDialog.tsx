import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Variante visuelle du bouton de confirmation */
  tone?: 'danger' | 'primary';
  loading?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modale de confirmation standardisée (accessible au clavier). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'danger',
  loading = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = 'confirm-dialog-title';
  return (
    <Modal open={open} onClose={onCancel} labelledBy={titleId}>
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${
          tone === 'danger' ? 'bg-error-container' : 'bg-primary-fixed'
        }`}
        aria-hidden="true"
      >
        <svg className={`w-6 h-6 ${tone === 'danger' ? 'text-error' : 'text-primary'}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
      </div>
      <h3 id={titleId} className="text-headline-sm font-bold text-on-surface text-center mb-2">{title}</h3>
      <p className="text-body-base text-on-surface-variant text-center mb-6">{description}</p>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} className="flex-1" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
      {error && <p className="text-body-sm text-error text-center mt-3">{error}</p>}
    </Modal>
  );
}
