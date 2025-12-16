// vROPS route'ları - vROPS API işlemleri için yardımcı endpoint'ler
import express from 'express';
import { executeVropsRequest, testConnection } from '../services/vrops.js';
import { parseVropsResponse, detectResponseType } from '../services/vropsParser.js';

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
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    // Endpoint'i temizle (/suite-api prefix'ini kaldır)
    let cleanEndpoint = endpoint;
    if (cleanEndpoint.startsWith('/suite-api')) {
      cleanEndpoint = cleanEndpoint.replace('/suite-api', '');
    }
    if (!cleanEndpoint.startsWith('/')) {
      cleanEndpoint = '/' + cleanEndpoint;
    }

    // Query string'i ayır
    const [pathPart, queryString] = cleanEndpoint.split('?', 2);
    const params = {};
    if (queryString) {
      const searchParams = new URLSearchParams(queryString);
      for (const [key, value] of searchParams.entries()) {
        params[key] = value;
      }
    }

    const requestConfig = {
      endpoint: pathPart,
      method: 'GET',
      params: params,
      body: {}
    };

    // vROPS API'ye istek gönder
    const vropsResult = await executeVropsRequest(requestConfig);
    
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

export default router;

