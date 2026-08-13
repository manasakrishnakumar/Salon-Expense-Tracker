import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExpenseProvider } from './context/ExpenseContext';
import { ServicesProvider } from './context/ServicesContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ServicesScreen from './screens/ServicesScreen';
import AnalysisScreen from './screens/AnalysisScreen';
import { ActivityIndicator, View, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Custom Tab Bar Component
function TabBar({ activeTab, setActiveTab }) {
  const { colors } = useTheme();

  return (
    <View style={styles.tabBarContainer}>
      <LinearGradient
        colors={colors.tabGradient}
        style={[styles.tabBarGradient, { borderTopColor: colors.border }]}
      >
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('expenses')}
        >
          <View style={[styles.iconContainer, activeTab === 'expenses' && styles.activeIconContainer]}>
            <Ionicons
              name={activeTab === 'expenses' ? "wallet" : "wallet-outline"}
              size={24}
              color={activeTab === 'expenses' ? '#FFF' : colors.textMuted}
            />
          </View>
          <Text style={[styles.tabLabel, { color: activeTab === 'expenses' ? colors.primary : colors.textMuted }]}>
            Expenses
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('services')}
        >
          <View style={[styles.iconContainer, activeTab === 'services' && styles.activeIconContainer]}>
            <Ionicons
              name={activeTab === 'services' ? "cut" : "cut-outline"}
              size={24}
              color={activeTab === 'services' ? '#FFF' : colors.textMuted}
            />
          </View>
          <Text style={[styles.tabLabel, { color: activeTab === 'services' ? colors.primary : colors.textMuted }]}>
            Services
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('analysis')}
        >
          <View style={[styles.iconContainer, activeTab === 'analysis' && styles.activeIconContainer]}>
            <Ionicons
              name={activeTab === 'analysis' ? "analytics" : "analytics-outline"}
              size={24}
              color={activeTab === 'analysis' ? '#FFF' : colors.textMuted}
            />
          </View>
          <Text style={[styles.tabLabel, { color: activeTab === 'analysis' ? colors.primary : colors.textMuted }]}>
            Analysis
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

function MainApp() {
  const [activeTab, setActiveTab] = useState('expenses');
  const { colors } = useTheme();

  const renderScreen = () => {
    switch (activeTab) {
      case 'expenses': return <HomeScreen />;
      case 'services': return <ServicesScreen />;
      case 'analysis': return <AnalysisScreen />;
      default: return <HomeScreen />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderScreen()}
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </View>
  );
}

function AppContent() {
  const { isLoggedIn, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.loadingLogo}>💇</Text>
        <Text style={[styles.loadingTitle, { color: colors.primary }]}>Salon Pro</Text>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return isLoggedIn ? <MainApp /> : <LoginScreen />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <ExpenseProvider>
          <ServicesProvider>
            <AppContent />
          </ServicesProvider>
        </ExpenseProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    fontSize: 72,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  tabBarGradient: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  activeIconContainer: {
    backgroundColor: '#A855F7', // Always primary for active background
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
  },
});
