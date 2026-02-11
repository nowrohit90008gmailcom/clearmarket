import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { firebaseConfig } from '../lib/firebaseConfig';

const AuthContext = createContext();

const FIREBASE_API_KEY = process.env.REACT_APP_FIREBASE_API_KEY || firebaseConfig.apiKey;
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const FIREBASE_AUTH_BASE = 'https://identitytoolkit.googleapis.com/v1';
const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
    picture: firebaseUser.photoUrl || null,
  };
};

const fetchBackendProfile = async (token) => {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

const loadGoogleScript = async () => {
  if (window.google?.accounts?.oauth2) return;

  await new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-identity="true"]');
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services.')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
    document.head.appendChild(script);
  });
};

const requestGoogleAccessToken = async () => {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google login is not configured. Set REACT_APP_GOOGLE_CLIENT_ID in frontend/.env.');
  }

  await loadGoogleScript();

  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: (response) => {
        if (response?.error) {
          reject(new Error(response.error_description || 'Google sign-in was cancelled.'));
          return;
        }

        if (!response?.access_token) {
          reject(new Error('Google sign-in did not return an access token.'));
          return;
        }

        resolve(response.access_token);
      },
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });
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

  const hydrateSession = useCallback(async (authResponse) => {
    const nextToken = authResponse.idToken;
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    localStorage.setItem(REFRESH_STORAGE_KEY, authResponse.refreshToken || '');
    setToken(nextToken);

    const baseUser = normalizeUser({
      localId: authResponse.localId,
      email: authResponse.email,
      displayName: authResponse.displayName,
      photoUrl: authResponse.photoUrl,
    });

    const backendProfile = await fetchBackendProfile(nextToken);
    const userData = {
      ...baseUser,
      ...(backendProfile || {}),
    };

    setUser(userData);
    return userData;
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
      const baseUser = normalizeUser(firebaseUser);
      const backendProfile = await fetchBackendProfile(token);
      setUser({
        ...baseUser,
        ...(backendProfile || {}),
      });
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

    return hydrateSession(response);
  };

  const signup = async (name, email, password) => {
    const signUpResponse = await firebaseRequest('accounts:signUp', {
      email,
      password,
      returnSecureToken: true,
    });

    let authResponse = signUpResponse;

    if (name) {
      const updateResponse = await firebaseRequest('accounts:update', {
        idToken: signUpResponse.idToken,
        displayName: name,
        returnSecureToken: true,
      });

      authResponse = {
        ...signUpResponse,
        idToken: updateResponse.idToken || signUpResponse.idToken,
        refreshToken: updateResponse.refreshToken || signUpResponse.refreshToken,
        displayName: name,
      };
    }

    return hydrateSession(authResponse);
  };

  const googleLogin = async () => {
    const accessToken = await requestGoogleAccessToken();
    const response = await firebaseRequest('accounts:signInWithIdp', {
      requestUri: window.location.origin,
      postBody: `access_token=${encodeURIComponent(accessToken)}&providerId=google.com`,
      returnSecureToken: true,
      returnIdpCredential: true,
    });

    return hydrateSession(response);
  };

  const processOAuthCallback = async () => {
    throw new Error('OAuth callback is not used with this Firebase auth flow.');
  };

  const logout = useCallback(async () => {
    clearAuth();
  }, [clearAuth]);

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
