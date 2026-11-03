import { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function PageLayout({ children, maxWidth = 'max-w-7xl' }: { children: ReactNode; maxWidth?: string }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Topbar />
      <main className="min-w-0 w-full md:ml-64 md:w-[calc(100%_-_16rem)] pt-16 min-h-screen">
        <div className={`${maxWidth} min-w-0 mx-auto px-3 sm:px-4 md:px-6 py-5 sm:py-6 md:py-8 animate-fade-in`}>
          {children}
        </div>
      </main>
    </div>
  );
}
