// vROPS servisi - vRealize Operations Manager API ile iletişim kurar
import axios from 'axios';
import dotenv from 'dotenv';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES6 modül sisteminde __dirname'i almak için
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment değişkenlerini yükle - Root dizindeki .env dosyasını kullan
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

// vROPS API için authentication token'ı saklar
let authToken = null;
let tokenExpiry = null;

// vROPS API'ye authentication yapan fonksiyon
// Burada login sürecini ve token kullanımını backend loglarına yazıyoruz
export async function authenticateVrops() {
  try {
    const host = process.env.VROPS_HOST;
    const port = process.env.VROPS_PORT || 443;
    const protocol = process.env.VROPS_PROTOCOL || 'https';
    const username = process.env.VROPS_USERNAME;
    const password = process.env.VROPS_PASSWORD;

    if (!host || !username || !password) {
      throw new Error('vROPS credentials are not configured');
    }

    // Token hala geçerliyse yeniden authenticate olma
    if (authToken && tokenExpiry && Date.now() < tokenExpiry) {
      console.log('[vROPS AUTH] Mevcut token kullanılacak (cache).', {
        host,
        username,
        tokenExpiresAt: new Date(tokenExpiry).toISOString()
      });
      return authToken;
    }

    console.log('[vROPS AUTH] Yeni token alınacak.', {
      host,
      username
    });

    // vROPS'a authentication isteği gönder
    const authUrl = `${protocol}://${host}:${port}/suite-api/api/auth/token/acquire`;
    
    const response = await axios.post(
      authUrl,
      {
        username: username,
        password: password
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        // SSL sertifika doğrulamasını atla (geliştirme için)
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    );

    // Token'ı sakla (genellikle 30 dakika geçerli)
    authToken = response.data.token;
    tokenExpiry = Date.now() + (30 * 60 * 1000); // 30 dakika

    console.log('[vROPS AUTH] Yeni token alındı.', {
      host,
      username,
      tokenExpiresAt: new Date(tokenExpiry).toISOString()
    });

    return authToken;

  } catch (error) {
    console.error('vROPS Authentication Error:', error.response?.data || error.message);
    throw new Error(`vROPS authentication hatası: ${error.response?.data?.message || error.message}`);
  }
}

// vROPS API request'ini çalıştıran ana fonksiyon
/**
 * Resource bilgisini çeker (resourceKindKey için)
 * @param {String} resourceId - Resource ID
 * @returns {Object} Resource bilgisi
 */
export async function getResourceInfo(resourceId) {
  try {
    const token = await authenticateVrops();
    const host = process.env.VROPS_HOST;
    const port = process.env.VROPS_PORT || '443';
    const protocol = process.env.VROPS_PROTOCOL || 'https';
    
    const url = `${protocol}://${host}:${port}/suite-api/api/resources/${resourceId}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `vRealizeOpsToken ${token}`,
        'Content-Type': 'application/json'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });
    
    return response.data;
  } catch (error) {
    console.error('Resource info error:', error.response?.data || error.message);
    throw new Error(`Resource bilgisi alınamadı: ${error.response?.data?.message || error.message}`);
  }
}

// Frontend'den gelen header'ları kullanarak vROPS request'i çalıştır
export async function executeVropsRequestWithHeaders(requestConfig, customHeaders = null) {
  try {
    const host = process.env.VROPS_HOST;
    const port = process.env.VROPS_PORT || 443;
    const protocol = process.env.VROPS_PROTOCOL || 'https';

    if (!host) {
      throw new Error('VROPS_HOST is not configured');
    }

    // Request URL'ini oluştur
    const baseUrl = `${protocol}://${host}:${port}/suite-api`;
    const url = `${baseUrl}${requestConfig.endpoint}`;

    // Header'ları hazırla - önce custom header'ları kullan, yoksa default'ları
    const headers = {};
    
    if (customHeaders && typeof customHeaders === 'object') {
      // Frontend'den gelen header'ları kullan
      Object.assign(headers, customHeaders);
      console.log('[vROPS REQUEST] Frontend header\'ları kullanılıyor:', Object.keys(headers));
    } else {
      // Default header'ları kullan (backend token ile)
      const token = await authenticateVrops();
      headers['Authorization'] = `vRealizeOpsToken ${token}`;
      headers['Content-Type'] = 'application/json';
      headers['Accept'] = 'application/json';
      console.log('[vROPS REQUEST] Backend token kullanılıyor');
    }

    // Request config'i hazırla
    const axiosConfig = {
      method: requestConfig.method || 'GET',
      url: url,
      headers: headers,
      // SSL sertifika doğrulamasını atla (geliştirme için)
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    };

    // GET ise params, POST/PUT ise data ekle
    if (requestConfig.method === 'GET' && requestConfig.params) {
      axiosConfig.params = requestConfig.params;
    } else if (['POST', 'PUT', 'PATCH'].includes(requestConfig.method) && requestConfig.body) {
      axiosConfig.data = requestConfig.body;
    }

    // API istek parametrelerini logla
    console.log('--- vROPS API REQUEST ---');
    console.log('Method:', axiosConfig.method);
    console.log('URL:', axiosConfig.url);
    console.log('Params:', JSON.stringify(axiosConfig.params || {}, null, 2));
    console.log('Body:', JSON.stringify(axiosConfig.data || {}, null, 2));
    console.log('Headers:', JSON.stringify({
      'Authorization': axiosConfig.headers.Authorization ? (axiosConfig.headers.Authorization.startsWith('OpsToken') ? 'OpsToken [REDACTED]' : 'vRealizeOpsToken [REDACTED]') : 'None',
      'Content-Type': axiosConfig.headers['Content-Type'],
      'Accept': axiosConfig.headers.Accept
    }, null, 2));

    // vROPS API'ye istek gönder
    const response = await axios(axiosConfig);
    
    console.log('--- vROPS API RESPONSE ---');
    console.log('Status:', response.status);
    console.log('Response Data Keys:', response.data ? Object.keys(response.data) : 'No data');
    console.log('--- vROPS API REQUEST END ---');

    return {
      success: true,
      data: response.data,
      status: response.status
    };

  } catch (error) {
    console.error('vROPS API Error:', error.response?.data || error.message);
    throw new Error(`vROPS API hatası: ${error.response?.data?.message || error.message}`);
  }
}

// Orijinal fonksiyon - geriye uyumluluk için
export async function executeVropsRequest(requestConfig) {
  return executeVropsRequestWithHeaders(requestConfig, null);
}

// vROPS bağlantı testi
export async function testConnection() {
  try {
    await authenticateVrops();
    return {
      success: true,
      message: 'vROPS connection successful'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

