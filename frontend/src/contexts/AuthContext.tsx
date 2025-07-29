import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../utils/api';

interface User {
  _id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  isApproved: boolean;
  companyName?: string;
  approvalStatus?: 'not requested' | 'pending' | 'approved' | 'rejected';
  approvalRequestedAt?: Date;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = authAPI.getStoredUser();
        if (storedUser) {
          // Verify the stored user is still valid by fetching current user
          try {
            const currentUser = await authAPI.getCurrentUser();
            setUser(currentUser);
            // Update stored user info if it changed
            localStorage.setItem('user', JSON.stringify(currentUser));
          } catch (error) {
            // Token expired or invalid, clear stored user
            localStorage.removeItem('user');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authAPI.login({ email, password });
    setUser(response.user);
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authAPI.getCurrentUser();
      setUser(currentUser);
      localStorage.setItem('user', JSON.stringify(currentUser));
    } catch (error) {
      // If refresh fails, user is no longer authenticated
      localStorage.removeItem('user');
      setUser(null);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isLoggedIn: user !== null,
    isAdmin: user?.isAdmin === true,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 