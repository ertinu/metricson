# Metric AI Portal

vRealize Operations Manager (vROPS) işlemlerinizi doğal dil ile yönetmenizi sağlayan AI destekli bir portal.

## Özellikler

- 🤖 **ChatGPT Entegrasyonu**: Doğal dil sorularınızı anlayıp vROPS API request'lerine çevirir
- 🔌 **vROPS API Bağlantısı**: ChatGPT'den gelen request'leri vROPS üzerinde çalıştırır
- 💬 **Modern Chat Arayüzü**: ChatGPT benzeri kullanıcı dostu arayüz
- 🎨 **Tailwind CSS**: Modern ve responsive tasarım

## Teknolojiler

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: MySQL (gelecekte kullanılacak)
- **AI**: OpenAI ChatGPT API

## Kurulum

### 1. Projeyi Klonlayın

```bash
cd Metric
```

### 2. Tüm Bağımlılıkları Yükleyin

```bash
npm run install-all
```

### 3. Environment Dosyasını Oluşturun

Proje kök dizininde `.env` dosyası oluşturun ve aşağıdaki bilgileri doldurun:

```env
# ChatGPT API Konfigürasyonu
CHATGPT_API_KEY=your_chatgpt_api_key_here
CHATGPT_MODEL=gpt-4
CHATGPT_BASE_URL=https://api.openai.com/v1

# vROPS Konfigürasyonu
VROPS_HOST=your_vrops_host_here
VROPS_PORT=443
VROPS_USERNAME=your_vrops_username
VROPS_PASSWORD=your_vrops_password
VROPS_PROTOCOL=https

# Server Konfigürasyonu
PORT=3001
NODE_ENV=development

# MySQL Konfigürasyonu (Gelecekte kullanılacak)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=metric_db
```

### 4. Uygulamayı Başlatın

```bash
npm run dev
```

Bu komut hem backend (port 3001) hem de frontend (port 3000) sunucularını başlatır.

## Kullanım

1. Tarayıcınızda `http://localhost:3000` adresine gidin
2. Doğal dilde sorularınızı yazın, örneğin:
   - "Tüm VM'leri listele"
   - "CPU kullanımı yüksek olan kaynakları göster"
   - "Disk kullanımı raporu al"

## Proje Yapısı

```
Metric/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/    # React komponentleri
│   │   ├── services/     # API servisleri
│   │   └── App.jsx       # Ana uygulama
│   └── package.json
├── server/                # Backend (Node.js + Express)
│   ├── routes/           # API route'ları
│   ├── services/         # Business logic servisleri
│   │   ├── chatgpt.js   # ChatGPT API entegrasyonu
│   │   └── vrops.js     # vROPS API entegrasyonu
│   └── index.js          # Ana server dosyası
├── package.json          # Root package.json
└── .env                  # Environment değişkenleri
```

## API Endpoints

### Chat
- `POST /api/chat/message` - Mesaj gönder ve işle

### vROPS
- `POST /api/vrops/execute` - vROPS request'ini çalıştır
- `GET /api/vrops/test` - vROPS bağlantı testi

### Health Check
- `GET /api/health` - Sunucu durumu

## Geliştirme Notları

- ChatGPT API response'u parse edilerek vROPS API request formatına çevrilir
- vROPS authentication token'ı 30 dakika süreyle cache'lenir
- SSL sertifika doğrulaması geliştirme için devre dışı bırakılmıştır (production'da aktif edilmeli)

## Lisans

ISC

