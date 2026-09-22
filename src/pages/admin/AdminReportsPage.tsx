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
import { formatDate, formatDateTime, getInitial, REPORT_STATUS_LABELS } from '../../lib/admin';
import { getApiErrorMessage } from '../../lib/errors';
import { queryKeys } from '../../lib/queryKeys';
import type { AdminReport } from '../../types';

const PAGE_SIZE = 20;

const REPORT_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  draft: 'default',
  submitted: 'success',
};

export default function AdminReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const query = searchParams.get('q') ?? '';
  const status = searchParams.get('status') ?? '';
  const [searchInput, setSearchInput] = useState(query);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.admin.reports(page, status, query),
    queryFn: () => adminApi.listReports({ search: query, status: status || undefined, page }),
  });

  const reports = data?.results ?? [];

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
        title="Rapports hebdomadaires"
        subtitle="Soumissions hebdomadaires des membres, toutes équipes confondues."
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
            placeholder="Rechercher un membre ou une équipe…"
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
            ...Object.entries(REPORT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>

      {error ? (
        <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : reports.length === 0 ? (
        <EmptyState title="Aucun rapport" description="Aucun rapport hebdomadaire ne correspond à votre recherche." icon={null} />
      ) : (
        <TableWrapper label="Liste des rapports hebdomadaires">
          <THead>
            <TR>
              <TH>Membre</TH>
              <TH>Équipe</TH>
              <TH>Semaine</TH>
              <TH>Statut</TH>
              <TH>Soumis le</TH>
            </TR>
          </THead>
          <TBody>
            {reports.map((report: AdminReport) => (
              <TR key={report.id}>
                <TD>
                  <span className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-sm font-semibold text-primary">
                      {getInitial(report.user.full_name || report.user.username)}
                    </span>
                    <span className="block truncate">{report.user.full_name || report.user.username}</span>
                  </span>
                </TD>
                <TD>
                  <span className="block truncate">{report.team_name}</span>
                </TD>
                <TD className="whitespace-nowrap">
                  Semaine du {formatDate(report.week_start)}
                </TD>
                <TD>
                  <Badge variant={REPORT_VARIANT[report.status] ?? 'default'}>
                    {REPORT_STATUS_LABELS[report.status] ?? report.status}
                  </Badge>
                </TD>
                <TD className="whitespace-nowrap">
                  {report.submitted_at ? formatDateTime(report.submitted_at) : <span className="text-on-surface-variant">—</span>}
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
        ariaLabel="Pagination des rapports"
      />
    </PageLayout>
  );
}