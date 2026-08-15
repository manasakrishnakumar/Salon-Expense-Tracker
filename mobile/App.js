import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExpenseProvider } from './context/ExpenseContext';
import { ServicesProvider } from './context/ServicesContext';
import { StockProvider } from './context/StockContext';
import { WorkersProvider } from './context/WorkersContext';
import { CustomersProvider } from './context/CustomersContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ServicesScreen from './screens/ServicesScreen';
import StockScreen from './screens/StockScreen';
import WorkersScreen from './screens/WorkersScreen';
import CustomersScreen from './screens/CustomersScreen';
import AnalysisScreen from './screens/AnalysisScreen';
import WorkerDashboardScreen from './screens/WorkerDashboardScreen';
import { ActivityIndicator, View, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Same tabs an owner sees on web's Sidebar, plus a worker-only "Dashboard"
// tab (web's "My Dashboard") that becomes the default landing tab for a
// worker instead of Expenses. Everything else here is owner-only, matching
// what the backend actually enforces (a worker hitting these API routes
// gets a 403 regardless of whether this tab is shown).
const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home', workerOnly: true },
  { key: 'expenses', label: 'Expenses', icon: 'wallet', ownerOnly: true },
  { key: 'services', label: 'Services', icon: 'cut' },
  { key: 'stock', label: 'Stock', icon: 'cube', ownerOnly: true },
  { key: 'workers', label: 'Workers', icon: 'people', ownerOnly: true },
  { key: 'customers', label: 'Customers', icon: 'person-circle', ownerOnly: true },
  { key: 'analysis', label: 'Analysis', icon: 'analytics', ownerOnly: true },
];

// Custom Tab Bar Component
function TabBar({ activeTab, setActiveTab, isWorker }) {
  const { colors } = useTheme();
  const tabs = TABS.filter(t => {
    if (t.ownerOnly) return !isWorker;
    if (t.workerOnly) return isWorker;
    return true;
  });

  return (
    <View style={styles.tabBarContainer}>
      <LinearGradient
        colors={colors.tabGradient}
        style={[styles.tabBarGradient, { borderTopColor: colors.border }]}
      >
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab.key)}
          >
            <View style={[styles.iconContainer, activeTab === tab.key && styles.activeIconContainer]}>
              <Ionicons
                name={activeTab === tab.key ? tab.icon : `${tab.icon}-outline`}
                size={24}
                color={activeTab === tab.key ? '#FFF' : colors.textMuted}
              />
            </View>
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? colors.primary : colors.textMuted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </LinearGradient>
    </View>
  );
}

function MainApp() {
  const { user } = useAuth();
  const isWorker = user?.role === 'worker';
  const [activeTab, setActiveTab] = useState(isWorker ? 'dashboard' : 'expenses');
  const { colors } = useTheme();

  // A worker landing on an owner-only tab (e.g. leftover state from a
  // previous admin session on this device) gets redirected to their own
  // dashboard instead — the real enforcement is the backend's 403, this is
  // just about not showing a broken-looking screen. Mirrors web's
  // Sidebar/App.jsx effectivePage logic.
  const ownerOnlyKeys = TABS.filter(t => t.ownerOnly).map(t => t.key);
  const effectiveTab = isWorker && ownerOnlyKeys.includes(activeTab) ? 'dashboard' : activeTab;

  const renderScreen = () => {
    switch (effectiveTab) {
      case 'dashboard': return <WorkerDashboardScreen />;
      case 'expenses': return <HomeScreen />;
      case 'services': return <ServicesScreen />;
      case 'stock': return <StockScreen />;
      case 'workers': return <WorkersScreen />;
      case 'customers': return <CustomersScreen />;
      case 'analysis': return <AnalysisScreen />;
      default: return isWorker ? <WorkerDashboardScreen /> : <HomeScreen />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderScreen()}
      <TabBar activeTab={effectiveTab} setActiveTab={setActiveTab} isWorker={isWorker} />
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
            <StockProvider>
              <WorkersProvider>
                <CustomersProvider>
                  <AppContent />
                </CustomersProvider>
              </WorkersProvider>
            </StockProvider>
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
    paddingHorizontal: 6,
    borderTopWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 13,
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
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
  },
});
