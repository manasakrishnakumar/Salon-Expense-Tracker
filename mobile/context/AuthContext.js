import React, { createContext, useState, useContext, useEffect } from 'react';
import { account, ID } from '../lib/appwrite';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

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
            const currentUser = await account.get();
            setUser(currentUser);
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
            await login(email, password);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    // Login with email and password
    const login = async (email, password) => {
        try {
            await account.createEmailPasswordSession(email, password);
            const currentUser = await account.get();
            setUser(currentUser);
            setIsLoggedIn(true);
            return { success: true };
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
            setUser(null);
            setIsLoggedIn(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoggedIn,
            loading,
            login,
            logout,
            register
        }}>
            {children}
        </AuthContext.Provider>
    );
};
