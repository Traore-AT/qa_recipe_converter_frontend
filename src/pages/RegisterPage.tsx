import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { FormError } from '../components/ui/FormError';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { getApiErrorMessage } from '../lib/errors';
import { authLink, safeNext } from '../lib/redirect';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [form, setForm] = useState({ username: '', email: '', password: '', password_confirm: '', first_name: '', last_name: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={next} replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.username.trim()) errs.username = "Nom d'utilisateur requis";
    if (!form.email.includes('@')) errs.email = 'Email invalide';
    if (form.password.length < 8) errs.password = '8 caractères minimum';
    if (form.password !== form.password_confirm) errs.password_confirm = 'Les mots de passe ne correspondent pas';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await register({ username: form.username, email: form.email, password: form.password, first_name: form.first_name, last_name: form.last_name });
      navigate(next);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Erreur lors de l'inscription."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Créer un compte" subtitle="Rejoignez QA Recipe Converter">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Prénom" name="first_name" value={form.first_name} onChange={handleChange} />
          <Input label="Nom" name="last_name" value={form.last_name} onChange={handleChange} />
        </div>
        <Input label="Nom d'utilisateur" name="username" value={form.username} onChange={handleChange} error={fieldErrors.username} required />
        <Input label="Email" type="email" name="email" value={form.email} onChange={handleChange} error={fieldErrors.email} required />
        <PasswordInput label="Mot de passe" name="password" value={form.password} onChange={handleChange} error={fieldErrors.password} autoComplete="new-password" hint="8 caractères minimum" required minLength={8} />
        <PasswordInput label="Confirmer le mot de passe" name="password_confirm" value={form.password_confirm} onChange={handleChange} error={fieldErrors.password_confirm} autoComplete="new-password" required />
        <FormError message={error} />
        <Button type="submit" size="lg" loading={loading} className="w-full">Créer mon compte</Button>
        <p className="text-center text-body-sm text-on-surface-variant">
          Déjà un compte ? <Link to={authLink('/login', next)} className="text-primary font-medium hover:underline">Se connecter</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
