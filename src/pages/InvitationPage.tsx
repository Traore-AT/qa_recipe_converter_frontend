import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { teamsApi } from '../api/teams';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { queryKeys } from '../lib/queryKeys';

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<'prompt' | 'accepted' | 'rejected' | 'error'>('prompt');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: invitation } = useQuery({
    queryKey: queryKeys.invitation(token),
    queryFn: () => teamsApi.getInvitation(token!),
    enabled: !!token && !!user,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => teamsApi.acceptInvitation(token!),
    onSuccess: () => {
      setMode('accepted');
    },
    onError: (err) => {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setErrorMsg(axiosErr?.response?.data?.error || "Impossible d'accepter l'invitation.");
      setMode('error');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => teamsApi.rejectInvitation(token!),
    onSuccess: () => {
      setMode('rejected');
    },
    onError: (err) => {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setErrorMsg(axiosErr?.response?.data?.error || "Impossible de refuser l'invitation.");
      setMode('error');
    },
  });

  if (authLoading) return null;

  if (!user) {
    navigate(`/login?next=/invitation/${token}`, { replace: true });
    return null;
  }

  if (mode === 'accepted') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center py-10 px-6">
          <div className="w-16 h-16 rounded-xl bg-success-container flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-success text-3xl">check_circle</span>
          </div>
          <h1 className="text-headline-md font-bold text-on-surface mb-2">Invitation acceptée</h1>
          <p className="text-body-base text-on-surface-variant mb-6">
            Vous avez rejoint l'équipe.
          </p>
          <Button onClick={() => navigate('/teams')}>Accéder au tableau de bord</Button>
        </Card>
      </div>
    );
  }

  if (mode === 'rejected') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center py-10 px-6">
          <div className="w-16 h-16 rounded-xl bg-warning-container flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-on-warning-container text-3xl">cancel</span>
          </div>
          <h1 className="text-headline-md font-bold text-on-surface mb-2">Invitation refusée</h1>
          <p className="text-body-base text-on-surface-variant mb-6">
            Vous avez refusé l'invitation.
          </p>
          <Button onClick={() => navigate('/teams')}>Retour au tableau de bord</Button>
        </Card>
      </div>
    );
  }

  if (mode === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center py-10 px-6">
          <div className="w-16 h-16 rounded-xl bg-error-container flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-error text-3xl">error</span>
          </div>
          <h1 className="text-headline-md font-bold text-on-surface mb-2">Erreur</h1>
          <p className="text-body-base text-on-surface-variant mb-6">{errorMsg}</p>
          <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center py-10 px-6">
        <div className="w-16 h-16 rounded-xl bg-primary-fixed flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-primary text-3xl">mail</span>
        </div>
        <h1 className="text-headline-md font-bold text-on-surface mb-2">Invitation à rejoindre une équipe</h1>
        <p className="text-body-base text-on-surface-variant mb-2">
          Vous avez été invité à rejoindre <strong>{invitation?.team_name || 'une équipe'}</strong>.
        </p>
        <p className="text-body-sm text-on-surface-variant mb-8">
          En tant que <strong>{invitation?.role || 'membre'}</strong>
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => acceptMutation.mutate()}
            loading={acceptMutation.isPending}
            className="flex-1"
          >
            Accepter
          </Button>
          <Button
            variant="secondary"
            onClick={() => rejectMutation.mutate()}
            loading={rejectMutation.isPending}
            className="flex-1"
          >
            Refuser
          </Button>
        </div>
      </Card>
    </div>
  );
}
