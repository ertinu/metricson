// ChatGPT servisi - OpenAI API ile iletişim kurar
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES6 modül sisteminde __dirname'i almak için
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment değişkenlerini yükle - Root dizindeki .env dosyasını kullan
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

// ChatGPT API'ye istek gönderen ana fonksiyon
export async function chatWithGPT(userMessage) {
  try {
    const apiKey = process.env.CHATGPT_API_KEY;
    const model = process.env.CHATGPT_MODEL || 'gpt-4';
    const baseURL = process.env.CHATGPT_BASE_URL || 'https://api.openai.com/v1';

    if (!apiKey) {
      throw new Error('CHATGPT_API_KEY is not configured');
    }

    // ChatGPT'ye gönderilecek sistem prompt'u

    const now = new Date();
    const currentDateTimeTr = now.toLocaleString('tr-TR', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const systemPrompt = `
    vROPS API uzmanısın.Yalnızca vROPS REST API endpoint PATH üret.
    - HTTP method (GET/POST vb.) YAZMA
    - Açıklama, başlık, kod bloğu YAZMA
    - Halüsinasyon YASAK
    - Sadece /suite-api/... ile başlayan tek satır döndür
    - URL (https://, host) YOK
    Anlamazsan kısa bir soru sor, endpoint üretme. Tarih gerekiyorsa epoch ms (UTC) kullan. Şu an: ${currentDateTimeTr}
    `;
    // OpenAI API'ye istek gönder
    const response = await axios.post(
      `${baseURL}/chat/completions`,
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_completion_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // ChatGPT'den gelen cevabı döndür
    const gptMessage = response.data.choices[0].message.content;
    return gptMessage;

  } catch (error) {
    console.error('ChatGPT API Error:', error.response?.data || error.message);
    throw new Error(`ChatGPT API hatası: ${error.response?.data?.error?.message || error.message}`);
  }
}

