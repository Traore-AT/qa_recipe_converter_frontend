import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { conversionApi } from '../api/conversion';
import { useAuth } from '../context/AuthContext';
import { PageLayout } from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { StatusPill } from '../components/ui/StatusPill';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { SkeletonList } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { useToast } from '../components/ui/Toast';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { invalidateJobs, queryKeys } from '../lib/queryKeys';
import { getApiErrorMessage } from '../lib/errors';

const PAGE_SIZE = 20;

export default function RecipesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('q') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const [searchDraft, setSearchDraft] = useState(search);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const toast = useToast();
  const { user } = useAuth();
  const isAnonymous = !user;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.jobs.list(page),
    queryFn: () => conversionApi.listJobs(page),
  });

  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => conversionApi.deleteJob(jobId),
    onSuccess: () => {
      invalidateJobs(queryClient);
      setDeleteTarget(null);
      setDeleteError('');
      toast.success('Recette supprimée');
    },
    onError: (err) => {
      const message = getApiErrorMessage(err, 'Impossible de supprimer cette recette.');
      setDeleteError(message);
      toast.error('Suppression impossible', { description: message });
    },
  });

  // Recherche différée : évite de recalculer le filtre à chaque frappe
  const debouncedSearch = useDebouncedValue(search, 250);
  const jobs = useMemo(
    () =>
      (data?.results ?? []).filter((job) =>
        job.source_filename.toLowerCase().includes(debouncedSearch.toLowerCase()),
      ),
    [data?.results, debouncedSearch],
  );

  const handleSearchChange = (value: string) => {
    setSearchDraft(value);
    // Le paramètre d'URL est la source de vérité (partagé avec le Topbar)
    const next = new URLSearchParams(searchParams);
    if (value) next.set('q', value); else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const handlePageChange = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(next));
    setSearchParams(params);
    window.scrollTo({ top: 0 });
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget);
  };

  return (
    <PageLayout>
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary transition-colors mb-3 cursor-pointer">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Retour
        </button>
        <h1 className="text-headline-lg font-bold text-on-surface">Recettes</h1>
        <p className="text-body-base text-on-surface-variant mt-1">
          {data?.count || 0} recette{(data?.count || 0) !== 1 ? 's' : ''} importée{(data?.count || 0) !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="relative mb-6 max-w-md">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="search"
          value={searchDraft}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Rechercher une recette..."
          aria-label="Rechercher une recette par nom de fichier"
          className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-lg text-body-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-surface-container-lowest"
        />
      </div>

      {isError ? (
        <ErrorState
          title="Impossible de charger les recettes"
          message={getApiErrorMessage(error, 'Erreur lors du chargement des recettes.')}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <SkeletonList rows={4} />
      ) : jobs.length === 0 ? (
        <EmptyState
          title={isAnonymous && !search ? 'Connectez-vous pour retrouver vos recettes' : search ? 'Aucune recette trouvée' : 'Aucune recette'}
          description={
            isAnonymous && !search
              ? 'Créez un compte ou connectez-vous pour retrouver vos fichiers de conversion.'
              : search
                ? 'Essayez un autre terme de recherche.'
                : 'Convertissez un fichier Word pour créer votre première recette.'
          }
          icon={
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm2 0v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2zm0 4h5v2H8v-2z" />
            </svg>
          }
          action={
            !search &&
            (isAnonymous ? (
              <Link
                to="/login"
                className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-4 py-2.5 text-label-sm font-medium text-on-primary transition-all hover:brightness-110"
              >
                Se connecter
              </Link>
            ) : (
              <Link
                to="/convert"
                className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-4 py-2.5 text-label-sm font-medium text-on-primary transition-all hover:brightness-110"
              >
                + Convertir un fichier
              </Link>
            ))
          }
        />
      ) : (
        <div className="grid gap-3">
          {jobs.map(job => (
            <div key={job.id} className="group relative">
              <Link to={`/preview/${job.id}`} className="block">
                <Card hover className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-3 17H7v-2h4v2zm6-4H7v-2h10v2zm-2-7V3.5L18.5 9H15z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-base font-semibold text-on-surface truncate">{job.source_filename}</p>
                    <p className="text-body-sm text-on-surface-variant">
                      {new Date(job.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      <span className="mx-1.5">·</span>
                      {job.use_cases_count} cas de test
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusPill status={job.status} />
                    <svg className="w-5 h-5 text-on-surface-variant" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                    </svg>
                  </div>
                </Card>
              </Link>
              <button
                onClick={e => { e.preventDefault(); setDeleteTarget(job.id); }}
                className="absolute top-2 right-2 w-11 h-11 rounded-lg bg-surface/80 backdrop-blur-sm border border-outline-variant/40 flex items-center justify-center opacity-0 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 transition-all hover:bg-error-container hover:border-error/50 cursor-pointer z-10"
                title="Supprimer cette recette"
                aria-label={`Supprimer la recette ${job.source_filename}`}
              >
                <svg className="w-4 h-4 text-on-surface-variant group-hover:text-error" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Confirmation de suppression (modale accessible) */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer cette recette ?"
        description="Cette action est irréversible. Tous les cas de test associés seront supprimés."
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setDeleteTarget(null); setDeleteError(''); }}
      />

      {/* Pagination (DRF : 20 recettes par page) */}
      {!search && (
        <Pagination
          page={page}
          count={data?.count || 0}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          isFetching={isFetching}
        />
      )}

    </PageLayout>
  );
}
