// vROPS route'ları - vROPS API işlemleri için yardımcı endpoint'ler
import express from 'express';
import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { executeVropsRequest, executeVropsRequestWithHeaders, testConnection, authenticateVrops } from '../services/vrops.js';
import { parseVropsResponse, detectResponseType } from '../services/vropsParser.js';
import { authenticateToken } from '../middleware/auth.js';

// ES6 modül sisteminde __dirname'i almak için
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment değişkenlerini yükle
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const router = express.Router();

// vROPS API request'ini direkt çalıştırmak için endpoint
router.post('/execute', async (req, res) => {
  try {
    const { endpoint, method, params, body } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    const result = await executeVropsRequest({
      endpoint,
      method: method || 'GET',
      params: params || {},
      body: body || {}
    });

    res.json({
      success: true,
      result: result
    });

  } catch (error) {
    console.error('vROPS error:', error);
    res.status(500).json({ 
      error: 'An error occurred while executing vROPS request',
      details: error.message 
    });
  }
});

// Direkt vROPS API endpoint'ine istek at (link'ler için)
router.post('/direct', async (req, res) => {
  try {
    const { endpoint, headers, method, params, body } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    console.log('[vROPS DIRECT] Frontend\'den gelen istek:', {
      endpoint,
      method,
      headers: headers ? Object.keys(headers) : null,
      params: params ? Object.keys(params) : null,
      body: body ? 'present' : null
    });

    // Endpoint'i temizle (/suite-api prefix'ini kaldır)
    let cleanEndpoint = endpoint;
    if (cleanEndpoint.startsWith('/suite-api')) {
      cleanEndpoint = cleanEndpoint.replace('/suite-api', '');
    }
    if (!cleanEndpoint.startsWith('/')) {
      cleanEndpoint = '/' + cleanEndpoint;
    }

    // Query string'i ayır (eğer params yoksa)
    let pathPart = cleanEndpoint;
    let queryParams = params || {};
    
    if (!params || Object.keys(params).length === 0) {
      const [path, queryString] = cleanEndpoint.split('?', 2);
      pathPart = path;
      if (queryString) {
        const searchParams = new URLSearchParams(queryString);
        for (const [key, value] of searchParams.entries()) {
          queryParams[key] = value;
        }
      }
    }

    const requestConfig = {
      endpoint: pathPart,
      method: method || 'GET',
      params: queryParams,
      body: body || {}
    };

    // Frontend'den gelen header'ları kullan (özellikle Authorization)
    let customHeaders = null;
    if (headers && typeof headers === 'object') {
      customHeaders = headers;
      console.log('[vROPS DIRECT] Frontend\'den gelen header\'lar kullanılacak:', Object.keys(headers));
    }

    // vROPS API'ye istek gönder (custom header'lar ile)
    const vropsResult = await executeVropsRequestWithHeaders(requestConfig, customHeaders);
    
    // Response tipini belirle ve parse et
    const dataType = detectResponseType(requestConfig.endpoint);
    console.log('vROPS Direct - Endpoint:', requestConfig.endpoint);
    console.log('vROPS Direct - DataType:', dataType);
    console.log('vROPS Direct - Raw Response:', JSON.stringify(vropsResult.data, null, 2));
    
    const parsedData = parseVropsResponse(vropsResult.data, dataType, requestConfig);
    console.log('vROPS Direct - Parsed Data:', JSON.stringify(parsedData, null, 2));

    res.json({
      success: true,
      data: vropsResult.data,
      parsedData: parsedData,
      dataType: dataType
    });

  } catch (error) {
    console.error('vROPS direct request error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// vROPS bağlantı testi
router.get('/test', async (req, res) => {
  try {
    const result = await testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      error: 'Connection test failed',
      details: error.message 
    });
  }
});

// vROPS token'ı al (API görünümü için) - Her zaman gerçek token al
router.get('/token', authenticateToken, async (req, res) => {
  try {
    // Her zaman yeni token al (cache kullanma)
    const host = process.env.VROPS_HOST;
    const port = process.env.VROPS_PORT || 443;
    const protocol = process.env.VROPS_PROTOCOL || 'https';
    const username = process.env.VROPS_USERNAME;
    const password = process.env.VROPS_PASSWORD;

    if (!host || !username || !password) {
      throw new Error('vROPS credentials are not configured');
    }

    console.log('[vROPS TOKEN] Yeni token alınıyor...', { host, username });

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
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    );

    // Gerçek token'ı al
    const token = response.data.token;
    
    if (!token) {
      throw new Error('vROPS token alınamadı - response.data.token boş');
    }
    
    console.log('[vROPS TOKEN] Gerçek token alındı:', {
      tokenLength: token ? token.length : 0,
      tokenPreview: token ? token.substring(0, 30) + '...' : 'null',
      tokenFull: token // Tam token'ı logla (debug için)
    });
    
    res.json({
      success: true,
      token: token,
      headerValue: `OpsToken ${token}`
    });
  } catch (error) {
    console.error('[vROPS TOKEN] Token alınırken hata:', error);
    console.error('[vROPS TOKEN] Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    res.status(500).json({ 
      success: false,
      error: 'vROPS token alınırken bir hata oluştu',
      details: error.message 
    });
  }
});

export default router;

