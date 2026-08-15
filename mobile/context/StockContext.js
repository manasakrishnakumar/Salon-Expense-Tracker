import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet, apiPost } from '../lib/api';
import { useAuth } from './AuthContext';

const StockContext = createContext();
export const useStock = () => useContext(StockContext);

// Owner-only. Stock is computed server-side (backend/src/logic/stockService.js)
// from the full restock + service-record + write-off history; this context
// just displays whatever the backend reports.
export const StockProvider = ({ children }) => {
    const { user, isLoggedIn } = useAuth();
    const [products, setProducts] = useState([]);
    const [productStockMap, setProductStockMap] = useState({});
    const [restockHistory, setRestockHistory] = useState([]);
    const [adjustments, setAdjustments] = useState([]);
    const [reorderSuggestions, setReorderSuggestions] = useState([]);
    const [totalInventoryValue, setTotalInventoryValue] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isLoggedIn && user) {
            loadAll();
        } else {
            setProducts([]);
            setProductStockMap({});
            setRestockHistory([]);
            setAdjustments([]);
            setReorderSuggestions([]);
            setTotalInventoryValue(0);
        }
    }, [isLoggedIn, user]);

    const loadAll = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [statusRes, restockRes] = await Promise.all([
                apiGet('/api/products/status'),
                apiGet('/api/restock'),
            ]);
            setProducts(statusRes.products);
            setProductStockMap(statusRes.stock);
            setTotalInventoryValue(statusRes.totalInventoryValue);
            setAdjustments(statusRes.adjustments || []);
            setReorderSuggestions(statusRes.reorderSuggestions || []);
            setRestockHistory(restockRes.restockHistory);
            await AsyncStorage.setItem('salonStockStatus', JSON.stringify(statusRes));
        } catch (error) {
            console.error('Stock load error:', error);
            if (error.status === 403) {
                // A worker landing here shouldn't see a stale owner's cache.
                return;
            }
            try {
                const cached = await AsyncStorage.getItem('salonStockStatus');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    setProducts(parsed.products || []);
                    setProductStockMap(parsed.stock || {});
                    setTotalInventoryValue(parsed.totalInventoryValue || 0);
                    setAdjustments(parsed.adjustments || []);
                    setReorderSuggestions(parsed.reorderSuggestions || []);
                }
            } catch (cacheError) {
                console.error('Error loading cached stock status:', cacheError);
            }
        } finally {
            setLoading(false);
        }
    };

    const addRestock = async ({ productName, quantityAdded, unit, purchasePrice, supplier, date }) => {
        try {
            await apiPost('/api/restock', {
                productName,
                quantityAdded: parseFloat(quantityAdded),
                unit: unit || 'g',
                purchasePrice: parseFloat(purchasePrice) || 0,
                supplier: supplier || '',
                date: date || new Date().toISOString().split('T')[0],
            });
            await loadAll(); // stock map depends on the new total, easiest to refetch
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    // Write off stock lost to wastage, theft, expiry, etc. — subtracted
    // from `remaining` server-side alongside restock/usage history.
    const addAdjustment = async ({ productName, quantityRemoved, reason, notes, date }) => {
        try {
            await apiPost('/api/stock-adjustments', {
                productName,
                quantityRemoved: parseFloat(quantityRemoved),
                reason: reason || 'wastage',
                notes: notes || '',
                date: date || new Date().toISOString().split('T')[0],
            });
            await loadAll();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const getLowStockProducts = () => Object.values(productStockMap).filter(p => p.isLowStock);
    const getNeverRestockedProducts = () => Object.values(productStockMap).filter(p => p.neverRestocked);
    const getTotalInventoryValue = () => totalInventoryValue;

    return (
        <StockContext.Provider value={{
            products, productStockMap, restockHistory, adjustments, reorderSuggestions, loading,
            addRestock, addAdjustment, getLowStockProducts, getNeverRestockedProducts, getTotalInventoryValue,
            refreshStock: loadAll,
        }}>
            {children}
        </StockContext.Provider>
    );
};
