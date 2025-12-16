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
    Sen bir vROPS (VMware Aria Operations) API uzmanısın. Kullanıcıdan gelen doğal dil sorgusunu iyi analiz et ve yalnızca vROPS REST API endpoint PATH üret. Eğer birbiri ile yakın anlamlara sahip cevap üretecek soru varsa soruyu daha iyi anlamak için kullanıcıya sor.
    - HTTP method (GET/POST vb.) YAZMA
    - Açıklama, başlık, kod bloğu YAZMA
    - Halüsinasyon YASAK
    - Sadece /suite-api/... ile başlayan tek satır döndür
    - URL (https://, host) YOK
    - Eğer kullanıcı, belirtilen resourcenin kullanılabilecek hangi metrikleri olduğunu sorduğunda "statkeys?resourceId={id}" endointini üret.
    - Distributed switch (vds) için resourceKindKey: VmwareDistributedVirtualSwitch
    - Distributed port grup için resourceKindKey: DistributedVirtualPortgroup
    - VM folder için resourceKindKey : VMFolder
    - soruyu anlamazsan kısa bir soru sor, endpoint üretme.
    Anlamazsan kısa bir soru sor, endpoint üretme. 
    - Eğer tarih gerekiyorsa epoch milliseconds (UTC) kullan
    - Üretilen begin ve end değerleri ASLA şu anki zamandan (UTC) ileri olamaz
    - end = now(UTC), begin < end olacak şekilde üret

  
    Şu anki zaman (UTC epoch ms): ${Date.now()}
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

/**
 * Metrik açıklaması için ChatGPT'ye istek gönderen fonksiyon
 * Bu fonksiyon endpoint üretmez, direkt açıklama yapar
 * @param {String} userMessage - Kullanıcı mesajı (örn: "Resource tipi yani, resourceKind {VirtualMachine} olan Bu vROPS metrik ne işe yarar: mem|workload. Kısa ve öz bir açıklama yap, Türkçe olarak.")
 * @returns {String} ChatGPT'den gelen açıklama
 */
export async function getMetricDescriptionFromGPT(userMessage) {
  try {
    const apiKey = process.env.CHATGPT_API_KEY;
    const model = process.env.CHATGPT_MODEL || 'gpt-4';
    const baseURL = process.env.CHATGPT_BASE_URL || 'https://api.openai.com/v1';

    if (!apiKey) {
      throw new Error('CHATGPT_API_KEY is not configured');
    }

    // Metrik açıklaması için özel sistem prompt'u - Endpoint üretmez, direkt açıklama yapar
    const systemPrompt = `
    Sen bir vROPS (VMware Aria Operations) metrik uzmanısın. Kullanıcıya metriklerin ne işe yaradığını kısa ve öz bir şekilde açıklayacaksın.
    - Türkçe cevap ver
    - Teknik terimleri açıkla
    - Kısa ve anlaşılır ol
    - Endpoint üretme, sadece açıklama yap
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
        max_completion_tokens: 500
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
    console.error('ChatGPT Metric Description API Error:', error.response?.data || error.message);
    throw new Error(`Metrik açıklaması alınırken hata: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Performans analizi için ChatGPT'ye istek gönderen fonksiyon
 * VM'in konfigürasyon ve performans verilerini analiz eder, sorunları tespit eder ve çözüm önerir
 * @param {String} userQuestion - Kullanıcının sorusu (örn: "x isimli VM neden yavaş?")
 * @param {Object} vmData - formatDataForGPT'den gelen VM verisi
 * @returns {String} ChatGPT'den gelen analiz raporu
 */
export async function analyzePerformanceFromGPT(userQuestion, vmData) {
  try {
    const apiKey = process.env.CHATGPT_API_KEY;
    const model = process.env.CHATGPT_MODEL || 'gpt-4';
    const baseURL = process.env.CHATGPT_BASE_URL || 'https://api.openai.com/v1';

    if (!apiKey) {
      throw new Error('CHATGPT_API_KEY is not configured');
    }

    // Performans analizi için özel sistem prompt'u - Hard Truth yaklaşımı
    const systemPrompt = `
    Sen bir VMware performans analiz uzmanısın. Verilen VM'in konfigürasyon ve performans metriklerini analiz edeceksin.
    
    Görevlerin:
    1. VM'in konfigürasyonunu değerlendir (CPU, Memory, Storage)
    2. Performans metriklerini analiz et (CPU kullanımı, memory kullanımı, storage latency, network, vs.)
    3. Sorunları tespit et ve nedenlerini açıkla
    4. Çözüm önerileri sun (öncelik sırasına göre)
    
    Yaklaşım:
    - Hard Truth: Doğrudan, net, çözüm odaklı ol
    - Yapılandırılmış format kullan (başlıklar, bullet points, öncelik sırası)
    - Türkçe cevap ver
    - Teknik terimleri açıkla ama basit tut
    - Öncelik sırasına göre sorunları listele (kritik → önemli → bilgi)
    - Her sorun için somut çözüm önerileri sun
    
    Format:
    # Performans Analizi: [VM İsmi]
    
    ## Tespit Edilen Sorunlar
    
    ### [Sorun Başlığı] (Kritik/Önemli/Bilgi)
    - **Neden:** [Açıklama]
    - **Etki:** [Performansa etkisi]
    - **Çözüm:** [Somut çözüm önerileri]
    
    ## Özet ve Öneriler
    [Genel değerlendirme ve öncelikli aksiyonlar]
    `;

    // VM verilerini JSON formatında hazırla
    const vmDataJson = JSON.stringify(vmData, null, 2);

    // Kullanıcı mesajını hazırla
    const userMessage = `
Kullanıcı Sorusu: ${userQuestion}

VM Verileri (JSON):
${vmDataJson}

Lütfen bu VM'in performans sorunlarını analiz et ve yukarıdaki formatta rapor hazırla.
    `;

    // Backend loglarına ChatGPT'ye gönderilecek verileri yaz
    console.log('--- CHATGPT PERFORMANCE ANALYSIS REQUEST ---');
    console.log('System Prompt:', systemPrompt);
    console.log('User Question:', userQuestion);
    console.log('VM Data (formatted):', JSON.stringify(vmData, null, 2));
    console.log('VM Data JSON (to send):', vmDataJson.substring(0, 500) + '...'); // İlk 500 karakteri göster
    console.log('Full User Message:', userMessage.substring(0, 1000) + '...'); // İlk 1000 karakteri göster

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
        max_completion_tokens: 2000 // Performans analizi için daha uzun cevap gerekebilir
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
    
    // Backend loglarına ChatGPT'den gelen cevabı yaz
    console.log('--- CHATGPT PERFORMANCE ANALYSIS RESPONSE ---');
    console.log('Analysis Length:', gptMessage.length, 'characters');
    console.log('Analysis Preview (first 500 chars):', gptMessage.substring(0, 500));
    console.log('Full Analysis:', gptMessage);
    console.log('--- CHATGPT PERFORMANCE ANALYSIS END ---');
    
    return gptMessage;

  } catch (error) {
    console.error('ChatGPT Performance Analysis API Error:', error.response?.data || error.message);
    throw new Error(`Performans analizi yapılırken hata: ${error.response?.data?.error?.message || error.message}`);
  }
}

