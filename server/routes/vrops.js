// vROPS route'ları - vROPS API işlemleri için yardımcı endpoint'ler
import express from 'express';
import { executeVropsRequest } from '../services/vrops.js';

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

// vROPS bağlantı testi
router.get('/test', async (req, res) => {
  try {
    const { testConnection } = await import('../services/vrops.js');
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

