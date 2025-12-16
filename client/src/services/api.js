// API servisi - Backend ile iletişim kurar
import axios from 'axios';

// Axios instance oluştur - Tüm API istekleri için base URL ve config
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Chat mesajı gönderme fonksiyonu
export async function sendMessage(message, resourceId = null) {
  try {
    const payload = { message };
    if (resourceId) {
      payload.resourceId = resourceId;
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

// Direkt vROPS API endpoint'ine istek at
export async function executeVropsDirectRequest(endpoint) {
  try {
    const response = await api.post('/vrops/direct', { endpoint });
    return response.data;
  } catch (error) {
    console.error('vROPS Direct Request Error:', error);
    throw error;
  }
}

