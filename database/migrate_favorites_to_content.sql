-- Favoriler tablosunu mesaj tablosundan bağımsız hale getirme migration scripti
-- Bu script favorites tablosunu günceller: message_id foreign key'ini kaldırır ve content alanı ekler

USE metric_ai_portal;

-- 1. Mevcut favorilerin içeriklerini yedekle (eğer varsa)
CREATE TABLE IF NOT EXISTS favorites_backup AS 
SELECT f.id, f.user_id, m.content, f.created_at
FROM favorites f
INNER JOIN messages m ON f.message_id = m.id;

-- 2. Foreign key constraint'ini kaldır
ALTER TABLE favorites DROP FOREIGN KEY favorites_ibfk_2;

-- 3. Eski message_id kolonunu kaldır ve yeni content kolonunu ekle
ALTER TABLE favorites 
DROP COLUMN message_id,
ADD COLUMN content TEXT NOT NULL COMMENT 'Favori mesaj içeriği' AFTER user_id;

-- 4. Yedeklenen verileri geri yükle (content ve created_at korunuyor)
UPDATE favorites f
INNER JOIN favorites_backup fb ON f.id = fb.id
SET f.content = fb.content, f.created_at = fb.created_at;

-- 5. Yedek tabloyu sil
DROP TABLE IF EXISTS favorites_backup;

-- 6. Unique constraint'i güncelle (artık user_id ve content kombinasyonu unique olacak)
ALTER TABLE favorites 
DROP INDEX unique_user_message,
ADD UNIQUE KEY unique_user_content (user_id, content(255));

-- 7. Index'leri güncelle
ALTER TABLE favorites 
ADD INDEX idx_content (content(255));

-- Not: Eğer veritabanında zaten veri varsa ve migration çalışmazsa, 
-- aşağıdaki adımları manuel olarak uygulayabilirsiniz:
-- 1. Tüm favorileri sil: DELETE FROM favorites;
-- 2. Foreign key'i kaldır: ALTER TABLE favorites DROP FOREIGN KEY favorites_ibfk_2;
-- 3. message_id kolonunu kaldır: ALTER TABLE favorites DROP COLUMN message_id;
-- 4. content kolonunu ekle: ALTER TABLE favorites ADD COLUMN content TEXT NOT NULL AFTER user_id;
-- 5. Unique constraint ekle: ALTER TABLE favorites ADD UNIQUE KEY unique_user_content (user_id, content(255));

