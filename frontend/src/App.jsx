import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import { ModalProvider } from './context/ModalContext';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import BobinesList from './pages/BobinesList';
import UsersList from './pages/UsersList';
import LotsList from './pages/LotsList';
import TubesList from './pages/TubesList';
import ComingSoon from './pages/ComingSoon';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Loading screen component
function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
    >
      <div className="text-center">
        <Loader2 
          size={48} 
          className="animate-spin mx-auto mb-4"
          style={{ color: 'var(--color-accent)' }}
        />
        <p style={{ color: 'var(--color-text-muted)' }}>
          {t('common.loading')}
        </p>
      </div>
    </div>
  );
}

// Protected App content
function AppContent() {
  const { isAuthenticated, loading, login } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <SocketProvider>
      <SidebarProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="lots" element={<LotsList />} />
              <Route path="tubes" element={<TubesList />} />
              <Route path="bobines" element={<BobinesList />} />
              <Route path="utilisateurs" element={<UsersList />} />
              <Route path="workflow" element={<ComingSoon />} />
              <Route path="reporting" element={<ComingSoon />} />
              <Route path="suivi" element={<ComingSoon />} />
              <Route path="produits" element={<ComingSoon />} />
              <Route path="documents" element={<ComingSoon />} />
              <Route path="parametres" element={<SettingsPage />} />
              <Route path="aide" element={<ComingSoon />} />
              <Route path="*" element={<ComingSoon />} />
            </Route>
          </Routes>
        </Router>
      </SidebarProvider>
    </SocketProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ModalProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ModalProvider>
    </ThemeProvider>
  );
}

export default App;
