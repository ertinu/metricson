# Veritabanı Performans Optimizasyonu Kılavuzu

Bu kılavuz veritabanı performans sorunlarını çözmek için adım adım talimatlar içerir.

## 🚨 ÖNEMLİ UYARILAR

1. **YEDEK ALIN**: Tüm optimizasyonları uygulamadan önce mutlaka veritabanınızın yedeğini alın!
2. **TEST ORTAMINDA DENEYİN**: Mümkünse önce test ortamında deneyin
3. **SIRAYLA UYGULAYIN**: Adımları sırayla uygulayın

## 📋 Adım Adım Optimizasyon

### 1. Mevcut Durumu Kontrol Et

Önce mevcut durumu analiz edin:

```bash
mysql -u root -p metric_ai_portal < database/check_performance.sql
```

Bu script şunları gösterir:
- Tablo boyutları
- Mevcut index'ler
- Foreign key'ler
- Fragmantasyon durumu
- MySQL ayarları

### 2. Kapsamlı Optimizasyonu Uygula

```bash
mysql -u root -p metric_ai_portal < database/comprehensive_optimize.sql
```

**NOT**: Eğer bazı index'ler zaten varsa hata alabilirsiniz. Bu normaldir, o satırları atlayın.

Bu script şunları yapar:
- ✅ Eksik index'leri ekler
- ✅ Tablo istatistiklerini günceller (ANALYZE TABLE)
- ✅ Tabloları optimize eder (fragmantasyonu azaltır)
- ✅ MySQL ayarları için öneriler sunar

### 3. MySQL Ayarlarını Optimize Et

MySQL config dosyanızı bulun ve düzenleyin:

**Linux/Mac**: `/etc/mysql/my.cnf` veya `/usr/local/etc/my.cnf`
**Windows**: `C:\ProgramData\MySQL\MySQL Server X.X\my.ini`

Aşağıdaki ayarları ekleyin veya güncelleyin:

```ini
[mysqld]
# InnoDB Buffer Pool Size (RAM'in %70-80'i kadar olmalı)
# Örnek: 8GB RAM için 6GB
innodb_buffer_pool_size = 1G

# InnoDB Log File Size
innodb_log_file_size = 256M

# Query Cache (MySQL 5.7 ve öncesi için)
query_cache_type = 1
query_cache_size = 64M

# Connection ayarları
max_connections = 200

# Table Open Cache
table_open_cache = 4000

# Thread Cache
thread_cache_size = 50

# Sort Buffer Size
sort_buffer_size = 2M

# Join Buffer Size
join_buffer_size = 2M

# Temp Table Size
tmp_table_size = 64M
max_heap_table_size = 64M

# Slow Query Log (yavaş sorguları tespit etmek için)
slow_query_log = 1
long_query_time = 1
slow_query_log_file = /var/log/mysql/slow-query.log
```

**Ayarları uyguladıktan sonra MySQL'i yeniden başlatın:**

```bash
# Linux/Mac
sudo systemctl restart mysql
# veya
sudo service mysql restart

# Windows
# Services panelinden MySQL'i yeniden başlatın
```

### 4. Environment Değişkenlerini Güncelle

`.env` dosyanıza şu değişkenleri ekleyin:

```env
# Veritabanı bağlantı ayarları
DB_CONNECTION_LIMIT=50
DB_QUEUE_LIMIT=100
```

### 5. Uygulamayı Yeniden Başlat

Değişikliklerin etkili olması için Node.js uygulamanızı yeniden başlatın:

```bash
# PM2 kullanıyorsanız
pm2 restart all

# veya normal başlatma
npm start
```

## 🔍 Performans Testi

Optimizasyonlardan sonra performansı test edin:

1. **Yavaş sorguları kontrol edin:**
   ```sql
   -- Slow query log'u kontrol edin
   SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;
   ```

2. **Sorgu sürelerini ölçün:**
   ```sql
   -- EXPLAIN kullanarak sorgu planlarını kontrol edin
   EXPLAIN SELECT c.id, c.title, COUNT(m.id) as message_count
   FROM chats c
   LEFT JOIN messages m ON c.id = m.chat_id
   WHERE c.user_id = 1
   GROUP BY c.id;
   ```

3. **Index kullanımını kontrol edin:**
   ```sql
   -- Hangi index'lerin kullanıldığını gösterir
   SHOW INDEX FROM messages;
   ```

## 🐛 Sorun Giderme

### Index zaten var hatası

Eğer `comprehensive_optimize.sql` çalıştırırken "Duplicate key name" hatası alırsanız:
- Bu normaldir, o index zaten var demektir
- O satırı atlayın ve devam edin

### Foreign Key hatası

Eğer foreign key constraint hatası alırsanız:
- Veri bütünlüğü için foreign key'ler önemlidir
- Sadece gerçekten gerekirse kaldırın (comprehensive_optimize.sql içinde yorum satırları var)

### Hala yavaş mı?

1. **Slow query log'u kontrol edin:**
   ```sql
   SET GLOBAL slow_query_log = 'ON';
   SET GLOBAL long_query_time = 1;
   ```

2. **EXPLAIN kullanarak sorguları analiz edin:**
   - Hangi index'lerin kullanıldığını görün
   - Full table scan yapılan sorguları tespit edin

3. **Tablo boyutlarını kontrol edin:**
   - Eğer tablolar çok büyükse (milyonlarca satır), pagination ekleyin
   - Eski verileri arşivleyin

4. **Connection pool ayarlarını kontrol edin:**
   - Çok fazla bağlantı açık mı?
   - Connection timeout'ları uygun mu?

## 📊 Beklenen İyileştirmeler

Optimizasyonlardan sonra şu iyileştirmeler beklenir:

- ✅ Sohbet listeleme: %70-80 daha hızlı
- ✅ Sohbet detayı: %50-60 daha hızlı
- ✅ Mesaj oluşturma: %40-50 daha hızlı
- ✅ Favorilere ekleme: %60-70 daha hızlı
- ✅ Genel sorgu hızı: %50-70 daha hızlı

## 🔄 Düzenli Bakım

Performansı korumak için düzenli olarak:

1. **Haftada bir ANALYZE TABLE çalıştırın:**
   ```sql
   ANALYZE TABLE chats, messages, favorites;
   ```

2. **Ayda bir OPTIMIZE TABLE çalıştırın:**
   ```sql
   OPTIMIZE TABLE chats, messages, favorites;
   ```

3. **Slow query log'u düzenli kontrol edin**

4. **Tablo boyutlarını izleyin**

## 📞 Destek

Sorun yaşarsanız:
1. `check_performance.sql` çalıştırın ve sonuçları kontrol edin
2. Slow query log'u inceleyin
3. EXPLAIN çıktılarını analiz edin

