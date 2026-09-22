import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { PageLayout } from '../../components/layout/PageLayout';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input, Select } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { TBody, TD, TH, THead, TR, TableWrapper } from '../../components/ui/Table';
import { formatDate, SPRINT_STATUS_LABELS } from '../../lib/admin';
import { getApiErrorMessage } from '../../lib/errors';
import { queryKeys } from '../../lib/queryKeys';
import type { AdminSprint } from '../../types';

const PAGE_SIZE = 20;

const SPRINT_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  planned: 'default',
  active: 'info',
  completed: 'success',
  closed: 'default',
};

export default function AdminSprintsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const query = searchParams.get('q') ?? '';
  const status = searchParams.get('status') ?? '';
  const [searchInput, setSearchInput] = useState(query);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.admin.sprints(page, status, query),
    queryFn: () => adminApi.listSprints({ search: query, status: status || undefined, page }),
  });

  const sprints = data?.results ?? [];

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

  return (
    <PageLayout>
      <PageHeader
        title="Sprints"
        subtitle="Tous les sprints des projets, avec leur progression de tests."
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
            placeholder="Rechercher un sprint…"
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
            ...Object.entries(SPRINT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>

      {error ? (
        <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : sprints.length === 0 ? (
        <EmptyState title="Aucun sprint" description="Aucun sprint ne correspond à votre recherche." icon={null} />
      ) : (
        <TableWrapper label="Liste des sprints">
          <THead>
            <TR>
              <TH>Nom</TH>
              <TH>Projet / Équipe</TH>
              <TH>Statut</TH>
              <TH>Période</TH>
              <TH>Durée</TH>
              <TH>Progression</TH>
            </TR>
          </THead>
          <TBody>
            {sprints.map((sprint: AdminSprint) => (
              <TR key={sprint.id}>
                <TD>
                  <span className="block max-w-xs truncate font-semibold text-on-surface" title={sprint.name}>
                    {sprint.name}
                  </span>
                  {sprint.goal && <span className="block max-w-xs truncate text-body-sm text-on-surface-variant" title={sprint.goal}>{sprint.goal}</span>}
                </TD>
                <TD>
                  <span className="block truncate">{sprint.project_name}</span>
                  <span className="block truncate text-body-sm text-on-surface-variant">{sprint.team_name}</span>
                </TD>
                <TD>
                  <Badge variant={SPRINT_VARIANT[sprint.status] ?? 'default'}>{SPRINT_STATUS_LABELS[sprint.status] ?? sprint.status}</Badge>
                </TD>
                <TD className="whitespace-nowrap">
                  {formatDate(sprint.start_date)} → {formatDate(sprint.end_date)}
                </TD>
                <TD>{sprint.duration_days} j</TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-container-high">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${sprint.stats.progress_pct ?? 0}%` }}
                      />
                    </div>
                    <span className="whitespace-nowrap text-body-sm text-on-surface-variant">
                      {sprint.stats.passed}/{sprint.stats.total} · {sprint.stats.progress_pct ?? 0}%
                    </span>
                  </div>
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
        ariaLabel="Pagination des sprints"
      />
    </PageLayout>
  );
}