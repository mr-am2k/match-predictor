import { Link, useLocation } from 'react-router-dom';
import { Trophy, LogIn, UserPlus, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
              <Trophy className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="font-bold text-xl text-gray-900">Match Predictor</span>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-600 hidden sm:block">
                  Welcome, <span className="font-medium text-gray-900">{user?.username}</span>
                </span>
                {location.pathname !== '/dashboard' && (
                  <Link to="/dashboard">
                    <Button variant="ghost" size="sm" icon={<LayoutDashboard className="w-4 h-4" />}>
                      Dashboard
                    </Button>
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={handleLogout} icon={<LogOut className="w-4 h-4" />}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" icon={<LogIn className="w-4 h-4" />}>
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm" icon={<UserPlus className="w-4 h-4" />}>
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
