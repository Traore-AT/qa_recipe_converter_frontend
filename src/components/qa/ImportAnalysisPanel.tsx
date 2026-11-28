import { useQuery } from '@tanstack/react-query';
import { conversionApi } from '../../api/conversion';
import { getApiErrorMessage } from '../../lib/errors';

const FIELD_LABELS: Record<string, string> = {
  use_case_text: 'Use Case', description: 'Description', preconditions: 'Préconditions', steps: 'Étapes',
  expected_results: 'Résultats attendus', observed_results: 'Résultats observés', jira_ticket: 'Tickets Jira',
};
const SAMPLE_ROWS = 5;

/**
 * Aperçu avant import : ce que la conversion extraira du document (colonnes reconnues,
 * nombre de cas, tickets Jira), sans rien enregistrer.
 */
export function ImportAnalysisPanel({ file }: { file: File }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['import-analysis', file.name, file.size, file.lastModified],
    queryFn: () => conversionApi.analyze(file),
    retry: false,
    staleTime: Infinity,
  });

  if (isLoading) {
    return <p role="status" className="mt-4 text-body-sm text-on-surface-variant animate-pulse">Analyse du document…</p>;
  }
  if (isError || !data) {
    return (
      <p role="status" className="mt-4 rounded-lg bg-warning-container/50 px-3 py-2 text-body-sm text-on-warning-container">
        Aperçu indisponible : {getApiErrorMessage(error, 'analyse impossible')}. La conversion reste possible.
      </p>
    );
  }

  return (
    <section aria-label="Aperçu de l'import" className="mt-4 space-y-3 text-left">
      <div className="flex flex-wrap gap-2 text-body-sm">
        <span className="rounded-full bg-primary-fixed px-3 py-1 font-semibold text-primary">{data.total_cases} cas de test</span>
        <span className={`rounded-full px-3 py-1 font-semibold ${data.jira_column ? 'bg-success-container text-on-success-container' : 'bg-warning-container text-on-warning-container'}`}>
          Tickets Jira {data.jira_column ? `✔ ${data.with_jira}/${data.total_cases}` : '✘ colonne absente'}
        </span>
      </div>

      {data.warnings.map(w => (
        <p key={w} role="note" className="rounded-lg bg-warning-container/50 px-3 py-2 text-body-xs text-on-warning-container">⚠ {w}</p>
      ))}

      {data.invalid_jira.length > 0 && (
        <details className="text-body-xs text-on-surface-variant">
          <summary className="cursor-pointer">Références Jira à vérifier ({data.invalid_jira.length})</summary>
          <ul className="mt-1 list-disc pl-5">
            {data.invalid_jira.map(i => <li key={`${i.row}-${i.ticket}`}>Cas n°{i.row} : <span className="font-mono">{i.ticket}</span></li>)}
          </ul>
        </details>
      )}

      <div className="space-y-2">
        {data.tables.map(t => (
          <div key={t.index} className="rounded-lg border border-outline-variant p-3">
            <p className="mb-2 text-label-sm font-bold text-on-surface">
              Tableau {t.index} — {t.ignored ? <span className="font-normal text-on-surface-variant">ignoré ({t.ignored})</span>
                : `${t.rows} cas${t.skipped_rows ? `, ${t.skipped_rows} ligne${t.skipped_rows > 1 ? 's' : ''} vide${t.skipped_rows > 1 ? 's' : ''} ignorée${t.skipped_rows > 1 ? 's' : ''}` : ''}`}
            </p>
            {t.columns.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {t.columns.map((c, i) => (
                  <li key={i} className={`rounded px-2 py-0.5 text-body-xs ${c.field ? 'bg-success-container/60 text-on-success-container' : 'bg-surface-container-high text-on-surface-variant line-through'}`}
                      title={c.field ? `Importée comme « ${c.label} »` : 'Colonne non reconnue : non importée'}>
                    {c.header || '(sans titre)'}{c.field ? ` → ${c.label} ✔` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {data.sample.length > 0 && (
        <details>
          <summary className="cursor-pointer text-body-sm text-on-surface-variant">Premiers cas extraits</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-body-xs">
              <thead>
                <tr className="text-left text-on-surface-variant">
                  <th className="px-2 py-1">#</th>
                  {data.fields.map(f => <th key={f} className="px-2 py-1">{FIELD_LABELS[f] ?? f}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.sample.slice(0, SAMPLE_ROWS).map((row, i) => (
                  <tr key={i} className="border-t border-outline-variant align-top">
                    <td className="px-2 py-1 font-mono">{i + 1}</td>
                    {data.fields.map(f => (
                      <td key={f} className={`max-w-[12rem] truncate px-2 py-1 ${f === 'jira_ticket' ? 'font-mono text-info' : ''}`}>
                        {row[f as keyof typeof row] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
