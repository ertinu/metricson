// Authentication middleware - Kullanıcı giriş kontrolü yapar
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES6 modül sisteminde __dirname'i almak için
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment değişkenlerini yükle
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// JWT token doğrulama middleware'i
export const authenticateToken = (req, res, next) => {
  // Authorization header'dan token'ı al
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN" formatından token'ı al

  if (!token) {
    return res.status(401).json({ error: 'Token bulunamadı. Lütfen giriş yapın.' });
  }

  // Token'ı doğrula
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Geçersiz token. Lütfen tekrar giriş yapın.' });
    }
    
    // Kullanıcı bilgisini request'e ekle
    req.user = user;
    next();
  });
};

// Admin kontrolü middleware'i
export const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Bu işlem için admin yetkisi gereklidir.' });
  }
  next();
};

