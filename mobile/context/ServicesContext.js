import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databases, DATABASE_ID, SERVICE_RECORDS_COLLECTION_ID, ID, Query } from '../lib/appwrite';
import { useAuth } from './AuthContext';
import { ALL_SERVICES, getServiceById, getServicesByCategory, SERVICE_CATEGORIES } from '../data/services';

const ServicesContext = createContext();

export const useServices = () => useContext(ServicesContext);

export const ServicesProvider = ({ children }) => {
    const [serviceRecords, setServiceRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const { user, isLoggedIn } = useAuth();

    useEffect(() => {
        if (isLoggedIn && user) {
            loadServiceRecords();
        } else {
            setServiceRecords([]);
        }
    }, [isLoggedIn, user]);

    // Load service records from Appwrite
    const loadServiceRecords = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                SERVICE_RECORDS_COLLECTION_ID,
                [
                    Query.equal('userID', user.$id),
                    Query.orderDesc('$createdAt'),
                    Query.limit(100)
                ]
            );
            setServiceRecords(response.documents);
            // Cache locally for offline access
            await AsyncStorage.setItem('salonServiceRecords', JSON.stringify(response.documents));
        } catch (error) {
            console.error('Error loading service records:', error);
            // Fallback to cached data
            try {
                const cached = await AsyncStorage.getItem('salonServiceRecords');
                if (cached) {
                    setServiceRecords(JSON.parse(cached));
                }
            } catch (cacheError) {
                console.error('Error loading cached service records:', cacheError);
            }
        } finally {
            setLoading(false);
        }
    };

    // Record a new service
    const recordService = async (serviceId, workerName = '', quantity = 1) => {
        if (!user) return { success: false, error: 'Not logged in' };

        const service = getServiceById(serviceId);
        if (!service) return { success: false, error: 'Service not found' };

        const totalCost = service.cost ? service.cost * quantity : 0;

        try {
            const newRecord = await databases.createDocument(
                DATABASE_ID,
                SERVICE_RECORDS_COLLECTION_ID,
                ID.unique(),
                {
                    userID: user.$id,
                    userName: user.name || 'Unknown',
                    serviceID: service.id,
                    serviceName: service.name,
                    category: service.category,
                    unitCost: service.cost || 0,
                    quantity: quantity,
                    totalCost: totalCost,
                    WorkerName: workerName,
                    Date: new Date().toISOString(),
                }
            );
            setServiceRecords(prev => [newRecord, ...prev]);
            return { success: true, record: newRecord };
        } catch (error) {
            console.error('Error recording service:', error);
            return { success: false, error: error.message };
        }
    };

    // Delete a service record
    const deleteServiceRecord = async (id) => {
        try {
            await databases.deleteDocument(DATABASE_ID, SERVICE_RECORDS_COLLECTION_ID, id);
            setServiceRecords(prev => prev.filter(rec => rec.$id !== id));
            return { success: true };
        } catch (error) {
            console.error('Error deleting service record:', error);
            return { success: false, error: error.message };
        }
    };

    // Get today's service count
    const getTodayServiceCount = () => {
        const today = new Date().toISOString().split('T')[0];
        return serviceRecords.filter(rec => rec.Date?.startsWith(today)).length;
    };

    // Get today's total cost
    const getTodayTotalCost = () => {
        const today = new Date().toISOString().split('T')[0];
        return serviceRecords
            .filter(rec => rec.Date?.startsWith(today))
            .reduce((sum, rec) => sum + (rec.totalCost || 0), 0);
    };

    // Get monthly total cost
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

    // Get service counts by category for today
    const getTodayServicesByCategory = () => {
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = serviceRecords.filter(rec => rec.Date?.startsWith(today));

        const counts = {};
        Object.values(SERVICE_CATEGORIES).forEach(cat => {
            counts[cat] = todayRecords.filter(rec => rec.category === cat).length;
        });
        return counts;
    };

    return (
        <ServicesContext.Provider value={{
            services: ALL_SERVICES,
            serviceRecords,
            loading,
            recordService,
            deleteServiceRecord,
            getServicesByCategory,
            getServiceById,
            getTodayServiceCount,
            getTodayTotalCost,
            getMonthlyServiceCost,
            getTodayServicesByCategory,
            refreshServiceRecords: loadServiceRecords
        }}>
            {children}
        </ServicesContext.Provider>
    );
};
