import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databases, DATABASE_ID, EXPENSES_COLLECTION_ID, ID, Query } from '../lib/appwrite';
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

    // Load expenses from Appwrite
    const loadExpenses = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                EXPENSES_COLLECTION_ID,
                [
                    Query.equal('userID', user.$id),
                    Query.orderDesc('$createdAt')
                ]
            );
            setExpenses(response.documents);
            // Cache locally for offline access
            await AsyncStorage.setItem('salonExpenses', JSON.stringify(response.documents));
        } catch (error) {
            console.error('Error loading expenses:', error);
            // Fallback to cached data
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

    // Add expense to Appwrite
    const addExpense = async (expense) => {
        if (!user) return { success: false, error: 'Not logged in' };

        try {
            const newExpense = await databases.createDocument(
                DATABASE_ID,
                EXPENSES_COLLECTION_ID,
                ID.unique(),
                {
                    userID: user.$id,
                    userName: user.name || 'Unknown',
                    userEmail: user.email,
                    name: expense.name,
                    amount: parseFloat(expense.amount),
                    category: expense.category,
                    date: expense.date,
                }
            );
            setExpenses(prev => [newExpense, ...prev]);
            return { success: true };
        } catch (error) {
            console.error('Error adding expense:', error);
            return { success: false, error: error.message };
        }
    };

    // Delete expense from Appwrite
    const deleteExpense = async (id) => {
        try {
            await databases.deleteDocument(DATABASE_ID, EXPENSES_COLLECTION_ID, id);
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
