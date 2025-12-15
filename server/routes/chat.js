// Chat route'ları - Kullanıcı sorularını ChatGPT'ye gönderir ve cevap alır
// Burada iki senaryo var:
// 1) Kullanıcı sadece sohbet / açıklama istiyorsa -> Sadece ChatGPT cevabı döner, vROPS çağrısı yapılmaz
// 2) Kullanıcı metin içinde bir vROPS REST API isteği (GET/POST/...) yazdıysa -> Bu istek vROPS üzerinde çalıştırılır ve response ekrana yazılır
import express from 'express';
import { chatWithGPT } from '../services/chatgpt.js';
import { executeVropsRequest } from '../services/vrops.js';

const router = express.Router();

// Ana chat endpoint'i - Kullanıcı sorusunu alır, ChatGPT'ye gönderir, gerekiyorsa vROPS'ta çalıştırır
router.post('/message', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Kullanıcıdan gelen soruyu backend loglarına yaz
    // Bu sayede hangi soruya karşılık nasıl cevap üretildiğini loglardan takip edebilirsin
    console.log('--- CHAT REQUEST START ---');
    console.log('Kullanıcı sorusu (userMessage):', message);

    // 1) ChatGPT'ye kullanıcı sorusunu gönder (sohbet / açıklama için)
    const gptResponse = await chatWithGPT(message);

    // ChatGPT'den gelen cevabı backend loglarına yaz
    console.log('ChatGPT cevabı (gptResponse):', gptResponse);

    // 2) ChatGPT'den gelen cevabın içinde vROPS endpoint PATH'i var mı kontrol et
    // Örn: "/suite-api/api/resources/33/stats?statKey=cpu|usage_average&begin=...&end=..."
    const vropsRequest = buildVropsRequestFromGptPath(gptResponse);

    // 3) Varsa vROPS API request'ini çalıştırmayı dene (yoksa hiç çağrı yapma)
    let vropsResult = null;
    let vropsError = null;
    let vropsExecuted = false; // Bu istek için gerçekten vROPS çağrısı yapıldı mı bilgisini tutar
    
    if (vropsRequest) {
      try {
        vropsResult = await executeVropsRequest(vropsRequest);
        vropsExecuted = true;
      } catch (vropsErr) {
        // vROPS hatası olsa bile ChatGPT cevabını döndür
        vropsError = vropsErr.message;
        console.error('vROPS execution error:', vropsErr);
      }
    }

    // vROPS ile ilgili özet log (istek çalıştı mı, çalıştıysa hangi endpoint)
    console.log('vROPS isteği çalıştırıldı mı (vropsExecuted):', vropsExecuted);
    if (vropsRequest) {
      console.log('vROPS isteği (vropsRequest):', vropsRequest);
    }
    console.log('--- CHAT REQUEST END ---');

    // Sonucu kullanıcıya döndür (ChatGPT cevabı her zaman döner)
    res.json({
      success: true,
      userMessage: message,
      gptResponse: gptResponse,
      vropsRequest: vropsRequest,
      vropsResult: vropsResult,
      vropsError: vropsError,
      vropsExecuted: vropsExecuted
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'An error occurred while processing your request',
      details: error.message 
    });
  }
});

// ChatGPT cevabı içinden vROPS endpoint PATH'ini çıkaran yardımcı fonksiyon
// Örnek giriş: "/suite-api/api/resources/33/stats?statKey=cpu|usage_average&begin=...&end=..."
// Çıktı: { endpoint: "/api/resources/33/stats", method: "GET", params: { statKey: "...", begin: "...", end: "..." }, body: {} }
function buildVropsRequestFromGptPath(gptResponse) {
  if (!gptResponse || typeof gptResponse !== 'string') {
    return null;
  }

  // Sadece ilk satırı al (model fazladan satır döndürürse)
  const firstLine = gptResponse.split('\n')[0].trim();
  if (!firstLine) return null;

  let rawPath = firstLine;

  // Eğer tam URL gelirse (https://.../suite-api/...), sadece path + query kısmını al
  if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
    try {
      const url = new URL(rawPath);
      rawPath = url.pathname + (url.search || '');
    } catch {
      return null;
    }
  }

  // PATH mutlaka / ile başlamalı
  if (!rawPath.startsWith('/')) {
    return null;
  }

  // Query string'i ayır
  const [pathPart, queryString] = rawPath.split('?', 2);
  let endpoint = pathPart;

  // /suite-api prefix'ini temizle -> geriye /api/... kalsın
  const suiteIndex = endpoint.indexOf('/suite-api');
  if (suiteIndex !== -1) {
    endpoint = endpoint.slice(suiteIndex + '/suite-api'.length);
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }
  }

  // Query parametrelerini objeye çevir
  const params = {};
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
  }

  return {
    endpoint,      // Örn: /api/resources/33/stats
    method: 'GET', // Şimdilik tüm bu path'ler GET varsayılıyor
    params,
    body: {}
  };
}

export default router;

