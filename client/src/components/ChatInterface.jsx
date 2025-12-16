// Chat arayüzü komponenti - Kullanıcı mesajlarını gönderir ve cevapları gösterir
// Bu komponent, sağ tarafta ChatGPT benzeri bir layout oluşturacak şekilde tasarlanmıştır:
// Üstte scroll edilebilen mesaj alanı, altta sabit prompt input bölümü yer alır.
import { useState, useRef, useEffect, useMemo } from 'react';
import { sendMessage, executeVropsDirectRequest } from '../services/api';
import VropsDataTable from './VropsDataTable';
import AlertFilters from './filters/AlertFilters';
import MetricTable from './MetricTable';
import MetricChart from './MetricChart';
import LatestStatsTable from './LatestStatsTable';
import StatKeysTable from './StatKeysTable';
import ResourceLinkModal from './ResourceLinkModal';

function ChatInterface() {
  // State yönetimi - Mesajlar ve yükleme durumu
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Yeni mesaj geldiğinde scroll'u en alta kaydır
  const scrollToBottom = () => {
    // DOM güncellenmesini beklemek için setTimeout kullan
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
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
      
      // Eğer parse edilmiş vROPS verisi varsa, mesaj objesine ekle
      let systemMessageContent = response.gptResponse;
      if (response.parsedData && response.dataType) {
        // Her veri tipi için özel mesaj
            if (response.dataType === 'alerts') {
              systemMessageContent = `vROPS verileri başarıyla alındı. ${response.parsedData.totalCount} alert aşağıda gösteriliyor.`;
            } else if (response.dataType === 'resourceDetail') {
              systemMessageContent = `Resource detayları başarıyla alındı. ${response.parsedData.name || 'Resource'} bilgileri aşağıda gösteriliyor.`;
            } else if (response.dataType === 'resources') {
              systemMessageContent = `vROPS verileri başarıyla alındı. ${response.parsedData.totalCount} resource aşağıda gösteriliyor.`;
            } else if (response.dataType === 'properties') {
              systemMessageContent = `vROPS verileri başarıyla alındı. ${response.parsedData.totalCount} property aşağıda gösteriliyor.`;
            } else {
              systemMessageContent = `vROPS verileri başarıyla alındı. Veriler aşağıda gösteriliyor.`;
            }
        
        // Başarılı mesajı ekle ve parsedData'yı mesaj objesine ekle
        const systemMessage = {
          id: Date.now() + 1,
          type: 'system',
          content: systemMessageContent,
          timestamp: new Date(),
          parsedData: response.parsedData, // Parse edilmiş veriyi mesaj objesine ekle
          dataType: response.dataType // Veri tipini mesaj objesine ekle
        };
        setMessages(prev => [...prev, systemMessage]);
      } else if (response.gptResponse) {
        // Sadece ChatGPT cevabı varsa göster (vROPS verisi yoksa)
        const systemMessage = {
          id: Date.now() + 1,
          type: 'system',
          content: response.gptResponse,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, systemMessage]);
      }
      
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

  // Resource sorgu isteği handler'ı
  const handleResourceQueryRequest = async (resource, query) => {
    console.log('handleResourceQueryRequest called', { resource, query });
    if (!resource || !query) {
      console.error('handleResourceQueryRequest - Missing resource or query', { resource, query });
      return;
    }

    setIsLoading(true);
    try {
      // Resource bilgilerini içeren enhanced query oluştur
      const enhancedQuery = `Resource ID: ${resource.resourceId || 'N/A'}, Resource İsmi: ${resource.name || 'N/A'}, Resource Tipi: ${resource.resourceKindKey || 'N/A'}. ${query}`;

      // Kullanıcı mesajı ekle
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: `${resource.name || resource.resourceId} için: ${query}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);

      // Backend'e mesaj gönder (resourceId ile birlikte)
      const response = await sendMessage(enhancedQuery, resource.resourceId);

      // System mesajını ekle
      let systemMessageContent = response.gptResponse;
      if (response.parsedData && response.dataType) {
        if (response.dataType === 'alerts') {
          systemMessageContent = `vROPS verileri başarıyla alındı. ${response.parsedData.totalCount} alert aşağıda gösteriliyor.`;
        } else if (response.dataType === 'resourceDetail') {
          systemMessageContent = `Resource detayları başarıyla alındı. ${response.parsedData.name || 'Resource'} bilgileri aşağıda gösteriliyor.`;
        } else if (response.dataType === 'resources') {
          systemMessageContent = `vROPS verileri başarıyla alındı. ${response.parsedData.totalCount} resource aşağıda gösteriliyor.`;
        } else if (response.dataType === 'properties') {
          systemMessageContent = `vROPS verileri başarıyla alındı. ${response.parsedData.totalCount} property aşağıda gösteriliyor.`;
        } else {
          systemMessageContent = `vROPS verileri başarıyla alındı. Veriler aşağıda gösteriliyor.`;
        }

        const systemMessage = {
          id: Date.now() + 1,
          type: 'system',
          content: systemMessageContent,
          timestamp: new Date(),
          parsedData: response.parsedData,
          dataType: response.dataType
        };
        setMessages(prev => [...prev, systemMessage]);
      } else if (response.gptResponse) {
        const systemMessage = {
          id: Date.now() + 1,
          type: 'system',
          content: response.gptResponse,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, systemMessage]);
      }
    } catch (error) {
      console.error('Resource query request error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'system',
        content: `Hata: ${error.response?.data?.error || error.message || 'Sorgu çalıştırılamadı'}`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Resource detay isteği handler'ı
  const handleResourceDetailRequest = async (resourceId) => {
    if (!resourceId) return;

    setIsLoading(true);
    try {
      // Kullanıcı mesajı ekle
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: `${resourceId} ID'li resource detaylarını göster`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);

      // vROPS API'ye direkt istek at
      const endpoint = `/api/resources/${resourceId}`;
      const response = await executeVropsDirectRequest(endpoint);

      if (response.success && response.parsedData && response.dataType === 'resourceDetail') {
        const systemMessage = {
          id: Date.now() + 1,
          type: 'system',
          content: `Resource detayları başarıyla alındı. ${response.parsedData.name || 'Resource'} bilgileri aşağıda gösteriliyor.`,
          timestamp: new Date(),
          parsedData: response.parsedData,
          dataType: response.dataType
        };
        setMessages(prev => [...prev, systemMessage]);
      } else {
        const errorMessage = {
          id: Date.now() + 1,
          type: 'system',
          content: 'Resource detayları alınırken bir hata oluştu.',
          timestamp: new Date(),
          isError: true
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Resource detail request error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'system',
        content: `Hata: ${error.response?.data?.error || error.message || 'Resource detayları alınamadı'}`,
        timestamp: new Date(),
        isError: true
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
              <div key={message.id}>
                {/* Mesaj balonu */}
                <MessageBubble message={message} />
                
                {/* Bu mesajın parsedData'sını hemen altında göster */}
                {message.parsedData && message.dataType && (
                  <>
                    {message.dataType === 'alerts' && message.parsedData.alerts && (
                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Alert Görselleştirme</h3>
                          <p className="text-sm text-gray-600">
                            Toplam {message.parsedData.totalCount} alert bulundu
                          </p>
                          
                          {/* Özet istatistikler */}
                          {message.parsedData.summary && (
                            <div className="mt-4 grid grid-cols-4 gap-3">
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="text-xs text-red-600 font-semibold">Kritik</div>
                                <div className="text-xl font-bold text-red-700">
                                  {message.parsedData.summary.byLevel?.CRITICAL || 0}
                                </div>
                              </div>
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                <div className="text-xs text-orange-600 font-semibold">Acil</div>
                                <div className="text-xl font-bold text-orange-700">
                                  {message.parsedData.summary.byLevel?.IMMEDIATE || 0}
                                </div>
                              </div>
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="text-xs text-yellow-600 font-semibold">Aktif</div>
                                <div className="text-xl font-bold text-yellow-700">
                                  {message.parsedData.summary.byStatus?.ACTIVE || 0}
                                </div>
                              </div>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <div className="text-xs text-gray-600 font-semibold">Toplam</div>
                                <div className="text-xl font-bold text-gray-700">
                                  {message.parsedData.totalCount}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Filtreler */}
                        <AlertFilters 
                          data={message.parsedData.alerts} 
                          onFilter={(filteredData) => {
                            // Mesajın parsedData'sını güncelle
                            setMessages(prev => prev.map(msg => 
                              msg.id === message.id 
                                ? { ...msg, parsedData: { ...msg.parsedData, alerts: filteredData } }
                                : msg
                            ));
                          }}
                          summary={message.parsedData.summary}
                        />

                        {/* Tablo */}
                        <VropsDataTable 
                          data={message.parsedData.alerts} 
                          dataType="alerts" 
                        />
                      </div>
                    )}
                    
                    {message.dataType === 'metrics' && message.parsedData.metrics && (
                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Metric Görselleştirme</h3>
                          {message.parsedData.statKey && (
                            <p className="text-sm text-gray-600">
                              StatKey: <span className="font-mono text-gray-800">{message.parsedData.statKey}</span>
                              {message.parsedData.resourceId && (
                                <span className="ml-2">Resource ID: <span className="font-mono text-gray-800">{message.parsedData.resourceId}</span></span>
                              )}
                            </p>
                          )}
                        </div>

                        {/* Metric Grafik */}
                        <div className="mb-6">
                          <MetricChart data={message.parsedData} />
                        </div>

                        {/* Metric Tablo */}
                        <MetricTable data={message.parsedData} />
                      </div>
                    )}
                    
                    {message.dataType === 'latestStats' && message.parsedData.resources && (
                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Latest Stats Görselleştirme</h3>
                          <p className="text-sm text-gray-600">
                            {message.parsedData.totalCount} resource için {message.parsedData.totalStats} stat gösteriliyor
                          </p>
                        </div>

                        {/* Latest Stats Tablo */}
                        <LatestStatsTable data={message.parsedData} />
                      </div>
                    )}
                    
                    {message.dataType === 'statKeys' && message.parsedData.statKeys && (
                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">StatKeys Görselleştirme</h3>
                          <p className="text-sm text-gray-600">
                            {message.parsedData.totalCount} statKey bulundu
                          </p>
                        </div>

                        {/* StatKeys Tablo */}
                        <StatKeysTable data={message.parsedData} />
                      </div>
                    )}

                    {message.dataType === 'resourceDetail' && message.parsedData.resourceId && (
                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Resource Detayları</h3>
                          <p className="text-sm text-gray-600">
                            {message.parsedData.name || 'Resource'} bilgileri
                          </p>
                        </div>

                        {/* Resource Detail - Tüm Detaylar */}
                        <ResourceDetailView data={message.parsedData} />
                      </div>
                    )}

                    {message.dataType === 'resources' && message.parsedData.resources && (
                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Resource Listesi</h3>
                          <p className="text-sm text-gray-600">
                            {message.parsedData.totalCount} resource bulundu
                          </p>
                        </div>

                        {/* Resources List View */}
                        <ResourcesListView 
                          data={message.parsedData} 
                          onResourceDetailRequest={handleResourceDetailRequest}
                          onResourceQueryRequest={handleResourceQueryRequest}
                        />
                      </div>
                    )}

                    {message.dataType === 'properties' && message.parsedData.properties && (
                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Hardware Konfigürasyon Bilgisi</h3>
                          <p className="text-sm text-gray-600">
                            {message.parsedData.totalCount} property bulundu
                          </p>
                        </div>

                        {/* Properties View */}
                        <PropertiesView data={message.parsedData} />
                      </div>
                    )}
                  </>
                )}
              </div>
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
      </div>
    </div>
  );
}

// Resource Detail görünümü komponenti - Tüm detayları gösterir
function ResourceDetailView({ data }) {
  const [selectedLink, setSelectedLink] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLinkClick = (link) => {
    setSelectedLink(link);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLink(null);
  };
  // Health rengini belirle
  const getHealthColor = (health) => {
    switch (health) {
      case 'GREEN': return 'text-green-700 bg-green-50 border-green-200';
      case 'YELLOW': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'RED': return 'text-red-700 bg-red-50 border-red-200';
      case 'GRAY': return 'text-gray-700 bg-gray-50 border-gray-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  // Badge rengini belirle
  const getBadgeColor = (color) => {
    switch (color) {
      case 'GREEN': return 'bg-green-100 text-green-800 border-green-300';
      case 'YELLOW': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'RED': return 'bg-red-100 text-red-800 border-red-300';
      case 'GREY': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Badge tipini Türkçe'ye çevir
  const getBadgeTypeLabel = (type) => {
    const labels = {
      'COMPLIANCE': 'Uyumluluk',
      'CAPACITY_REMAINING': 'Kalan Kapasite',
      'TIME_REMAINING': 'Kalan Süre',
      'HEALTH': 'Sağlık',
      'WORKLOAD': 'İş Yükü',
      'EFFICIENCY': 'Verimlilik',
      'RISK': 'Risk'
    };
    return labels[type] || type;
  };

  // Status rengini belirle
  const getStatusColor = (status) => {
    switch (status) {
      case 'DATA_RECEIVING': return 'text-green-600 bg-green-50';
      case 'STARTED': return 'text-blue-600 bg-blue-50';
      case 'STOPPED': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Link başlığını Türkçe'ye çevir
  const getLinkTitle = (linkName) => {
    const titles = {
      'relationsOfResource': 'İlişkili Kaynaklar',
      'propertiesOfResource': 'Hardware Konfigürasyon Bilgisi',
      'alertsOfResource': 'Alerts',
      'symptomsOfResource': 'Semptomlar',
      'statKeysOfResource': 'Performans Metrik Keys',
      'latestStatsOfResource': 'Son Performans Verileri'
    };
    return titles[linkName] || linkName;
  };

  return (
    <div className="space-y-6">
      {/* Health ve Temel Bilgiler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Health Card */}
        <div className={`bg-white rounded-lg shadow-sm border-2 p-4 ${getHealthColor(data.health)}`}>
          <div className="text-sm font-semibold mb-2">Sağlık Durumu</div>
          <div className="text-2xl font-bold mb-1">{data.health || 'N/A'}</div>
          {data.healthValue !== null && (
            <div className="text-xs opacity-75">Skor: {data.healthValue.toFixed(1)}</div>
          )}
        </div>

        {/* Resource Type */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-2">Resource Tipi</div>
          <div className="text-lg font-semibold text-gray-900">{data.resourceKindKey || 'N/A'}</div>
          <div className="text-sm text-gray-500 mt-1">Adapter: {data.adapterKindKey || 'N/A'}</div>
        </div>

        {/* Creation Time */}
        {data.creationTime && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-2">Oluşturulma Tarihi</div>
            <div className="text-sm font-semibold text-gray-900">
              {new Date(data.creationTime).toLocaleString('tr-TR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        )}
      </div>

      {/* Badges */}
      {data.badges && data.badges.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">Rozetler (Badges)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {data.badges.map((badge, index) => (
              <div
                key={index}
                className={`rounded-lg border-2 p-3 text-center ${getBadgeColor(badge.color)}`}
              >
                <div className="text-xs font-semibold mb-1">{getBadgeTypeLabel(badge.type)}</div>
                <div className="text-xl font-bold">
                  {badge.score === -1 ? 'N/A' : badge.score.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resource Identifiers */}
      {data.identifiers && data.identifiers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">Resource Tanımlayıcıları</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">İsim</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Değer</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Veri Tipi</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Benzersizlik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.identifiers.map((ident, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900 font-medium">{ident.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 font-mono break-all">{ident.value || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{ident.dataType}</td>
                    <td className="px-4 py-2 text-sm">
                      {ident.isPartOfUniqueness ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Evet</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">Hayır</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status States */}
      {data.statusStates && data.statusStates.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">Durum Bilgileri</h4>
          <div className="space-y-2">
            {data.statusStates.map((state, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-600 mb-1">Adapter Instance ID</div>
                  <div className="text-xs text-gray-500 font-mono mb-2 break-all">{state.adapterInstanceId}</div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(state.resourceStatus)}`}>
                      {state.resourceStatus}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(state.resourceState)}`}>
                      {state.resourceState}
                    </span>
                  </div>
                  {state.statusMessage && (
                    <div className="text-xs text-gray-500 mt-2">{state.statusMessage}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Links */}
      {data.links && data.links.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">İlgili Linkler</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.links
              .filter(link => 
                link.name !== 'linkToSelf' && 
                link.name !== 'credentialsOfResource' && 
                link.name !== 'latestPropertiesOfResource'
              )
              .map((link, index) => (
                <button
                  key={index}
                  onClick={() => handleLinkClick(link)}
                  className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors text-left cursor-pointer"
                >
                  <div className="text-sm font-semibold text-gray-900">{getLinkTitle(link.name)}</div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Resource Link Modal */}
      <ResourceLinkModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        link={selectedLink}
        resourceId={data.resourceId}
      />
    </div>
  );
}

// Resources List görünümü komponenti
function ResourcesListView({ data, onResourceDetailRequest, onResourceQueryRequest }) {
  const [selectedResource, setSelectedResource] = useState(null);
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null); // Açık menü ID'si
  const [selectedLink, setSelectedLink] = useState(null); // Modal için seçilen link
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false); // Link modal açık mı
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResourceKind, setSelectedResourceKind] = useState('all');

  // Sıralama fonksiyonu
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Benzersiz resource kind'ları bul
  const resourceKinds = useMemo(() => {
    const kinds = new Set();
    data.resources.forEach(resource => {
      if (resource.resourceKindKey) {
        kinds.add(resource.resourceKindKey);
      }
    });
    return Array.from(kinds).sort();
  }, [data.resources]);

  // Filtrelenmiş ve sıralanmış veri
  const filteredAndSortedData = useMemo(() => {
    let result = [...(data.resources || [])];
    
    // Resource Kind filtresi
    if (selectedResourceKind !== 'all') {
      result = result.filter(item => item.resourceKindKey === selectedResourceKind);
    }
    
    // Arama filtresi
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(term) || 
        item.resourceId?.toLowerCase().includes(term) ||
        item.resourceKindKey?.toLowerCase().includes(term)
      );
    }
    
    // Sıralama
    if (sortConfig.key) {
      result = result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal === bVal) return 0;
        
        const comparison = aVal > bVal ? 1 : -1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    
    return result;
  }, [data.resources, sortConfig, selectedResourceKind, searchTerm]);

  // Sayfalama hesaplamaları
  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredAndSortedData.slice(startIndex, endIndex);

  // Sayfa değiştiğinde scroll'u yukarı kaydır
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Health rengini belirle
  const getHealthColor = (health) => {
    switch (health) {
      case 'GREEN': return 'bg-green-100 text-green-800 border-green-300';
      case 'YELLOW': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'RED': return 'bg-red-100 text-red-800 border-red-300';
      case 'GRAY': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (!data || !data.resources || data.resources.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
        <div className="text-gray-400 mb-2">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p className="text-gray-600 font-semibold">Resource bulunamadı</p>
        <p className="text-sm text-gray-500 mt-1">Arama kriterlerinize uygun resource yok</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Özet Bilgiler */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Toplam Resource</div>
            <div className="text-2xl font-bold text-gray-900">{data.totalCount || 0}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Gösterilen</div>
            <div className="text-xl font-bold text-gray-900">{filteredAndSortedData.length}</div>
          </div>
          {resourceKinds.length > 0 && (
            <div>
              <div className="text-sm text-gray-600">Resource Tipi Sayısı</div>
              <div className="text-lg font-semibold text-gray-900">{resourceKinds.length}</div>
            </div>
          )}
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
        {/* Resource Kind Filtresi */}
        {resourceKinds.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm text-gray-600 font-semibold">Resource Tipi:</label>
            <select
              value={selectedResourceKind}
              onChange={(e) => {
                setSelectedResourceKind(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tümü ({data.totalCount})</option>
              {resourceKinds.map((kind) => {
                const count = data.resources.filter(r => r.resourceKindKey === kind).length;
                return (
                  <option key={kind} value={kind}>
                    {kind} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Arama */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-semibold">Ara:</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Resource adı, ID veya tipinde ara..."
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Sayfa Başına Kayıt Sayısı */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sayfa başına:</label>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
          </select>
        </div>
        <div className="text-sm text-gray-600">
          {startIndex + 1}-{Math.min(endIndex, filteredAndSortedData.length)} / {filteredAndSortedData.length} kayıt
        </div>
      </div>

      {/* Resources Tablosu */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  Resource Adı {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('resourceKindKey')}
                >
                  Resource Tipi {sortConfig.key === 'resourceKindKey' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('health')}
                >
                  Sağlık Durumu {sortConfig.key === 'health' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('creationTime')}
                >
                  Oluşturulma {sortConfig.key === 'creationTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-32">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.map((resource, index) => (
                <tr key={resource.resourceId || index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <div className="text-gray-900 font-medium">{resource.name || 'N/A'}</div>
                    {resource.resourceId && (
                      <div className="text-xs text-gray-500 font-mono mt-1 break-all">{resource.resourceId}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{resource.resourceKindKey || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">
                    {resource.health ? (
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getHealthColor(resource.health)}`}>
                        {resource.health}
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {resource.creationTime ? (
                      new Date(resource.creationTime).toLocaleString('tr-TR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm relative">
                    {resource.resourceId && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === resource.resourceId ? null : resource.resourceId);
                          }}
                          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap flex items-center gap-1"
                        >
                          İşlemler
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {openMenuId === resource.resourceId && (
                          <>
                            {/* Overlay - menü dışına tıklanınca kapat */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            {/* Dropdown Menü */}
                            <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                              <div className="py-1">
                                {/* Detaylarını Göster */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    if (onResourceDetailRequest) {
                                      onResourceDetailRequest(resource.resourceId);
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Detaylarını Göster
                                </button>
                                
                                {/* Sorgu Çalıştır */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    setSelectedResource(resource);
                                    setIsQueryModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                  </svg>
                                  Sorgu Çalıştır
                                </button>
                                
                                {/* Ayırıcı */}
                                <div className="border-t border-gray-200 my-1" />
                                
                                {/* İlişkili Kaynaklar */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    setSelectedLink({
                                      name: 'relationsOfResource',
                                      href: `/suite-api/api/resources/${resource.resourceId}/relationships`
                                    });
                                    setIsLinkModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                  İlişkili Kaynaklar
                                </button>
                                
                                {/* Hardware Konfigürasyon Bilgisi */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    setSelectedLink({
                                      name: 'propertiesOfResource',
                                      href: `/suite-api/api/resources/${resource.resourceId}/properties`
                                    });
                                    setIsLinkModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Hardware Konfigürasyon Bilgisi
                                </button>
                                
                                {/* Alerts */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    setSelectedLink({
                                      name: 'alertsOfResource',
                                      href: `/suite-api/api/alerts?resourceId=${resource.resourceId}`
                                    });
                                    setIsLinkModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  Alerts
                                </button>
                                
                                {/* Semptomlar */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    setSelectedLink({
                                      name: 'symptomsOfResource',
                                      href: `/suite-api/api/symptoms?resourceId=${resource.resourceId}`
                                    });
                                    setIsLinkModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343 5.657l-.707-.707m2.828-9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                  Semptomlar
                                </button>
                                
                                {/* Performans Metrik Keys */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    setSelectedLink({
                                      name: 'statKeysOfResource',
                                      href: `/suite-api/api/resources/${resource.resourceId}/statkeys`
                                    });
                                    setIsLinkModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                  Performans Metrik Keys
                                </button>
                                
                                {/* Son Performans Verileri */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    setSelectedLink({
                                      name: 'latestStatsOfResource',
                                      href: `/suite-api/api/resources/${resource.resourceId}/stats/latest`
                                    });
                                    setIsLinkModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                  </svg>
                                  Son Performans Verileri
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sayfalama Kontrolleri */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Sayfa {currentPage} / {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              İlk
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Önceki
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Son
            </button>
          </div>
        </div>
      )}

      {/* Resource Query Modal */}
            {selectedResource && (
              <ResourceQueryModal
                isOpen={isQueryModalOpen}
                onClose={() => {
                  setIsQueryModalOpen(false);
                  setSelectedResource(null);
                }}
                resource={selectedResource}
                onQuerySubmit={onResourceQueryRequest}
              />
            )}

            {/* Resource Link Modal */}
            {selectedLink && (
              <ResourceLinkModal
                isOpen={isLinkModalOpen}
                onClose={() => {
                  setIsLinkModalOpen(false);
                  setSelectedLink(null);
                }}
                link={selectedLink}
                resourceId={selectedLink.href?.match(/\/resources\/([^\/\?]+)/)?.[1] || null}
              />
            )}
          </div>
        );
      }

// Resource Query Modal komponenti
function ResourceQueryModal({ isOpen, onClose, resource, onQuerySubmit }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!query.trim()) return;
    
    console.log('ResourceQueryModal - handleSubmit called', { resource, query: query.trim(), onQuerySubmit: !!onQuerySubmit });
    
    if (onQuerySubmit) {
      onQuerySubmit(resource, query.trim());
    } else {
      console.error('ResourceQueryModal - onQuerySubmit is not provided');
    }
    
    setQuery('');
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Sorgu Çalıştır</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Resource Bilgileri */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm font-semibold text-gray-700 mb-2">Resource Bilgileri:</div>
          <div className="space-y-1 text-sm text-gray-600">
            <div><span className="font-medium">ID:</span> <span className="font-mono">{resource.resourceId || 'N/A'}</span></div>
            <div><span className="font-medium">İsim:</span> {resource.name || 'N/A'}</div>
            <div><span className="font-medium">Resource Tipi:</span> {resource.resourceKindKey || 'N/A'}</div>
          </div>
        </div>

        {/* Query Input */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Sorunuzu yazın:
          </label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Örn: CPU kullanımını getir, memory kullanımını göster..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={4}
          />
          <div className="mt-2 text-xs text-gray-500">
            Resource bilgileri otomatik olarak sorguya eklenecektir.
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!query.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}

// Properties görünümü komponenti (ResourceLinkModal'dan kopyalandı)
function PropertiesView({ data }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Sıralama fonksiyonu
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filtrelenmiş ve sıralanmış veri
  const filteredAndSortedData = useMemo(() => {
    let result = [...(data.properties || [])];
    
    // Kategori filtresi
    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category === selectedCategory);
    }
    
    // Arama filtresi
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(term) || 
        item.displayName.toLowerCase().includes(term) ||
        item.value.toLowerCase().includes(term)
      );
    }
    
    // Sıralama
    if (sortConfig.key) {
      result = result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal === bVal) return 0;
        
        const comparison = aVal > bVal ? 1 : -1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    
    return result;
  }, [data.properties, sortConfig, selectedCategory, searchTerm]);

  // Sayfalama hesaplamaları
  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredAndSortedData.slice(startIndex, endIndex);

  // Sayfa değiştiğinde scroll'u yukarı kaydır
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Kategori değiştiğinde sayfayı sıfırla
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  // Arama değiştiğinde sayfayı sıfırla
  const handleSearchChange = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  if (!data || !data.properties || data.properties.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
        <div className="text-gray-400 mb-2">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-gray-600 font-semibold">Property bulunamadı</p>
        <p className="text-sm text-gray-500 mt-1">Bu resource için property yok</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Özet Bilgiler */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">Toplam Property</div>
            <div className="text-2xl font-bold text-gray-900">{data.totalCount || 0}</div>
          </div>
          {data.resourceId && (
            <div>
              <div className="text-sm text-gray-600">Resource ID</div>
              <div className="text-sm font-mono text-gray-900 break-all">{data.resourceId}</div>
            </div>
          )}
          {data.categories && data.categories.length > 0 && (
            <div>
              <div className="text-sm text-gray-600">Kategori Sayısı</div>
              <div className="text-lg font-semibold text-gray-900">{data.categories.length}</div>
            </div>
          )}
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
        {/* Kategori Filtresi */}
        {data.categories && data.categories.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm text-gray-600 font-semibold">Kategori:</label>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tümü ({data.totalCount})</option>
              {data.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} ({data.byCategory[cat]?.length || 0})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Arama */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-semibold">Ara:</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Property adı veya değerinde ara..."
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Sayfa Başına Kayıt Sayısı */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sayfa başına:</label>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
          </select>
        </div>
        <div className="text-sm text-gray-600">
          {startIndex + 1}-{Math.min(endIndex, filteredAndSortedData.length)} / {filteredAndSortedData.length} kayıt
        </div>
      </div>

      {/* Properties Tablosu */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('category')}
                >
                  Kategori {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('displayName')}
                >
                  Property Adı {sortConfig.key === 'displayName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('value')}
                >
                  Değer {sortConfig.key === 'value' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.map((prop, index) => (
                <tr key={`${prop.name}-${index}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{prop.category || 'General'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium font-mono break-all">{prop.displayName || prop.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 break-all">{prop.value || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sayfalama Kontrolleri */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Sayfa {currentPage} / {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              İlk
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Önceki
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Son
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatInterface;

