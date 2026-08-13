import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { useAuth } from './AuthContext';

const WorkersContext = createContext();
export const useWorkers = () => useContext(WorkersContext);

export const WorkersProvider = ({ children }) => {
  const { user, isLoggedIn } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadWorkers = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    if (isLoggedIn && user) loadWorkers();
    else setWorkers([]);
  }, [isLoggedIn, user, loadWorkers]);

  const addWorker = async (name) => {
    try {
      const { worker } = await apiPost('/api/workers', { name: name.trim() });
      setWorkers(prev => [...prev, worker].sort((a, b) => a.name.localeCompare(b.name)));
      return { success: true, worker };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Soft-delete server-side (isActive: false) — past service records still
  // reference this worker's name, so history stays intact.
  const deleteWorker = async (id) => {
    try {
      await apiDelete(`/api/workers/${id}`);
      setWorkers(prev => prev.filter(w => w.$id !== id));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <WorkersContext.Provider value={{ workers, loading, addWorker, deleteWorker, refreshWorkers: loadWorkers }}>
      {children}
    </WorkersContext.Provider>
  );
};
