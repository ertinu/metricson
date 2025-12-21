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
    - Eğer bir kullanıcı bir resource ile ilgili symptom / semptom istediyse örnek endpoint : /suite-api/api/symptoms?resourceId={id}. Eğer tüm semptomlar istenirse 'symptoms?activeOnly=false', sadece aktif olanlar istenirse symptoms?activeOnly=true
    - endpoint içerisinde true, false alan tüm değerleri boolean olarak dönüş yap.
    - Distributed switch (vds) için resourceKindKey: VmwareDistributedVirtualSwitch
    - Distributed port grup için resourceKindKey: DistributedVirtualPortgroup
    - VM folder için resourceKindKey : VMFolder
    - soruyu anlamazsan kısa bir soru sor, endpoint üretme.
    - en fazla ya da en az CPU tüketen ya da en fazla ya da en az memory tüketen ya da en fazla ya da en az kaynak tüketen VM leri listelemek için bir fonksiyon daha yaz. Örnek Soru : 'En fazla/az cpu harcayan, tüketen VM leri listele,getir' ya da 'En fazla/az cpu tüketen vm hangisi ?' 'En fazla/az CPU tüketen ilk 10 VM i listele,getir' şeklinde bir prompt yazıldığı zaman aşağıdaki endpoint kullanılacak.


      GET /suite-api/api/resources/stats/topn?currentOnly=false&dt=false&groupBy=RESOURCE&intervalQuantifier={number}&intervalType=DAYS&metrics=true&rollUpType=AVG&sortOrder=DESCENDING&statKey={statKey}&statKey={statKey}&topN={number}0&wrapStatValues=true&resourceId=resourceId={id}&resourceId={id}

      - intervalType=DAYS: son 5 gün ifafesi ya da son 30 dakika ifadesi kullanılıyorsa intervalQuantifier ile birlikte kullanılabilir. DAYS, MINUTES,SECONDS,WEEKS,MONTHS,YEARS kullanılabilir. Eğer herhangi bir tarih aralığı ya da kriter verilmeden direkt olarak "En son, şuan" kullanılan metrikler istenirse intervalQuantifier=5, intervalType=MINUTES olacak. (son 5 dakikayı baz alır)
      - intervalQuantifier={number}: intervalType ile birlikte kullanılır ve kaç gün, hafta, yıl, dakika isteniyorsa ona göre sayı yazılır.
      - SortOrder: Bu alan en fazla kullanım ya da en az kullanıma göre listele dediğinde DESCENDING ya a ASCENDING olabilir.
      - topN={number}: burada ilk 5 VM, ilk 100 vm gibi rakamlar belirtirse ona gçre bir rakam girilecek. Eğer tamamı ve tümü isteniyorsa topN=10000000 kulan
      - {statKey}: alanı aşağıdakilerden biri olabilir, bir veya daha fazla metrik istenirse birden fazla tanımlanabilir.
        - mem|consumed_average = VM’in host üzerinde GERÇEKTEN tükettiği bellek miktarı (MB). En fazla memory kullanan VM’i bulmak için kullanılır.
        -cpu|usagemhz_average = VM’in host CPU’ları üzerinde GERÇEKTEN tükettiği CPU miktarı (MHz). En fazla CPU kullanan VM’i bulmak için kullanılır.
        -virtualDisk|usage = VM’in disk üzerinde yaptığı toplam I/O yükü (read + write). En fazla disk I/O yapan VM’i bulmak için kullanılır.
        -virtualDisk|read_average = VM’in diskten okuma hızı. En fazla disk okuma yapan VM’i bulmak için kullanılır.
        -virtualDisk|write_average = VM’in diske yazma hızı. En fazla disk yazma yapan VM’i bulmak için kullanılır.
        -diskspace|used = VM’in datastore üzerinde fiilen kullandığı disk alanı. En fazla disk alanı kullanan VM’i bulmak için kullanılır.
        -diskspace|provisionedSpace = VM’e datastore üzerinde tahsis edilmiş toplam disk alanı (thin dahil). En fazla disk tahsis edilen VM’i bulmak için kullanılır.

    Anlamazsan kısa bir soru sor, endpoint üretme. 
    - Eğer tarih gerekiyorsa epoch milliseconds (UTC) kullan
    - Üretilen begin ve end değerleri ASLA şu anki zamandan (UTC) ileri olamaz
    - end = now(UTC), begin < end olacak şekilde üret
    - Kullanıcı mesajında "Şu anki zaman (UTC epoch ms):" bilgisi verilecek, bu bilgiyi kullan
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

/**
 * Performans değerleri için ChatGPT'ye yorum isteği gönderen fonksiyon
 * API endpoint üretmez, sadece metrikleri analiz eder ve yorum yapar
 * @param {String} statsJson - JSON formatında performans metrikleri
 * @returns {String} ChatGPT'den gelen yorum
 */
export async function analyzePerformanceValuesFromGPT(statsJson) {
  try {
    const apiKey = process.env.CHATGPT_API_KEY;
    const model = process.env.CHATGPT_MODEL || 'gpt-4';
    const baseURL = process.env.CHATGPT_BASE_URL || 'https://api.openai.com/v1';

    if (!apiKey) {
      throw new Error('CHATGPT_API_KEY is not configured');
    }

    // Performans analizi için özel sistem prompt'u - API endpoint üretme, sadece analiz yap
    const systemPrompt = `Sen bir VMware performans analiz uzmanısın. Performans metriklerini analiz et ve kısa bir yorum yap (Türkçe, 2-3 cümle). API endpoint üretme, sadece metrikleri analiz et ve yorum yap.`;

    const userPrompt = `Aşağıdaki performans metriklerini analiz et ve kısa bir yorum yap:\n\n${statsJson}`;

    // OpenAI API'ye istek gönder - max_completion_tokens kullan (gpt-5.2 için)
    const requestBody = {
      model: model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.7
    };
    
    // Model'e göre token parametresini ayarla
    if (model.includes('gpt-5') || model.includes('o1')) {
      requestBody.max_completion_tokens = 500;
    } else {
      requestBody.max_tokens = 500;
    }
    
    const response = await axios.post(
      `${baseURL}/chat/completions`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0]?.message?.content || 'Yorum alınamadı.';
  } catch (error) {
    console.error('ChatGPT performans değerleri analizi hatası:', error);
    throw new Error(`Performans değerleri analizi yapılamadı: ${error.response?.data?.error?.message || error.message}`);
  }
}

