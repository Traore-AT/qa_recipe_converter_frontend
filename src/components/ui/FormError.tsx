/** Message d'erreur global d'un formulaire, annoncé aux lecteurs d'écran. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-error/30 bg-error-container p-3 text-body-sm text-on-error-container">
      <svg className="mt-px h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5M12 16.5v.01" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
