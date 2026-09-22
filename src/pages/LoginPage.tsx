import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { getApiErrorMessage } from '../lib/errors';

export default function LoginPage() {
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (authLoading) return null;
  if (user) {
    navigate(searchParams.get('next') || '/', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate(searchParams.get('next') || '/');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Identifiants invalides. Veuillez réessayer.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Connexion" subtitle="Accédez à votre espace de travail QA">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email ou nom d'utilisateur"
          type="text"
          placeholder="exemple@email.com"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
        <div className="relative">
          <Input
            label="Mot de passe"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[38px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            tabIndex={-1}
          >
            <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
          </button>
        </div>
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-error-container text-error text-body-sm">
            <span className="material-symbols-outlined text-lg shrink-0">error</span>
            {error}
          </div>
        )}
        <div className="flex items-center justify-between">
          <Button type="submit" loading={loading} className="flex-1">
            Se connecter
          </Button>
        </div>
        <div className="flex items-center justify-between text-body-sm">
          <Link to="/register" className="text-on-surface-variant hover:text-primary transition-colors">
            Pas encore de compte ?
          </Link>
          <span className="text-on-surface-variant">·</span>
          <Link to="/forgot-password" className="text-on-surface-variant hover:text-primary transition-colors">
            Mot de passe oublié ?
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
