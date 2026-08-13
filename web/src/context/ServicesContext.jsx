import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { useAuth } from './AuthContext';

const ServicesContext = createContext();

export const useServices = () => useContext(ServicesContext);

export const ServicesProvider = ({ children }) => {
  const [services, setServices] = useState([]);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, isLoggedIn } = useAuth();

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [catalogRes, recordsRes] = await Promise.all([
        apiGet('/api/services'),
        apiGet('/api/service-records'),
      ]);
      setServices(catalogRes.services);
      setServiceRecords(recordsRes.records);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isLoggedIn && user) loadAll();
    else { setServices([]); setServiceRecords([]); }
  }, [isLoggedIn, user, loadAll]);

  // The server computes unitCost/totalCost from the canonical catalog —
  // this call sends only the intent (which service, how many, who did it).
  const recordService = async (serviceId, workerName = '', quantity = 1, extras = {}) => {
    try {
      const { record } = await apiPost('/api/service-records', {
        serviceId, workerName, quantity,
        tip: extras.tip || 0,
        customerId: extras.customerId || '',
        customerName: extras.customerName || '',
      });
      setServiceRecords(prev => [record, ...prev]);
      return { success: true, record };
    } catch (error) {
      console.error('Error recording service:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteServiceRecord = async (id) => {
    try {
      await apiDelete(`/api/service-records/${id}`);
      setServiceRecords(prev => prev.filter(r => r.$id !== id));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const getServiceById = (id) => services.find(s => s.id === id);
  const getServicesByCategory = (category) => services.filter(s => s.category === category);

  const getTodayServiceCount = () => {
    const today = new Date().toISOString().split('T')[0];
    return serviceRecords.filter(r => r.Date?.startsWith(today)).length;
  };

  // "Cost" = what the product usage cost the salon (unitCost/totalCost on
  // the record). NOT what a customer paid — see getTodayRevenue below for
  // that. Keeping both distinct is the whole point of Phase 4's price field.
  const getTodayTotalCost = () => {
    const today = new Date().toISOString().split('T')[0];
    return serviceRecords
      .filter(r => r.Date?.startsWith(today))
      .reduce((sum, r) => sum + (r.totalCost || 0), 0);
  };

  const getMonthlyServiceCost = () => {
    const now = new Date();
    return serviceRecords
      .filter(r => {
        const d = new Date(r.Date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, r) => sum + (r.totalCost || 0), 0);
  };

  // "Revenue" = what was actually charged (unitPrice/totalPrice), computed
  // server-side from the owner's own price list. Records made before a
  // service had a price set will have totalPrice 0 — that's expected, not
  // a bug, until the owner backfills a price for that service.
  const getTodayRevenue = () => {
    const today = new Date().toISOString().split('T')[0];
    return serviceRecords
      .filter(r => r.Date?.startsWith(today))
      .reduce((sum, r) => sum + (r.totalPrice || 0), 0);
  };

  const getMonthlyRevenue = () => {
    const now = new Date();
    return serviceRecords
      .filter(r => {
        const d = new Date(r.Date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, r) => sum + (r.totalPrice || 0), 0);
  };

  const getTodayServicesByCategory = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = serviceRecords.filter(r => r.Date?.startsWith(today));
    const counts = {};
    todayRecords.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return counts;
  };

  return (
    <ServicesContext.Provider value={{
      services,
      serviceRecords, loading,
      recordService, deleteServiceRecord,
      getServicesByCategory, getServiceById,
      getTodayServiceCount, getTodayTotalCost,
      getMonthlyServiceCost, getTodayServicesByCategory,
      getTodayRevenue, getMonthlyRevenue,
      refreshServiceRecords: loadAll,
    }}>
      {children}
    </ServicesContext.Provider>
  );
};
