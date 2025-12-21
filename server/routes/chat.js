// Chat route'ları - Kullanıcı sorularını ChatGPT'ye gönderir ve cevap alır
// Burada iki senaryo var:
// 1) Kullanıcı sadece sohbet / açıklama istiyorsa -> Sadece ChatGPT cevabı döner, vROPS çağrısı yapılmaz
// 2) Kullanıcı metin içinde bir vROPS REST API isteği (GET/POST/...) yazdıysa -> Bu istek vROPS üzerinde çalıştırılır ve response ekrana yazılır
import express from 'express';
import { chatWithGPT, getMetricDescriptionFromGPT, analyzePerformanceFromGPT, analyzePerformanceValuesFromGPT } from '../services/chatgpt.js';
import { executeVropsRequest, getResourceInfo } from '../services/vrops.js';
import { parseVropsResponse, detectResponseType } from '../services/vropsParser.js';
import { findVMByName, collectAllVMData, formatDataForGPT } from '../services/performanceAnalyzer.js';
import pool from '../services/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Ana chat endpoint'i - Kullanıcı sorusunu alır, ChatGPT'ye gönderir, gerekiyorsa vROPS'ta çalıştırır
router.post('/message', authenticateToken, async (req, res) => {
  try {
    const { message, resourceId, chatId } = req.body; // chatId ve resourceId parametrelerini al

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // ChatId yoksa yeni sohbet oluştur
    let currentChatId = chatId;
    if (!currentChatId) {
      const [chatResult] = await pool.execute(
        'INSERT INTO chats (user_id, title) VALUES (?, ?)',
        [req.user.id, null]
      );
      currentChatId = chatResult.insertId;
    } else {
      // ChatId varsa, kullanıcıya ait olduğunu kontrol et
      const [chats] = await pool.execute(
        'SELECT id FROM chats WHERE id = ? AND user_id = ?',
        [currentChatId, req.user.id]
      );
      if (chats.length === 0) {
        return res.status(403).json({ error: 'Bu sohbete erişim yetkiniz yok.' });
      }
    }

    // Aktif AI modelini al (cache'lenmiş)
    let aiModel;
    try {
      const { getActiveAIModel } = await import('../services/aiModelCache.js');
      aiModel = await getActiveAIModel();
    } catch (error) {
      return res.status(500).json({ error: 'Aktif AI modeli bulunamadı. Lütfen ayarlardan bir AI modeli ekleyin.' });
    }

    const aiModelId = aiModel.id;

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
    
    // Performans değerleri isteği kontrolü
    const lowerMessage = message.toLowerCase();
    const isPerformanceValuesRequest = (
      lowerMessage.includes('performans değerleri') ||
      lowerMessage.includes('performans değerlerini getir') ||
      lowerMessage.includes('performansını görmek istiyorum') ||
      lowerMessage.includes('performans değerleri nedir')
    );
    
    // Eğer performans değerleri isteği varsa ve resourceId yoksa, mesajdan UUID tespit et
    let performanceResourceId = resourceId;
    if (isPerformanceValuesRequest && !performanceResourceId) {
      const uuidPattern = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
      const uuidMatch = message.match(uuidPattern);
      if (uuidMatch) {
        performanceResourceId = uuidMatch[1];
        console.log('Mesajdan tespit edilen resource ID:', performanceResourceId);
      }
    }
    
    // AI model bilgilerini chatgpt.js'e geçirmek için environment değişkenlerini geçici olarak güncelle
    const originalApiKey = process.env.CHATGPT_API_KEY;
    const originalModel = process.env.CHATGPT_MODEL;
    const originalBaseUrl = process.env.CHATGPT_BASE_URL;
    
    process.env.CHATGPT_API_KEY = aiModel.api_token;
    process.env.CHATGPT_MODEL = aiModel.model_version;
    process.env.CHATGPT_BASE_URL = aiModel.base_url;
    
    let gptResponse;
    let performanceValuesData = null;
    let performanceValuesComment = null;
    
    if (isPerformanceValuesRequest) {
      // Performans değerleri için özel işlem
      console.log('--- PERFORMANCE VALUES REQUEST START ---');
      
      if (!performanceResourceId) {
        gptResponse = 'Performans değerlerini almak için lütfen bir resource ID belirtin (örnek: "b9192081-0170-40f8-9a7d-b15e6832e74d li sunucunun performans değerlerini getir").';
        console.log('Resource ID bulunamadı');
      } else {
        console.log('Resource ID:', performanceResourceId);
        
        try {
          // vROPS'tan latest stats çek
          const latestStatsRequest = {
            endpoint: `/api/resources/${performanceResourceId}/stats/latest`,
            method: 'GET',
            params: {},
            body: {}
          };
          
          const latestStatsResponse = await executeVropsRequest(latestStatsRequest);
          
          // Response'dan belirli statKey'leri parse et - Her zaman 8 statKey gösterilecek
          const targetStatKeys = {
            'guest|cpu_queue': 'CPU Queue (%)',
            'guest|contextSwapRate_latest': 'CPU Context Switch Rate',
            'guest|disk_queue': 'Disk Queue',
            'cpu|readyPct': 'CPU Ready',
            'cpu|costopPct': 'CPU Co-stop (%)',
            'mem|host_contentionPct': 'Memory Contention (%)',
            'virtualDisk|20_sec_peak_totalLatency_average': 'Virtual Disk Total Latency (μs)',
            'net|droppedTx_summation': 'Network Transmitted Packets Dropped'
          };
          
          // Önce tüm statKey'leri N/A ile başlat
          const extractedStats = Object.entries(targetStatKeys).map(([statKey, title]) => ({
            title: title,
            statKey: statKey,
            value: null,
            timestamp: null
          }));
          
          // Response'dan gelen değerleri eşleştir
          if (latestStatsResponse.data && latestStatsResponse.data.values && latestStatsResponse.data.values.length > 0) {
            const statList = latestStatsResponse.data.values[0]['stat-list'];
            if (statList && statList.stat && Array.isArray(statList.stat)) {
              // Response'dan gelen stat'ları bir map'e al
              const responseStatsMap = new Map();
              statList.stat.forEach(stat => {
                const statKey = stat.statKey?.key;
                if (statKey) {
                  const value = stat.data && stat.data.length > 0 ? stat.data[0] : null;
                  const timestamp = stat.timestamps && stat.timestamps.length > 0 ? stat.timestamps[0] : null;
                  responseStatsMap.set(statKey, { value, timestamp });
                }
              });
              
              // extractedStats'ı güncelle - sadece targetStatKeys'deki statKey'ler için
              extractedStats.forEach((stat, index) => {
                const responseStat = responseStatsMap.get(stat.statKey);
                if (responseStat) {
                  extractedStats[index] = {
                    title: stat.title,
                    statKey: stat.statKey,
                    value: responseStat.value,
                    timestamp: responseStat.timestamp
                  };
                }
              });
            }
          }
          
          performanceValuesData = extractedStats;
          console.log('Extracted performance stats (always 8):', extractedStats);
          
          // ChatGPT'ye yorum için gönder - Her zaman gönder (8 statKey her zaman var)
          // Özel fonksiyon kullan: API endpoint üretme, sadece analiz yap
          const statsJson = JSON.stringify(extractedStats, null, 2);
          
          performanceValuesComment = await analyzePerformanceValuesFromGPT(statsJson);
          console.log('ChatGPT yorumu:', performanceValuesComment);
          
          // Bulunan değer sayısını hesapla
          const foundStatsCount = extractedStats.filter(stat => stat.value !== null && stat.value !== undefined).length;
          gptResponse = `Performans değerleri başarıyla alındı. ${foundStatsCount} metrik değeri bulundu, ${extractedStats.length} metrik aşağıda gösteriliyor.`;
        } catch (error) {
          console.error('Performans değerleri alınırken hata:', error);
          gptResponse = `Performans değerleri alınırken bir hata oluştu: ${error.message}`;
        }
      }
      
      console.log('--- PERFORMANCE VALUES REQUEST END ---');
    } else if (isMetricDescriptionRequest) {
      // Metrik açıklaması için özel format: "Resource tipi yani, resourceKind {VirtualMachine} olan Bu vROPS metrik ne işe yarar: mem|workload. Kısa ve öz bir açıklama yap, Türkçe olarak."
      let enhancedMessage = message;
      if (resourceKindKey) {
        enhancedMessage = `Resource tipi yani, resourceKind {${resourceKindKey}} olan ${message}`;
      }
      console.log('Metrik açıklaması için enhanced message:', enhancedMessage);
      gptResponse = await getMetricDescriptionFromGPT(enhancedMessage);
    } else {
      // Normal chat için standart fonksiyonu kullan
      // User message'a zaman bilgisini ekle (system prompt cache için)
      const messageWithTime = `${message}\n\nŞu anki zaman (UTC epoch ms): ${Date.now()}`;
      gptResponse = await chatWithGPT(messageWithTime);
    }
    
    // Environment değişkenlerini geri yükle
    process.env.CHATGPT_API_KEY = originalApiKey;
    process.env.CHATGPT_MODEL = originalModel;
    process.env.CHATGPT_BASE_URL = originalBaseUrl;
    
    // ChatGPT'den gelen cevabı backend loglarına yaz
    console.log('ChatGPT cevabı (gptResponse):', gptResponse);

    // 2) ChatGPT'den gelen cevabın içinde vROPS endpoint PATH'i var mı kontrol et
    // Örn: "/suite-api/api/resources/33/stats?statKey=cpu|usage_average&begin=...&end=..."
    const vropsRequest = buildVropsRequestFromGptPath(gptResponse);
    console.log('[CHAT] vropsRequest parse edildi:', JSON.stringify(vropsRequest, null, 2));

    // 3) Eğer endpoint /api/resources/stats/topn ise ve resourceId parametreleri eksikse, tüm VM'leri çek
    if (vropsRequest && vropsRequest.endpoint && vropsRequest.endpoint.includes('/resources/stats/topn')) {
      // resourceId parametrelerini kontrol et
      const hasResourceIds = vropsRequest.params && Object.keys(vropsRequest.params).some(key => key.startsWith('resourceId'));
      
      if (!hasResourceIds) {
        console.log('[CHAT] TopN endpoint tespit edildi, resourceId parametreleri eksik. Tüm VM\'ler çekiliyor...');
        
        try {
          // Tüm VM'leri listeleyen endpoint'i çalıştır
          const vmListRequest = {
            endpoint: '/api/resources',
            method: 'GET',
            params: {
              page: 0,
              pageSize: 1000,
              resourceKind: 'virtualmachine',
              _no_links: 'true'
            },
            body: {}
          };
          
          const vmListResponse = await executeVropsRequest(vmListRequest);
          
          // VM ID'lerini ve isimlerini topla (Map: resourceId -> name)
          const vmIds = [];
          const vmNameMap = new Map(); // VM isimlerini saklamak için Map
          
          if (vmListResponse.data && vmListResponse.data.resourceList && Array.isArray(vmListResponse.data.resourceList)) {
            vmListResponse.data.resourceList.forEach(resource => {
              if (resource.identifier) {
                vmIds.push(resource.identifier);
                // VM ismini resourceKey.name'den al
                const vmName = resource.resourceKey?.name || resource.identifier;
                vmNameMap.set(resource.identifier, vmName);
              }
            });
          }
          
          console.log(`[CHAT] ${vmIds.length} adet VM ID'si bulundu`);
          
          // VM isimlerini requestConfig'e ekle (parseTopNStatsResponse'da kullanılacak)
          // Map'i normal objeye çevir (JSON serialize için)
          const vmNameMapObj = {};
          vmNameMap.forEach((name, id) => {
            vmNameMapObj[id] = name;
          });
          
          if (!vropsRequest.vmNameMap) {
            vropsRequest.vmNameMap = vmNameMapObj;
          } else {
            // Eğer zaten bir vmNameMap varsa birleştir
            Object.assign(vropsRequest.vmNameMap, vmNameMapObj);
          }
          
          // VM ID'lerini vropsRequest params'ına ekle
          if (vmIds.length > 0) {
            // vROPS API'si resourceId parametrelerini query string'de tekrar eden parametreler olarak bekliyor
            // axios otomatik olarak array'leri query string'e çevirir: resourceId=id1&resourceId=id2&resourceId=id3
            // Eğer zaten bir resourceId varsa, onu da array'e dahil et
            if (vropsRequest.params.resourceId) {
              // Mevcut resourceId'yi array'e çevir
              const existingResourceId = vropsRequest.params.resourceId;
              if (!Array.isArray(existingResourceId)) {
                vropsRequest.params.resourceId = [existingResourceId];
              }
              // Yeni ID'leri ekle
              vropsRequest.params.resourceId = [...vropsRequest.params.resourceId, ...vmIds];
            } else {
              // Yeni array oluştur
              vropsRequest.params.resourceId = vmIds;
            }
            
            console.log(`[CHAT] ${vmIds.length} adet resourceId parametresi eklendi (toplam: ${vropsRequest.params.resourceId.length})`);
            console.log('[CHAT] Güncellenmiş vropsRequest params (ilk 5 resourceId):', {
              ...vropsRequest.params,
              resourceId: Array.isArray(vropsRequest.params.resourceId) 
                ? vropsRequest.params.resourceId.slice(0, 5) 
                : vropsRequest.params.resourceId
            });
          } else {
            console.warn('[CHAT] Hiç VM ID\'si bulunamadı');
          }
        } catch (vmListErr) {
          console.error('[CHAT] VM listesi çekilirken hata:', vmListErr);
          // Hata olsa bile devam et, belki ChatGPT'nin döndürdüğü endpoint zaten çalışır
        }
      } else {
        console.log('[CHAT] TopN endpoint tespit edildi, resourceId parametreleri mevcut');
      }
    }

    // 4) Varsa vROPS API request'ini çalıştırmayı dene (yoksa hiç çağrı yapma)
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

    // Tüm veritabanı işlemlerini transaction içinde yap (performans için)
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    let userMessageResult = null;
    let assistantMessageResult = null;

    try {
      // Kullanıcı mesajını veritabanına kaydet
      const [userMessageInsert] = await connection.execute(
        'INSERT INTO messages (chat_id, user_id, role, content, ai_model_id) VALUES (?, ?, ?, ?, ?)',
        [currentChatId, req.user.id, 'user', message, aiModelId]
      );
      userMessageResult = userMessageInsert;

      // Asistan cevabını veritabanına kaydet
      const [assistantMessageInsert] = await connection.execute(
        'INSERT INTO messages (chat_id, user_id, role, content, response_model_id) VALUES (?, ?, ?, ?, ?)',
        [currentChatId, req.user.id, 'assistant', gptResponse, aiModelId]
      );
      assistantMessageResult = assistantMessageInsert;

      // Sohbetin updated_at'ini güncelle ve başlık kontrolü yap (tek sorguda)
      // Eğer title NULL ise ve ilk mesajsa, başlık oluştur
      const title = message.substring(0, 50).trim();
      await connection.execute(
        'UPDATE chats SET updated_at = CURRENT_TIMESTAMP, title = COALESCE(title, ?) WHERE id = ? AND title IS NULL',
        [title, currentChatId]
      );
      
      // Eğer title zaten varsa sadece updated_at'i güncelle
      await connection.execute(
        'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND title IS NOT NULL',
        [currentChatId]
      );

      await connection.commit();
      connection.release();
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

    // Sonucu kullanıcıya döndür (ChatGPT cevabı her zaman döner)
    res.json({
      success: true,
      chatId: currentChatId,
      userMessage: message,
      gptResponse: gptResponse,
      vropsRequest: vropsRequest,
      vropsResult: vropsResult, // Ham data (debug için)
      parsedData: parsedData, // Parse edilmiş, temiz data
      dataType: dataType, // 'alerts', 'metrics', vs.
      displayType: displayType, // Frontend'e nasıl göstereceğini söyle ('table' veya 'card')
      vropsError: vropsError,
      vropsExecuted: vropsExecuted,
      performanceValuesData: performanceValuesData, // Performans değerleri verisi
      performanceValuesComment: performanceValuesComment, // ChatGPT yorumu
      userMessageId: userMessageResult.insertId,
      assistantMessageId: assistantMessageResult.insertId
    });

  } catch (error) {
    console.error('Chat message error:', error);
    res.status(500).json({ 
      error: 'Mesaj gönderilirken bir hata oluştu',
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
    console.log('[BUILD VROPS REQUEST] Query string parse edildi:', queryString);
    console.log('[BUILD VROPS REQUEST] Params objesi:', JSON.stringify(params, null, 2));
  } else {
    console.log('[BUILD VROPS REQUEST] Query string yok');
  }

  const result = {
    endpoint,      // Örn: /api/resources/33/stats
    method: 'GET', // Şimdilik tüm bu path'ler GET varsayılıyor
    params,
    body: {}
  };
  
  console.log('[BUILD VROPS REQUEST] Sonuç:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Performans analizi endpoint'i
 * VM ismini tespit eder, verilerini toplar ve ChatGPT'ye analiz için gönderir
 * POST /api/chat/analyze-performance
 * Body: { message: "x isimli VM neden yavaş?", vmName?: "optional", chatId?: "optional" }
 */
router.post('/analyze-performance', authenticateToken, async (req, res) => {
  try {
    const { message, vmName, chatId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // ChatId yoksa yeni sohbet oluştur
    let currentChatId = chatId;
    if (!currentChatId) {
      const [chatResult] = await pool.execute(
        'INSERT INTO chats (user_id, title) VALUES (?, ?)',
        [req.user.id, null]
      );
      currentChatId = chatResult.insertId;
    } else {
      // ChatId varsa, kullanıcıya ait olduğunu kontrol et
      const [chats] = await pool.execute(
        'SELECT id FROM chats WHERE id = ? AND user_id = ?',
        [currentChatId, req.user.id]
      );
      if (chats.length === 0) {
        return res.status(403).json({ error: 'Bu sohbete erişim yetkiniz yok.' });
      }
    }

    // Aktif AI modelini al (cache'lenmiş)
    let aiModel;
    try {
      const { getActiveAIModel } = await import('../services/aiModelCache.js');
      aiModel = await getActiveAIModel();
    } catch (error) {
      return res.status(500).json({ error: 'Aktif AI modeli bulunamadı. Lütfen ayarlardan bir AI modeli ekleyin.' });
    }

    const aiModelId = aiModel.id;

    console.log('--- PERFORMANCE ANALYSIS REQUEST START ---');
    console.log('Kullanıcı sorusu:', message);
    console.log('VM İsmi (opsiyonel):', vmName);

    // UUID formatını kontrol et (örn: "2aba63ec-52aa-481c-865f-a5089301d218")
    const uuidPattern = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
    const uuidMatch = message.match(uuidPattern);
    
    let resourceId = null;
    let targetVMName = vmName;

    // Eğer mesajda UUID varsa, direkt resource ID olarak kullan
    if (uuidMatch) {
      resourceId = uuidMatch[1];
      console.log('UUID formatında Resource ID tespit edildi:', resourceId);
      
      // VM bilgisini çek (isim için)
      try {
        const vmInfo = await getResourceInfo(resourceId);
        targetVMName = vmInfo?.resourceKey?.name || resourceId;
        console.log('VM bilgisi çekildi, VM ismi:', targetVMName);
      } catch (error) {
        console.warn('VM bilgisi çekilemedi, UUID kullanılacak:', error.message);
        targetVMName = resourceId;
      }
    } else {
      // VM ismini çıkar (kullanıcıdan gelen vmName veya mesajdan)
      if (!targetVMName) {
        // ChatGPT'ye VM ismini çıkarması için sor
        try {
          const extractPrompt = `Aşağıdaki soruda VM (sanal sunucu) ismini çıkar. Sadece VM ismini döndür, başka bir şey yazma. Eğer VM ismi yoksa "BULUNAMADI" yaz.
        
Soru: ${message}
Şu anki zaman (UTC epoch ms): ${Date.now()}`;
          
          const extractedName = await chatWithGPT(extractPrompt);
          targetVMName = extractedName.trim();
          
          // "BULUNAMADI" kontrolü
          if (targetVMName === 'BULUNAMADI' || !targetVMName || targetVMName.length < 2) {
            return res.status(400).json({ 
              error: 'VM ismi tespit edilemedi. Lütfen sorunuzda VM ismini belirtin (örn: "test-vm-01 isimli VM neden yavaş?")' 
            });
          }
        } catch (error) {
          console.error('VM ismi çıkarılamadı:', error.message);
          return res.status(400).json({ 
            error: 'VM ismi tespit edilemedi. Lütfen sorunuzda VM ismini belirtin.' 
          });
        }
      }

      console.log('Tespit edilen VM ismi:', targetVMName);

      // VM ID'yi bul (isimden)
      try {
        resourceId = await findVMByName(targetVMName);
        if (!resourceId) {
          return res.status(404).json({ 
            error: `VM bulunamadı: ${targetVMName}. Lütfen VM ismini kontrol edin.` 
          });
        }
        console.log('VM Resource ID (isimden bulundu):', resourceId);
      } catch (error) {
        console.error('VM bulunamadı:', error.message);
        return res.status(404).json({ 
          error: `VM bulunamadı: ${error.message}` 
        });
      }
    }

    // VM verilerini topla (properties + performance stats)
    let vmData;
    try {
      console.log('VM verileri toplanıyor...');
      vmData = await collectAllVMData(resourceId, targetVMName);
      console.log('VM verileri toplandı:', {
        vmName: vmData.vmName,
        vmId: vmData.vmId,
        hasConfiguration: !!vmData.configuration,
        hasPerformance: !!vmData.performance
      });
    } catch (error) {
      console.error('VM verileri toplanamadı:', error.message);
      return res.status(500).json({ 
        error: `VM verileri toplanamadı: ${error.message}` 
      });
    }

    // ChatGPT'ye gönderilecek formata dönüştür
    const formattedData = formatDataForGPT(vmData);
    console.log('Formatted data for GPT:', JSON.stringify(formattedData, null, 2));

    // AI model bilgilerini chatgpt.js'e geçirmek için environment değişkenlerini geçici olarak güncelle
    const originalApiKey = process.env.CHATGPT_API_KEY;
    const originalModel = process.env.CHATGPT_MODEL;
    const originalBaseUrl = process.env.CHATGPT_BASE_URL;
    
    process.env.CHATGPT_API_KEY = aiModel.api_token;
    process.env.CHATGPT_MODEL = aiModel.model_version;
    process.env.CHATGPT_BASE_URL = aiModel.base_url;

    // ChatGPT'ye analiz için gönder
    let analysis;
    try {
      console.log('ChatGPT analizi başlatılıyor...');
      console.log('User question:', message);
      analysis = await analyzePerformanceFromGPT(message, formattedData);
      console.log('ChatGPT analizi tamamlandı');
      console.log('Analysis length:', analysis?.length || 0, 'characters');
    } catch (error) {
      console.error('ChatGPT analizi başarısız:', error.message);
      // Environment değişkenlerini geri yükle
      process.env.CHATGPT_API_KEY = originalApiKey;
      process.env.CHATGPT_MODEL = originalModel;
      process.env.CHATGPT_BASE_URL = originalBaseUrl;
      return res.status(500).json({ 
        error: `Performans analizi yapılamadı: ${error.message}` 
      });
    }

    // Environment değişkenlerini geri yükle
    process.env.CHATGPT_API_KEY = originalApiKey;
    process.env.CHATGPT_MODEL = originalModel;
    process.env.CHATGPT_BASE_URL = originalBaseUrl;

    // Tüm veritabanı işlemlerini transaction içinde yap (performans için)
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Kullanıcı mesajını veritabanına kaydet
      await connection.execute(
        'INSERT INTO messages (chat_id, user_id, role, content, ai_model_id) VALUES (?, ?, ?, ?, ?)',
        [currentChatId, req.user.id, 'user', message, aiModelId]
      );

      // Asistan cevabını veritabanına kaydet
      await connection.execute(
        'INSERT INTO messages (chat_id, user_id, role, content, response_model_id) VALUES (?, ?, ?, ?, ?)',
        [currentChatId, req.user.id, 'assistant', analysis, aiModelId]
      );

      // Sohbetin updated_at'ini güncelle ve başlık kontrolü yap (tek sorguda)
      // Eğer title NULL ise ve ilk mesajsa, başlık oluştur
      const title = message.substring(0, 50).trim();
      await connection.execute(
        'UPDATE chats SET updated_at = CURRENT_TIMESTAMP, title = COALESCE(title, ?) WHERE id = ? AND title IS NULL',
        [title, currentChatId]
      );
      
      // Eğer title zaten varsa sadece updated_at'i güncelle
      await connection.execute(
        'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND title IS NOT NULL',
        [currentChatId]
      );

      await connection.commit();
      connection.release();
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

    console.log('--- PERFORMANCE ANALYSIS REQUEST END ---');

    // Sonucu döndür
    res.json({
      success: true,
      chatId: currentChatId,
      vmId: resourceId,
      vmName: targetVMName,
      analysis: analysis,
      collectedData: vmData,
      timestamp: new Date().toISOString(),
      userMessageId: userMessageResult.insertId,
      assistantMessageId: assistantMessageResult.insertId
    });

  } catch (error) {
    console.error('Performance analysis error:', error);
    res.status(500).json({ 
      error: 'An error occurred while processing performance analysis',
      details: error.message 
    });
  }
});

export default router;

