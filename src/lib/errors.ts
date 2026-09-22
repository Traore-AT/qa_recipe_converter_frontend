import { extractApiError } from '../api/client';

/**
 * Transforme n'importe quelle erreur (réponse DRF `{error}`, `{detail}`,
 * erreurs par champ, erreur réseau, timeout) en message utilisateur français.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Une erreur est survenue. Veuillez réessayer.',
): string {
  return extractApiError(error).detail ?? fallback;
}

/**
 * Retourne les erreurs par champ d'une réponse DRF (`{ email: ['déjà utilisé'] }`)
 * afin de les injecter directement dans les formulaires.
 */
export function getApiFieldErrors(error: unknown): Record<string, string> {
  return extractApiError(error).fieldErrors;
}

/** Code HTTP associé à l'erreur, ou `null` si la requête n'a pas abouti. */
export function getApiErrorStatus(error: unknown): number | null {
  return extractApiError(error).status;
}

/** Indique si l'échec mérite une nouvelle tentative (réseau, 429 ou 5xx). */
export function isRetryableApiError(error: unknown): boolean {
  const { kind, status } = extractApiError(error);
  if (kind === 'network' || kind === 'timeout') return true;
  return status === 429 || (status !== null && status >= 500);
}

