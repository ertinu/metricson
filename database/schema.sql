-- Metric AI Portal Veritabanı Şeması
-- MySQL 8.0+ için hazırlanmıştır

-- Veritabanını oluştur
CREATE DATABASE IF NOT EXISTS metric_ai_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE metric_ai_portal;

-- Kullanıcılar tablosu
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE COMMENT 'Kullanıcı adı',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Şifre hash değeri',
    email VARCHAR(255) DEFAULT NULL COMMENT 'E-posta adresi (şifre sıfırlama için)',
    is_admin BOOLEAN DEFAULT FALSE COMMENT 'Admin yetkisi var mı?',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Oluşturulma tarihi',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Güncellenme tarihi',
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Kullanıcılar tablosu';

-- AI Modelleri tablosu
CREATE TABLE IF NOT EXISTS ai_models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE COMMENT 'Model ismi (örn: gpt-4, gpt-3.5-turbo)',
    api_token VARCHAR(500) NOT NULL COMMENT 'API token (şifrelenmiş olarak saklanmalı)',
    model_version VARCHAR(100) NOT NULL COMMENT 'Model versiyonu (API isteği yaparken kullanılacak)',
    base_url VARCHAR(500) DEFAULT 'https://api.openai.com/v1' COMMENT 'API base URL',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Aktif mi?',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Oluşturulma tarihi',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Güncellenme tarihi',
    INDEX idx_name (name),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI Modelleri tablosu';

-- Sohbetler tablosu
CREATE TABLE IF NOT EXISTS chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT 'Sohbeti oluşturan kullanıcı ID',
    title VARCHAR(255) DEFAULT NULL COMMENT 'Sohbet başlığı (ilk mesajdan otomatik oluşturulabilir)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Oluşturulma tarihi',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Son güncellenme tarihi',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sohbetler tablosu';

-- Mesajlar tablosu
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chat_id INT NOT NULL COMMENT 'Hangi sohbete ait',
    user_id INT NOT NULL COMMENT 'Mesajı gönderen kullanıcı ID',
    role ENUM('user', 'assistant', 'system') NOT NULL COMMENT 'Mesaj rolü (kullanıcı, asistan, sistem)',
    content TEXT NOT NULL COMMENT 'Mesaj içeriği',
    ai_model_id INT DEFAULT NULL COMMENT 'Hangi AI modeline soruldu (soru için)',
    response_model_id INT DEFAULT NULL COMMENT 'Cevabı hangi AI modeli üretti (cevap için)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Oluşturulma tarihi',
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ai_model_id) REFERENCES ai_models(id) ON DELETE SET NULL,
    FOREIGN KEY (response_model_id) REFERENCES ai_models(id) ON DELETE SET NULL,
    INDEX idx_chat_id (chat_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mesajlar tablosu';

-- Favoriler tablosu (mesaj tablosundan bağımsız - sadece text içerik tutar)
CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT 'Favoriyi ekleyen kullanıcı ID',
    content TEXT NOT NULL COMMENT 'Favori mesaj içeriği',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Favoriye eklenme tarihi',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_content (user_id, content(255)),
    INDEX idx_user_id (user_id),
    INDEX idx_content (content(255)),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Favoriler tablosu';

-- Şifre sıfırlama token'ları tablosu
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT 'Token sahibi kullanıcı ID',
    token VARCHAR(255) NOT NULL UNIQUE COMMENT 'Sıfırlama token',
    expires_at TIMESTAMP NOT NULL COMMENT 'Token son kullanma tarihi',
    used BOOLEAN DEFAULT FALSE COMMENT 'Token kullanıldı mı?',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Oluşturulma tarihi',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Şifre sıfırlama token tablosu';

-- vROPS Konfigürasyonları tablosu
CREATE TABLE IF NOT EXISTS vrops_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'vROPS adı/başlığı',
    url VARCHAR(500) NOT NULL COMMENT 'vROPS URL (örn: https://vrops.example.com)',
    username VARCHAR(255) NOT NULL COMMENT 'vROPS kullanıcı adı',
    password VARCHAR(500) NOT NULL COMMENT 'vROPS şifresi (şifrelenmiş olarak saklanmalı)',
    description TEXT DEFAULT NULL COMMENT 'Açıklama',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Aktif mi?',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Oluşturulma tarihi',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Güncellenme tarihi',
    INDEX idx_name (name),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='vROPS Konfigürasyonları tablosu';

-- Varsayılan admin kullanıcısını oluştur (şifre: 123456)
-- Şifre hash'i bcrypt ile oluşturulmuş: $2b$10$rOzJ8K8K8K8K8K8K8K8K8eK8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K
-- Gerçek uygulamada bcrypt kullanılmalı, burada örnek hash
INSERT INTO users (username, password_hash, is_admin) VALUES 
('admin', '$2b$10$2KcQNFbSknjqmNBlyqdqn.WcW/Mp/sGeNydKXAUWOUK2GME5mtKkK', TRUE)
ON DUPLICATE KEY UPDATE username=username;

-- Varsayılan AI modeli ekle (GPT-4)
INSERT INTO ai_models (name, api_token, model_version, base_url, is_active) VALUES 
('gpt-4', 'YOUR_API_KEY_HERE', 'gpt-4', 'https://api.openai.com/v1', TRUE)
ON DUPLICATE KEY UPDATE name=name;

