// Sohbetler route'ları - Sohbet ve mesaj yönetimi
import express from 'express';
import pool from '../services/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Tüm sohbetleri listele (kullanıcının kendi sohbetleri) - Optimize edilmiş sorgu
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Subquery ile COUNT yapmak GROUP BY'den daha hızlı olabilir (özellikle çok mesaj varsa)
    // Index kullanımını optimize etmek için subquery kullanıyoruz
    const [chats] = await pool.execute(
      `SELECT c.id, c.title, c.created_at, c.updated_at,
       (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as message_count
       FROM chats c
       WHERE c.user_id = ?
       ORDER BY c.updated_at DESC`,
      [req.user.id]
    );

    const mappedChats = chats.map(chat => ({
      id: chat.id,
      title: chat.title,
      createdAt: chat.created_at,
      updatedAt: chat.updated_at,
      messageCount: chat.message_count
    }));

    res.json({
      success: true,
      chats: mappedChats
    });
  } catch (error) {
    console.error('List chats error:', error);
    res.status(500).json({ error: 'Sohbetler listelenirken bir hata oluştu.' });
  }
});

// Sohbet arama - mesaj içeriğine göre
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.json({
        success: true,
        chats: []
      });
    }

    const searchTerm = `%${q.trim()}%`;
    
    // Mesaj içeriğinde arama yap ve eşleşen sohbetleri getir
    const [chats] = await pool.execute(
      `SELECT DISTINCT c.id, c.title, c.created_at, c.updated_at,
       (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as message_count
       FROM chats c
       INNER JOIN messages m ON c.id = m.chat_id
       WHERE c.user_id = ? AND m.content LIKE ?
       ORDER BY c.updated_at DESC`,
      [req.user.id, searchTerm]
    );

    const mappedChats = chats.map(chat => ({
      id: chat.id,
      title: chat.title,
      createdAt: chat.created_at,
      updatedAt: chat.updated_at,
      messageCount: chat.message_count
    }));

    res.json({
      success: true,
      chats: mappedChats
    });
  } catch (error) {
    console.error('Search chats error:', error);
    res.status(500).json({ error: 'Sohbet arama sırasında bir hata oluştu.' });
  }
});

// Tüm sohbetleri sil
router.delete('/all', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM chats WHERE user_id = ?', [req.user.id]);

    res.json({
      success: true,
      message: 'Tüm sohbetler başarıyla silindi.'
    });
  } catch (error) {
    console.error('Delete all chats error:', error);
    res.status(500).json({ error: 'Sohbetler silinirken bir hata oluştu.' });
  }
});

// Seçili sohbetleri sil
router.delete('/bulk', authenticateToken, async (req, res) => {
  try {
    const { chatIds } = req.body;

    if (!Array.isArray(chatIds) || chatIds.length === 0) {
      return res.status(400).json({ error: 'Geçersiz sohbet ID listesi.' });
    }

    // Kullanıcının kendi sohbetlerini kontrol et ve sil
    const placeholders = chatIds.map(() => '?').join(',');
    await pool.execute(
      `DELETE FROM chats WHERE id IN (${placeholders}) AND user_id = ?`,
      [...chatIds, req.user.id]
    );

    res.json({
      success: true,
      message: `${chatIds.length} sohbet başarıyla silindi.`
    });
  } catch (error) {
    console.error('Bulk delete chats error:', error);
    res.status(500).json({ error: 'Sohbetler silinirken bir hata oluştu.' });
  }
});

// Yeni sohbet oluştur
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO chats (user_id, title) VALUES (?, ?)',
      [req.user.id, title || null]
    );

    res.json({
      success: true,
      chat: {
        id: result.insertId,
        title: title || null,
        userId: req.user.id
      }
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ error: 'Sohbet oluşturulurken bir hata oluştu.' });
  }
});

// Sohbet detayını getir (mesajlarla birlikte)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const chatId = parseInt(req.params.id);

    // Sohbeti ve mesajları tek sorguda getir (daha hızlı - N+1 problemi çözüldü)
    const [results] = await pool.execute(
      `SELECT c.id, c.title, c.user_id, c.created_at, c.updated_at,
       m.id as message_id, m.role, m.content, m.created_at as message_created_at, 
       m.ai_model_id, m.response_model_id,
       am1.name as question_model_name, am2.name as response_model_name
       FROM chats c
       LEFT JOIN messages m ON c.id = m.chat_id
       LEFT JOIN ai_models am1 ON m.ai_model_id = am1.id
       LEFT JOIN ai_models am2 ON m.response_model_id = am2.id
       WHERE c.id = ? AND c.user_id = ?
       ORDER BY m.created_at ASC`,
      [chatId, req.user.id]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: 'Sohbet bulunamadı.' });
    }

    const chat = {
      id: results[0].id,
      title: results[0].title,
      userId: results[0].user_id,
      createdAt: results[0].created_at,
      updatedAt: results[0].updated_at,
      messages: results
        .filter(row => row.message_id !== null)
        .map(row => ({
          id: row.message_id,
          role: row.role,
          content: row.content,
          createdAt: row.message_created_at,
          questionModelId: row.ai_model_id,
          questionModelName: row.question_model_name,
          responseModelId: row.response_model_id,
          responseModelName: row.response_model_name
        }))
    };

    res.json({
      success: true,
      chat
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Sohbet alınırken bir hata oluştu.' });
  }
});

// Sohbeti sil
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const chatId = parseInt(req.params.id);

    // Sohbeti kontrol et (kullanıcının kendi sohbeti mi?)
    const [chats] = await pool.execute(
      'SELECT id FROM chats WHERE id = ? AND user_id = ?',
      [chatId, req.user.id]
    );

    if (chats.length === 0) {
      return res.status(404).json({ error: 'Sohbet bulunamadı.' });
    }

    // Sohbeti sil (mesajlar CASCADE ile otomatik silinecek)
    await pool.execute('DELETE FROM chats WHERE id = ?', [chatId]);

    res.json({
      success: true,
      message: 'Sohbet başarıyla silindi.'
    });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ error: 'Sohbet silinirken bir hata oluştu.' });
  }
});

// Sohbet başlığını güncelle
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const chatId = parseInt(req.params.id);
    const { title } = req.body;

    // Sohbeti kontrol et
    const [chats] = await pool.execute(
      'SELECT id FROM chats WHERE id = ? AND user_id = ?',
      [chatId, req.user.id]
    );

    if (chats.length === 0) {
      return res.status(404).json({ error: 'Sohbet bulunamadı.' });
    }

    // Başlığı güncelle
    await pool.execute(
      'UPDATE chats SET title = ? WHERE id = ?',
      [title, chatId]
    );

    res.json({
      success: true,
      message: 'Sohbet başlığı güncellendi.'
    });
  } catch (error) {
    console.error('Update chat error:', error);
    res.status(500).json({ error: 'Sohbet güncellenirken bir hata oluştu.' });
  }
});

export default router;

