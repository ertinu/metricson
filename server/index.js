// Ana server dosyası - Express sunucusunu başlatır ve route'ları yapılandırır
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chatRoutes from './routes/chat.js';
import vropsRoutes from './routes/vrops.js';

// ES6 modül sisteminde __dirname'i almak için
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment değişkenlerini yükle - Root dizindeki .env dosyasını kullan
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware'ler - Gelen istekleri işlemek için
app.use(cors()); // CORS politikalarını yönetir, frontend'den gelen isteklere izin verir
app.use(express.json()); // JSON formatındaki request body'lerini parse eder

// API Route'ları
app.use('/api/chat', chatRoutes); // Chat işlemleri için route'lar
app.use('/api/vrops', vropsRoutes); // vROPS işlemleri için route'lar

// Health check endpoint - Sunucunun çalışıp çalışmadığını kontrol eder
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

