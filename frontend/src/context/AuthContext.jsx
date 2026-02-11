import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getUserFromToken = (jwtToken) => {
  if (!jwtToken) return null;
  try {
    const payloadBase64 = jwtToken.split('.')[1];
    if (!payloadBase64) return null;
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    return {
      user_id: payload.user_id,
      email: payload.email,
      name: payload.name,
    };
  } catch (error) {
    console.error('Failed to parse auth token payload:', error);
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/auth/me`, {
        headers,
        withCredentials: true
      });
      setUser(response.data);
    } catch (e) {
      console.error('Auth check failed:', e);
      const status = e?.response?.status;

      if (token && (status === 404 || status === 405)) {
        // Fallback for backends that only return JWT on login/signup and don't expose /auth/me
        setUser(getUserFromToken(token));
        return;
      }

      if (token) {
        localStorage.removeItem('token');
        setToken(null);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const newToken = response.data?.token;
    if (!newToken) {
      throw new Error('Authentication token missing from login response');
    }
    const userData = response.data?.user || getUserFromToken(newToken);
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const signup = async (name, email, password) => {
    const response = await axios.post(`${API}/auth/signup`, { name, email, password });
    const newToken = response.data?.token;
    if (!newToken) {
      throw new Error('Authentication token missing from signup response');
    }
    const userData = response.data?.user || getUserFromToken(newToken);
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const googleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const processOAuthCallback = async (sessionId) => {
    const response = await axios.get(`${API}/auth/session?session_id=${sessionId}`, {
      withCredentials: true
    });
    const newToken = response.data?.token;
    if (newToken) {
      localStorage.setItem('token', newToken);
      setToken(newToken);
    }

    const userData = response.data?.user || (newToken ? getUserFromToken(newToken) : response.data);
    setUser(userData);
    return userData;
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      signup,
      logout,
      googleLogin,
      processOAuthCallback,
      refreshUser,
      isAuthenticated: !!user
    }}>
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
