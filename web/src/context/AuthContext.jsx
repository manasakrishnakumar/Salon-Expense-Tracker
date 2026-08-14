import React, { createContext, useState, useContext, useEffect } from 'react';
import { account, ID } from '../lib/appwrite';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'salon_auth_token';
const USER_KEY  = 'salon_auth_user';

// ── Token storage (localStorage — cross-domain safe, no cookies) ───────────
export function saveAuthData(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
}

export function clearAuthData() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  // Also clear old session keys
  localStorage.removeItem('salon_session_secret');
}

export const AuthProvider = ({ children }) => {
  const [user, setUser]         = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  // ── Check session on app load ─────────────────────────────────────────
  const checkSession = async () => {
    const token = getStoredToken();
    const stored = getStoredUser();

    if (!token) {
      setLoading(false);
      return;
    }

    // Use stored user immediately to avoid flash
    if (stored) {
      setUser(stored);
      setIsLoggedIn(true);
    }

    // Verify token with backend (silent — don't show errors to user)
    try {
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setIsLoggedIn(true);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      } else {
        // Token invalid/expired — log out silently
        clearAuthData();
        setUser(null);
        setIsLoggedIn(false);
      }
    } catch {
      // Network error — keep using stored user (offline-friendly)
      if (!stored) {
        setUser(null);
        setIsLoggedIn(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Login via backend proxy ────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid email or password' };
      }

      saveAuthData(data.token, data.user);
      setUser(data.user);
      setIsLoggedIn(true);
      return { success: true, user: data.user };
    } catch {
      return { success: false, error: 'Could not reach server. Check your internet connection.' };
    }
  };

  // ── Register (new admin sign-up — still goes to Appwrite directly) ────
  const register = async (email, password, name) => {
    try {
      // Create Appwrite account (the backend bootstraps prefs on first API call)
      await account.create(ID.unique(), email, password, name);
      // Log in via our proxy so token is issued
      return await login(email, password);
    } catch (error) {
      // Try login if account already exists
      if (error?.code === 409) return await login(email, password);
      return { success: false, error: error.message };
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────
  const logout = async () => {
    clearAuthData();
    setUser(null);
    setIsLoggedIn(false);
  };

  // ── Change password (via backend — no Appwrite client session needed) ──
  const changePassword = async (newPassword, oldPassword) => {
    // oldPassword used for UX validation only — admin SDK changes it directly
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.' };
    }
    try {
      const token = getStoredToken();
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Failed to change password' };
      return { success: true };
    } catch {
      return { success: false, error: 'Could not reach server.' };
    }
  };

  // ── Password recovery (Appwrite handles email — OK to call directly) ──
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
