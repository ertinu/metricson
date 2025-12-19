// AI Modelleri route'ları - Model yönetimi (sadece admin)
import express from 'express';
import pool from '../services/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Tüm AI modellerini listele
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [models] = await pool.execute(
      'SELECT id, name, model_version, base_url, is_active, created_at FROM ai_models ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      models: models.map(model => ({
        id: model.id,
        name: model.name,
        modelVersion: model.model_version,
        baseUrl: model.base_url,
        isActive: model.is_active,
        createdAt: model.created_at
      }))
    });
  } catch (error) {
    console.error('List AI models error:', error);
    res.status(500).json({ error: 'AI modelleri listelenirken bir hata oluştu.' });
  }
});

// AI modeli oluştur (sadece admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, apiToken, modelVersion, baseUrl } = req.body;

    if (!name || !apiToken || !modelVersion) {
      return res.status(400).json({ error: 'Model ismi, API token ve model versiyonu gereklidir.' });
    }

    // Model ismi zaten var mı kontrol et
    const [existingModels] = await pool.execute(
      'SELECT id FROM ai_models WHERE name = ?',
      [name]
    );

    if (existingModels.length > 0) {
      return res.status(400).json({ error: 'Bu model ismi zaten kullanılıyor.' });
    }

    // Modeli oluştur
    const [result] = await pool.execute(
      'INSERT INTO ai_models (name, api_token, model_version, base_url) VALUES (?, ?, ?, ?)',
      [name, apiToken, modelVersion, baseUrl || 'https://api.openai.com/v1']
    );

    // Cache'i temizle (yeni model eklendi)
    const { clearAIModelCache } = await import('../services/aiModelCache.js');
    clearAIModelCache();

    res.json({
      success: true,
      message: 'AI modeli başarıyla oluşturuldu.',
      modelId: result.insertId
    });
  } catch (error) {
    console.error('Create AI model error:', error);
    res.status(500).json({ error: 'AI modeli oluşturulurken bir hata oluştu.' });
  }
});

// AI modeli güncelle (sadece admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const modelId = parseInt(req.params.id);
    const { name, apiToken, modelVersion, baseUrl, isActive } = req.body;

    // Model var mı kontrol et
    const [models] = await pool.execute(
      'SELECT id FROM ai_models WHERE id = ?',
      [modelId]
    );

    if (models.length === 0) {
      return res.status(404).json({ error: 'AI modeli bulunamadı.' });
    }

    // Güncelleme sorgusu oluştur
    const updates = [];
    const values = [];

    if (name) {
      // İsim değişiyorsa, başka bir modelde aynı isim var mı kontrol et
      const [existingModels] = await pool.execute(
        'SELECT id FROM ai_models WHERE name = ? AND id != ?',
        [name, modelId]
      );

      if (existingModels.length > 0) {
        return res.status(400).json({ error: 'Bu model ismi zaten kullanılıyor.' });
      }

      updates.push('name = ?');
      values.push(name);
    }

    if (apiToken) {
      updates.push('api_token = ?');
      values.push(apiToken);
    }

    if (modelVersion) {
      updates.push('model_version = ?');
      values.push(modelVersion);
    }

    if (baseUrl) {
      updates.push('base_url = ?');
      values.push(baseUrl);
    }

    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Güncellenecek alan belirtilmedi.' });
    }

    values.push(modelId);

    await pool.execute(
      `UPDATE ai_models SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Cache'i temizle (AI model güncellendi)
    const { clearAIModelCache } = await import('../services/aiModelCache.js');
    clearAIModelCache();

    res.json({
      success: true,
      message: 'AI modeli başarıyla güncellendi.'
    });
  } catch (error) {
    console.error('Update AI model error:', error);
    res.status(500).json({ error: 'AI modeli güncellenirken bir hata oluştu.' });
  }
});

// AI modeli sil (sadece admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const modelId = parseInt(req.params.id);

    // Model var mı kontrol et
    const [models] = await pool.execute(
      'SELECT id FROM ai_models WHERE id = ?',
      [modelId]
    );

    if (models.length === 0) {
      return res.status(404).json({ error: 'AI modeli bulunamadı.' });
    }

    // Modeli sil
    await pool.execute('DELETE FROM ai_models WHERE id = ?', [modelId]);

    // Cache'i temizle (model silindi)
    const { clearAIModelCache } = await import('../services/aiModelCache.js');
    clearAIModelCache();

    res.json({
      success: true,
      message: 'AI modeli başarıyla silindi.'
    });
  } catch (error) {
    console.error('Delete AI model error:', error);
    res.status(500).json({ error: 'AI modeli silinirken bir hata oluştu.' });
  }
});

// Aktif AI modelini getir (chat için kullanılacak)
router.get('/active', authenticateToken, async (req, res) => {
  try {
    // Cache'lenmiş AI modelini kullan
    const { getActiveAIModel } = await import('../services/aiModelCache.js');
    const aiModel = await getActiveAIModel();

    if (!aiModel) {
      return res.status(404).json({ error: 'Aktif AI modeli bulunamadı.' });
    }

    res.json({
      success: true,
      model: {
        id: aiModel.id,
        name: aiModel.name,
        apiToken: aiModel.api_token,
        modelVersion: aiModel.model_version,
        baseUrl: aiModel.base_url
      }
    });
  } catch (error) {
    console.error('Get active AI model error:', error);
    res.status(500).json({ error: 'Aktif AI modeli alınırken bir hata oluştu.' });
  }
});

export default router;

