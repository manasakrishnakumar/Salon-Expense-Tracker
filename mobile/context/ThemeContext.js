import React, { createContext, useContext, useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/Colors';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        // Load saved theme preference
        AsyncStorage.getItem('theme').then(savedTheme => {
            if (savedTheme) {
                setIsDark(savedTheme === 'dark');
            }
        });
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    };

    const theme = isDark ? Colors.dark : Colors.light;

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, colors: theme }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
