import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { login as apiLogin, LoginRequest } from '../api/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  token: null,
  login: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));

  const isAuthenticated = !!token;

  const login = useCallback(async (data: LoginRequest) => {
    const response = await apiLogin(data);
    const newToken = response.data.access_token;
    localStorage.setItem('admin_token', newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    setToken(null);
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem('admin_token');
      setToken(stored);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
