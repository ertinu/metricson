-- Kapsamlı Veritabanı Performans Optimizasyonu
-- Bu dosya tüm performans sorunlarını çözmek için hazırlanmıştır
-- DİKKAT: Bu dosyayı çalıştırmadan önce veritabanınızı yedekleyin!

USE metric_ai_portal;

-- ============================================
-- 1. MEVCUT INDEX'LERİ KONTROL ET VE EKSİKLERİ EKLE
-- ============================================

-- Chats tablosu için ek index'ler
-- user_id + updated_at composite index (eğer yoksa ekle)
-- NOT: Eğer index zaten varsa hata verebilir, o zaman bu satırı atlayın
ALTER TABLE chats ADD INDEX idx_user_updated (user_id, updated_at DESC);

-- Messages tablosu için ek index'ler
-- chat_id + created_at composite index
ALTER TABLE messages ADD INDEX idx_chat_created (chat_id, created_at ASC);

-- user_id + created_at composite index
ALTER TABLE messages ADD INDEX idx_user_created (user_id, created_at DESC);

-- role + created_at composite index (role bazlı sorgular için)
ALTER TABLE messages ADD INDEX idx_role_created (role, created_at DESC);

-- chat_id + role composite index (belirli role'deki mesajları hızlı bulmak için)
ALTER TABLE messages ADD INDEX idx_chat_role (chat_id, role);

-- Favoriler tablosu için index'ler
ALTER TABLE favorites ADD INDEX idx_message_id (message_id);
ALTER TABLE favorites ADD INDEX idx_user_created_fav (user_id, created_at DESC);

-- Users tablosu için ek index'ler
-- username zaten unique index var, ama email için de kontrol edelim
-- NOT: Eğer index zaten varsa hata verebilir
ALTER TABLE users ADD INDEX idx_email (email);

-- AI Models tablosu için ek index
ALTER TABLE ai_models ADD INDEX idx_active_created (is_active, created_at DESC);

-- vROPS Configurations tablosu için ek index
ALTER TABLE vrops_configurations ADD INDEX idx_active_created (is_active, created_at DESC);

-- Password reset tokens için ek index
ALTER TABLE password_reset_tokens ADD INDEX idx_user_expires (user_id, expires_at);

-- ============================================
-- 2. TABLO İSTATİSTİKLERİNİ GÜNCELLE
-- ============================================
-- Bu işlem sorgu optimizer'ın daha iyi planlar oluşturmasını sağlar

ANALYZE TABLE users;
ANALYZE TABLE chats;
ANALYZE TABLE messages;
ANALYZE TABLE favorites;
ANALYZE TABLE ai_models;
ANALYZE TABLE vrops_configurations;
ANALYZE TABLE password_reset_tokens;

-- ============================================
-- 3. TABLOLARI OPTİMİZE ET
-- ============================================
-- Fragmantasyonu azaltır ve performansı artırır

OPTIMIZE TABLE users;
OPTIMIZE TABLE chats;
OPTIMIZE TABLE messages;
OPTIMIZE TABLE favorites;
OPTIMIZE TABLE ai_models;
OPTIMIZE TABLE vrops_configurations;
OPTIMIZE TABLE password_reset_tokens;

-- ============================================
-- 4. FOREIGN KEY CONSTRAINT'LERİNİ KONTROL ET
-- ============================================
-- Foreign key'ler veri bütünlüğü için önemli ama performansı düşürebilir
-- Eğer çok yavaşsa, aşağıdaki kodu kullanarak foreign key'leri kaldırabilirsiniz
-- AMA DİKKAT: Bu veri bütünlüğünü riske atar!

-- Foreign key'leri kaldırmak için (SADECE GEREKİRSE):
-- ALTER TABLE chats DROP FOREIGN KEY chats_ibfk_1;
-- ALTER TABLE messages DROP FOREIGN KEY messages_ibfk_1;
-- ALTER TABLE messages DROP FOREIGN KEY messages_ibfk_2;
-- ALTER TABLE messages DROP FOREIGN KEY messages_ibfk_3;
-- ALTER TABLE messages DROP FOREIGN KEY messages_ibfk_4;
-- ALTER TABLE favorites DROP FOREIGN KEY favorites_ibfk_1;
-- ALTER TABLE favorites DROP FOREIGN KEY favorites_ibfk_2;
-- ALTER TABLE password_reset_tokens DROP FOREIGN KEY password_reset_tokens_ibfk_1;

-- ============================================
-- 5. INNODB AYARLARI İÇİN ÖNERİLER (MySQL Config)
-- ============================================
-- Bu ayarları MySQL config dosyasına (my.cnf veya my.ini) ekleyin:
-- 
-- [mysqld]
-- # InnoDB Buffer Pool Size (RAM'in %70-80'i kadar olmalı)
-- innodb_buffer_pool_size = 1G  # Sisteminize göre ayarlayın
-- 
-- # InnoDB Log File Size
-- innodb_log_file_size = 256M
-- 
-- # Query Cache (MySQL 5.7 ve öncesi için)
-- query_cache_type = 1
-- query_cache_size = 64M
-- 
-- # Connection ayarları
-- max_connections = 200
-- 
-- # Table Open Cache
-- table_open_cache = 4000
-- 
-- # Thread Cache
-- thread_cache_size = 50
-- 
-- # Sort Buffer Size
-- sort_buffer_size = 2M
-- 
-- # Join Buffer Size
-- join_buffer_size = 2M
-- 
-- # Temp Table Size
-- tmp_table_size = 64M
-- max_heap_table_size = 64M

-- ============================================
-- 6. MEVCUT INDEX'LERİ KONTROL ET
-- ============================================
-- Aşağıdaki sorguları çalıştırarak mevcut index'leri görebilirsiniz:
-- SHOW INDEX FROM chats;
-- SHOW INDEX FROM messages;
-- SHOW INDEX FROM favorites;

-- ============================================
-- 7. YAVAŞ SORGULARI TESPİT ETMEK İÇİN
-- ============================================
-- Aşağıdaki ayarları aktif ederek yavaş sorguları loglayabilirsiniz:
-- SET GLOBAL slow_query_log = 'ON';
-- SET GLOBAL long_query_time = 1;  -- 1 saniyeden uzun sorguları logla
-- SET GLOBAL slow_query_log_file = '/var/log/mysql/slow-query.log';

-- ============================================
-- 8. TABLO BOYUTLARINI KONTROL ET
-- ============================================
-- Büyük tablolar için ek optimizasyonlar gerekebilir:
-- SELECT 
--   TABLE_NAME,
--   ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS 'Size (MB)',
--   TABLE_ROWS
-- FROM information_schema.TABLES 
-- WHERE TABLE_SCHEMA = 'metric_ai_portal'
-- ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;

