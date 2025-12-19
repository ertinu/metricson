// AI Model Cache - Aktif AI modelini cache'ler, gereksiz sorguları önler
import pool from './database.js';

let cachedModel = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika cache süresi

/**
 * Aktif AI modelini getir (cache'lenmiş)
 * @returns {Promise<Object>} AI model objesi
 */
export async function getActiveAIModel() {
  const now = Date.now();
  
  // Cache geçerliyse direkt döndür
  if (cachedModel && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedModel;
  }
  
  // Cache yoksa veya süresi dolmuşsa veritabanından al
  try {
    const [models] = await pool.execute(
      'SELECT id, name, api_token, model_version, base_url FROM ai_models WHERE is_active = TRUE LIMIT 1'
    );
    
    if (models.length === 0) {
      throw new Error('Aktif AI modeli bulunamadı');
    }
    
    // Cache'i güncelle
    cachedModel = models[0];
    cacheTimestamp = now;
    
    return cachedModel;
  } catch (error) {
    console.error('AI model getirme hatası:', error);
    throw error;
  }
}

/**
 * Cache'i temizle (AI model güncellendiğinde çağrılmalı)
 */
export function clearAIModelCache() {
  cachedModel = null;
  cacheTimestamp = null;
}

