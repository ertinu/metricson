// Ana App komponenti - React Router ile sayfa yönlendirmelerini yönetir
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import AlertsPage from './pages/data/AlertsPage';
import ResourceDetailPage from './pages/ResourceDetailPage';

// Protected Route komponenti - Giriş yapmamış kullanıcıları login sayfasına yönlendirir
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/data/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
          <Route path="/resources/:resourceId" element={<ProtectedRoute><ResourceDetailPage /></ProtectedRoute>} />
        </Routes>
    </BrowserRouter>
  );
}

export default App;

