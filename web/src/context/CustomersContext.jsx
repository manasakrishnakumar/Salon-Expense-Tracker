import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import { useAuth } from './AuthContext';

const CustomersContext = createContext();
export const useCustomers = () => useContext(CustomersContext);

export const CustomersProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, isLoggedIn } = useAuth();

  const loadCustomers = useCallback(async () => {
    if (!user || user.role !== 'owner') return;
    setLoading(true);
    try {
      const res = await apiGet('/api/customers');
      setCustomers(res.customers || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isLoggedIn && user) loadCustomers();
    else setCustomers([]);
  }, [isLoggedIn, user, loadCustomers]);

  const addCustomer = async (data) => {
    try {
      const res = await apiPost('/api/customers', data);
      setCustomers(prev => [res.customer, ...prev]);
      return { success: true, customer: res.customer };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateCustomer = async (id, data) => {
    try {
      const res = await apiPut(`/api/customers/${id}`, data);
      setCustomers(prev => prev.map(c => c.$id === id ? res.customer : c));
      return { success: true, customer: res.customer };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteCustomer = async (id) => {
    try {
      await apiDelete(`/api/customers/${id}`);
      setCustomers(prev => prev.filter(c => c.$id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const getCustomerById = (id) => customers.find(c => c.$id === id);

  return (
    <CustomersContext.Provider value={{ customers, loading, addCustomer, updateCustomer, deleteCustomer, getCustomerById, refreshCustomers: loadCustomers }}>
      {children}
    </CustomersContext.Provider>
  );
};
