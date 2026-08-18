import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExpenseProvider } from './context/ExpenseContext';
import { ServicesProvider } from './context/ServicesContext';
import { StockProvider } from './context/StockContext';
import { WorkersProvider } from './context/WorkersContext';
import { CustomersProvider } from './context/CustomersContext';
import Sidebar from './components/Sidebar';
import ChatbotWidget from './components/ChatbotWidget';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ServicesPage from './pages/ServicesPage';
import StockPage from './pages/StockPage';
import WorkersPage from './pages/WorkersPage';
import AnalysisPage from './pages/AnalysisPage';
import CustomersPage from './pages/CustomersPage';
import WorkerDashboardPage from './pages/WorkerDashboardPage';

const OWNER_ONLY_PAGES = new Set(['dashboard', 'stock', 'workers', 'analysis', 'customers']);

function AppContent() {
  const { isLoggedIn, loading, user } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const isWorker = user?.role === 'worker';

  const effectivePage = isWorker && OWNER_ONLY_PAGES.has(activePage) ? 'my-dashboard' : activePage;

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="login-logo-icon" style={{ width: 72, height: 72, borderRadius: 24, background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 16 }}>
          💇
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg, #A855F7, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Salon Pro
        </div>
        <div className="spinner" style={{ marginTop: 24 }} />
      </div>
    );
  }

  if (!isLoggedIn) return <LoginPage />;

  const renderPage = () => {
    switch (effectivePage) {
      case 'dashboard':     return <DashboardPage onNavigate={setActivePage} />;
      case 'my-dashboard':  return <WorkerDashboardPage />;
      case 'services':      return <ServicesPage />;
      case 'stock':         return <StockPage />;
      case 'workers':       return <WorkersPage />;
      case 'analysis':      return <AnalysisPage />;
      case 'customers':     return <CustomersPage />;
      default:              return isWorker ? <WorkerDashboardPage /> : <DashboardPage onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activePage={effectivePage} onNavigate={setActivePage} />
      <main className="main-content">
        {renderPage()}
      </main>
      <ChatbotWidget />
    </div>
  );
}

export default function App() {
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
