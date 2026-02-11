import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

const FIREBASE_API_KEY = process.env.REACT_APP_FIREBASE_API_KEY;
const FIREBASE_AUTH_BASE = 'https://identitytoolkit.googleapis.com/v1';

const TOKEN_STORAGE_KEY = 'token';
const REFRESH_STORAGE_KEY = 'refreshToken';

const mapFirebaseError = (code) => {
  const errorMap = {
    EMAIL_EXISTS: 'An account with this email already exists.',
    OPERATION_NOT_ALLOWED: 'Email/password authentication is not enabled in Firebase.',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts. Please try again later.',
    EMAIL_NOT_FOUND: 'No account found with this email.',
    INVALID_PASSWORD: 'Incorrect password.',
    USER_DISABLED: 'This account has been disabled.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    WEAK_PASSWORD: 'Password should be at least 6 characters.',
    MISSING_PASSWORD: 'Please provide a password.',
    MISSING_EMAIL: 'Please provide an email address.',
    INVALID_ID_TOKEN: 'Your session has expired. Please log in again.',
  };

  return errorMap[code] || 'Authentication failed. Please try again.';
};

const ensureFirebaseConfig = () => {
  if (!FIREBASE_API_KEY) {
    throw new Error('Firebase is not configured. Set REACT_APP_FIREBASE_API_KEY in frontend/.env.');
  }
};

const firebaseRequest = async (endpoint, payload) => {
  ensureFirebaseConfig();

  const response = await fetch(`${FIREBASE_AUTH_BASE}/${endpoint}?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const firebaseCode = data?.error?.message;
    throw new Error(mapFirebaseError(firebaseCode));
  }

  return data;
};

const normalizeUser = (firebaseUser) => {
  if (!firebaseUser) return null;

  return {
    user_id: firebaseUser.localId,
    email: firebaseUser.email,
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const fetchUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await firebaseRequest('accounts:lookup', { idToken: token });
      const firebaseUser = response?.users?.[0];
      setUser(normalizeUser(firebaseUser));
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
    const response = await firebaseRequest('accounts:signInWithPassword', {
      email,
      password,
      returnSecureToken: true,
    });

    const nextToken = response.idToken;
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    localStorage.setItem(REFRESH_STORAGE_KEY, response.refreshToken || '');
    setToken(nextToken);

    const userData = normalizeUser({
      localId: response.localId,
      email: response.email,
      displayName: response.displayName,
    });
    setUser(userData);

    return userData;
  };

  const signup = async (name, email, password) => {
    const signUpResponse = await firebaseRequest('accounts:signUp', {
      email,
      password,
      returnSecureToken: true,
    });

    if (name) {
      await firebaseRequest('accounts:update', {
        idToken: signUpResponse.idToken,
        displayName: name,
        returnSecureToken: false,
      });
    }

    const nextToken = signUpResponse.idToken;
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    localStorage.setItem(REFRESH_STORAGE_KEY, signUpResponse.refreshToken || '');
    setToken(nextToken);

    const userData = normalizeUser({
      localId: signUpResponse.localId,
      email: signUpResponse.email,
      displayName: name,
    });
    setUser(userData);

    return userData;
  };

  const logout = useCallback(async () => {
    clearAuth();
  }, [clearAuth]);

  const googleLogin = () => {
    throw new Error('Google login is not configured in this Firebase integration yet.');
  };

  const processOAuthCallback = async () => {
    throw new Error('OAuth callback is not used with this Firebase auth flow.');
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
