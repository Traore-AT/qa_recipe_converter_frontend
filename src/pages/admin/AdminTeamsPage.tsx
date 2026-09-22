import { useState, type FormEvent } from 'react';
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
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { TBody, TD, TH, THead, TR, TableWrapper } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import { formatDate, getInitial } from '../../lib/admin';
import { getApiErrorMessage } from '../../lib/errors';
import { queryKeys } from '../../lib/queryKeys';
import type { AdminTeam } from '../../types';

const PAGE_SIZE = 20;

export default function AdminTeamsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const query = searchParams.get('q') ?? '';
  const [searchInput, setSearchInput] = useState(query);

  const [transferTeam, setTransferTeam] = useState<AdminTeam | null>(null);
  const [transferUserId, setTransferUserId] = useState<string>('');
  const [deleteTeam, setDeleteTeam] = useState<AdminTeam | null>(null);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.admin.teams(page, query),
    queryFn: () => adminApi.listTeams({ search: query, page }),
  });

  const teams = data?.results ?? [];

  const applyQuery = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set('q', next);
    else params.delete('q');
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
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.teamsRoot });
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.summary() });
  };

  const transferMutation = useMutation({
    mutationFn: ({ slug, userId }: { slug: string; userId: number }) => adminApi.transferTeam(slug, userId),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({ mutationFn: adminApi.deleteTeam, onSuccess: invalidate });

  const handleTransfer = (event: FormEvent) => {
    event.preventDefault();
    if (!transferTeam || !transferUserId) return;
    transferMutation.mutate(
      { slug: transferTeam.slug, userId: Number(transferUserId) },
      {
        onSuccess: () => {
          toast.success('Propriété transférée.');
          setTransferTeam(null);
          setTransferUserId('');
        },
        onError: (error) => toast.error('Transfert impossible.', { description: getApiErrorMessage(error) }),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTeam) return;
    deleteMutation.mutate(deleteTeam.slug, {
      onSuccess: () => {
        toast.success('Équipe supprimée.');
        setDeleteTeam(null);
      },
      onError: (error) => toast.error('Suppression impossible.', { description: getApiErrorMessage(error) }),
    });
  };

  const transferCandidates = (transferTeam?.members ?? []).filter((member) => member.id !== transferTeam?.owner.id);

  return (
    <PageLayout>
      <PageHeader
        title="Équipes"
        subtitle="Organisation des équipes et transfert de propriété."
      />

      <form
        className="mb-6 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          applyQuery(searchInput.trim());
        }}
      >
        <Input
          className="lg:max-w-sm"
          placeholder="Rechercher une équipe…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <Button type="submit" variant="secondary">Rechercher</Button>
      </form>

      {error ? (
        <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : teams.length === 0 ? (
        <EmptyState title="Aucune équipe" description="Aucune équipe ne correspond à votre recherche." icon={null} />
      ) : (
        <TableWrapper label="Liste des équipes">
          <THead>
            <TR>
              <TH>Équipe</TH>
              <TH>Propriétaire</TH>
              <TH>Membres</TH>
              <TH>Projets</TH>
              <TH>Créée le</TH>
              <TH><span className="sr-only">Actions</span></TH>
            </TR>
          </THead>
          <TBody>
            {teams.map((team) => (
              <TR key={team.id}>
                <TD>
                  <span className="block truncate font-semibold text-on-surface">{team.name}</span>
                  {team.description && <span className="block truncate text-body-sm text-on-surface-variant">{team.description}</span>}
                </TD>
                <TD>
                  <span className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-sm font-semibold text-primary">
                      {getInitial(team.owner.full_name || team.owner.username)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-on-surface">{team.owner.full_name || team.owner.username}</span>
                      <span className="block truncate text-body-sm text-on-surface-variant">@{team.owner.username}</span>
                    </span>
                  </span>
                </TD>
                <TD><Badge variant="default">{team.members_count} membre{team.members_count !== 1 ? 's' : ''}</Badge></TD>
                <TD>{team.projects_count}</TD>
                <TD className="whitespace-nowrap">{formatDate(team.created_at)}</TD>
                <TD>
                  <span className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={team.members_count <= 1}
                      onClick={() => {
                        setTransferTeam(team);
                        setTransferUserId('');
                      }}
                    >
                      Transférer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-error hover:bg-error-container"
                      onClick={() => setDeleteTeam(team)}
                    >
                      Supprimer
                    </Button>
                  </span>
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
        ariaLabel="Pagination des équipes"
      />

      <Modal open={!!transferTeam} onClose={() => setTransferTeam(null)} labelledBy="transfer-team-title" describedBy="transfer-team-desc">
        <form onSubmit={handleTransfer} className="space-y-4" noValidate>
          <h2 id="transfer-team-title" className="text-headline-sm font-bold text-on-surface">Transférer la propriété</h2>
          <p id="transfer-team-desc" className="text-body-base text-on-surface-variant">
            {transferTeam ? `Le nouveau propriétaire de « ${transferTeam.name} » doit déjà être membre de l'équipe.` : ''}
          </p>
          <Select
            label="Nouveau propriétaire"
            value={transferUserId}
            onChange={(event) => setTransferUserId(event.target.value)}
            options={[
              { value: '', label: '— Choisir un membre —' },
              ...(transferCandidates ?? []).map((member) => ({
                value: String(member.id),
                label: member.full_name || member.username,
              })),
            ]}
            required
          />
          {transferMutation.error && (
            <p className="text-body-sm text-error" role="alert">{getApiErrorMessage(transferMutation.error)}</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setTransferTeam(null)}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={transferMutation.isPending} disabled={!transferUserId}>
              Transférer
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTeam}
        title="Supprimer cette équipe ?"
        description={deleteTeam ? `« ${deleteTeam.name} » et tous ses projets seront supprimés définitivement.` : ''}
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
        error={getApiErrorMessage(deleteMutation.error, '')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTeam(null)}
      />
    </PageLayout>
  );
}