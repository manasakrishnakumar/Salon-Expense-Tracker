import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { useAuth } from './AuthContext';

const ExpenseContext = createContext();

export const useExpenses = () => useContext(ExpenseContext);

export const ExpenseProvider = ({ children }) => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(false);
    const { user, isLoggedIn } = useAuth();

    useEffect(() => {
        if (isLoggedIn && user) {
            loadExpenses();
        } else {
            setExpenses([]);
        }
    }, [isLoggedIn, user]);

    // Load expenses from the backend (owner-only — a worker gets a 403,
    // which is expected: expenses are owner-only, same as on web).
    const loadExpenses = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const { expenses } = await apiGet('/api/expenses');
            setExpenses(expenses);
            await AsyncStorage.setItem('salonExpenses', JSON.stringify(expenses));
        } catch (error) {
            console.error('Error loading expenses:', error);
            if (error.status === 403) {
                // A worker landing here shouldn't see a stale owner's cache.
                setExpenses([]);
                return;
            }
            try {
                const cached = await AsyncStorage.getItem('salonExpenses');
                if (cached) {
                    setExpenses(JSON.parse(cached));
                }
            } catch (cacheError) {
                console.error('Error loading cached expenses:', cacheError);
            }
        } finally {
            setLoading(false);
        }
    };

    // Add expense via the backend — server-side owner-only check applies
    const addExpense = async (expense) => {
        if (!user) return { success: false, error: 'Not logged in' };

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

    // Delete expense via the backend
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
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return expenses
            .filter(exp => {
                const expDate = new Date(exp.date);
                return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
            })
            .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    };

    const getTotalExpenses = () => {
        return expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    };

    return (
        <ExpenseContext.Provider value={{
            expenses,
            loading,
            addExpense,
            deleteExpense,
            getMonthlyTotal,
            getTotalExpenses,
            refreshExpenses: loadExpenses
        }}>
            {children}
        </ExpenseContext.Provider>
    );
};
