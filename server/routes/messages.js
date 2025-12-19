// Mesajlar route'ları - Mesaj oluşturma ve favorilere ekleme
import express from 'express';
import pool from '../services/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Mesaj oluştur
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { chatId, role, content, aiModelId, responseModelId } = req.body;

    if (!chatId || !role || !content) {
      return res.status(400).json({ error: 'Sohbet ID, rol ve içerik gereklidir.' });
    }

    // Sohbetin kullanıcıya ait olduğunu kontrol et
    const [chats] = await pool.execute(
      'SELECT id FROM chats WHERE id = ? AND user_id = ?',
      [chatId, req.user.id]
    );

    if (chats.length === 0) {
      return res.status(404).json({ error: 'Sohbet bulunamadı.' });
    }

    // Transaction kullanarak tüm işlemleri tek seferde yap (performans için)
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Mesajı oluştur
      const [result] = await connection.execute(
        'INSERT INTO messages (chat_id, user_id, role, content, ai_model_id, response_model_id) VALUES (?, ?, ?, ?, ?, ?)',
        [chatId, req.user.id, role, content, aiModelId || null, responseModelId || null]
      );

      // İlk mesajsa ve başlık yoksa, başlık oluştur - Tek sorguda kontrol ve güncelleme
      if (role === 'user' && content.length > 0) {
        const title = content.substring(0, 50).trim();
        // Sadece title NULL ise güncelle (daha hızlı)
        await connection.execute(
          'UPDATE chats SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND title IS NULL',
          [title, chatId]
        );
      } else {
        // Sadece updated_at'i güncelle
        await connection.execute(
          'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [chatId]
        );
      }

      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message: {
          id: result.insertId,
          chatId,
          role,
          content,
          createdAt: new Date()
        }
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Mesaj oluşturulurken bir hata oluştu.' });
  }
});

// Favorilere ekle (artık mesaj içeriği ile)
router.post('/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);

    // Message ID kontrolü
    if (isNaN(messageId) || messageId <= 0) {
      return res.status(400).json({ error: 'Geçersiz mesaj ID.' });
    }

    // Mesajın kullanıcıya ait olduğunu ve user role'ünde olduğunu tek sorguda kontrol et
    const [messages] = await pool.execute(
      `SELECT m.id, m.role, m.content, c.user_id 
       FROM messages m 
       INNER JOIN chats c ON m.chat_id = c.id 
       WHERE m.id = ? AND c.user_id = ? AND m.role = 'user'`,
      [messageId, req.user.id]
    );

    if (messages.length === 0) {
      return res.status(404).json({ error: 'Mesaj bulunamadı veya favorilere eklenemez.' });
    }

    const messageContent = messages[0].content.trim();
    
    if (!messageContent) {
      return res.status(400).json({ error: 'Mesaj içeriği boş olamaz.' });
    }

    // Zaten favorilerde mi kontrol et (artık content'e göre)
    const [existingFavorites] = await pool.execute(
      'SELECT id FROM favorites WHERE user_id = ? AND content = ?',
      [req.user.id, messageContent]
    );

    if (existingFavorites.length > 0) {
      return res.status(400).json({ error: 'Bu mesaj zaten favorilerinizde.' });
    }

    // Favorilere ekle (artık content ile)
    await pool.execute(
      'INSERT INTO favorites (user_id, content) VALUES (?, ?)',
      [req.user.id, messageContent]
    );

    res.json({
      success: true,
      message: 'Mesaj favorilere eklendi.'
    });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({ error: 'Favorilere eklenirken bir hata oluştu.' });
  }
});

// Favorilerden çıkar
router.delete('/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);

    // Favoriden çıkar
    const [result] = await pool.execute(
      'DELETE FROM favorites WHERE user_id = ? AND message_id = ?',
      [req.user.id, messageId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Bu mesaj favorilerinizde bulunamadı.' });
    }

    res.json({
      success: true,
      message: 'Mesaj favorilerden çıkarıldı.'
    });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({ error: 'Favorilerden çıkarılırken bir hata oluştu.' });
  }
});

export default router;

