import React, { createContext, useState, useContext, useEffect } from 'react';
import { account, ID, clearBackendAuthToken } from '../lib/appwrite';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// role/ownerId are set server-side (backend/src/middleware/auth.js) on this
// account's own Appwrite prefs — read-only from here. A brand-new account
// won't have them yet until its first authenticated call to our backend
// triggers the owner-of-self bootstrap, so we default to 'owner' for
// display purposes in the meantime (matches what the backend sets moments
// later, on the first API call any page makes).
async function loadUserWithPrefs() {
  const currentUser = await account.get();
  const prefs = await account.getPrefs().catch(() => ({}));
  return { ...currentUser, role: prefs.role || 'owner', ownerId: prefs.ownerId || currentUser.$id };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      setUser(await loadUserWithPrefs());
      setIsLoggedIn(true);
    } catch {
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      await account.createEmailPasswordSession(email, password);
      setUser(await loadUserWithPrefs());
      setIsLoggedIn(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password, name) => {
    try {
      await account.create(ID.unique(), email, password, name);
      await login(email, password);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
    } catch (e) {
      console.error(e);
    } finally {
      clearBackendAuthToken();
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};
