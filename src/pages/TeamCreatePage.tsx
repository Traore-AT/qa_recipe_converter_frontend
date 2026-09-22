import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '../api/teams';
import { PageLayout } from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { getApiErrorMessage } from '../lib/errors';
import { queryKeys } from '../lib/queryKeys';

export default function TeamCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => teamsApi.createTeam({ name, description }),
    onSuccess: (team) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams });
      navigate(`/teams/${team.slug}`);
    },
    onError: (err: unknown) => setError(getApiErrorMessage(err, 'Erreur lors de la création de l\'équipe.')),
  });

  return (
    <PageLayout maxWidth="max-w-lg">
      <div className="mb-6">
        <p className="text-body-sm text-on-surface-variant mb-1">
          <button onClick={() => navigate('/teams')} className="hover:underline cursor-pointer bg-transparent border-none text-on-surface-variant">Équipes</button>
          {' / '}
          <span className="text-on-surface">Nouvelle équipe</span>
        </p>
        <h1 className="text-headline-lg font-bold text-on-surface">Créer une équipe</h1>
      </div>

      <Card>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-5">
          <Input
            label="Nom de l'équipe *"
            placeholder="Ex : QA Frontend Team"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <Textarea
            label="Description"
            placeholder="Description de l'équipe…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
          {error && (
            <div className="p-3 rounded-lg bg-error-container text-on-error-container text-body-sm">{error}</div>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" loading={mutation.isPending} disabled={!name.trim()}>
              ✅ Créer l'équipe
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/teams')}>
              Annuler
            </Button>
          </div>
        </form>
      </Card>
    </PageLayout>
  );
}
