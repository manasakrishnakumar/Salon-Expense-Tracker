import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
    const { isDark, toggleTheme, colors } = useTheme();

    return (
        <TouchableOpacity
            style={[styles.themeToggle, { backgroundColor: colors.glass, borderColor: colors.border }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
        >
            <Ionicons
                name={isDark ? "sunny" : "moon"}
                size={20}
                color={isDark ? "#FBBF24" : colors.primary}
            />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    themeToggle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    }
});
