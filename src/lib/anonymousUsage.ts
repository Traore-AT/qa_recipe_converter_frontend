/** Quota de conversions anonymes (freemium) avant invitation à créer un compte. */
export const ANONYMOUS_CONVERSION_LIMIT = 3;

/** Clé localStorage qui stocke le nombre de conversions déjà réalisées en mode anonyme. */
const STORAGE_KEY = 'qa_recipe:anonymous_conversions';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function readCount(): number {
  if (!isBrowser()) return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeCount(value: number): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // localStorage indisponible (mode privé) : on ignore, le quota repart de zéro.
  }
}

/** Nombre de conversions anonymes déjà consommées par ce navigateur. */
export function getAnonymousConversionCount(): number {
  return readCount();
}

/** Conversions anonymes restantes avant de devoir se connecter. */
export function getAnonymousConversionsRemaining(): number {
  return Math.max(0, ANONYMOUS_CONVERSION_LIMIT - readCount());
}

/** True si l'utilisateur anonyme a encore droit à une conversion. */
export function canConvertAnonymously(): boolean {
  return readCount() < ANONYMOUS_CONVERSION_LIMIT;
}

/** À appeler une seule fois après une conversion réussie en mode anonyme. */
export function incrementAnonymousConversionCount(): void {
  writeCount(readCount() + 1);
}

/** Réinitialise le compteur (utilisé pour les tests). */
export function resetAnonymousConversionCount(): void {
  writeCount(0);
}
