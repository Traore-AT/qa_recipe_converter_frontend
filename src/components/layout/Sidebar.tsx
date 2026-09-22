import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import logo_global_itec from '../../assets/logo_global.jpeg';

const navItems = [
  { to: '/', label: 'Tableau de bord', icon: 'grid' },
  { to: '/recipes', label: 'Recettes', icon: 'book' },
  { to: '/suites', label: 'Suites de test', icon: 'check-square' },
  { to: '/convert', label: 'Conversion', icon: 'upload' },
  { to: '/teams', label: 'Équipes', icon: 'users' },
  { to: '/notifications', label: 'Notifications', icon: 'bell', auth: true },
  { to: '/settings', label: 'Paramètres', icon: 'settings', auth: true },
];

const adminNavItems = [
  { to: '/admin', label: 'Vue d\u2019ensemble', icon: 'dashboard', end: true },
  { to: '/admin/users', label: 'Utilisateurs', icon: 'person' },
  { to: '/admin/teams', label: 'Équipes', icon: 'teams' },
  { to: '/admin/projects', label: 'Projets', icon: 'folder' },
  { to: '/admin/jobs', label: 'Conversions', icon: 'upload' },
  { to: '/admin/use-cases', label: 'Cas de test', icon: 'check-square' },
  { to: '/admin/sprints', label: 'Sprints', icon: 'sprint' },
  { to: '/admin/defects', label: 'Anomalies', icon: 'bug' },
  { to: '/admin/reports', label: 'Rapports', icon: 'report' },
  { to: '/admin/activity', label: 'Activité', icon: 'activity' },
  { to: '/admin/system', label: 'Système', icon: 'server' },
];

const iconPaths: Record<string, string> = {
  grid: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z',
  book: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm2 0v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2zm0 4h5v2H8v-2z',
  'check-square': 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z',
  upload: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
  bell: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
  users: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.611 3.611 0 0112 15.6z',
  dashboard: 'M4 13h6a1 1 0 001-1V4a1 1 0 00-1-1H4a1 1 0 00-1 1v8a1 1 0 001 1zm0 8h6a1 1 0 001-1v-4a1 1 0 00-1-1H4a1 1 0 00-1 1v4a1 1 0 001 1zm10 0h6a1 1 0 001-1v-8a1 1 0 00-1-1h-6a1 1 0 00-1 1v8a1 1 0 001 1zm0-12h6a1 1 0 001-1V4a1 1 0 00-1-1h-6a1 1 0 00-1 1v4a1 1 0 001 1z',
  person: 'M12 12a5 5 0 10-5-5 5 5 0 005 5zm0 2a8 8 0 00-8 8h16a8 8 0 00-8-8z',
  teams: 'M12 12a4 4 0 10-4-4 4 4 0 004 4zm0 2c-3.33 0-10 1.67-10 5v2h9v-2.03c0-.9.14-1.76.4-2.54A7.51 7.51 0 0112 14zm8.41-1.05c.38.63.59 1.36.59 2.05H22v-2c0-2.38-2.62-4-5.28-4.89.82.64 1.51 1.52 1.96 2.51a6.87 6.87 0 011.73 2.33zM16.6 12a3.9 3.9 0 00-1.11-2.21c-.48.44-1.02.81-1.6 1.11.85.76 1.51 1.77 1.9 2.82.44-.42 1.61-.47 2.05-.47a6.74 6.74 0 00-1.24-1.25z',
  folder: 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
  activity: 'M3 13h2.79l2.21-4.5 3.75 8.5L15 13h6v-2h-6.5l-1.75 3.5-3.75-8.5L7 11H3v2z',
  server: 'M8 17h8v-2H8v2zm-5-7v2h18v-2H3zm0 10h18v-2H3v2zm0-12h18V6H3v2z',
  sprint: 'M13 3h-2v6.59l-4.3 4.3 1.41 1.41L12 11.41V3zm6 8c0-3.31-2.69-6-6-6v2c2.21 0 4 1.79 4 4s-1.79 4-4 4v2c3.31 0 6-2.69 6-6zm-9-2c-1.66 0-3 1.34-3 3s1.34 3 3 3v-2c-.55 0-1-.45-1-1s.45-1 1-1V9z',
  bug: 'M20 8h-2.81c-1.13-.64-2.45-1-3.86-1h-2.66c-1.41 0-2.73.36-3.86 1H4v2h2.06c-.04.33-.06.66-.06 1v1H4v2h2v1c0 .34.02.67.06 1H4v2h2.81c1.13.64 2.45 1 3.86 1h2.66c1.41 0 2.73-.36 3.86-1H20v-2h-2.06c.04-.33.06-.66.06-1v-1h2v-2h-2v-1c0-.34-.02-.67-.06-1H20V8zm-4 6c0 2.21-1.79 4-4 4s-4-1.79-4-4v-2c0-2.21 1.79-4 4-4s4 1.79 4 4v2z',
  report: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h10v2H7v-2zm0 4h10v2H7v-2zm0-8h10v2H7V6z',
};

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isOpen, close } = useSidebar();

  const handleNav = (to: string) => {
    close();
    navigate(to);
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={close} />
      )}

      <aside className={`fixed top-0 left-0 w-64 h-screen bg-surface-container-lowest border-r border-outline-variant flex flex-col z-30 transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-6 py-5 border-b border-outline-variant">
          <div className="flex items-center gap-2.5">
            <img src={logo_global_itec} alt="Global-itec Logo" className="w-8 h-8 rounded-lg" />
            <span className="text-headline-sm text-on-surface font-bold">Global-itec</span>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {user?.is_superuser && (
            <div className="pt-2">
              <p className="px-4 pb-2 text-label-sm uppercase tracking-wider text-on-surface-variant">
                Administration
              </p>
              {adminNavItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={close}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-body-base transition-all ${
                      isActive
                        ? 'bg-primary-fixed text-primary font-semibold border-l-4 border-primary'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                    }`
                  }
                >
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d={iconPaths[item.icon]} />
                  </svg>
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}

          {!user?.is_superuser && navItems.map(item => {
            if (item.auth && !user) return null;
            if (item.to === '/settings' && !user) return null;
            if (item.to === '/teams' && !user) return null;
            if (item.to === '/recipes' && !user) return null;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={close}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-body-base transition-all ${
                    isActive
                      ? 'bg-primary-fixed text-primary font-semibold border-l-4 border-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`
                }
              >
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d={iconPaths[item.icon]} />
                </svg>
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-outline-variant space-y-1">
          {user ? (
            <>
              <div className="flex items-center gap-3 px-4 py-2.5 text-body-sm text-on-surface-variant">
                <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-semibold text-sm">
                  {user.full_name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase()}
                </div>
                <span className="truncate">{user.full_name || user.username}</span>
              </div>
              <button
                onClick={() => { logout(); close(); navigate('/'); }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-body-base text-on-surface-variant hover:bg-surface-container-low w-full text-left transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                </svg>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleNav('/login')}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-body-base text-primary hover:bg-primary-fixed w-full text-left transition-all font-medium"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z" />
                </svg>
                Connexion
              </button>
              <button
                onClick={() => handleNav('/register')}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-body-base text-on-surface-variant hover:bg-surface-container-low w-full text-left transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                Inscription
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
