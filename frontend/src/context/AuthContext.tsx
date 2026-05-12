import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../api/auth';
import type { User, LoginRequest, RegisterRequest } from '../api/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    let current: User | null = null;
    try {
      current = await authApi.getCurrentUser();
    } catch {
      current = null;
    }
    if (!current) {
      try {
        current = await authApi.refreshToken();
      } catch {
        current = null;
      }
    }
    setUser(current);
    setIsLoading(false);
  }

  async function login(data: LoginRequest) {
    const user = await authApi.login(data);
    setUser(user);
  }

  async function register(data: RegisterRequest) {
    const user = await authApi.register(data);
    setUser(user);
  }

  async function logout() {
    await authApi.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
