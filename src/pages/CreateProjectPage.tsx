import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '../api/teams';
import { PageLayout } from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { getApiErrorMessage } from '../lib/errors';
import { queryKeys } from '../lib/queryKeys';

const colorOptions = ['#1e40af', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#65a30d'];

const ICONS = ['📋', '🧪', '🔬', '🚀', '⚡', '🎯', '🛡️', '📡', '🔄', '🏗️'];

export default function CreateProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ name: '', description: '', icon: '📋', color: '#1e40af', visibility: 'team' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => teamsApi.createProject(slug!, form as Record<string, unknown>),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectsRoot(slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(slug) });
      navigate(`/teams/${slug}/projects/${project.slug}`);
    },
    onError: (err: unknown) => setError(getApiErrorMessage(err, 'Erreur lors de la création.')),
  });

  return (
    <PageLayout maxWidth="max-w-3xl">
      <div className="mb-8">
        <p className="text-body-sm text-on-surface-variant mb-1">
          <button onClick={() => navigate(`/teams/${slug}`)} className="hover:underline cursor-pointer bg-transparent border-none text-on-surface-variant">Équipe</button>
          {' '}/{' '}
          <span className="text-on-surface">Nouveau projet</span>
        </p>
        <h1 className="text-headline-lg font-bold text-on-surface">Créer un projet</h1>
      </div>

      {/* Live preview banner */}
      <div className="h-16 rounded-xl mb-6 flex items-center px-5 gap-3.5 shadow-lg transition-all"
           style={{ background: `linear-gradient(135deg, ${form.color}, ${form.color}cc)` }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ background: 'rgba(255,255,255,0.15)' }}>
          {form.icon || '📋'}
        </div>
        <span className="font-extrabold text-white text-body-base">{form.name || 'Nom du projet'}</span>
      </div>

      <Card>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
          <Input
            label="Nom du projet"
            placeholder="ex: Système E-commerce v2"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            required
          />

          <Textarea
            label="Description"
            placeholder="Description du projet..."
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-label-md text-on-surface-variant block mb-1.5">Icône</label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map(icon => (
                  <button key={icon} type="button" onClick={() => setForm(p => ({ ...p, icon }))}
                    className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-all cursor-pointer ${
                      form.icon === icon ? 'ring-2 ring-offset-2 ring-primary bg-primary-fixed' : 'bg-surface-container-high hover:bg-surface-container'
                    }`}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant block mb-1.5">Couleur</label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map(c => (
                  <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                    className={`w-8 h-8 rounded-lg transition-all cursor-pointer ${form.color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>

          {/* Visibility card-style selector */}
          <div>
            <label className="text-label-md text-on-surface-variant block mb-1.5">Visibilité</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: 'private', icon: '🔒', title: 'Privé', desc: 'Lead + admins' },
                { value: 'team', icon: '👥', title: 'Équipe', desc: 'Tous les membres' },
                { value: 'public', icon: '🌐', title: 'Public', desc: 'Tout utilisateur' },
              ].map(v => (
                <button key={v.value} type="button" onClick={() => setForm(p => ({ ...p, visibility: v.value }))}
                  className={`p-3 rounded-lg border-2 text-left transition-all cursor-pointer ${
                    form.visibility === v.value ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant hover:border-primary/50'
                  }`}>
                  <div className="text-lg mb-0.5">{v.icon}</div>
                  <div className="text-body-sm font-bold text-on-surface">{v.title}</div>
                  <div className="text-body-xs text-on-surface-variant">{v.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-error-container text-on-error-container text-body-sm">{error}</div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" loading={mutation.isPending}>Créer le projet</Button>
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Annuler</Button>
          </div>
        </form>
      </Card>
    </PageLayout>
  );
}
