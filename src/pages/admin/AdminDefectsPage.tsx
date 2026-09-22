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
import { formatDateTime, getInitial, DEFECT_SEVERITY_LABELS, DEFECT_STATUS_LABELS } from '../../lib/admin';
import { getApiErrorMessage } from '../../lib/errors';
import { queryKeys } from '../../lib/queryKeys';
import type { AdminDefect } from '../../types';

const PAGE_SIZE = 20;

const SEVERITY_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  critical: 'error',
  major: 'warning',
  minor: 'info',
  trivial: 'default',
};

const STATUS_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  open: 'error',
  reopened: 'error',
  in_progress: 'info',
  resolved: 'success',
  closed: 'default',
};

export default function AdminDefectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const query = searchParams.get('q') ?? '';
  const status = searchParams.get('status') ?? '';
  const severity = searchParams.get('severity') ?? '';
  const [searchInput, setSearchInput] = useState(query);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.admin.defects(page, status, severity, query),
    queryFn: () => adminApi.listDefects({
      search: query, status: status || undefined, severity: severity || undefined, page,
    }),
  });

  const defects = data?.results ?? [];

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
        title="Anomalies"
        subtitle="Vue globale des anomalies remontées sur tous les projets."
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
            placeholder="Rechercher une anomalie…"
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
            ...Object.entries(DEFECT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
        <Select
          label="Sévérité"
          className="min-w-40"
          value={severity}
          onChange={(event) => applyParams({ severity: event.target.value })}
          options={[
            { value: '', label: 'Toutes' },
            ...Object.entries(DEFECT_SEVERITY_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>

      {error ? (
        <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : defects.length === 0 ? (
        <EmptyState title="Aucune anomalie" description="Aucune anomalie ne correspond à votre recherche." icon={null} />
      ) : (
        <TableWrapper label="Liste des anomalies">
          <THead>
            <TR>
              <TH>Titre</TH>
              <TH>Projet / Équipe</TH>
              <TH>UC</TH>
              <TH>Sévérité</TH>
              <TH>Statut</TH>
              <TH>Signalé par</TH>
              <TH>Créée le</TH>
            </TR>
          </THead>
          <TBody>
            {defects.map((defect: AdminDefect) => (
              <TR key={defect.id}>
                <TD>
                  <span className="block max-w-md truncate font-semibold text-on-surface" title={defect.title}>
                    {defect.title}
                  </span>
                </TD>
                <TD>
                  <span className="block truncate">{defect.project_name}</span>
                  <span className="block truncate text-body-sm text-on-surface-variant">{defect.team_name}</span>
                </TD>
                <TD>
                  {defect.use_case_order != null
                    ? <span className="whitespace-nowrap">UC#{defect.use_case_order}</span>
                    : <span className="text-on-surface-variant">—</span>}
                </TD>
                <TD>
                  <Badge variant={SEVERITY_VARIANT[defect.severity] ?? 'default'}>
                    {DEFECT_SEVERITY_LABELS[defect.severity] ?? defect.severity}
                  </Badge>
                </TD>
                <TD>
                  <Badge variant={STATUS_VARIANT[defect.status] ?? 'default'}>
                    {DEFECT_STATUS_LABELS[defect.status] ?? defect.status}
                  </Badge>
                </TD>
                <TD>
                  <span className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-sm font-semibold text-primary">
                      {getInitial(defect.reported_by.full_name || defect.reported_by.username)}
                    </span>
                    <span className="block truncate">{defect.reported_by.full_name || defect.reported_by.username}</span>
                  </span>
                </TD>
                <TD className="whitespace-nowrap">{formatDateTime(defect.created_at)}</TD>
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
        ariaLabel="Pagination des anomalies"
      />
    </PageLayout>
  );
}