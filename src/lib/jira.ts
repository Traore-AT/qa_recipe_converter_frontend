/** Clé Jira : PROJET-123 (même règle que le backend, `apps/core/use_cases.py`). */
export const JIRA_KEY_RE = /^[A-Z][A-Z0-9_]+-\d+$/;

/** Références distinctes d'une saisie (« QA-1, QA-2 », une par ligne, séparées par « ; »…). */
export function splitJiraKeys(value?: string | null): string[] {
  return [...new Set((value ?? '').split(/[\n\r;,]+/).map(k => k.trim()).filter(Boolean))];
}

/** Références qui ne respectent pas le format PROJET-123. */
export function invalidJiraKeys(value?: string | null): string[] {
  return splitJiraKeys(value).filter(k => !JIRA_KEY_RE.test(k));
}

/** Message d'aide pour une saisie de ticket(s) Jira, ou chaîne vide si tout est conforme. */
export function jiraFormatWarning(value?: string | null): string {
  const invalid = invalidJiraKeys(value);
  if (!invalid.length) return '';
  return `Format inattendu : ${invalid.join(', ')} (attendu : PROJET-123, en majuscules).`;
}
