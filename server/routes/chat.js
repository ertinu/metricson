// Chat route'ları - Kullanıcı sorularını ChatGPT'ye gönderir ve cevap alır
// Burada iki senaryo var:
// 1) Kullanıcı sadece sohbet / açıklama istiyorsa -> Sadece ChatGPT cevabı döner, vROPS çağrısı yapılmaz
// 2) Kullanıcı metin içinde bir vROPS REST API isteği (GET/POST/...) yazdıysa -> Bu istek vROPS üzerinde çalıştırılır ve response ekrana yazılır
import express from 'express';
import { chatWithGPT, getMetricDescriptionFromGPT } from '../services/chatgpt.js';
import { executeVropsRequest, getResourceInfo } from '../services/vrops.js';
import { parseVropsResponse, detectResponseType } from '../services/vropsParser.js';

const router = express.Router();

// Ana chat endpoint'i - Kullanıcı sorusunu alır, ChatGPT'ye gönderir, gerekiyorsa vROPS'ta çalıştırır
router.post('/message', async (req, res) => {
  try {
    const { message, resourceId } = req.body; // resourceId parametresini al

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Kullanıcıdan gelen soruyu ve vROPS bağlantı parametrelerini backend loglarına yaz
    // Bu sayede hangi soruya karşılık nasıl cevap üretildiğini ve hangi vROPS ortamına gittiğini loglardan takip edebilirsin
    console.log('--- CHAT REQUEST START ---');
    console.log('Kullanıcı sorusu (userMessage):', message);
    console.log('vROPS bağlantı bilgileri (env):', {
      host: process.env.VROPS_HOST,
      port: process.env.VROPS_PORT,
      protocol: process.env.VROPS_PROTOCOL,
      username: process.env.VROPS_USERNAME
      // Parolayı güvenlik nedeniyle loglamıyoruz
    });

    // Eğer resourceId varsa, resource bilgisini çek ve prompt'a ekle
    let resourceKindKey = null;
    if (resourceId) {
      try {
        const resourceInfo = await getResourceInfo(resourceId);
        resourceKindKey = resourceInfo?.resourceKey?.resourceKindKey || null;
        console.log('Resource tipi (resourceKindKey):', resourceKindKey);
      } catch (error) {
        console.error('Resource bilgisi alınamadı:', error.message);
        // Hata olsa bile devam et
      }
    }

    // Eğer mesaj "ne işe yarar" içeriyorsa ve resourceId varsa, metrik açıklaması için özel fonksiyonu kullan
    const isMetricDescriptionRequest = message.toLowerCase().includes('ne işe yarar') && resourceId;
    
    let gptResponse;
    if (isMetricDescriptionRequest) {
      // Metrik açıklaması için özel format: "Resource tipi yani, resourceKind {VirtualMachine} olan Bu vROPS metrik ne işe yarar: mem|workload. Kısa ve öz bir açıklama yap, Türkçe olarak."
      let enhancedMessage = message;
      if (resourceKindKey) {
        enhancedMessage = `Resource tipi yani, resourceKind {${resourceKindKey}} olan ${message}`;
      }
      console.log('Metrik açıklaması için enhanced message:', enhancedMessage);
      gptResponse = await getMetricDescriptionFromGPT(enhancedMessage);
    } else {
      // Normal chat için standart fonksiyonu kullan
      gptResponse = await chatWithGPT(message);
    }

    // ChatGPT'den gelen cevabı backend loglarına yaz
    console.log('ChatGPT cevabı (gptResponse):', gptResponse);

    // 2) ChatGPT'den gelen cevabın içinde vROPS endpoint PATH'i var mı kontrol et
    // Örn: "/suite-api/api/resources/33/stats?statKey=cpu|usage_average&begin=...&end=..."
    const vropsRequest = buildVropsRequestFromGptPath(gptResponse);

    // 3) Varsa vROPS API request'ini çalıştırmayı dene (yoksa hiç çağrı yapma)
    let vropsResult = null;
    let vropsError = null;
    let vropsExecuted = false; // Bu istek için gerçekten vROPS çağrısı yapıldı mı bilgisini tutar
    let parsedData = null; // Parse edilmiş veri
    let dataType = null; // Veri tipi (alerts, metrics, vs.)
    
    if (vropsRequest) {
      try {
        vropsResult = await executeVropsRequest(vropsRequest);
        vropsExecuted = true;
        
        // vROPS response'unu parse et
        dataType = detectResponseType(vropsRequest.endpoint);
        parsedData = parseVropsResponse(vropsResult.data, dataType, vropsRequest);
        
        console.log('Parse edilmiş veri tipi:', dataType);
        console.log('Parse edilmiş veri özeti:', {
          totalCount: parsedData.totalCount || parsedData.alerts?.length || 'N/A',
          dataType: dataType
        });
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

    // displayType belirleme - resourceDetail için 'card' kullan
    let displayType = null;
    if (parsedData) {
      if (dataType === 'resourceDetail') {
        displayType = 'card';
      } else {
        displayType = 'table';
      }
    }

    // Sonucu kullanıcıya döndür (ChatGPT cevabı her zaman döner)
    res.json({
      success: true,
      userMessage: message,
      gptResponse: gptResponse,
      vropsRequest: vropsRequest,
      vropsResult: vropsResult, // Ham data (debug için)
      parsedData: parsedData, // Parse edilmiş, temiz data
      dataType: dataType, // 'alerts', 'metrics', vs.
      displayType: displayType, // Frontend'e nasıl göstereceğini söyle ('table' veya 'card')
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

