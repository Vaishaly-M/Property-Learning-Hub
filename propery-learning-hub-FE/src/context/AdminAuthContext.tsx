//context/AdminAuthContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'super_admin' | 'instructor' | 'learner';
  status: string;
  profile_completed?: boolean;
  free_invite_pending?: boolean;
  permissions?: string[];
}

interface AdminAuthContextType {
  admin: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (token: string, user: AuthUser, remember?: boolean, redirectTo?: string) => void;
  establishSession: (token: string, user: AuthUser, remember?: boolean) => void;
  logout: () => Promise<void>;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined
);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser) as AuthUser;
          setToken(storedToken);
          setAdmin(parsedUser);

          const needsPermissionRefresh =
            ['learner', 'instructor', 'admin'].includes(parsedUser.role) &&
            (!parsedUser.permissions?.length ||
              !parsedUser.permissions.includes('chat.view'));

          if (needsPermissionRefresh) {
            try {
              const response = await fetch(`${API_BASE_URL}/user`, {
                headers: {
                  Authorization: `Bearer ${storedToken}`,
                  Accept: 'application/json',
                },
              });

              if (response.ok) {
                const data = await response.json();
                const refreshedUser = { ...parsedUser, ...data.user };
                setAdmin(refreshedUser);
                localStorage.setItem('user', JSON.stringify(refreshedUser));
              }
            } catch (refreshError) {
              console.error('Error refreshing user permissions:', refreshError);
            }
          }
        }
      } catch (error) {
        console.error('Error restoring auth state:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    restoreAuth();
  }, []);

  const getRedirectPath = (user: AuthUser): string => {
    if (user.role === 'admin' || user.role === 'super_admin') return '/admin/dashboard';

    if (!user.profile_completed) {
      if (user.role === 'learner') return '/profile/learner';
      if (user.role === 'instructor') return '/profile/instructor';
    }

    if (user.role === 'instructor') return '/instructor/dashboard';
    if (user.role === 'learner') return '/learn';

    return '/';
  };

  const establishSession = (newToken: string, user: AuthUser, remember = true) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(user));

    if (remember) {
      document.cookie = `token=${newToken}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
    }

    setToken(newToken);
    setAdmin(user);
  };

  const login = (newToken: string, user: AuthUser, remember = false, redirectTo?: string) => {
    establishSession(newToken, user, remember);
    router.push(redirectTo || getRedirectPath(user));
  };

  const logout = async (): Promise<void> => {
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAdmin(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
      router.push('/login');
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        token,
        isLoading,
        isInitialized,
        login,
        establishSession,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }

  return context;
}