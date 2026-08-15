import React, { createContext, useState, useContext, useEffect } from 'react';
import { account, ID, clearBackendAuthToken } from '../lib/appwrite';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// role/ownerId are set server-side (backend/src/middleware/auth.js) on this
// account's own Appwrite prefs. A brand-new account won't have them yet
// until its first authenticated call to the backend triggers the
// owner-of-self bootstrap — default to 'owner' here in the meantime,
// matching what the backend sets moments later.
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

    // Check if user has an active session
    const checkSession = async () => {
        try {
            setUser(await loadUserWithPrefs());
            setIsLoggedIn(true);
        } catch (error) {
            // No active session
            setUser(null);
            setIsLoggedIn(false);
        } finally {
            setLoading(false);
        }
    };

    // Register a new user
    const register = async (email, password, name) => {
        try {
            await account.create(ID.unique(), email, password, name);
            // Auto-login after registration
            return await login(email, password);
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    // Login with email and password — returns the loaded user (with role)
    // so callers can validate "Admin tab vs Worker tab" the way web's
    // LoginPage does, before deciding whether to keep the session.
    const login = async (email, password) => {
        try {
            await account.createEmailPasswordSession(email, password);
            const loadedUser = await loadUserWithPrefs();
            setUser(loadedUser);
            setIsLoggedIn(true);
            return { success: true, user: loadedUser };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    // Logout
    const logout = async () => {
        try {
            await account.deleteSession('current');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            clearBackendAuthToken();
            setUser(null);
            setIsLoggedIn(false);
        }
    };

    // Requires the current password — used by the "Change Password" modal
    // available to any logged-in user (owner or worker), same as web's
    // Sidebar.
    const changePassword = async (newPassword, oldPassword) => {
        try {
            await account.updatePassword(newPassword, oldPassword);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    // Sends an Appwrite password-recovery email. The link inside it embeds
    // a userId+secret that only a web page can currently consume (see
    // web/src/pages/LoginPage.jsx's `?recovery=true` handling) — there's no
    // in-app deep-link flow here yet, so we point the redirect at the web
    // app (EXPO_PUBLIC_WEB_URL) and tell the user to finish there.
    const sendRecovery = async (email) => {
        try {
            const webUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://salon-pro.app';
            const redirectUrl = `${webUrl}?recovery=true`;
            await account.createRecovery(email, redirectUrl);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoggedIn,
            loading,
            login,
            logout,
            register,
            changePassword,
            sendRecovery,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
