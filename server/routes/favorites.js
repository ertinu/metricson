// Favoriler route'ları - Kullanıcının favori sorularını listele
import express from 'express';
import pool from '../services/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Kullanıcının favorilerini listele - Optimize edilmiş sorgu
router.get('/', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1000; // Varsayılan 1000, paging için
    const offset = parseInt(req.query.offset) || 0;
    const searchQuery = req.query.search || '';

    // LIMIT ve OFFSET için prepared statement kullanmak MySQL'de sorun çıkarabiliyor
    // Bu yüzden değerleri direkt sorguya ekliyoruz (güvenli çünkü parseInt ile kontrol ediliyor)
    let query = `SELECT f.id, f.content, f.created_at as favorited_at
       FROM favorites f
       WHERE f.user_id = ?`;

    const params = [req.user.id];

    // Arama sorgusu varsa ekle
    if (searchQuery.trim()) {
      query += ` AND f.content LIKE ?`;
      params.push(`%${searchQuery}%`);
    }

    query += ` ORDER BY f.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const [favorites] = await pool.execute(query, params);

    // Toplam sayıyı al (paging için)
    let countQuery = `SELECT COUNT(*) as total FROM favorites f
       WHERE f.user_id = ?`;
    const countParams = [req.user.id];
    
    if (searchQuery.trim()) {
      countQuery += ` AND f.content LIKE ?`;
      countParams.push(`%${searchQuery}%`);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    const mappedFavorites = favorites.map(fav => ({
      id: fav.id,
      content: fav.content,
      favoritedAt: fav.favorited_at
    }));

    res.json({
      success: true,
      favorites: mappedFavorites,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('List favorites error:', error);
    res.status(500).json({ error: 'Favoriler listelenirken bir hata oluştu.' });
  }
});

// Toplu favori silme (artık favori ID'leri ile)
router.delete('/bulk', authenticateToken, async (req, res) => {
  try {
    const { favoriteIds } = req.body;

    if (!Array.isArray(favoriteIds) || favoriteIds.length === 0) {
      return res.status(400).json({ error: 'Geçerli favori ID\'leri gerekli.' });
    }

    // Kullanıcının favorilerini kontrol et ve sil
    const placeholders = favoriteIds.map(() => '?').join(',');
    const [result] = await pool.execute(
      `DELETE FROM favorites 
       WHERE user_id = ? AND id IN (${placeholders})`,
      [req.user.id, ...favoriteIds]
    );

    res.json({
      success: true,
      deletedCount: result.affectedRows
    });
  } catch (error) {
    console.error('Bulk delete favorites error:', error);
    res.status(500).json({ error: 'Favoriler silinirken bir hata oluştu.' });
  }
});

// Tek favori silme
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const favoriteId = parseInt(req.params.id);

    if (isNaN(favoriteId) || favoriteId <= 0) {
      return res.status(400).json({ error: 'Geçersiz favori ID.' });
    }

    const [result] = await pool.execute(
      'DELETE FROM favorites WHERE id = ? AND user_id = ?',
      [favoriteId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Favori bulunamadı.' });
    }

    res.json({
      success: true,
      message: 'Favori silindi.'
    });
  } catch (error) {
    console.error('Delete favorite error:', error);
    res.status(500).json({ error: 'Favori silinirken bir hata oluştu.' });
  }
});

// Tüm favorileri sil
router.delete('/all', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM favorites WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      deletedCount: result.affectedRows
    });
  } catch (error) {
    console.error('Delete all favorites error:', error);
    res.status(500).json({ error: 'Favoriler silinirken bir hata oluştu.' });
  }
});

export default router;

