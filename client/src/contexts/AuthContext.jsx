// Authentication Context - Kullanıcı giriş durumunu yönetir
import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Token'ı localStorage'dan al ve kullanıcı bilgilerini yükle
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Token'ı axios header'ına ekle
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Kullanıcı bilgilerini al
      axios.get(`${API_BASE_URL}/api/auth/me`)
        .then(response => {
          if (response.data.success) {
            setUser(response.data.user);
          } else {
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  // Login fonksiyonu
  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        username,
        password
      });

      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(user);
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Giriş yapılırken bir hata oluştu.'
      };
    }
  };

  // Logout fonksiyonu
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // Şifre sıfırlama token'ı oluştur
  const forgotPassword = async (username, email) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, {
        username,
        email
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Şifre sıfırlama işlemi sırasında bir hata oluştu.'
      };
    }
  };

  // Şifre sıfırla
  const resetPassword = async (token, newPassword) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/reset-password`, {
        token,
        newPassword
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Şifre değiştirme işlemi sırasında bir hata oluştu.'
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    forgotPassword,
    resetPassword,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook - AuthContext'i kullanmak için
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

