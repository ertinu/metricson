// vROPS Konfigürasyonları route'ları - vROPS yönetimi (sadece admin)
import express from 'express';
import pool from '../services/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Şifreleme anahtarı (environment'tan alınmalı, 32 byte = 64 hex karakter olmalı)
// Eğer environment'ta yoksa, rastgele bir anahtar oluşturulur (production'da mutlaka environment'tan alınmalı)
let ENCRYPTION_KEY = process.env.VROPS_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  // 32 byte = 64 hex karakter
  ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  console.warn('VROPS_ENCRYPTION_KEY environment değişkeni bulunamadı veya geçersiz. Rastgele bir anahtar oluşturuldu. Production\'da mutlaka environment değişkenini ayarlayın!');
}
const ALGORITHM = 'aes-256-cbc';

// Şifreleme fonksiyonu
function encrypt(text) {
  try {
    const iv = crypto.randomBytes(16);
    const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Şifreleme hatası');
  }
}

// Şifre çözme fonksiyonu
function decrypt(text) {
  try {
    const parts = text.split(':');
    if (parts.length !== 2) {
      throw new Error('Geçersiz şifreli metin formatı');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Şifre çözme hatası');
  }
}

// Tüm vROPS konfigürasyonlarını listele
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [configs] = await pool.execute(
      'SELECT id, name, url, username, description, is_active, created_at, updated_at FROM vrops_configurations ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      configs: configs.map(config => ({
        id: config.id,
        name: config.name,
        url: config.url,
        username: config.username,
        description: config.description,
        isActive: config.is_active,
        createdAt: config.created_at,
        updatedAt: config.updated_at
      }))
    });
  } catch (error) {
    console.error('List vROPS configs error:', error);
    res.status(500).json({ error: 'vROPS konfigürasyonları listelenirken bir hata oluştu.' });
  }
});

// vROPS konfigürasyonu oluştur (sadece admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, url, username, password, description, isActive } = req.body;

    if (!name || !url || !username || !password) {
      return res.status(400).json({ error: 'vROPS adı, URL, kullanıcı adı ve şifre gereklidir.' });
    }

    // Şifreyi şifrele
    const encryptedPassword = encrypt(password);

    // Konfigürasyonu oluştur
    const [result] = await pool.execute(
      'INSERT INTO vrops_configurations (name, url, username, password, description, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [name, url, username, encryptedPassword, description || null, isActive !== undefined ? isActive : true]
    );

    res.json({
      success: true,
      message: 'vROPS konfigürasyonu başarıyla oluşturuldu.',
      configId: result.insertId
    });
  } catch (error) {
    console.error('Create vROPS config error:', error);
    res.status(500).json({ error: 'vROPS konfigürasyonu oluşturulurken bir hata oluştu.' });
  }
});

// vROPS konfigürasyonu güncelle (sadece admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const configId = parseInt(req.params.id);
    const { name, url, username, password, description, isActive } = req.body;

    // Konfigürasyon var mı kontrol et
    const [configs] = await pool.execute(
      'SELECT id FROM vrops_configurations WHERE id = ?',
      [configId]
    );

    if (configs.length === 0) {
      return res.status(404).json({ error: 'vROPS konfigürasyonu bulunamadı.' });
    }

    // Güncelleme sorgusu oluştur
    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }

    if (url) {
      updates.push('url = ?');
      values.push(url);
    }

    if (username) {
      updates.push('username = ?');
      values.push(username);
    }

    if (password) {
      // Şifreyi şifrele
      const encryptedPassword = encrypt(password);
      updates.push('password = ?');
      values.push(encryptedPassword);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }

    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Güncellenecek alan belirtilmedi.' });
    }

    values.push(configId);

    await pool.execute(
      `UPDATE vrops_configurations SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: 'vROPS konfigürasyonu başarıyla güncellendi.'
    });
  } catch (error) {
    console.error('Update vROPS config error:', error);
    res.status(500).json({ error: 'vROPS konfigürasyonu güncellenirken bir hata oluştu.' });
  }
});

// vROPS konfigürasyonu sil (sadece admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const configId = parseInt(req.params.id);

    // Konfigürasyon var mı kontrol et
    const [configs] = await pool.execute(
      'SELECT id FROM vrops_configurations WHERE id = ?',
      [configId]
    );

    if (configs.length === 0) {
      return res.status(404).json({ error: 'vROPS konfigürasyonu bulunamadı.' });
    }

    // Konfigürasyonu sil
    await pool.execute('DELETE FROM vrops_configurations WHERE id = ?', [configId]);

    res.json({
      success: true,
      message: 'vROPS konfigürasyonu başarıyla silindi.'
    });
  } catch (error) {
    console.error('Delete vROPS config error:', error);
    res.status(500).json({ error: 'vROPS konfigürasyonu silinirken bir hata oluştu.' });
  }
});

// Aktif vROPS konfigürasyonunu getir (şifre ile birlikte, sadece admin)
router.get('/active', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [configs] = await pool.execute(
      'SELECT id, name, url, username, password, description FROM vrops_configurations WHERE is_active = TRUE LIMIT 1'
    );

    if (configs.length === 0) {
      return res.status(404).json({ error: 'Aktif vROPS konfigürasyonu bulunamadı.' });
    }

    const config = configs[0];
    
    // Şifreyi çöz
    let decryptedPassword = null;
    try {
      decryptedPassword = decrypt(config.password);
    } catch (error) {
      console.error('Password decryption error:', error);
      return res.status(500).json({ error: 'Şifre çözülürken bir hata oluştu.' });
    }

    res.json({
      success: true,
      config: {
        id: config.id,
        name: config.name,
        url: config.url,
        username: config.username,
        password: decryptedPassword,
        description: config.description
      }
    });
  } catch (error) {
    console.error('Get active vROPS config error:', error);
    res.status(500).json({ error: 'Aktif vROPS konfigürasyonu alınırken bir hata oluştu.' });
  }
});

export default router;

