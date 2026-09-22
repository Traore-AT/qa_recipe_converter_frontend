/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '../../lib/cn';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  /** Texte secondaire (détail de l'erreur, nom du fichier…). */
  description?: string;
  /** Durée d'affichage en ms (0 = persistant jusqu'à fermeture manuelle). */
  duration?: number;
  /** Action facultative affichée dans le toast (ex. « Réessayer »). */
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastOptions {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  showToast: (variant: ToastVariant, message: string, options?: ToastOptions) => number;
  success: (message: string, options?: ToastOptions) => number;
  error: (message: string, options?: ToastOptions) => number;
  warning: (message: string, options?: ToastOptions) => number;
  info: (message: string, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'border-success/40 bg-success-container text-on-success-container',
  error: 'border-error/40 bg-error-container text-on-error-container',
  warning: 'border-warning/40 bg-warning-container text-on-warning-container',
  info: 'border-info/40 bg-info-container text-on-info-container',
};

const VARIANT_ICONS: Record<ToastVariant, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

const VARIANT_ROLE: Record<ToastVariant, 'status' | 'alert'> = {
  success: 'status',
  info: 'status',
  warning: 'alert',
  error: 'alert',
};

/**
 * Fournisseur de notifications transitoires (toasts).
 * Les toasts sont annoncés par les lecteurs d'écran (`role="status"` pour les
 * succès, `role="alert"` pour les erreurs) et respectent `prefers-reduced-motion`
 * via les règles globales de `index.css`.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);
  const timersRef = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback<ToastContextValue['showToast']>(
    (variant, message, options) => {
      const id = nextIdRef.current++;
      const duration = options?.duration ?? (variant === 'error' ? 7000 : 4000);
      setToasts((current) => [...current.slice(-3), { id, variant, message, ...options }]);
      if (duration > 0) {
        const timer = window.setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  // Nettoyage des minuteurs en attente au démontage (évite les fuites mémoire)
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message, options) => showToast('success', message, options),
      error: (message, options) => showToast('error', message, options),
      warning: (message, options) => showToast('warning', message, options),
      info: (message, options) => showToast('info', message, options),
      dismiss,
    }),
    [showToast, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={VARIANT_ROLE[toast.variant]}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg animate-slide-up-short',
              VARIANT_STYLES[toast.variant],
            )}
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              {VARIANT_ICONS[toast.variant]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-label-md font-semibold">{toast.message}</p>
              {toast.description && <p className="mt-1 text-body-sm opacity-90">{toast.description}</p>}
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    dismiss(toast.id);
                  }}
                  className="mt-2 text-label-sm font-semibold underline underline-offset-2 hover:opacity-80"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Fermer la notification"
              className="material-symbols-outlined text-lg opacity-70 transition-opacity hover:opacity-100"
            >
              close
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Implémentation neutre utilisée hors `ToastProvider` (tests unitaires, rendu isolé). */
const NOOP_TOASTS: ToastContextValue = {
  showToast: () => 0,
  success: () => 0,
  error: () => 0,
  warning: () => 0,
  info: () => 0,
  dismiss: () => {},
};

/**
 * Accès aux toasts depuis n'importe quel composant.
 * Hors `ToastProvider`, les appels sont ignorés sans erreur afin de permettre
 * le rendu isolé d'un composant (tests unitaires, storybook de composants).
 */
export function useToast(): ToastContextValue {
  return useContext(ToastContext) ?? NOOP_TOASTS;
}
