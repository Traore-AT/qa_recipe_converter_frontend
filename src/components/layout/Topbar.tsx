import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { teamsApi } from '../../api/teams';
import { queryKeys } from '../../lib/queryKeys';
import logo_global_itec from '../../assets/logo_global.jpeg';

export function Topbar() {
  const { dark, toggle } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toggle: toggleSidebar } = useSidebar();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const { data: notifications } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => teamsApi.getNotifications(),
    enabled: !!user,
    staleTime: 30_000,
  });

  // Fermeture du panneau de notifications : clic extérieur + touche Échap
  useEffect(() => {
    if (!notificationsOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notificationsOpen]);

  const markNotificationRead = useMutation({
    mutationFn: teamsApi.markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  const markAllNotificationsRead = useMutation({
    mutationFn: teamsApi.markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/recherche?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="fixed top-0 right-0 h-16 bg-surface-container-lowest border-b border-outline-variant flex items-center justify-between px-4 md:px-6 z-20 left-0 md:left-64">
      <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
        <button
          onClick={toggleSidebar}
          className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-all shrink-0"
          title="Menu"
          aria-label="Ouvrir le menu de navigation"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>

        <img src={logo_global_itec} alt="Global-itec" className="hidden md:block w-7 h-7 rounded-md" />

        <form onSubmit={handleSearch} role="search" className="relative w-full max-w-sm md:max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une recette, un fichier, un projet…"
            aria-label="Rechercher une recette, un fichier ou un projet"
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all sm:max-w-full"
          />
        </form>
      </div>

      <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
        <button
          onClick={() => navigate('/convert')}
          className="px-3 md:px-4 py-2 bg-primary text-white rounded-lg text-label-sm font-medium hover:brightness-110 transition-all whitespace-nowrap min-h-[44px]"
        >
          <span className="hidden sm:inline">+ Importer une recette</span>
          <span className="sm:hidden">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
            </svg>
          </span>
        </button>

        <button
          onClick={toggle}
          className="w-11 h-11 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-all shrink-0"
          title={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {dark ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9.37 5.51A7.35 7.35 0 009.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A7.014 7.014 0 0112 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49z" />
            </svg>
          )}
        </button>

        {user && (
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen(open => !open)}
              className="relative w-11 h-11 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-all shrink-0"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              aria-haspopup="true"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9a6 6 0 0 0-12 0v.75a8.967 8.967 0 0 1-2.31 6.022c1.74.74 3.6 1.17 5.454 1.31m5.713 0a24.255 24.255 0 0 1-5.713 0m5.713 0a3 3 0 1 1-5.713 0" />
              </svg>
              {(notifications?.unread_count ?? 0) > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-error text-white text-body-xs leading-4 text-center font-bold" aria-label={`${notifications?.unread_count} notification${notifications?.unread_count === 1 ? '' : 's'} non lue${notifications?.unread_count === 1 ? '' : 's'}`}>
                  {(notifications?.unread_count ?? 0) > 99 ? '99+' : notifications?.unread_count}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div role="menu" aria-label="Notifications" className="absolute right-0 top-12 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-outline-variant bg-surface-container-lowest shadow-xl p-3 z-50">
                <div className="flex items-center justify-between gap-3 px-2 pb-2 border-b border-outline-variant">
                  <h2 className="text-label-md font-semibold text-on-surface">Notifications</h2>
                  {(notifications?.unread_count ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllNotificationsRead.mutate()}
                      disabled={markAllNotificationsRead.isPending}
                      className="text-body-xs text-primary hover:underline disabled:opacity-50"
                    >
                      Tout marquer comme lu
                    </button>
                  )}
                </div>
                {notifications?.results?.length ? (
                  <div className="max-h-80 overflow-y-auto divide-y divide-outline-variant">
                    {notifications.results.slice(0, 10).map(notification => (
                      <button
                        type="button"
                        role="menuitem"
                        key={notification.id}
                        onClick={() => { if (!notification.is_read) markNotificationRead.mutate(notification.id); }}
                        className={`w-full text-left px-2 py-3 hover:bg-surface-container-low transition-colors ${notification.is_read ? 'opacity-70' : ''}`}
                      >
                        <span className="block text-body-sm text-on-surface">{notification.description}</span>
                        <span className="block text-body-xs text-on-surface-variant mt-1">{new Date(notification.created_at).toLocaleString('fr-FR')}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="px-2 py-6 text-center text-body-sm text-on-surface-variant">Aucune notification</p>
                )}
                <Link
                  to="/notifications"
                  onClick={() => setNotificationsOpen(false)}
                  className="mt-1 block w-full rounded-lg px-2 py-2.5 text-center text-label-sm font-medium text-primary hover:bg-primary-fixed transition-all min-h-[44px] flex items-center justify-center"
                >
                  Voir toutes les notifications
                </Link>
              </div>
            )}
          </div>
        )}

        {user?.is_superuser && (
          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary-fixed text-primary text-label-sm font-medium shrink-0">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
            Super Admin
          </span>
        )}

        {user ? (
          <button
            onClick={() => navigate('/settings')}
            className="w-11 h-11 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-semibold text-sm hover:brightness-95 transition-all shrink-0"
            title="Mon profil"
            aria-label="Aller à mes paramètres"
          >
            {user.full_name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase()}
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-primary text-white rounded-lg text-label-sm font-medium hover:brightness-110 transition-all whitespace-nowrap hidden sm:block min-h-[44px]"
          >
            Connexion
          </button>
        )}
      </div>
    </header>
  );
}
