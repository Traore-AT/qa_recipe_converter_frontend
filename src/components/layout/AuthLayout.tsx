import type { ReactNode } from 'react';
import logo_global_itec from '../../assets/logo_global.jpeg';

export function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-3 mb-2">
            <img src={logo_global_itec} alt="Global-itec Logo" className="w-14 h-14 rounded-xl shadow-md" />
            <span className="text-headline-md text-on-surface font-bold">Global-itec</span>
          </div>
          <h1 className="text-headline-lg font-bold text-on-surface mt-6">{title}</h1>
          {subtitle && <p className="text-body-base text-on-surface-variant mt-2">{subtitle}</p>}
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 sm:p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
