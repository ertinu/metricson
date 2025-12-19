// API servisi - Backend ile iletişim kurar
import axios from 'axios';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Axios instance oluştur - Tüm API istekleri için base URL ve config
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  },
  // Network performans optimizasyonları
  timeout: 30000, // 30 saniye timeout (varsayılan çok uzun olabilir)
  // Keep-alive bağlantıları kullan (HTTP/1.1)
  httpAgent: false, // Node.js için, browser'da kullanılmaz
  httpsAgent: false, // Node.js için, browser'da kullanılmaz
  // Connection pooling için
  maxRedirects: 5,
  validateStatus: function (status) {
    return status >= 200 && status < 300; // Sadece başarılı status kodları
  }
});

// Token'ı axios header'ına ekle (her istekte)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Chat mesajı gönderme fonksiyonu
export async function sendMessage(message, resourceId = null, chatId = null) {
  try {
    const payload = { message };
    if (resourceId) {
      payload.resourceId = resourceId;
    }
    if (chatId) {
      payload.chatId = chatId;
    }
    const response = await api.post('/chat/message', payload);
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// vROPS bağlantı testi
export async function testVropsConnection() {
  try {
    const response = await api.get('/vrops/test');
    return response.data;
  } catch (error) {
    console.error('vROPS Test Error:', error);
    throw error;
  }
}

// vROPS token'ı al
export async function getVropsToken() {
  try {
    const response = await api.get('/vrops/token');
    return response.data;
  } catch (error) {
    console.error('Get vROPS Token Error:', error);
    throw error;
  }
}

// Direkt vROPS API endpoint'ine istek at
export async function executeVropsDirectRequest(endpoint, headers = null, method = 'GET', params = null, body = null) {
  try {
    const requestData = { endpoint };
    
    // Eğer header bilgileri varsa gönder
    if (headers) {
      requestData.headers = headers;
    }
    
    // Method bilgisi varsa gönder
    if (method) {
      requestData.method = method;
    }
    
    // Params bilgisi varsa gönder
    if (params) {
      requestData.params = params;
    }
    
    // Body bilgisi varsa gönder
    if (body) {
      requestData.body = body;
    }
    
    const response = await api.post('/vrops/direct', requestData);
    return response.data;
  } catch (error) {
    console.error('vROPS Direct Request Error:', error);
    throw error;
  }
}

// Performans analizi isteği
export async function analyzePerformance(message, vmName = null, chatId = null) {
  try {
    const payload = { message };
    if (vmName) {
      payload.vmName = vmName;
    }
    if (chatId) {
      payload.chatId = chatId;
    }
    const response = await api.post('/chat/analyze-performance', payload);
    return response.data;
  } catch (error) {
    console.error('Performance Analysis Error:', error);
    throw error;
  }
}

// Sohbetleri listele
export async function getChats() {
  try {
    const response = await api.get('/chats');
    return response.data;
  } catch (error) {
    console.error('Get Chats Error:', error);
    throw error;
  }
}

// Yeni sohbet oluştur
export async function createChat(title = null) {
  try {
    const response = await api.post('/chats', { title });
    return response.data;
  } catch (error) {
    console.error('Create Chat Error:', error);
    throw error;
  }
}

// Sohbet detayını getir
export async function getChat(chatId) {
  try {
    const response = await api.get(`/chats/${chatId}`);
    return response.data;
  } catch (error) {
    console.error('Get Chat Error:', error);
    throw error;
  }
}

// Sohbeti sil
export async function deleteChat(chatId) {
  try {
    const response = await api.delete(`/chats/${chatId}`);
    return response.data;
  } catch (error) {
    console.error('Delete Chat Error:', error);
    throw error;
  }
}

// Favorilere ekle
export async function addToFavorites(messageId) {
  try {
    if (!messageId) {
      throw new Error('Message ID boş');
    }
    
    const parsedId = parseInt(messageId);
    if (isNaN(parsedId) || parsedId <= 0) {
      throw new Error('Geçersiz mesaj ID');
    }

    const response = await api.post(`/messages/${parsedId}/favorite`);
    return response.data;
  } catch (error) {
    // 400 hatası mesaj zaten favorilerde olabilir, bu durumu handle et
    if (error.response?.status === 400) {
      const errorMessage = error.response?.data?.error || 'Bu mesaj zaten favorilerinizde.';
      const customError = new Error(errorMessage);
      customError.status = 400;
      throw customError;
    }
    console.error('Add to Favorites Error:', error);
    throw error;
  }
}

// Favorilerden çıkar (artık favori ID ile)
export async function removeFromFavorites(favoriteId) {
  try {
    const response = await api.delete(`/favorites/${favoriteId}`);
    return response.data;
  } catch (error) {
    console.error('Remove from Favorites Error:', error);
    throw error;
  }
}

// Favorileri listele (paging ve search ile)
export async function getFavorites(limit = 1000, offset = 0, search = '') {
  try {
    const params = {};
    if (limit !== undefined && limit !== null) params.limit = limit;
    if (offset !== undefined && offset !== null) params.offset = offset;
    if (search && search.trim()) params.search = search.trim();
    
    const response = await api.get('/favorites', { params });
    return response.data;
  } catch (error) {
    console.error('Get Favorites Error:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw error;
  }
}

// Toplu favori silme (artık favori ID'leri ile)
export async function deleteBulkFavorites(favoriteIds) {
  try {
    const response = await api.delete('/favorites/bulk', { data: { favoriteIds } });
    return response.data;
  } catch (error) {
    console.error('Delete Bulk Favorites Error:', error);
    throw error;
  }
}

// Tüm favorileri sil
export async function deleteAllFavorites() {
  try {
    const response = await api.delete('/favorites/all');
    return response.data;
  } catch (error) {
    console.error('Delete All Favorites Error:', error);
    throw error;
  }
}

// Sohbet arama
export async function searchChats(query) {
  try {
    const response = await api.get('/chats/search', { params: { q: query } });
    return response.data;
  } catch (error) {
    console.error('Search Chats Error:', error);
    throw error;
  }
}

// Tüm sohbetleri sil
export async function deleteAllChats() {
  try {
    const response = await api.delete('/chats/all');
    return response.data;
  } catch (error) {
    console.error('Delete All Chats Error:', error);
    throw error;
  }
}

// Seçili sohbetleri sil
export async function deleteBulkChats(chatIds) {
  try {
    const response = await api.delete('/chats/bulk', { data: { chatIds } });
    return response.data;
  } catch (error) {
    console.error('Delete Bulk Chats Error:', error);
    throw error;
  }
}

