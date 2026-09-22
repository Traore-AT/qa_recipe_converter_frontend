import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { PageLayout } from '../../components/layout/PageLayout';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { TBody, TD, TH, THead, TR, TableWrapper } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { formatDate, getInitial } from '../../lib/admin';
import { getApiErrorMessage } from '../../lib/errors';
import { queryKeys } from '../../lib/queryKeys';
import type { AdminUser, ResetPasswordResponse } from '../../types';

const PAGE_SIZE = 20;

const accessBadge = (user: AdminUser) => {
  if (user.is_superuser) return <Badge variant="primary">Super admin</Badge>;
  if (user.is_staff) return <Badge variant="default">Staff</Badge>;
  return <Badge variant="default">Membre</Badge>;
};

const accessButtonLabel = (user: AdminUser) => {
  if (!user.is_staff) return 'Promouvoir';
  if (!user.is_superuser) return 'Rendre admin';
  return 'Retirer admin';
};

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const active = searchParams.get('active') ?? '';
  const staff = searchParams.get('staff') ?? '';
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');

  const [createOpen, setCreateOpen] = useState(false);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [resetResult, setResetResult] = useState<ResetPasswordResponse | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [demoteUser, setDemoteUser] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  const query = searchParams.get('q') ?? '';

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.admin.users(page, { search: query, active, staff }),
    queryFn: () => adminApi.listUsers({ search: query, active, staff: staff || undefined, page }),
  });

  const users = data?.results ?? [];

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
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.usersRoot });
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.summary() });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => adminApi.updateUser(id, data),
    onSuccess: invalidate,
  });

  const handleToggleActive = (user: AdminUser) => {
    updateMutation.mutate(
      { id: user.id, data: { is_active: !user.is_active } },
      {
        onSuccess: () => toast.success(user.is_active ? 'Compte désactivé.' : 'Compte réactivé.'),
        onError: (error) => toast.error('Mise à jour impossible.', { description: getApiErrorMessage(error) }),
      },
    );
  };

  const handleAccess = (user: AdminUser) => {
    if (user.is_superuser) {
      setDemoteUser(user);
      return;
    }
    updateMutation.mutate(
      { id: user.id, data: user.is_staff ? { is_superuser: true } : { is_staff: true } },
      {
        onSuccess: () => toast.success('Accès mis à jour.'),
        onError: (error) => toast.error('Mise à jour impossible.', { description: getApiErrorMessage(error) }),
      },
    );
  };

  const createMutation = useMutation({ mutationFn: adminApi.createUser, onSuccess: invalidate });
  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password?: string }) => adminApi.resetUserPassword(id, password),
  });
  const deleteMutation = useMutation({ mutationFn: adminApi.deleteUser, onSuccess: invalidate });

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      username: String(form.get('username') ?? ''),
      email: String(form.get('email') ?? ''),
      first_name: String(form.get('first_name') ?? ''),
      last_name: String(form.get('last_name') ?? ''),
      is_superuser: form.get('is_superuser') === 'on',
    };
    const password = String(form.get('password') ?? '');
    if (password) payload.password = password;

    createMutation.mutate(payload, {
      onSuccess: (created) => {
        toast.success(`Utilisateur « ${created.username} » créé.`);
        setCreateOpen(false);
      },
      onError: (error) => toast.error('Création impossible.', { description: getApiErrorMessage(error) }),
    });
  };

  const handleReset = () => {
    if (!resetUser) return;
    resetMutation.mutate({ id: resetUser.id, password: resetPassword || undefined }, {
      onSuccess: (result) => {
        setResetUser(null);
        setResetResult(result);
      },
      onError: (error) => toast.error('Réinitialisation impossible.', { description: getApiErrorMessage(error) }),
    });
  };

  const handleDelete = () => {
    if (!deleteUser) return;
    deleteMutation.mutate(deleteUser.id, {
      onSuccess: () => {
        toast.success('Utilisateur supprimé.');
        setDeleteUser(null);
      },
      onError: (error) => toast.error('Suppression impossible.', { description: getApiErrorMessage(error) }),
    });
  };

  const dismissResult = () => {
    setResetResult(null);
    setResetPassword('');
  };

  return (
    <PageLayout>
      <PageHeader
        title="Gestion des utilisateurs"
        subtitle="Comptes, accès et rôles de l'ensemble de la plateforme."
      />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            applyParams({ q: searchInput.trim() });
          }}
        >
          <Input
            className="lg:max-w-sm"
            placeholder="Rechercher un utilisateur…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Button type="submit" variant="secondary">Rechercher</Button>
        </form>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Statut"
            className="min-w-32"
            value={active}
            onChange={(event) => applyParams({ active: event.target.value })}
            options={[
              { value: '', label: 'Tous' },
              { value: 'true', label: 'Actifs' },
              { value: 'false', label: 'Désactivés' },
            ]}
          />
          <Select
            label="Accès"
            className="min-w-32"
            value={staff}
            onChange={(event) => applyParams({ staff: event.target.value })}
            options={[
              { value: '', label: 'Tous' },
              { value: 'true', label: 'Staff' },
              { value: 'false', label: 'Membres' },
            ]}
          />
          <Button variant="primary" icon={<span aria-hidden="true">+</span>} onClick={() => setCreateOpen(true)}>
            Nouvel utilisateur
          </Button>
        </div>
      </div>

      {error ? (
        <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <SkeletonTable rows={8} columns={7} />
      ) : (
        <TableWrapper label="Liste des utilisateurs">
          <THead>
            <TR>
              <TH>Utilisateur</TH>
              <TH>Statut</TH>
              <TH>Accès</TH>
              <TH>Équipes</TH>
              <TH>Projets</TH>
              <TH>Inscrit le</TH>
              <TH><span className="sr-only">Actions</span></TH>
            </TR>
          </THead>
          <TBody>
            {users.map((user) => (
              <TR key={user.id}>
                <TD>
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-sm font-semibold text-primary">
                      {getInitial(user.full_name || user.username)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-on-surface">{user.full_name || user.username}</span>
                      <span className="block truncate text-body-sm text-on-surface-variant">{user.email || `@${user.username}`}</span>
                    </span>
                  </span>
                </TD>
                <TD>
                  {user.is_active ? (
                    <Badge variant="success">Actif</Badge>
                  ) : (
                    <Badge variant="default">Désactivé</Badge>
                  )}
                </TD>
                <TD>{accessBadge(user)}</TD>
                <TD>{user.teams_count}</TD>
                <TD>{user.projects_count}</TD>
                <TD className="whitespace-nowrap">{formatDate(user.date_joined)}</TD>
                <TD>
                  <span className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={currentUser?.id === user.id}
                      onClick={() => handleToggleActive(user)}
                    >
                      {user.is_active ? 'Désactiver' : 'Activer'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={currentUser?.id === user.id}
                      onClick={() => handleAccess(user)}
                    >
                      {accessButtonLabel(user)}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setResetUser(user); setResetPassword(''); }}>
                      Mot de passe
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-error hover:bg-error-container"
                      disabled={currentUser?.id === user.id}
                      onClick={() => setDeleteUser(user)}
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
        ariaLabel="Pagination des utilisateurs"
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} labelledBy="create-user-title" maxWidth="max-w-lg">
        <h2 id="create-user-title" className="text-headline-sm font-bold text-on-surface mb-4">Nouvel utilisateur</h2>
        <form onSubmit={handleCreate} className="space-y-4" noValidate>
          <Input name="username" label="Identifiant *" required autoFocus />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input name="first_name" label="Prénom" />
            <Input name="last_name" label="Nom" />
          </div>
          <Input name="email" label="Adresse e-mail *" type="email" required />
          <Input name="password" label="Mot de passe" type="password" hint="Laissé vide : accès en attente de réinitialisation." />
          <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            <input name="is_superuser" type="checkbox" className="h-4 w-4 accent-primary" />
            Accorder le rôle super-admin
          </label>
          {createMutation.error && (
            <p className="text-body-sm text-error" role="alert">{getApiErrorMessage(createMutation.error)}</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={createMutation.isPending}>Créer l'utilisateur</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resetUser} onClose={() => setResetUser(null)} labelledBy="reset-password-title" describedBy="reset-password-desc">
        <h2 id="reset-password-title" className="text-headline-sm font-bold text-on-surface mb-2">Réinitialiser le mot de passe</h2>
        <p id="reset-password-desc" className="text-body-base text-on-surface-variant mb-4">
          {resetUser ? `Un nouveau mot de passe sera généré pour « ${resetUser.username} ».` : ''}
          Laissez le champ vide pour générer automatiquement un mot de passe temporaire.
        </p>
        <Input
          label="Nouveau mot de passe (facultatif)"
          type="password"
          placeholder="Laisser vide pour générer"
          value={resetPassword}
          onChange={(event) => setResetPassword(event.target.value)}
        />
        {resetMutation.error && (
          <p className="text-body-sm text-error" role="alert">{getApiErrorMessage(resetMutation.error)}</p>
        )}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => setResetUser(null)}>Annuler</Button>
          <Button type="button" className="flex-1" loading={resetMutation.isPending} onClick={handleReset}>Réinitialiser</Button>
        </div>
      </Modal>

      <Modal open={!!resetResult} onClose={dismissResult} labelledBy="reset-result-title" maxWidth="max-w-md">
        <h2 id="reset-result-title" className="text-headline-sm font-bold text-on-surface mb-2">Mot de passe réinitialisé</h2>
        <p className="text-body-base text-on-surface-variant mb-4">{resetResult?.detail}</p>
        {resetResult?.temp_password && (
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
            <p className="text-label-sm uppercase tracking-wide text-on-surface-variant mb-1">Mot de passe temporaire</p>
            <code className="block break-all text-body-base font-semibold text-on-surface select-all">{resetResult.temp_password}</code>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => {
                navigator.clipboard?.writeText(resetResult.temp_password ?? '').catch(() => undefined);
                toast.success('Mot de passe copié.');
              }}
            >
              Copier
            </Button>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button onClick={dismissResult}>Fermer</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteUser}
        title="Supprimer cet utilisateur ?"
        description={deleteUser ? `« ${deleteUser.full_name || deleteUser.username} » sera supprimé définitivement.` : ''}
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
        error={getApiErrorMessage(deleteMutation.error, '')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteUser(null)}
      />

      <ConfirmDialog
        open={!!demoteUser}
        title="Retirer le rôle super-admin ?"
        description={demoteUser ? `« ${demoteUser.full_name || demoteUser.username} » perdra l'accès à cet espace d'administration.` : ''}
        confirmLabel="Retirer"
        tone="danger"
        loading={updateMutation.isPending}
        error={getApiErrorMessage(updateMutation.error, '')}
        onConfirm={() => {
          if (!demoteUser) return;
          updateMutation.mutate(
            { id: demoteUser.id, data: { is_superuser: false } },
            {
              onSuccess: () => {
                toast.success('Rôle super-admin retiré.');
                setDemoteUser(null);
              },
              onError: (error) => toast.error('Mise à jour impossible.', { description: getApiErrorMessage(error) }),
            },
          );
        }}
        onCancel={() => setDemoteUser(null)}
      />
    </PageLayout>
  );
}