import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { useAuth } from './AuthContext';

const WorkersContext = createContext();
export const useWorkers = () => useContext(WorkersContext);

// Owner-only.
export const WorkersProvider = ({ children }) => {
    const { user, isLoggedIn } = useAuth();
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isLoggedIn && user) {
            loadWorkers();
        } else {
            setWorkers([]);
        }
    }, [isLoggedIn, user]);

    const loadWorkers = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { workers } = await apiGet('/api/workers');
            setWorkers(workers);
        } catch (error) {
            console.error('Workers load error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Plain attribution name — no login attached.
    const addWorker = async (name) => {
        try {
            const { worker } = await apiPost('/api/workers', { name: name.trim() });
            setWorkers(prev => [...prev, worker].sort((a, b) => a.name.localeCompare(b.name)));
            return { success: true, worker };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    // Soft-delete server-side (isActive: false) — past service records
    // still reference this worker's name, so history stays intact.
    const deleteWorker = async (id) => {
        try {
            await apiDelete(`/api/workers/${id}`);
            setWorkers(prev => prev.filter(w => w.$id !== id));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    // Real login for a staff member, scoped to this owner's salon. The
    // backend generates the temp password itself now (shown on screen to
    // the admin to share manually) — the client only sends name+email.
    const inviteWorker = async ({ name, email }) => {
        try {
            const result = await apiPost('/api/workers/invite', { name, email });
            // A brand-new login also lands in the workers collection
            // server-side, so refresh the list to pick it up.
            await loadWorkers();
            return { success: true, ...result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    return (
        <WorkersContext.Provider value={{ workers, loading, addWorker, deleteWorker, inviteWorker, refreshWorkers: loadWorkers }}>
            {children}
        </WorkersContext.Provider>
    );
};
