import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { useAuth } from './AuthContext';

const ServicesContext = createContext();

export const useServices = () => useContext(ServicesContext);

export const ServicesProvider = ({ children }) => {
    const [services, setServices] = useState([]);
    const [serviceRecords, setServiceRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const { user, isLoggedIn } = useAuth();

    useEffect(() => {
        if (isLoggedIn && user) {
            loadAll();
        } else {
            setServices([]);
            setServiceRecords([]);
        }
    }, [isLoggedIn, user]);

    // Catalog + records both come from the backend now — a worker's catalog
    // response has cost/margin stripped server-side.
    const loadAll = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const [catalogRes, recordsRes] = await Promise.all([
                apiGet('/api/services'),
                apiGet('/api/service-records'),
            ]);
            setServices(catalogRes.services);
            setServiceRecords(recordsRes.records);
            await AsyncStorage.setItem('salonServices', JSON.stringify(catalogRes.services));
            await AsyncStorage.setItem('salonServiceRecords', JSON.stringify(recordsRes.records));
        } catch (error) {
            console.error('Error loading services:', error);
            try {
                const cachedServices = await AsyncStorage.getItem('salonServices');
                if (cachedServices) setServices(JSON.parse(cachedServices));
                const cachedRecords = await AsyncStorage.getItem('salonServiceRecords');
                if (cachedRecords) setServiceRecords(JSON.parse(cachedRecords));
            } catch (cacheError) {
                console.error('Error loading cached services:', cacheError);
            }
        } finally {
            setLoading(false);
        }
    };

    // Record a new service — server computes unitCost/totalCost and
    // unitPrice/totalPrice from the catalog + this owner's price; nothing
    // money-related is trusted from this call. `extras` optionally carries
    // { tip, customerId, customerName } — same fields web's ServiceModal
    // sends.
    const recordService = async (serviceId, workerName = '', quantity = 1, extras = {}) => {
        if (!user) return { success: false, error: 'Not logged in' };

        try {
            const { record } = await apiPost('/api/service-records', {
                serviceId,
                workerName,
                quantity,
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

    // Delete a service record (owner-only server-side)
    const deleteServiceRecord = async (id) => {
        try {
            await apiDelete(`/api/service-records/${id}`);
            setServiceRecords(prev => prev.filter(rec => rec.$id !== id));
            return { success: true };
        } catch (error) {
            console.error('Error deleting service record:', error);
            return { success: false, error: error.message };
        }
    };

    const getServiceById = (id) => services.find(s => s.id === id);
    const getServicesByCategory = (category) => services.filter(s => s.category === category);

    const getTodayServiceCount = () => {
        const today = new Date().toISOString().split('T')[0];
        return serviceRecords.filter(rec => rec.Date?.startsWith(today)).length;
    };

    // "Cost" = internal product-usage cost (never shown to a customer).
    const getTodayTotalCost = () => {
        const today = new Date().toISOString().split('T')[0];
        return serviceRecords
            .filter(rec => rec.Date?.startsWith(today))
            .reduce((sum, rec) => sum + (rec.totalCost || 0), 0);
    };

    const getMonthlyServiceCost = () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return serviceRecords
            .filter(rec => {
                const recDate = new Date(rec.Date);
                return recDate.getMonth() === currentMonth && recDate.getFullYear() === currentYear;
            })
            .reduce((sum, rec) => sum + (rec.totalCost || 0), 0);
    };

    // "Revenue" = what was actually charged (totalPrice) — a distinct
    // number from cost above. This is what the dashboard should show as
    // "Revenue" (fixes the bug where it used to show product cost instead).
    const getTodayRevenue = () => {
        const today = new Date().toISOString().split('T')[0];
        return serviceRecords
            .filter(rec => rec.Date?.startsWith(today))
            .reduce((sum, rec) => sum + (rec.totalPrice || 0), 0);
    };

    const getMonthlyRevenue = () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return serviceRecords
            .filter(rec => {
                const recDate = new Date(rec.Date);
                return recDate.getMonth() === currentMonth && recDate.getFullYear() === currentYear;
            })
            .reduce((sum, rec) => sum + (rec.totalPrice || 0), 0);
    };

    const getTodayTips = () => {
        const today = new Date().toISOString().split('T')[0];
        return serviceRecords
            .filter(rec => rec.Date?.startsWith(today))
            .reduce((sum, rec) => sum + (rec.tip || 0), 0);
    };

    const getTodayServicesByCategory = () => {
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = serviceRecords.filter(rec => rec.Date?.startsWith(today));

        const counts = {};
        todayRecords.forEach(rec => {
            counts[rec.category] = (counts[rec.category] || 0) + 1;
        });
        return counts;
    };

    return (
        <ServicesContext.Provider value={{
            services,
            serviceRecords,
            loading,
            recordService,
            deleteServiceRecord,
            getServicesByCategory,
            getServiceById,
            getTodayServiceCount,
            getTodayTotalCost,
            getMonthlyServiceCost,
            getTodayRevenue,
            getMonthlyRevenue,
            getTodayTips,
            getTodayServicesByCategory,
            refreshServiceRecords: loadAll
        }}>
            {children}
        </ServicesContext.Provider>
    );
};
