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
async function authenticateVrops() {
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
export async function executeVropsRequest(requestConfig) {
  try {
    const host = process.env.VROPS_HOST;
    const port = process.env.VROPS_PORT || 443;
    const protocol = process.env.VROPS_PROTOCOL || 'https';

    if (!host) {
      throw new Error('VROPS_HOST is not configured');
    }

    // Önce authenticate ol
    const token = await authenticateVrops();

    // Request URL'ini oluştur
    const baseUrl = `${protocol}://${host}:${port}/suite-api`;
    const url = `${baseUrl}${requestConfig.endpoint}`;

    // Request config'i hazırla
    const axiosConfig = {
      method: requestConfig.method || 'GET',
      url: url,
      headers: {
        'Authorization': `vRealizeOpsToken ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
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

    // vROPS API'ye istek gönder
    const response = await axios(axiosConfig);

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

