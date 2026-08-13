import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { useAuth } from './AuthContext';

const ExpenseContext = createContext();

export const useExpenses = () => useContext(ExpenseContext);

export const ExpenseProvider = ({ children }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, isLoggedIn } = useAuth();

  const loadExpenses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { expenses } = await apiGet('/api/expenses');
      setExpenses(expenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isLoggedIn && user) loadExpenses();
    else setExpenses([]);
  }, [isLoggedIn, user, loadExpenses]);

  const addExpense = async (expense) => {
    try {
      const { expense: newExpense } = await apiPost('/api/expenses', {
        name: expense.name,
        amount: parseFloat(expense.amount),
        category: expense.category,
        date: expense.date,
      });
      setExpenses(prev => [newExpense, ...prev]);
      return { success: true };
    } catch (error) {
      console.error('Error adding expense:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteExpense = async (id) => {
    try {
      await apiDelete(`/api/expenses/${id}`);
      setExpenses(prev => prev.filter(exp => exp.$id !== id));
      return { success: true };
    } catch (error) {
      console.error('Error deleting expense:', error);
      return { success: false, error: error.message };
    }
  };

  const getMonthlyTotal = () => {
    const now = new Date();
    return expenses
      .filter(exp => {
        const d = new Date(exp.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  };

  const getTotalExpenses = () => expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  return (
    <ExpenseContext.Provider value={{
      expenses, loading, addExpense, deleteExpense,
      getMonthlyTotal, getTotalExpenses, refreshExpenses: loadExpenses,
    }}>
      {children}
    </ExpenseContext.Provider>
  );
};
