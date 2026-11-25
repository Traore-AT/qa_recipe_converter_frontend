import type { ReactNode } from 'react';
import logo from '../../assets/logo_global_itec.png';
import { useTheme } from '../../context/ThemeContext';

const FEATURES = [
  {
    title: 'Recettes et cas de test',
    text: 'Importez vos documents Word et suivez chaque cas.',
    path: 'M9 12l2 2 4-4M7 3h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z',
  },
  {
    title: 'Sprints et anomalies',
    text: 'Pilotez l’exécution, les anomalies et les régressions.',
    path: 'M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v6h-4z',
  },
  {
    title: 'Rapports et performance',
    text: 'Mesurez la qualité de chaque projet dans le temps.',
    path: 'M4 19h16M5 15l4-5 4 3 6-8',
  },
];

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  const label = dark ? 'Passer en mode clair' : 'Passer en mode sombre';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="absolute right-4 top-4 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dark
          ? <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6L7 7m10 10l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          : <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />}
      </svg>
    </button>
  );
}

/** Mise en page des écrans d'authentification : marque à gauche, formulaire à droite. */
export function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-[#132d5e] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        {/* Arcs inspirés du logo */}
        <svg className="pointer-events-none absolute -bottom-72 -right-80 w-[44rem] max-w-none" viewBox="0 0 600 600" fill="none" aria-hidden="true">
          <ellipse cx="300" cy="300" rx="280" ry="190" stroke="#20dfea" strokeOpacity="0.35" strokeWidth="26" transform="rotate(-18 300 300)" />
          <ellipse cx="300" cy="300" rx="210" ry="130" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="40" transform="rotate(-18 300 300)" />
        </svg>

        <div className="relative w-fit rounded-2xl bg-white px-6 py-4 shadow-lg">
          <img src={logo} alt="GLOBAL ITEC" width={150} height={70} />
        </div>

        <div className="relative max-w-md">
          <p className="text-4xl font-bold leading-tight">Vos recettes de test, du document au rapport.</p>
          <ul className="mt-10 space-y-6">
            {FEATURES.map(f => (
              <li key={f.title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#20dfea]">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={f.path} /></svg>
                </span>
                <div>
                  <p className="text-body-base font-semibold">{f.title}</p>
                  <p className="text-body-sm text-white/75">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-body-sm text-white/75">GLOBAL ITEC — Conakry, Guinée</p>
      </aside>

      <main className="relative flex min-h-screen items-center justify-center px-4 py-16 sm:px-8">
        <ThemeToggle />
        <div className="w-full max-w-md animate-fade-in">
          <div className="mx-auto mb-8 w-fit rounded-2xl bg-white px-5 py-3 shadow-sm lg:hidden">
            <img src={logo} alt="GLOBAL ITEC" width={129} height={60} />
          </div>
          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-headline-lg font-bold text-on-surface">{title}</h1>
            {subtitle && <p className="mt-2 text-body-base text-on-surface-variant">{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
