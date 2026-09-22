import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import logo_global_itec from '../assets/logo_global.jpeg';

// ==================== COMPOSANTS UTILITAIRES ====================

function LaptopImage() {
  return (
    <svg viewBox="0 0 600 400" className="w-full drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="60" y="20" width="480" height="300" rx="16" fill="#f2f4f6" stroke="#c4c5d5" strokeWidth="1" />
      <rect x="80" y="40" width="440" height="260" rx="8" fill="white" />
      <rect x="80" y="40" width="440" height="40" rx="8" fill="#00288e" />
      <circle cx="100" cy="60" r="6" fill="white" opacity="0.3" />
      <circle cx="118" cy="60" r="6" fill="white" opacity="0.3" />
      <rect x="160" y="52" width="80" height="16" rx="4" fill="white" opacity="0.5" />
      <rect x="100" y="100" width="380" height="16" rx="4" fill="#e0e3e5" />
      <rect x="100" y="130" width="240" height="12" rx="4" fill="#eceef0" />
      <rect x="100" y="155" width="380" height="80" rx="6" fill="#f7f9fb" stroke="#e0e3e5" strokeWidth="1" />
      <rect x="110" y="165" width="100" height="12" rx="4" fill="#dde1ff" />
      <rect x="110" y="185" width="200" height="8" rx="4" fill="#eceef0" />
      <rect x="110" y="200" width="160" height="8" rx="4" fill="#eceef0" />
      <rect x="110" y="215" width="180" height="8" rx="4" fill="#eceef0" />
      <rect x="360" y="165" width="100" height="12" rx="4" fill="#d8e2ff" />
      <circle cx="380" cy="190" r="20" fill="#dde1ff" />
      <rect x="100" y="250" width="180" height="30" rx="6" fill="#00288e" />
      <rect x="300" y="250" width="180" height="30" rx="6" fill="#e0e3e5" />
      <path d="M60 320 L120 320 L100 350 L40 350 Z" fill="#c4c5d5" />
      <path d="M540 320 L480 320 L500 350 L560 350 Z" fill="#c4c5d5" />
      <rect x="80" y="350" width="440" height="8" rx="2" fill="#e0e3e5" />
    </svg>
  );
}

function AvatarPlaceholder({ initials, color }: { initials: string; color: string }) {
  return (
    <div
      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white font-bold text-xs sm:text-sm"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

// Hook pour l'animation de compteur (métriques SaaS)
function useCountUp(end: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    let animationFrame: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      }
    };
    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, start]);

  return count;
}

function StatCounter({ end, suffix = '', label, icon }: { end: number; suffix?: string; label: string; icon: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const count = useCountUp(end, 1800, isVisible);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center text-center px-4 py-6 sm:py-8">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 flex items-center justify-center mb-3 sm:mb-4">
        <span className="material-symbols-outlined text-white text-2xl">{icon}</span>
      </div>
      <div className="text-3xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">
        {count}
        {suffix}
      </div>
      <div className="text-xs sm:text-sm text-white/80 font-medium uppercase tracking-wide">{label}</div>
    </div>
  );
}

// ==================== PAGE PRINCIPALE ====================

export default function HomePage() {
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const sectionsRef = useRef<HTMLElement[]>([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            entry.target.classList.remove('opacity-0', 'translate-y-8');
          }
        });
      },
      { threshold: 0.1 }
    );

    const sections = document.querySelectorAll('.fade-in-section');
    sections.forEach((s) => observer.observe(s));
    sectionsRef.current = sections as unknown as HTMLElement[];

    return () => observer.disconnect();
  }, []);

  const navLinks = [
    { href: '#features', label: 'Fonctionnalités' },
    { href: '#process', label: 'Processus' },
    { href: '#stats', label: 'Résultats' },
    { href: '#pricing', label: 'Tarifs' },
    { href: '#help', label: 'Aide' },
  ];

  return (
    <div className="min-h-screen bg-background text-on-background selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* ==================== HEADER ==================== */}
      <header className="sticky top-0 z-50 bg-surface-container-lowest border-b border-outline-variant shadow-sm">
        <div className="flex justify-between items-center w-full max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16">
          <div className="text-base sm:text-lg font-semibold text-primary flex items-center gap-2">
            <img src={logo_global_itec} alt="Global-itec Logo" className="w-7 h-7 rounded-md" />
            <span className="hidden xs:inline sm:inline">QA Recipe Converter</span>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map(l => (
              <a key={l.href} href={l.href} className="text-sm text-on-surface-variant hover:text-primary transition-colors font-medium">{l.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={toggle}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
              title={dark ? 'Mode clair' : 'Mode sombre'}
            >
              <span className="material-symbols-outlined text-lg sm:text-xl">{dark ? 'light_mode' : 'dark_mode'}</span>
            </button>
            <button
              onClick={() => navigate('/login')}
              className="hidden sm:block text-sm font-medium text-primary px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-surface-container-low transition-colors rounded-lg cursor-pointer"
            >
              Connexion
            </button>
            <button
              onClick={() => navigate('/convert')}
              className="bg-primary-container text-white px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
            >
              Commencer
            </button>
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">{mobileNavOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="md:hidden border-t border-outline-variant bg-surface-container-lowest animate-slide-up">
            <div className="px-4 py-3 space-y-2">
              {navLinks.map(l => (
                <a key={l.href} href={l.href} onClick={() => setMobileNavOpen(false)}
                   className="block px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors font-medium">
                  {l.label}
                </a>
              ))}
              <button onClick={() => { navigate('/login'); setMobileNavOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-primary font-medium hover:bg-surface-container-low transition-colors">
                Connexion
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ==================== HERO SECTION ==================== */}
        <section className="relative pt-16 sm:pt-20 pb-10 sm:pb-12 overflow-hidden bg-surface-container-lowest">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid sm:grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-12 items-center">
            <div className="relative z-10">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant text-xs font-semibold mb-4 sm:mb-6">
                <span className="material-symbols-outlined text-sm mr-1">auto_awesome</span>
                Nouveau : Conversion par IA
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-4 sm:mb-6 leading-tight">
                Transformez vos Recettes QA <span className="text-secondary">en Secondes</span>
              </h1>
              <p className="text-sm text-on-surface-variant mb-6 sm:mb-8 max-w-lg leading-relaxed">
                Passez de documents Word fastidieux à des fichiers Excel structurés instantanément. Notre outil intelligent analyse vos scénarios de test pour une documentation fluide et sans erreur.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={() => navigate('/convert')}
                  className="bg-primary-container text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg text-sm font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Commencer gratuitement
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
                <button
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="border border-outline text-primary px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined">play_circle</span>
                  Voir la démo
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-10 bg-gradient-to-tr from-secondary-fixed to-primary-fixed opacity-20 blur-3xl rounded-full" />
              <div className="relative z-10">
                <LaptopImage />
              </div>
            </div>
          </div>
        </section>

        {/* ==================== FEATURES SECTION ==================== */}
        <section id="features" className="py-16 sm:py-24 bg-surface-container-low">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 fade-in-section transition-all duration-1000 opacity-0 translate-y-8">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-xl sm:text-2xl font-bold text-primary mb-3 sm:mb-4">Pourquoi nous choisir ?</h2>
              <p className="text-sm text-on-surface-variant max-w-2xl mx-auto px-4">La solution tout-en-un pour moderniser vos workflows d'assurance qualité.</p>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
              {[
                {
                  icon: 'verified',
                  title: 'Précision accrue',
                  desc: "L'intelligence artificielle détecte automatiquement les étapes, les résultats attendus et les pré-requis avec une précision de 99.9%.",
                },
                {
                  icon: 'bolt',
                  title: 'Gain de productivité',
                  desc: 'Réduisez le temps de documentation de 80%. Convertissez des dossiers entiers de test cases en un clic au lieu de plusieurs heures.',
                },
                {
                  icon: 'group',
                  title: 'Collaboration simplifiée',
                  desc: "Standardisez les formats pour toutes vos équipes. Centralisez les recettes QA dans un espace de travail collaboratif partagé.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="bg-surface-container-lowest p-6 sm:p-8 rounded-xl border border-outline-variant hover:border-primary transition-all group cursor-default"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-secondary-fixed flex items-center justify-center text-primary mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">{f.icon}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-on-background mb-2 sm:mb-4">{f.title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== PROCESS SECTION ==================== */}
        <section id="process" className="py-16 sm:py-24 bg-surface-container-lowest">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 fade-in-section transition-all duration-1000 opacity-0 translate-y-8">
            <div className="text-center mb-12 sm:mb-20">
              <h2 className="text-xl sm:text-2xl font-bold text-primary mb-3 sm:mb-4">Processus en 3 étapes</h2>
              <p className="text-sm text-on-surface-variant">Simple, rapide et efficace.</p>
            </div>
            <div className="relative flex flex-col md:flex-row justify-between items-center gap-10 sm:gap-12">
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-outline-variant -z-0" />
              {[
                { icon: 'upload_file', title: '1. Importez votre Word', desc: 'Glissez-déposez vos fichiers .doc ou .docx directement sur la plateforme.' },
                { icon: 'psychology', title: '2. Analyse Intelligente', desc: 'Notre IA analyse la structure et extrait les données de test pertinentes en temps réel.' },
                { icon: 'download', title: '3. Exportation Excel', desc: "Récupérez vos fichiers Excel parfaitement formatés et prêts à l'import dans vos outils de testing." },
              ].map((step) => (
                <div key={step.title} className="relative z-10 flex flex-col items-center text-center max-w-[280px]">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary-container text-white flex items-center justify-center mb-4 sm:mb-6 shadow-lg border-4 border-white">
                    <span className="material-symbols-outlined">{step.icon}</span>
                  </div>
                  <h4 className="text-base sm:text-lg font-semibold text-on-background mb-2">{step.title}</h4>
                  <p className="text-sm text-on-surface-variant">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== STATS SECTION (métriques SaaS) ==================== */}
        <section id="stats" className="relative py-16 sm:py-20 bg-primary overflow-hidden">
          {/* Overlay décoratif */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary opacity-95" />
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 fade-in-section transition-all duration-1000 opacity-0 translate-y-8">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Des résultats concrets</h2>
              <p className="text-sm text-white/80 max-w-xl mx-auto px-4">La confiance de nos utilisateurs, mesurée en chiffres.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
              <StatCounter end={500} suffix="+" label="Recettes converties" icon="description" />
              <StatCounter end={99} suffix="%" label="Précision IA" icon="verified" />
              <StatCounter end={50} suffix="+" label="Équipes QA actives" icon="groups" />
              <StatCounter end={80} suffix="%" label="Temps économisé" icon="bolt" />
            </div>
          </div>
        </section>

        {/* ==================== COLLABORATIVE SPACE SECTION ==================== */}
        <section className="py-16 sm:py-24 bg-surface-container-low overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 fade-in-section transition-all duration-1000 opacity-0 translate-y-8">
            <div className="flex flex-col lg:flex-row items-center gap-10 sm:gap-16">
              <div className="lg:w-1/2">
                <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-6">Pensé pour les QA Managers</h2>
                <p className="text-sm text-on-surface-variant mb-6 sm:mb-8 leading-relaxed">
                  Rejoignez l'accès exclusif de l'équipe Alpha. Centralisez toutes vos recettes de test au même endroit, gérez les versions et collaborez avec vos ingénieurs QA en toute fluidité.
                </p>
                <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  {[
                    'Gestion centralisée des référentiels',
                    'Historique des versions et audits',
                    'Intégration native Jira & Azure DevOps',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-success shrink-0">check_circle</span>
                      <span className="text-sm text-on-surface">{item}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/convert')}
                  className="bg-primary text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg text-sm font-medium hover:opacity-90 transition-all cursor-pointer w-full sm:w-auto"
                >
                  Découvrir l'espace Alpha
                </button>
              </div>
              <div className="lg:w-1/2 relative w-full">
                <div
                  className="grid grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-8 rounded-2xl bg-surface-container-lowest/80 backdrop-blur-xl border border-outline-variant max-w-md mx-auto"
                >
                  <AvatarPlaceholder initials="AS" color="#00288e" />
                  <AvatarPlaceholder initials="MB" color="#0058be" />
                  <AvatarPlaceholder initials="CL" color="#2170e4" />
                  <AvatarPlaceholder initials="DR" color="#1e40af" />
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-secondary-fixed flex items-center justify-center text-primary font-bold text-xs sm:text-sm">+12</div>
                  <AvatarPlaceholder initials="EK" color="#3755c3" />
                  <AvatarPlaceholder initials="FP" color="#004395" />
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">add</span>
                  </div>
                </div>
                <div
                  className="hidden sm:flex absolute -bottom-6 -left-6 p-4 rounded-xl shadow-xl items-center gap-4 bg-surface-container-lowest/80 backdrop-blur-xl border border-outline-variant"
                >
                  <div className="w-10 h-10 bg-success-container text-success rounded-lg flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined">task_alt</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-on-surface-variant">Recette convertie</div>
                    <div className="text-sm font-bold text-on-background truncate">Scenario_Authentification.xlsx</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== PRICING SECTION ==================== */}
        <section id="pricing" className="py-16 sm:py-24 bg-surface-container-lowest">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 fade-in-section transition-all duration-1000 opacity-0 translate-y-8">
            <div className="text-center mb-12 sm:mb-16">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant text-xs font-semibold mb-4">
                <span className="material-symbols-outlined text-sm mr-1">payments</span>
                Tarification simple
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-primary mb-3 sm:mb-4">Des offres adaptées à votre équipe</h2>
              <p className="text-sm text-on-surface-variant max-w-2xl mx-auto px-4">
                Commencez gratuitement, évoluez selon vos besoins. Sans engagement, annulable à tout moment.
              </p>
            </div>

            <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
              {[
                {
                  name: 'Starter',
                  price: '0',
                  period: 'Gratuit',
                  desc: 'Pour découvrir la conversion intelligente.',
                  features: [
                    '5 conversions / mois',
                    'Export Excel standard',
                    '1 utilisateur',
                    'Support par email',
                  ],
                  highlighted: false,
                  cta: 'Commencer gratuitement',
                },
                {
                  name: 'Pro',
                  price: '29',
                  period: '/ mois',
                  desc: "Pour les équipes QA qui veulent aller vite.",
                  features: [
                    'Conversions illimitées',
                    'Analyse IA avancée',
                    "Jusqu'à 10 utilisateurs",
                    'Intégration Jira & Azure DevOps',
                    'Historique des versions',
                    'Support prioritaire',
                  ],
                  highlighted: true,
                  cta: 'Essayer 14 jours gratuits',
                },
                {
                  name: 'Entreprise',
                  price: 'Sur devis',
                  period: '',
                  desc: 'Pour les organisations avec besoins spécifiques.',
                  features: [
                    'Tout Pro inclus',
                    'Utilisateurs illimités',
                    'SSO & sécurité avancée',
                    'Déploiement on-premise possible',
                    'Account manager dédié',
                    'SLA garanti',
                  ],
                  highlighted: false,
                  cta: 'Contacter les ventes',
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl p-6 sm:p-8 transition-all ${
                    plan.highlighted
                      ? 'bg-primary-container border-2 border-primary shadow-2xl scale-100 md:scale-105 z-10'
                      : 'bg-surface-container-low border border-outline-variant hover:border-primary'
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-on-secondary text-xs font-bold px-3 py-1 rounded-full shadow-md whitespace-nowrap">
                      Le plus populaire
                    </span>
                  )}

                  <h3 className={`text-base sm:text-lg font-bold mb-1 ${plan.highlighted ? 'text-white' : 'text-on-background'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-xs sm:text-sm mb-4 sm:mb-6 ${plan.highlighted ? 'text-white/80' : 'text-on-surface-variant'}`}>
                    {plan.desc}
                  </p>

                  <div className="mb-6 sm:mb-8 flex items-end gap-1">
                    <span className={`text-3xl sm:text-4xl font-bold ${plan.highlighted ? 'text-white' : 'text-primary'}`}>
                      {plan.price !== 'Sur devis' && '€'}{plan.price}
                    </span>
                    {plan.period && (
                      <span className={`text-sm mb-1 ${plan.highlighted ? 'text-white/70' : 'text-on-surface-variant'}`}>
                        {plan.period}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5">
                        <span
                          className={`material-symbols-outlined text-lg shrink-0 ${
                            plan.highlighted ? 'text-white' : 'text-success'
                          }`}
                        >
                          check_circle
                        </span>
                        <span className={`text-sm ${plan.highlighted ? 'text-white/90' : 'text-on-surface'}`}>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => navigate('/convert')}
                    className={`w-full py-2.5 sm:py-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      plan.highlighted
                        ? 'bg-white text-primary hover:shadow-lg'
                        : 'bg-primary text-white hover:opacity-90'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>

            <p className="text-center text-xs sm:text-sm text-on-surface-variant mt-8 sm:mt-10">
              Tous les prix sont hors taxes. <a href="#" className="text-primary hover:underline font-medium">Voir la FAQ tarification →</a>
            </p>
          </div>
        </section>

        {/* ==================== CTA SECTION ==================== */}
        <section className="py-14 sm:py-16 bg-secondary-fixed">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 fade-in-section transition-all duration-1000 opacity-0 translate-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-primary-container rounded-2xl p-8 sm:p-12 shadow-xl">
              <div className="text-center md:text-left">
                <h3 className="text-lg sm:text-2xl font-bold text-white mb-2">Prêt à transformer vos recettes QA ?</h3>
                <p className="text-sm text-white/80 max-w-md">Rejoignez les équipes qui ont déjà gagné des centaines d'heures de documentation.</p>
              </div>
              <button
                onClick={() => navigate('/convert')}
                className="bg-white text-primary px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg text-sm font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                Démarrer maintenant
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ==================== FOOTER ==================== */}
      <footer id="help" className="bg-surface-container-low border-t border-outline-variant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">

            {/* Colonne 1 : Logo + description */}
            <div className="max-w-xs">
              <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-primary mb-3 sm:mb-4">
                <img src={logo_global_itec} alt="Global-itec Logo" className="w-6 h-6 rounded-md" />
                QA Recipe Converter
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Optimisez vos processus de test grâce à la puissance de l'IA et de la collaboration en temps réel.
              </p>
              <div className="flex gap-3 mt-4 sm:mt-6">
                {['language', 'share', 'link'].map((icon) => (
                  <span key={icon} className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-primary transition-colors">{icon}</span>
                ))}
              </div>
            </div>

            {/* Colonne 2 : Produit */}
            <div className="flex flex-col gap-2 sm:gap-3">
              <span className="text-sm font-bold text-on-surface mb-1">Produit</span>
              {['Fonctionnalités', 'Processus', 'Résultats', 'Tarifs'].map((link) => (
                <a key={link} href="#" className="text-sm text-on-surface-variant hover:text-secondary transition-colors">{link}</a>
              ))}
            </div>

            {/* Colonne 3 : Entreprise */}
            <div className="flex flex-col gap-2 sm:gap-3">
              <span className="text-sm font-bold text-on-surface mb-1">Entreprise</span>
              {['À propos', 'Blog', 'Carrières', 'Contact'].map((link) => (
                <a key={link} href="#" className="text-sm text-on-surface-variant hover:text-secondary transition-colors">{link}</a>
              ))}
            </div>

            {/* Colonne 4 : Contact réel Global-itec */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <span className="text-sm font-bold text-on-surface mb-1">Contactez-nous</span>

              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-lg shrink-0">location_on</span>
                <span className="text-sm text-on-surface-variant leading-relaxed">
                  {/* TODO: Remplacer par l'adresse réelle de Global-itec */}

                </span>
              </div>

              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-lg shrink-0">mail</span>
                <a
                  href="mailto:contact@global-itec.com"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors break-all"
                >

                </a>
              </div>

              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-lg shrink-0">call</span>
                <a
                  href="tel: +224 627 00 00 00"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >

                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-outline-variant py-4 sm:py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-on-surface-variant">
            <span>© 2026 QA Recipe Converter — Global-itec. Tous droits réservés.</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-primary transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-primary transition-colors">Conditions</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}