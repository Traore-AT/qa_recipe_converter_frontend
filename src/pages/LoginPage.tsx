import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { FormError } from '../components/ui/FormError';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { getApiErrorMessage } from '../lib/errors';
import { authLink, safeNext } from '../lib/redirect';

/** Au-delà de ce délai, on explique l'attente (réveil du serveur hébergé). */
const SLOW_DELAY = 5_000;

function SlowServerHint() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_DELAY);
    return () => clearTimeout(timer);
  }, []);
  return slow ? (
    <p role="status" className="text-center text-body-sm text-on-surface-variant">Le serveur démarre, cela peut prendre quelques instants…</p>
  ) : null;
}

export default function LoginPage() {
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate(next, { replace: true });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Identifiants invalides. Veuillez réessayer.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Connexion" subtitle="Accédez à votre espace de travail QA">
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormError message={error} />
        <Input
          label="Email ou nom d'utilisateur"
          type="text"
          placeholder="exemple@email.com"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          required
        />
        <PasswordInput
          label="Mot de passe"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-body-sm font-medium text-primary hover:underline">Mot de passe oublié ?</Link>
        </div>
        {/* Session en cours de vérification : le formulaire reste utilisable. */}
        <Button type="submit" size="lg" loading={loading} className="w-full">
          {loading ? 'Connexion…' : 'Se connecter'}
        </Button>
        {(loading || authLoading) && <SlowServerHint />}
        <p className="border-t border-outline-variant/40 pt-5 text-center text-body-sm text-on-surface-variant">
          <span>Pas encore de compte ?</span>{' '}
          <Link to={authLink('/register', next)} className="font-medium text-primary hover:underline">Créer un compte</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
