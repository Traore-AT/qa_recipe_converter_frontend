import { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function PageLayout({ children, maxWidth = 'max-w-7xl' }: { children: ReactNode; maxWidth?: string }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Topbar />
      <main className="md:ml-64 pt-16 min-h-screen">
        <div className={`${maxWidth} mx-auto px-4 md:px-6 py-6 md:py-8 animate-fade-in`}>
          {children}
        </div>
      </main>
    </div>
  );
}
