// Chat arayüzü komponenti - Kullanıcı mesajlarını gönderir ve cevapları gösterir
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* Mesaj listesi */}
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-4 h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-lg mb-2">Merhaba! 👋</p>
            <p>vROPS hakkında sorularınızı sorabilirsiniz.</p>
            <p className="text-sm mt-2">Örnek: "Tüm VM'leri listele" veya "CPU kullanımı yüksek olan kaynakları göster"</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                <span>İşleniyor...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Mesaj input alanı */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Mesajınızı yazın..."
          className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !inputMessage.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          Gönder
        </button>
      </div>
    </div>
  );
}

// Mesaj balonu komponenti - Her mesajı gösterir
function MessageBubble({ message }) {
  const isUser = message.type === 'user';
  const isError = message.type === 'error';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-3xl rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : isError
            ? 'bg-red-600 text-white'
            : 'bg-gray-700 text-gray-100'
        }`}
      >
        <div className="font-semibold mb-1">
          {isUser ? 'Sen' : isError ? 'Hata' : 'Sistem'}
        </div>
        <div className="whitespace-pre-wrap">{message.content}</div>
        
        {/* ChatGPT cevabını göster (detaylı bilgi için) */}
        {message.gptResponse && message.gptResponse !== message.content && (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-gray-300 hover:text-white">
              ChatGPT Cevabı
            </summary>
            <div className="mt-2 p-2 bg-gray-900 rounded overflow-x-auto whitespace-pre-wrap">
              {message.gptResponse}
            </div>
          </details>
        )}
        
        {/* Detaylı bilgileri göster (geliştirme için) */}
        {message.vropsRequest && (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-gray-300 hover:text-white">
              vROPS Request Detayları
            </summary>
            <pre className="mt-2 p-2 bg-gray-900 rounded overflow-x-auto">
              {JSON.stringify(message.vropsRequest, null, 2)}
            </pre>
          </details>
        )}
        
        {message.vropsResult && (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-gray-300 hover:text-white">
              vROPS Sonuç Detayları
            </summary>
            <pre className="mt-2 p-2 bg-gray-900 rounded overflow-x-auto">
              {JSON.stringify(message.vropsResult, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default ChatInterface;

