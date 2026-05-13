import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useEffect } from 'react';

export function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Floating decorative orbs — soft atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 -right-40 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-[0.18]"
        style={{
          background:
            'radial-gradient(circle, rgba(215,255,61,0.55), transparent 60%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 -left-40 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-[0.12]"
        style={{
          background:
            'radial-gradient(circle, rgba(64,120,220,0.5), transparent 60%)',
        }}
      />

      <Navbar />
      <main className="relative flex-1 z-10">
        <Outlet />
      </main>
    </div>
  );
}
