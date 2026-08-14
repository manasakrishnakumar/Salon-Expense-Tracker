import React, { createContext, useState, useContext, useEffect } from 'react';
import { account, ID, clearBackendAuthToken, saveSession, restoreSession, clearSession } from '../lib/appwrite';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// ── Load user profile from Appwrite ────────────────────────────────────────
async function loadUserWithPrefs() {
  const currentUser = await account.get();
  const prefs = await account.getPrefs().catch(() => ({}));
  return { ...currentUser, role: prefs.role || 'owner', ownerId: prefs.ownerId || currentUser.$id };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser]         = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    // Restore session from localStorage so the Appwrite SDK uses the
    // X-Appwrite-Session header (cross-domain safe, no cookie needed)
    restoreSession();
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      setUser(await loadUserWithPrefs());
      setIsLoggedIn(true);
    } catch {
      clearSession();
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  // ── Login via backend proxy ────────────────────────────────────────────
  // The proxy calls Appwrite server-to-server (no CORS/cookie restriction)
  // and returns the session secret so we can use header-based auth.
  const login = async (email, password) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid email or password' };
      }

      // Store session secret → SDK uses X-Appwrite-Session header from now on
      if (data.sessionSecret) {
        saveSession(data.sessionSecret);
      }

      const loadedUser = await loadUserWithPrefs();
      setUser(loadedUser);
      setIsLoggedIn(true);
      return { success: true, user: loadedUser };
    } catch (error) {
      return { success: false, error: 'Could not reach the server. Check your connection.' };
    }
  };

  // ── Register (self-registration, goes direct to Appwrite) ─────────────
  const register = async (email, password, name) => {
    try {
      await account.create(ID.unique(), email, password, name);
      // After creating account, log in via proxy so session is header-based
      const result = await login(email, password);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await account.deleteSession('current');
    } catch { /* ignore — session might already be expired */ }
    clearSession();
    clearBackendAuthToken();
    setUser(null);
    setIsLoggedIn(false);
  };

  // ── Change password ────────────────────────────────────────────────────
  const changePassword = async (newPassword, oldPassword) => {
    try {
      await account.updatePassword(newPassword, oldPassword);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // ── Password recovery ──────────────────────────────────────────────────
  const sendRecovery = async (email) => {
    try {
      const redirectUrl = `${window.location.origin}?recovery=true`;
      await account.createRecovery(email, redirectUrl);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const confirmRecovery = async (userId, secret, newPassword) => {
    try {
      await account.updateRecovery(userId, secret, newPassword);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, loading, login, logout, register, changePassword, sendRecovery, confirmRecovery }}>
      {children}
    </AuthContext.Provider>
  );
};
