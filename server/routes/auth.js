// Authentication route'ları - Login, şifre sıfırlama, kullanıcı yönetimi
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../services/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Login endpoint'i
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı ve şifre gereklidir.' });
    }

    // Kullanıcıyı veritabanından bul
    const [users] = await pool.execute(
      'SELECT id, username, password_hash, is_admin, email FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
    }

    const user = users[0];

    // Şifreyi kontrol et
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
    }

    // JWT token oluştur
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Kullanıcı bilgilerini döndür (şifre hariç)
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Giriş yapılırken bir hata oluştu.' });
  }
});

// Şifremi unuttum - Token oluştur
router.post('/forgot-password', async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Kullanıcı adı gereklidir.' });
    }

    // Kullanıcıyı bul
    const [users] = await pool.execute(
      'SELECT id, email FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      // Güvenlik nedeniyle kullanıcı bulunamadığında da başarılı mesaj döndür
      return res.json({
        success: true,
        message: 'Eğer kullanıcı adı kayıtlıysa, şifre sıfırlama bağlantısı e-posta adresinize gönderilecektir.'
      });
    }

    const user = users[0];

    // E-posta kontrolü (eğer e-posta verilmişse)
    if (email && user.email && user.email !== email) {
      return res.status(400).json({ error: 'Kullanıcı adı ve e-posta eşleşmiyor.' });
    }

    // Token oluştur
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 saat geçerli

    // Token'ı veritabanına kaydet
    await pool.execute(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, resetToken, expiresAt]
    );

    // Burada normalde e-posta gönderilir, şimdilik token'ı döndürüyoruz (geliştirme için)
    // Production'da token'ı e-posta ile göndermelisiniz
    res.json({
      success: true,
      message: 'Şifre sıfırlama bağlantısı oluşturuldu.',
      resetToken: resetToken // Geliştirme için, production'da kaldırılmalı
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Şifre sıfırlama işlemi sırasında bir hata oluştu.' });
  }
});

// Şifre sıfırlama - Token ile şifre değiştir
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token ve yeni şifre gereklidir.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
    }

    // Token'ı kontrol et
    const [tokens] = await pool.execute(
      'SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = ?',
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'Geçersiz token.' });
    }

    const resetToken = tokens[0];

    // Token kullanılmış mı kontrol et
    if (resetToken.used) {
      return res.status(400).json({ error: 'Bu token daha önce kullanılmış.' });
    }

    // Token süresi dolmuş mu kontrol et
    if (new Date() > new Date(resetToken.expires_at)) {
      return res.status(400).json({ error: 'Token süresi dolmuş.' });
    }

    // Şifreyi hash'le
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Şifreyi güncelle
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, resetToken.user_id]
    );

    // Token'ı kullanıldı olarak işaretle
    await pool.execute(
      'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?',
      [token]
    );

    res.json({
      success: true,
      message: 'Şifre başarıyla değiştirildi.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Şifre değiştirme işlemi sırasında bir hata oluştu.' });
  }
});

// Kullanıcı oluşturma (sadece admin)
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, email, name, surname, isAdmin } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı ve şifre gereklidir.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
    }

    // Kullanıcı adı zaten var mı kontrol et
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor.' });
    }

    // Şifreyi hash'le
    const passwordHash = await bcrypt.hash(password, 10);

    // Kullanıcıyı oluştur
    const [result] = await pool.execute(
      'INSERT INTO users (username, password_hash, email, name, surname, is_admin) VALUES (?, ?, ?, ?, ?, ?)',
      [username, passwordHash, email || null, name || null, surname || null, isAdmin || false]
    );

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu.',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Kullanıcı oluşturulurken bir hata oluştu.' });
  }
});

// Kullanıcıları listele (sadece admin)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, name, surname, is_admin, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        surname: user.surname,
        isAdmin: user.is_admin,
        createdAt: user.created_at
      }))
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Kullanıcılar listelenirken bir hata oluştu.' });
  }
});

// Kullanıcı silme (sadece admin)
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Kendini silmeyi engelle
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz.' });
    }

    // Admin kullanıcıyı silmeyi engelle (en az bir admin kalmalı)
    const [user] = await pool.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [userId]
    );

    if (user.length > 0 && user[0].is_admin) {
      // Başka admin var mı kontrol et
      const [admins] = await pool.execute(
        'SELECT COUNT(*) as count FROM users WHERE is_admin = TRUE AND id != ?',
        [userId]
      );

      if (admins[0].count === 0) {
        return res.status(400).json({ error: 'En az bir admin kullanıcı kalmalıdır.' });
      }
    }

    // Kullanıcıyı sil
    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi.'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Kullanıcı silinirken bir hata oluştu.' });
  }
});

// Mevcut kullanıcı bilgilerini getir
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, is_admin FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    const user = users[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Kullanıcı bilgileri alınırken bir hata oluştu.' });
  }
});

export default router;

