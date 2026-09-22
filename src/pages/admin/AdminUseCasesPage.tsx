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
import { getApiErrorMessage } from '../../lib/errors';
import { queryKeys } from '../../lib/queryKeys';
import { UC_STATUS_LABELS } from '../../lib/admin';
import type { AdminUseCase } from '../../types';

const PAGE_SIZE = 20;

const UC_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  'Passé': 'success',
  'Échoué': 'error',
  'Bloqué': 'warning',
  'En cours': 'info',
  'À tester': 'default',
};

export default function AdminUseCasesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const query = searchParams.get('q') ?? '';
  const status = searchParams.get('status') ?? '';
  const automated = searchParams.get('automated') ?? '';
  const [searchInput, setSearchInput] = useState(query);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.admin.useCases(page, status, query),
    queryFn: () => adminApi.listUseCases({ search: query, status: status || undefined, automated: automated || undefined, page }),
  });

  const useCases = data?.results ?? [];

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
        title="Cas de test extraits"
        subtitle="Vue globale des use cases extraits des recettes, sur tout le système."
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
            placeholder="Rechercher un cas…"
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
            ...Object.entries(UC_STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
        <Select
          label="Automatisé"
          className="min-w-40"
          value={automated}
          onChange={(event) => applyParams({ automated: event.target.value })}
          options={[
            { value: '', label: 'Tous' },
            { value: 'true', label: 'Automatisés' },
            { value: 'false', label: 'Manuels' },
          ]}
        />
      </div>

      {error ? (
        <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : useCases.length === 0 ? (
        <EmptyState title="Aucun cas de test" description="Aucun cas extrait ne correspond à votre recherche." icon={null} />
      ) : (
        <TableWrapper label="Liste des cas de test extraits">
          <THead>
            <TR>
              <TH>UC</TH>
              <TH>Description</TH>
              <TH>Statut</TH>
              <TH>Automatisé</TH>
              <TH>Source</TH>
              <TH>Projet / Équipe</TH>
              <TH>Affecté à</TH>
            </TR>
          </THead>
          <TBody>
            {useCases.map((uc: AdminUseCase) => (
              <TR key={uc.id}>
                <TD className="whitespace-nowrap">UC#{uc.order}</TD>
                <TD>
                  <span className="block max-w-md truncate font-semibold text-on-surface" title={uc.use_case_text}>
                    {uc.use_case_text || 'Sans description'}
                  </span>
                </TD>
                <TD>
                  <Badge variant={UC_VARIANT[uc.status] ?? 'default'}>{UC_STATUS_LABELS[uc.status] ?? uc.status}</Badge>
                </TD>
                <TD>
                  <Badge variant={uc.is_automated ? 'info' : 'default'}>{uc.is_automated ? 'Oui' : 'Non'}</Badge>
                </TD>
                <TD>
                  <span className="block max-w-xs truncate" title={uc.source_filename ?? undefined}>{uc.source_filename ?? '—'}</span>
                </TD>
                <TD>
                  <span className="block truncate">{uc.project_name ?? '—'}</span>
                  {uc.team_name && <span className="block truncate text-body-sm text-on-surface-variant">{uc.team_name}</span>}
                </TD>
                <TD>
                  {uc.assigned_users.length > 0
                    ? <span className="block max-w-40 truncate">{uc.assigned_users.join(', ')}</span>
                    : <span className="text-on-surface-variant">—</span>}
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
        ariaLabel="Pagination des cas de test"
      />
    </PageLayout>
  );
}