import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { teamsApi } from '../api/teams';
import { PageLayout } from '../components/layout/PageLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { StatusBreakdown } from '../components/charts/StatusBreakdown';
import { Sparkline } from '../components/qa/TeamPerformance';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { formatPercent } from '../lib/chart';
import { getApiErrorMessage } from '../lib/errors';
import { LEVEL_VARIANTS } from '../lib/qa';
import { queryKeys } from '../lib/queryKeys';
import type { Performance, TeamPerformanceRow } from '../types';

const score = (perf: Performance) => (perf.score === null ? '—' : `${perf.score.toLocaleString('fr-FR')}/100`);

/**
 * Rapports de l'équipe : choix d'un ou plusieurs projets, aperçu en direct du niveau de performance
 * de chacun et de l'ensemble, puis génération du rapport PDF global.
 */
export default function TeamReportsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[] | null>(null);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const projects = useQuery({
    queryKey: queryKeys.teamPerformance(slug),
    queryFn: () => teamsApi.getTeamPerformance(slug!),
    enabled: !!slug,
  });
  const rows = useMemo(
    () => [...(projects.data?.results ?? [])].sort((a, b) => a.project.name.localeCompare(b.project.name, 'fr')),
    [projects.data],
  );

  // Par défaut (tant que l'utilisateur n'a rien changé) : tous les projets actifs, ou tous s'il n'y en a aucun d'actif.
  const defaults = useMemo(() => {
    const active = rows.filter(r => r.project.status === 'active');
    return (active.length ? active : rows).map(r => r.project.id);
  }, [rows]);
  const current = selected ?? defaults;
  const chosen = useMemo(() => [...current].sort(), [current]);
  const debounced = useDebouncedValue(chosen, 350);
  const preview = useQuery({
    queryKey: queryKeys.portfolio(slug, debounced),
    queryFn: () => teamsApi.getPortfolio(slug!, debounced),
    enabled: !!slug && debounced.length > 0,
    placeholderData: previous => previous,  // l'aperçu garde son cadre pendant le rechargement
  });

  const visible = rows.filter(r => (!activeOnly || r.project.status === 'active')
    && r.project.name.toLowerCase().includes(search.trim().toLowerCase()));
  const isSelected = (id: string) => chosen.includes(id);
  const toggle = (id: string) => setSelected(current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  const allVisibleSelected = visible.length > 0 && visible.every(r => isSelected(r.project.id));
  const toggleVisible = () => {
    const ids = visible.map(r => r.project.id);
    setSelected(allVisibleSelected ? current.filter(id => !ids.includes(id)) : [...new Set([...current, ...ids])]);
  };

  const generate = async () => {
    setDownloadError('');
    setDownloading(true);
    try {
      await teamsApi.downloadPortfolioReport(slug!, chosen);
    } catch (error: unknown) {
      setDownloadError(getApiErrorMessage(error, 'Impossible de générer le rapport.'));
    } finally {
      setDownloading(false);
    }
  };

  const overall = preview.data?.performance;
  const stale = preview.isFetching || chosen.join() !== debounced.join();

  return (
    <PageLayout>
      <div className="mb-6">
        <button onClick={() => navigate(`/teams/${slug}`)} className="mb-1 flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary">
          ← Retour à l’équipe
        </button>
        <h1 className="text-headline-lg font-bold text-on-surface">Rapports de l’équipe</h1>
        <p className="mt-1 text-body-base text-on-surface-variant">
          Sélectionnez un ou plusieurs projets pour générer le rapport global : ce qui a été réalisé dans chacun,
          son niveau de performance et le niveau global de la sélection.
        </p>
      </div>

      {projects.isError ? (
        <ErrorState message={getApiErrorMessage(projects.error)} onRetry={() => projects.refetch()} />
      ) : projects.isPending ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : !rows.length ? (
        <Card><p className="text-body-base text-on-surface-variant">Cette équipe n’a encore aucun projet.</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* ── Sélection des projets ───────────────────────────────────────── */}
          <section aria-labelledby="projects-title">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 id="projects-title" className="mr-auto text-headline-sm font-bold text-on-surface">
                Projets <span className="text-on-surface-variant">({chosen.length} / {rows.length} sélectionnés)</span>
              </h2>
              <input type="search" aria-label="Rechercher un projet" placeholder="Rechercher un projet" value={search}
                     onChange={e => setSearch(e.target.value)}
                     className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-sm sm:w-56" />
              <label className="flex items-center gap-1.5 text-body-sm text-on-surface">
                <input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)} /> Actifs uniquement
              </label>
              <Button size="sm" variant="secondary" onClick={toggleVisible} disabled={!visible.length}>
                {allVisibleSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              </Button>
            </div>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {visible.map(row => <ProjectChoice key={row.project.id} row={row} checked={isSelected(row.project.id)} onToggle={() => toggle(row.project.id)} />)}
              {!visible.length && <li className="text-body-sm italic text-on-surface-variant">Aucun projet ne correspond aux filtres.</li>}
            </ul>
          </section>

          {/* ── Aperçu et génération ───────────────────────────────────────── */}
          <aside aria-labelledby="preview-title" className="xl:sticky xl:top-4 xl:self-start">
            <Card>
              <h2 id="preview-title" className="mb-3 text-headline-sm font-bold text-on-surface">Aperçu du rapport global</h2>
              {!chosen.length ? (
                <p className="text-body-sm text-on-surface-variant">Sélectionnez au moins un projet.</p>
              ) : preview.isError ? (
                <p role="alert" className="text-body-sm text-error">{getApiErrorMessage(preview.error)}</p>
              ) : !overall ? (
                <Skeleton className="h-48 rounded-lg" />
              ) : (
                <div className={`space-y-4 transition-opacity ${stale ? 'opacity-60' : ''}`} aria-busy={stale}>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-body-xs text-on-surface-variant">Niveau de performance global</p>
                      <p className="text-[2.75rem] font-bold leading-none text-on-surface">{score(overall)}</p>
                    </div>
                    <Badge variant={LEVEL_VARIANTS[overall.level]}>{overall.level_label}</Badge>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-body-sm">
                    {[['Taux de réussite', formatPercent(overall.stats.success_rate)],
                      ['Avancement', formatPercent(overall.stats.execution_rate)],
                      ['Cas de test', overall.stats.total.toLocaleString('fr-FR')],
                      ['Anomalies actives', String(overall.defects.active ?? 0)]].map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-surface-container px-3 py-2">
                        <dt className="text-body-xs text-on-surface-variant">{label}</dt>
                        <dd className="font-semibold tabular-nums text-on-surface">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <StatusBreakdown stats={overall.stats} title="Répartition globale" />
                  <ScoreBars projects={preview.data!.projects} />
                </div>
              )}
              {downloadError && <p role="alert" className="mt-3 text-body-sm text-error">{downloadError}</p>}
              <Button className="mt-4 w-full" onClick={generate} loading={downloading} disabled={!chosen.length}>
                📄 Générer le rapport PDF ({chosen.length} projet{chosen.length > 1 ? 's' : ''})
              </Button>
              <p className="mt-2 text-body-xs text-on-surface-variant">
                Le rapport détaille chaque projet (sprints, résultats, cas en échec, recommandations) puis conclut sur l’ensemble.
              </p>
            </Card>

            <Card className="mt-4">
              <h2 className="text-label-md font-bold text-on-surface">Rapports hebdomadaires</h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">Bilan de la semaine rédigé par chaque membre.</p>
              <Link to={`/teams/${slug}/weekly-reports`} className="mt-2 inline-block text-body-sm font-medium text-primary hover:underline">
                Ouvrir les rapports hebdomadaires →
              </Link>
            </Card>
          </aside>
        </div>
      )}
    </PageLayout>
  );
}

function ProjectChoice({ row, checked, onToggle }: { row: TeamPerformanceRow; checked: boolean; onToggle: () => void }) {
  const perf = row.performance;
  return (
    <li>
      <label className={`flex h-full cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${checked ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant bg-surface-container-lowest hover:border-primary/40'}`}>
        <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1 h-4 w-4 accent-primary" aria-label={`Inclure ${row.project.name}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-on-surface">{row.project.name}</span>
            {row.project.status !== 'active' && <Badge variant="default">{row.project.status === 'archived' ? 'Archivé' : 'Terminé'}</Badge>}
            <Badge variant={LEVEL_VARIANTS[perf.level]}>{perf.level_label}{perf.score === null ? '' : ` · ${score(perf)}`}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-body-xs text-on-surface-variant">
            <span className="tabular-nums">
              {perf.stats.total} cas · réussite {formatPercent(perf.stats.success_rate)} · avancement {formatPercent(perf.stats.execution_rate)}
            </span>
            {row.evolution.length > 0 && <Sparkline row={row} />}
          </div>
        </div>
      </label>
    </li>
  );
}

/** Score /100 de chaque projet sélectionné (une seule série : une seule couleur), du plus haut au plus bas. */
function ScoreBars({ projects }: { projects: Array<{ id: string; name: string; performance: Performance }> }) {
  const ranked = [...projects].sort((a, b) => (b.performance.score ?? -1) - (a.performance.score ?? -1));
  return (
    <figure aria-label="Score de performance par projet">
      <figcaption className="mb-2 text-label-md font-bold text-on-surface">Score par projet</figcaption>
      <ul className="space-y-2">
        {ranked.map(p => (
          <li key={p.id} className="text-body-xs">
            <div className="flex justify-between gap-2 text-on-surface">
              <span className="truncate">{p.name}</span>
              <span className="shrink-0 font-semibold tabular-nums">{score(p.performance)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--chart-1) 15%, transparent)' }}
                 role="meter" aria-label={p.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.performance.score ?? 0}>
              <div className="h-full rounded-full transition-[width] duration-500"
                   style={{ width: `${p.performance.score ?? 0}%`, backgroundColor: 'var(--chart-1)' }} />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}
