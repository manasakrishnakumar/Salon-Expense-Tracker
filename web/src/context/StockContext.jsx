import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { useAuth } from './AuthContext';

const StockContext = createContext();
export const useStock = () => useContext(StockContext);

export const StockProvider = ({ children }) => {
  const { user, isLoggedIn } = useAuth();
  const [products, setProducts] = useState([]);
  const [productStockMap, setProductStockMap] = useState({});
  const [restockHistory, setRestockHistory] = useState([]);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [loading, setLoading] = useState(false);

  // Stock is computed server-side (backend/src/logic/stockService.js) from
  // the full restock + service-record history — this context just displays
  // whatever the backend reports, instead of recomputing it itself.
  const loadAll = useCallback(async () => {
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
      setRestockHistory(restockRes.restockHistory);
    } catch (error) {
      console.error('Stock load error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isLoggedIn && user) loadAll();
    else { setProducts([]); setProductStockMap({}); setRestockHistory([]); setTotalInventoryValue(0); }
  }, [isLoggedIn, user, loadAll]);

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

  const getLowStockProducts = () => Object.values(productStockMap).filter(p => p.isLowStock);
  const getNeverRestockedProducts = () => Object.values(productStockMap).filter(p => p.neverRestocked);
  const getTotalInventoryValue = () => totalInventoryValue;

  return (
    <StockContext.Provider value={{
      products, productStockMap, restockHistory, loading,
      addRestock, getLowStockProducts, getNeverRestockedProducts, getTotalInventoryValue,
      refreshStock: loadAll,
    }}>
      {children}
    </StockContext.Provider>
  );
};
