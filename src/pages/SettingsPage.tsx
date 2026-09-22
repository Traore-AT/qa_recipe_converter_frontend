import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PageLayout } from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';

/**
 * Page Paramètres — lecture seule.
 * ⚠️ Le backend n'expose pas encore d'endpoint de mise à jour du profil
 * (voir AUDIT.md §B4 / E2) : aucun bouton « Enregistrer » n'est donc affiché
 * tant que `PATCH /api/auth/me/` n'existe pas côté backend.
 */
export default function SettingsPage() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <PageLayout maxWidth="max-w-3xl">
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary transition-colors mb-3 cursor-pointer">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Retour
        </button>
        <h1 className="text-headline-lg font-bold text-on-surface">Paramètres</h1>
        <p className="text-body-base text-on-surface-variant mt-1">Gérez votre profil et vos préférences</p>
      </div>

      <div className="space-y-6">
        <Card>
          <h2 className="text-headline-sm font-semibold text-on-surface mb-6">Profil</h2>
          <div className="flex items-center gap-5 mb-6">
            <div className="w-20 h-20 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-3xl" aria-hidden="true">
              {user?.full_name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-body-base font-semibold text-on-surface">{user?.full_name || user?.username}</p>
              <p className="text-body-sm text-on-surface-variant">{user?.email}</p>
              <p className="text-body-sm text-on-surface-variant">Membre depuis {user?.date_joined ? new Date(user.date_joined).toLocaleDateString('fr-FR') : ''}</p>
            </div>
          </div>

          {/* Informations en lecture seule — la modification du profil requiert
              un endpoint backend `PATCH /api/auth/me/` qui n'existe pas encore. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-label-md text-on-surface-variant mb-1">Prénom et nom</p>
              <p className="text-body-base text-on-surface">{user?.full_name || '—'}</p>
            </div>
            <div>
              <p className="text-label-md text-on-surface-variant mb-1">Nom d'utilisateur</p>
              <p className="text-body-base text-on-surface">{user?.username || '—'}</p>
            </div>
            <div>
              <p className="text-label-md text-on-surface-variant mb-1">Email</p>
              <p className="text-body-base text-on-surface">{user?.email || '—'}</p>
            </div>
          </div>
          <p className="text-body-xs text-on-surface-variant/60 mt-4 italic">
            La modification de ces informations nécessite une évolution du backend (endpoint de mise à jour du profil) — en attente d'arbitrage.
          </p>
        </Card>

        <Card>
          <h2 className="text-headline-sm font-semibold text-on-surface mb-6">Préférences</h2>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-base font-medium text-on-surface">Mode sombre</p>
                <p className="text-body-sm text-on-surface-variant">Basculez entre thème clair et sombre (aussi disponible dans la barre supérieure)</p>
              </div>
              <button
                type="button"
                onClick={toggle}
                role="switch"
                aria-checked={dark}
                aria-label="Activer ou désactiver le mode sombre"
                className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer shrink-0 ${dark ? 'bg-primary' : 'bg-outline-variant'}`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${dark ? 'left-6' : 'left-1'}`}
                  aria-hidden="true"
                />
              </button>
            </div>
            <hr className="border-outline-variant" />
            <div>
              <p className="text-body-base font-medium text-on-surface">Langue</p>
              <p className="text-body-sm text-on-surface-variant">Français (langue de l'application)</p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-headline-sm font-semibold text-on-surface mb-4">Avatar</h2>
          <p className="text-body-sm text-on-surface-variant">
            L'avatar de profil sera disponible avec la mise à jour du profil (voir la note ci-dessus).
            Les avatars de projet sont gérés depuis la page de chaque projet.
          </p>
        </Card>
      </div>
    </PageLayout>
  );
}
