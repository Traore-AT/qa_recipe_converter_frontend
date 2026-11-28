import type { JiraValidation } from '../../types';
import { jiraFormatWarning } from '../../lib/jira';

/** Avertissement inline si une saisie ne respecte pas le format PROJET-123. */
export function JiraFormatHint({ value }: { value?: string | null }) {
  const warning = jiraFormatWarning(value);
  return warning ? <span role="status" className="mt-1 block text-body-xs font-normal text-warning">{warning}</span> : null;
}

/** Résultat d'une vérification Jira : format, puis existence du ticket lorsque Jira est configuré. */
export function JiraCheckResult({ check }: { check: JiraValidation }) {
  return (
    <div className="mt-2 space-y-1" aria-live="polite">
      {check.error && <p className="text-body-xs text-warning">{check.error}</p>}
      {!check.jira_checked && !check.error && (
        <p className="text-body-xs text-on-surface-variant">Jira n’est pas configuré : seul le format a été contrôlé.</p>
      )}
      {check.results.map(r => {
        const [icon, text, tone] = !r.valid_format
          ? ['⚠', 'format inattendu (attendu : PROJET-123)', 'text-warning']
          : r.exists === true ? ['✔', r.summary || 'ticket trouvé', 'text-success']
            : r.exists === false ? ['✘', 'introuvable dans Jira', 'text-error']
              : ['✔', 'format valide', 'text-on-surface-variant'];
        return (
          <p key={r.ticket} className={`text-body-xs ${tone}`}>
            <span aria-hidden="true">{icon}</span> <span className="font-mono font-semibold">{r.ticket}</span> — {text}
          </p>
        );
      })}
    </div>
  );
}
