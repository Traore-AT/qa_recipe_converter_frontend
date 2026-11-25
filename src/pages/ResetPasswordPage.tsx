import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { FormError } from '../components/ui/FormError';
import { PasswordInput } from '../components/ui/PasswordInput';
import { getApiErrorMessage } from '../lib/errors';

export default function ResetPasswordPage() {
  const { uidb64, token } = useParams<{ uidb64: string; token: string }>();
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    try {
      await authApi.passwordResetConfirm(uidb64!, token!, password, passwordConfirm);
      setDone(true);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Lien invalide ou expiré.'));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthLayout title="Mot de passe réinitialisé">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-xl bg-success-container flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-success text-3xl">check_circle</span>
          </div>
          <p className="text-body-base text-on-surface-variant">
            Votre mot de passe a été modifié avec succès.
          </p>
          <Link to="/login" className="text-primary font-medium hover:underline text-body-sm block">
            Se connecter
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Nouveau mot de passe" subtitle="Choisissez un nouveau mot de passe sécurisé">
      <form onSubmit={handleSubmit} className="space-y-5">
        <PasswordInput
          label="Nouveau mot de passe"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
          hint="8 caractères minimum"
          required
          minLength={8}
        />
        <PasswordInput
          label="Confirmer le mot de passe"
          autoComplete="new-password"
          placeholder="••••••••"
          value={passwordConfirm}
          onChange={e => setPasswordConfirm(e.target.value)}
          required
          minLength={8}
        />
        <FormError message={error} />
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Réinitialiser le mot de passe
        </Button>
      </form>
    </AuthLayout>
  );
}
