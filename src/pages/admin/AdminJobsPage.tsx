import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { PageLayout } from '../../components/layout/PageLayout';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input, Select } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { TBody, TD, TH, THead, TR, TableWrapper } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import { formatDateTime, getInitial, JOB_STATUS_LABELS } from '../../lib/admin';
import { getApiErrorMessage } from '../../lib/errors';
import { queryKeys } from '../../lib/queryKeys';
import type { AdminJob } from '../../types';

const PAGE_SIZE = 20;

const JOB_VARIANT: Record<string, 'success' | 'error' | 'info' | 'default'> = {
  PENDING: 'default',
  PROCESSING: 'info',
  DONE: 'success',
  ERROR: 'error',
};

export default function AdminJobsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const query = searchParams.get('q') ?? '';
  const status = searchParams.get('status') ?? '';
  const [searchInput, setSearchInput] = useState(query);
  const [deleteJob, setDeleteJob] = useState<AdminJob | null>(null);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.admin.jobs(page, status, query),
    queryFn: () => adminApi.listJobs({ search: query, status: status || undefined, page }),
  });

  const jobs = data?.results ?? [];

  const applyParams = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(next));
    setSearchParams(params);
    window.scrollTo({ top: 0 });
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.jobsRoot });
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.summary() });
  };

  const deleteMutation = useMutation({ mutationFn: adminApi.deleteJob, onSuccess: invalidate });

  const handleDelete = () => {
    if (!deleteJob) return;
    deleteMutation.mutate(deleteJob.id, {
      onSuccess: () => {
        toast.success('Conversion supprimée.');
        setDeleteJob(null);
      },
      onError: (error) => toast.error('Suppression impossible.', { description: getApiErrorMessage(error) }),
    });
  };

  return (
    <PageLayout>
      <PageHeader
        title="Conversions"
        subtitle="Tâches de conversion de fichiers : état, cas extraits et erreurs."
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            applyParams({ q: searchInput.trim() });
          }}
        >
          <Input
            className="lg:max-w-sm"
            placeholder="Rechercher un fichier…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Button type="submit" variant="secondary">Rechercher</Button>
        </form>
        <Select
          label="Statut"
          className="min-w-40"
          value={status}
          onChange={(event) => applyParams({ status: event.target.value })}
          options={[
            { value: '', label: 'Tous' },
            { value: 'PENDING', label: 'En attente' },
            { value: 'PROCESSING', label: 'En cours' },
            { value: 'DONE', label: 'Terminé' },
            { value: 'ERROR', label: 'Erreur' },
          ]}
        />
      </div>

      {error ? (
        <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : jobs.length === 0 ? (
        <EmptyState title="Aucune conversion" description="Aucune conversion ne correspond à votre recherche." icon={null} />
      ) : (
        <TableWrapper label="Liste des conversions">
          <THead>
            <TR>
              <TH>Fichier</TH>
              <TH>Projet</TH>
              <TH>Utilisateur</TH>
              <TH>Statut</TH>
              <TH>Cas extraits</TH>
              <TH>Soumis le</TH>
              <TH><span className="sr-only">Actions</span></TH>
            </TR>
          </THead>
          <TBody>
            {jobs.map((job) => (
              <TR key={job.id}>
                <TD>
                  <span className="block max-w-xs truncate font-semibold text-on-surface" title={job.source_filename}>
                    {job.source_filename}
                  </span>
                  {job.error_message && (
                    <span className="block max-w-xs truncate text-body-sm text-error" title={job.error_message}>
                      {job.error_message}
                    </span>
                  )}
                </TD>
                <TD>
                  <span className="block truncate">{job.project_name ?? '—'}</span>
                  {job.team_name && <span className="block truncate text-body-sm text-on-surface-variant">{job.team_name}</span>}
                </TD>
                <TD>
                  <span className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-sm font-semibold text-primary">
                      {getInitial(job.uploaded_by.full_name || job.uploaded_by.username)}
                    </span>
                    <span className="block truncate">{job.uploaded_by.full_name || job.uploaded_by.username}</span>
                  </span>
                </TD>
                <TD>
                  <Badge variant={JOB_VARIANT[job.status] ?? 'default'}>{JOB_STATUS_LABELS[job.status] ?? job.status}</Badge>
                </TD>
                <TD>{job.use_cases_count}</TD>
                <TD className="whitespace-nowrap">{formatDateTime(job.created_at)}</TD>
                <TD>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-error hover:bg-error-container"
                    onClick={() => setDeleteJob(job)}
                  >
                    Supprimer
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </TableWrapper>
      )}

      <Pagination
        page={page}
        count={data?.count ?? 0}
        pageSize={PAGE_SIZE}
        isFetching={isFetching}
        onPageChange={handlePageChange}
        ariaLabel="Pagination des conversions"
      />

      <ConfirmDialog
        open={!!deleteJob}
        title="Supprimer cette conversion ?"
        description={deleteJob ? `« ${deleteJob.source_filename} » et son historique seront supprimés définitivement.` : ''}
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
        error={getApiErrorMessage(deleteMutation.error, '')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteJob(null)}
      />
    </PageLayout>
  );
}