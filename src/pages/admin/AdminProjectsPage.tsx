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
import { PROJECT_STATUS_LABELS } from '../../lib/admin';
import { getApiErrorMessage } from '../../lib/errors';
import { queryKeys } from '../../lib/queryKeys';
import type { AdminProject } from '../../types';

const PAGE_SIZE = 20;

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'default'> = {
  active: 'success',
  archived: 'warning',
  completed: 'default',
};

const VISIBILITY_VARIANTS: Record<string, 'default' | 'primary' | 'success'> = {
  private: 'default',
  team: 'primary',
  public: 'success',
};

const VISIBILITY_LABELS: Record<string, string> = {
  private: 'Privé',
  team: 'Équipe',
  public: 'Public',
};

export default function AdminProjectsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const query = searchParams.get('q') ?? '';
  const status = searchParams.get('status') ?? '';
  const [searchInput, setSearchInput] = useState(query);
  const [deleteProject, setDeleteProject] = useState<AdminProject | null>(null);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.admin.projects(page, status, query),
    queryFn: () => adminApi.listProjects({ search: query, status: status || undefined, page }),
  });

  const projects = data?.results ?? [];

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
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.projectsRoot });
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.summary() });
  };

  const deleteMutation = useMutation({ mutationFn: adminApi.deleteProject, onSuccess: invalidate });

  const handleDelete = () => {
    if (!deleteProject) return;
    deleteMutation.mutate(deleteProject.id, {
      onSuccess: () => {
        toast.success('Projet supprimé.');
        setDeleteProject(null);
      },
      onError: (error) => toast.error('Suppression impossible.', { description: getApiErrorMessage(error) }),
    });
  };

  return (
    <PageLayout>
      <PageHeader
        title="Projets"
        subtitle="Projets de toutes les équipes : visibilité, statut et statistiques."
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
            placeholder="Rechercher un projet…"
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
            { value: 'active', label: 'Actifs' },
            { value: 'archived', label: 'Archivés' },
            { value: 'completed', label: 'Terminés' },
          ]}
        />
      </div>

      {error ? (
        <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : projects.length === 0 ? (
        <EmptyState title="Aucun projet" description="Aucun projet ne correspond à votre recherche." icon={null} />
      ) : (
        <TableWrapper label="Liste des projets">
          <THead>
            <TR>
              <TH>Projet</TH>
              <TH>Équipe</TH>
              <TH>Visibilité</TH>
              <TH>Statut</TH>
              <TH>Tests</TH>
              <TH>Réussite</TH>
              <TH><span className="sr-only">Actions</span></TH>
            </TR>
          </THead>
          <TBody>
            {projects.map((project) => (
              <TR key={project.id}>
                <TD>
                  <span className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-label-sm font-bold text-white"
                      style={{ backgroundColor: project.color || '#1e40af' }}
                    >
                      {project.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-on-surface">{project.name}</span>
                      {project.description && <span className="block truncate text-body-sm text-on-surface-variant">{project.description}</span>}
                    </span>
                  </span>
                </TD>
                <TD>{project.team_name}</TD>
                <TD><Badge variant={VISIBILITY_VARIANTS[project.visibility] ?? 'default'}>{VISIBILITY_LABELS[project.visibility] ?? project.visibility}</Badge></TD>
                <TD><Badge variant={STATUS_VARIANTS[project.status] ?? 'default'}>{PROJECT_STATUS_LABELS[project.status] ?? project.status}</Badge></TD>
                <TD>{project.stats?.total ?? 0}</TD>
                <TD className="font-semibold">{project.stats?.success_rate ?? 0}%</TD>
                <TD>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-error hover:bg-error-container"
                    onClick={() => setDeleteProject(project)}
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
        ariaLabel="Pagination des projets"
      />

      <ConfirmDialog
        open={!!deleteProject}
        title="Supprimer ce projet ?"
        description={deleteProject ? `« ${deleteProject.name} » et tous ses cas de test seront supprimés définitivement.` : ''}
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
        error={getApiErrorMessage(deleteMutation.error, '')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteProject(null)}
      />
    </PageLayout>
  );
}