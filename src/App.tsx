
import { AuthProvider, useAuth } from './context/AuthContext';
import { ContentProvider } from './context/ContentContext';
import { ToastProvider } from './context/ToastContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import './index.css';

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', color: '#0f172a' }}>Authenticating...</div>;
  }

  return isAuthenticated ? (
    <ToastProvider>
      <ContentProvider>
        <Dashboard />
      </ContentProvider>
    </ToastProvider>
  ) : (
    <Login />
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
