import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="w-8 h-8 text-[color:var(--color-volt-200)] animate-spin" />
          <div aria-hidden className="absolute inset-0 blur-xl bg-[color:var(--color-volt-200)]/30 rounded-full" />
        </div>
        <p className="font-mono text-[0.7rem] tracking-[0.3em] uppercase text-[color:var(--color-ink-300)]">
          Authorizing manager…
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
