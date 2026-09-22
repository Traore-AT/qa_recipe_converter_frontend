import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Accessible via aria-labelledby — id du titre de la modale */
  labelledBy: string;
  /** Optionnel : id de la description (aria-describedby). */
  describedBy?: string;
  children: ReactNode;
  className?: string;
  maxWidth?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modale accessible :
 * - `role="dialog"` + `aria-modal` + libellé par le titre ;
 * - focus initial dans la modale, piège de focus (Tab / Maj+Tab) ;
 * - fermeture par Échap ou clic sur l'arrière-plan ;
 * - focus rendu à l'élément déclencheur à la fermeture ;
 * - verrou du défilement de la page pendant l'ouverture.
 */
export function Modal({ open, onClose, labelledBy, describedBy, children, className, maxWidth = 'max-w-sm' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleFallbackId = useId();

  // La référence évite de relancer l'effet de focus à chaque re-render du parent
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Focus initial : premier élément focusable, sinon la modale elle-même
    const focusable = modalRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusable ?? modalRef.current)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !modalRef.current) return;

      const elements = Array.from(modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (elements.length === 0) {
        event.preventDefault();
        modalRef.current.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === modalRef.current)) {
        event.preventDefault();
        last.focus();
      }
    };

    const previouslyFocused = previousFocusRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || titleFallbackId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={cn('max-h-[92vh] w-[92%] overflow-y-auto rounded-xl bg-surface p-6 shadow-xl animate-fade-in focus:outline-none', maxWidth, className)}
      >
        {children}
      </div>
    </div>
  );
}

