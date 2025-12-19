// Veritabanı bağlantı servisi - MySQL bağlantısını yönetir
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES6 modül sisteminde __dirname'i almak için
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment değişkenlerini yükle
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

// MySQL bağlantı havuzu ayarları
const poolConfig = {
  host: process.env.DB_HOST || '127.0.0.1', // localhost yerine 127.0.0.1 kullan (DNS çözümlemesi gerektirmez, daha hızlı)
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'metric_ai_portal',
  
  // Pool ayarları (MySQL2 için geçerli)
  // ÖNEMLİ: Pool kullanmak her sorguda yeni bağlantı açmaktan çok daha hızlıdır
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20, // Optimal: 20 bağlantı (çok düşük = queue'da bekler, çok yüksek = kaynak israfı)
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0, // Sınırsız queue (0 = sınırsız, bağlantı beklerken hata vermez)
  
  // Keep alive ayarları (bağlantıları canlı tutmak için)
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  
  // Veri işleme ayarları
  multipleStatements: false, // Güvenlik için false
  dateStrings: false, // Date objeleri olarak döndür
  supportBigNumbers: true,
  bigNumberStrings: false,
  typeCast: true, // Tip dönüşümlerini aktif et
  decimalNumbers: true // Decimal sayıları doğru işle
};

// MySQL bağlantı havuzu oluştur - Optimize edilmiş ayarlar
// MySQL2 pool için geçerli seçenekler kullanılıyor
const pool = mysql.createPool(poolConfig);

// Bağlantıyı test et ve pool durumunu göster
pool.getConnection()
  .then(connection => {
    console.log('✅ MySQL veritabanına başarıyla bağlanıldı');
    console.log(`📊 Connection Pool Ayarları:`);
    console.log(`   - Connection Limit: ${poolConfig.connectionLimit}`);
    console.log(`   - Queue Limit: ${poolConfig.queueLimit} (0 = sınırsız)`);
    console.log(`   - Host: ${poolConfig.host}`);
    console.log(`   - Database: ${poolConfig.database}`);
    console.log(`   ✅ Pool kullanılıyor - Her sorguda yeni bağlantı açılmıyor!`);
    connection.release();
  })
  .catch(error => {
    console.error('❌ MySQL bağlantı hatası:', error);
  });

export default pool;

