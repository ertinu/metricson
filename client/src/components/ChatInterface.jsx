// Chat arayüzü komponenti - Kullanıcı mesajlarını gönderir ve cevapları gösterir
// Bu komponent, sağ tarafta ChatGPT benzeri bir layout oluşturacak şekilde tasarlanmıştır:
// Üstte scroll edilebilen mesaj alanı, altta sabit prompt input bölümü yer alır.
import { useState, useRef, useEffect } from 'react';
import { sendMessage } from '../services/api';

function ChatInterface() {
  // State yönetimi - Mesajlar ve yükleme durumu
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Yeni mesaj geldiğinde scroll'u en alta kaydır
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mesaj gönderme fonksiyonu
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Kullanıcı mesajını ekle
    const newUserMessage = {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Backend'e mesaj gönder
      const response = await sendMessage(userMessage);
      
      // ChatGPT cevabını öncelikli olarak göster
      // vROPS sonucu varsa onu göster, yoksa ChatGPT cevabını göster
      let displayContent = '';
      
      if (response.vropsResult?.data) {
        // vROPS sonucu varsa onu göster
        displayContent = typeof response.vropsResult.data === 'object' 
          ? JSON.stringify(response.vropsResult.data, null, 2)
          : response.vropsResult.data;
      } else if (response.gptResponse) {
        // ChatGPT cevabını göster
        displayContent = response.gptResponse;
      } else {
        displayContent = 'İşlem tamamlandı';
      }
      
      // Sistem cevabını ekle
      const systemMessage = {
        id: Date.now() + 1,
        type: 'system',
        content: displayContent,
        gptResponse: response.gptResponse,
        vropsRequest: response.vropsRequest,
        vropsResult: response.vropsResult,
        vropsError: response.vropsError,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, systemMessage]);
      
      // Eğer vROPS hatası varsa, bunu ayrı bir mesaj olarak göster
      if (response.vropsError) {
        const errorMessage = {
          id: Date.now() + 2,
          type: 'error',
          content: `vROPS Hatası: ${response.vropsError}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      // Hata mesajını ekle
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: error.response?.data?.error || error.message || 'Bir hata oluştu',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enter tuşu ile mesaj gönderme
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Layout:
  // - Dış div: Tüm yüksekliği kullanan dikey flex container
  // - Üst kısım: Mesajların olduğu, scroll edilebilen alan
  // - Alt kısım: Prompt / input alanı (her zaman görünür)
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Mesaj listesi alanı - geri kalan tüm yüksekliği kaplar */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl bg-white border border-gray-200 px-4 sm:px-6 py-4 space-y-4 shadow-sm">
        {messages.length === 0 ? (
          // İlk açılışta kullanıcıya rehberlik eden boş durum ekranı
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
            <div className="max-w-xl">
              <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-2">
                Metric Analyzer · vROPS AI Asistanı
              </p>
              <p className="text-xl sm:text-2xl font-semibold mb-2 text-gray-900">
                Merhaba, bugün vROPS tarafında neye bakmak istersiniz?
              </p>
              <p className="text-sm sm:text-base">
                vROPS ortamınızla ilgili metrik, uyarı ve rapor taleplerinizi doğal dil ile
                iletebilirsiniz.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 text-left text-xs sm:text-sm">
                {/* Örnek prompt kartları - sadece görsel amaçlı */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="font-semibold text-gray-800">
                    Son 24 saatte CPU kullanımı yüksek VM&apos;leri listele
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="font-semibold text-gray-800">
                    Disk alanı %90&apos;ı geçen sunucuları göster
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="font-semibold text-gray-800">
                    &quot;x&quot; ile başlayan VM&apos;lerin CPU trendlerini getir
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="font-semibold text-gray-800">
                    Son 1 haftanın kritik alarmlarını özetle
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Mesajlar listelendiği alan
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {/* Yükleniyor durumu - ChatGPT typing indicator benzeri */}
            {isLoading && (
              <div className="flex items-center text-gray-500 gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                <span className="text-xs">İsteğiniz işleniyor...</span>
              </div>
            )}

            {/* Scroll&apos;u en alta sabitlemek için referans */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Alt sabit input alanı */}
      <div className="mt-3 border border-gray-300 rounded-xl bg-white px-3 sm:px-4 py-2 shadow-sm">
        {/* İsteğe bağlı üst satır açıklama / ortam seçimi alanı (şu an sadece metin) */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-gray-500">
            Sorunuzu yazın, vROPS ortamınızdan uygun verileri çekelim.
          </span>
        </div>

        {/* Asıl input ve gönder butonu */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Örnek: 01.12.2025 ve 12.12.2025 tarihleri arasındaki VM'lerin CPU kullanımını listele"
            className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 rounded-md px-2 py-2 focus:outline-none focus:ring-0 text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors"
          >
            {/* Gönderme butonu metni */}
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}

// Mesaj balonu komponenti - Her mesajı gösterir
function MessageBubble({ message }) {
  const isUser = message.type === 'user';
  const isError = message.type === 'error';

  return (
    // Kullanıcı mesajları sağda, sistem ve hata mesajları solda gösterilir
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Mesaj kartı */}
      <div
        className={`max-w-3xl rounded-xl px-4 py-3 text-sm shadow-sm border ${
          isUser
            ? 'bg-blue-600 text-white border-blue-500/80'
            : isError
            ? 'bg-red-50 text-red-900 border-red-200'
            : 'bg-gray-50 text-gray-900 border-gray-200'
        }`}
      >
        {/* Gönderen bilgisi */}
        <div
          className={`font-semibold mb-1 text-xs ${
            isUser
              ? 'text-blue-100'
              : isError
              ? 'text-red-700'
              : 'text-gray-500'
          }`}
        >
          {isUser ? 'admin' : isError ? 'Teknik Hata' : 'Metric vROPS Asistanı'}
        </div>

        {/* Mesaj içeriği */}
        <div className="whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>

        {/* ChatGPT cevabını göster (detaylı bilgi için, ayrı sekme gibi) */}
        {message.gptResponse && message.gptResponse !== message.content && (
          <details className="mt-2 text-[11px]">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
              ChatGPT Cevabı (detay)
            </summary>
            <div className="mt-2 p-2 bg-gray-900/5 rounded border border-gray-200 overflow-x-auto whitespace-pre-wrap">
              {message.gptResponse}
            </div>
          </details>
        )}

        {/* vROPS istek detayları (geliştirme / debug amaçlı) */}
        {message.vropsRequest && (
          <details className="mt-2 text-[11px]">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
              vROPS Request Detayları
            </summary>
            <pre className="mt-2 p-2 bg-gray-900/5 rounded border border-gray-200 overflow-x-auto">
              {JSON.stringify(message.vropsRequest, null, 2)}
            </pre>
          </details>
        )}

        {/* vROPS sonuç detayları */}
        {message.vropsResult && (
          <details className="mt-2 text-[11px]">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
              vROPS Sonuç Detayları
            </summary>
            <pre className="mt-2 p-2 bg-gray-900/5 rounded border border-gray-200 overflow-x-auto">
              {JSON.stringify(message.vropsResult, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default ChatInterface;

