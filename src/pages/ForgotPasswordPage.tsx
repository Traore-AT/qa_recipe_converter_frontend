import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.passwordReset(email);
      setSent(true);
    } catch {
      setError('Erreur lors de l\'envoi de l\'email.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Email envoyé">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-xl bg-success-container flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-success text-3xl">check_circle</span>
          </div>
          <p className="text-body-base text-on-surface-variant">
            Si un compte existe avec cette adresse email, vous recevrez un lien de réinitialisation.
          </p>
          <Link to="/login" className="text-primary font-medium hover:underline text-body-sm block">
            Retour à la connexion
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Mot de passe oublié" subtitle="Saisissez votre email pour recevoir un lien de réinitialisation">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Adresse email"
          type="email"
          placeholder="exemple@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-error-container text-error text-body-sm">
            <span className="material-symbols-outlined text-lg shrink-0">error</span>
            {error}
          </div>
        )}
        <Button type="submit" loading={loading} className="w-full">
          Envoyer le lien
        </Button>
        <p className="text-center text-body-sm text-on-surface-variant">
          <Link to="/login" className="text-primary font-medium hover:underline">Retour à la connexion</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
