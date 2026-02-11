import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TOKEN_STORAGE_KEY = 'token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const fetchUser = useCallback(async (activeToken = token) => {
    if (!activeToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${activeToken}` },
        withCredentials: true,
      });
      setUser(response.data);
    } catch (error) {
      console.error('Auth check failed:', error);
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, [token, clearAuth]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
    const nextToken = response.data?.token;
    const nextUser = response.data?.user;

    if (!nextToken || !nextUser) {
      throw new Error('Invalid login response from server.');
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    return nextUser;
  };

  const signup = async (name, email, password) => {
    const response = await axios.post(`${API}/auth/signup`, { name, email, password }, { withCredentials: true });
    const nextToken = response.data?.token;
    const nextUser = response.data?.user;

    if (!nextToken || !nextUser) {
      throw new Error('Invalid signup response from server.');
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    return nextUser;
  };

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const googleLogin = () => {
    throw new Error('Google login is not configured.');
  };

  const processOAuthCallback = async () => {
    throw new Error('OAuth callback is not used in this auth flow.');
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        logout,
        googleLogin,
        processOAuthCallback,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
