// Ana server dosyası - Express sunucusunu başlatır ve route'ları yapılandırır
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chatRoutes from './routes/chat.js';
import vropsRoutes from './routes/vrops.js';
import authRoutes from './routes/auth.js';
import chatsRoutes from './routes/chats.js';
import messagesRoutes from './routes/messages.js';
import favoritesRoutes from './routes/favorites.js';
import aiModelsRoutes from './routes/aiModels.js';
import vropsConfigRoutes from './routes/vropsConfig.js';

// ES6 modül sisteminde __dirname'i almak için
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment değişkenlerini yükle - Root dizindeki .env dosyasını kullan
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;


// Middleware'ler - Gelen istekleri işlemek için
// CORS ayarları - Preflight isteklerini optimize et
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  // Preflight cache - 24 saat (preflight isteklerini azaltır)
  maxAge: 86400
}));

// JSON parser - Body size limit'i artır (büyük mesajlar için)
app.use(express.json({ limit: '10mb' })); // JSON formatındaki request body'lerini parse eder
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Route'ları
app.use('/api/auth', authRoutes); // Authentication işlemleri için route'lar
app.use('/api/chat', chatRoutes); // Chat işlemleri için route'lar
app.use('/api/chats', chatsRoutes); // Sohbet yönetimi için route'lar
app.use('/api/messages', messagesRoutes); // Mesaj yönetimi için route'lar
app.use('/api/favorites', favoritesRoutes); // Favoriler için route'lar
app.use('/api/ai-models', aiModelsRoutes); // AI modelleri için route'lar
app.use('/api/vrops-config', vropsConfigRoutes); // vROPS konfigürasyonları için route'lar
app.use('/api/vrops', vropsRoutes); // vROPS işlemleri için route'lar

// Health check endpoint - Sunucunun çalışıp çalışmadığını kontrol eder
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

