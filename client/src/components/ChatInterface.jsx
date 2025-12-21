// Chat arayüzü komponenti - Kullanıcı mesajlarını gönderir ve cevapları gösterir
// Bu komponent, sağ tarafta ChatGPT benzeri bir layout oluşturacak şekilde tasarlanmıştır:
// Üstte scroll edilebilen mesaj alanı, altta sabit prompt input bölümü yer alır.
import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { sendMessage, executeVropsDirectRequest, analyzePerformance, getChat, addToFavorites, removeFromFavorites, getFavorites, getVropsToken } from '../services/api';
import { VscVmRunning } from 'react-icons/vsc';
import { GoFileCode, GoCopy, GoSync } from 'react-icons/go';
import { BsStars } from 'react-icons/bs';
import monitoringLogo from '../monitoring-logo.png';
import VropsDataTable from './VropsDataTable';
import AlertFilters from './filters/AlertFilters';
import MetricTable from './MetricTable';
import MetricChart from './MetricChart';
import LatestStatsTable from './LatestStatsTable';
import StatKeysTable from './StatKeysTable';
import TopNStatsTable from './TopNStatsTable';
import ResourceLinkModal from './ResourceLinkModal';
import PerformanceAnalysisView from './PerformanceAnalysisView';

function ChatInterface({ chatId, onChatCreated, onFavoriteAdded, executeMessage }) {
  // State yönetimi - Mesajlar ve yükleme durumu
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(chatId);
  const [favoriteMessageIds, setFavoriteMessageIds] = useState(new Set());
  const messagesEndRef = useRef(null);
  const lastExecutedMessageRef = useRef(null);
  const executeMessageTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true); // Kullanıcı scroll yaptıysa false olacak
  const inputRef = useRef(null); // Input textarea referansı
  
  // API görünümü state'leri
  const [showApiView, setShowApiView] = useState(false);
  const [apiResponseRaw, setApiResponseRaw] = useState(''); // API request parametreleri (JSON)
  const [apiExecutionResponse, setApiExecutionResponse] = useState(''); // API çalıştırma sonucu
  const [apiRequest, setApiRequest] = useState({
    endpoint: '',
    method: 'GET',
    headers: '{}',
    params: '',
    body: ''
  });
  const [splitPaneWidth, setSplitPaneWidth] = useState(50); // Yüzde olarak
  const [isResizing, setIsResizing] = useState(false);
  const splitPaneRef = useRef(null);
  const [isExecutingApi, setIsExecutingApi] = useState(false);

  // ChatId değiştiğinde mesajları yükle
  useEffect(() => {
    if (chatId) {
      // Eğer currentChatId zaten aynıysa loadChatMessages çağırma (mesajlar zaten yüklü)
      if (currentChatId !== chatId) {
        setCurrentChatId(chatId);
        loadChatMessages(chatId);
        // Yeni chat açıldığında input'u temizle
        setInputMessage('');
      }
    } else {
      setMessages([]);
      setCurrentChatId(null);
      // Chat yoksa input'u temizle
      setInputMessage('');
    }
  }, [chatId, currentChatId]);

  // executeMessage prop'u değiştiğinde mesajı input alanına yaz
  useEffect(() => {
    // executeMessage null olduğunda bir şey yapma
    if (executeMessage === null || executeMessage === undefined) {
      return;
    }

    // Mesajı input alanına yaz
    const trimmedMessage = executeMessage.trim();
    if (trimmedMessage) {
      setInputMessage(trimmedMessage);
    }
    
    // Input alanına focus yap - ref kullanarak daha güvenilir
    // Boş string durumunda da focus yap (sadece focus için kullanılıyor)
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        // Cursor'ı sona taşı
        if (trimmedMessage && inputRef.current.setSelectionRange) {
          inputRef.current.setSelectionRange(trimmedMessage.length, trimmedMessage.length);
        } else if (trimmedMessage && inputRef.current.createTextRange) {
          // IE için fallback
          const range = inputRef.current.createTextRange();
          range.collapse(false);
          range.select();
        }
      } else {
        // Fallback: ref yoksa selector kullan
        const inputElement = document.querySelector('textarea[placeholder*="Talebinizi"]') || 
                           document.querySelector('textarea[placeholder*="Mesaj"]') ||
                           document.querySelector('input[placeholder*="Talebinizi"]') ||
                           document.querySelector('input[placeholder*="Mesaj"]') ||
                           document.querySelector('textarea');
        if (inputElement) {
          inputElement.focus();
          // Cursor'ı sona taşı
          if (trimmedMessage && inputElement.setSelectionRange) {
            inputElement.setSelectionRange(trimmedMessage.length, trimmedMessage.length);
          } else if (trimmedMessage && inputElement.createTextRange) {
            // IE için fallback
            const range = inputElement.createTextRange();
            range.collapse(false);
            range.select();
          }
        }
      }
    }, 200);

    // executeMessage'ı temizle (bir sonraki değişiklik için)
    setTimeout(() => {
      // Bu timeout parent component'ten gelecek, burada sadece input'a yazıyoruz
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executeMessage]);

  // Favorileri yükle
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const response = await getFavorites();
        if (response.success && response.favorites) {
          const favoriteIds = new Set(response.favorites.map(fav => fav.messageId));
          setFavoriteMessageIds(favoriteIds);
        }
      } catch (error) {
        console.error('Favoriler yüklenirken hata:', error);
      }
    };
    loadFavorites();
  }, []);

  // Sohbet mesajlarını yükle
  const loadChatMessages = async (chatIdToLoad) => {
    try {
      const response = await getChat(chatIdToLoad);
      if (response.success && response.chat.messages) {
        // Mevcut mesajlardaki performanceValuesData'ları koru (eğer varsa)
        const existingMessagesMap = new Map();
        messages.forEach(msg => {
          if (msg.performanceValuesData || msg.performanceValuesComment) {
            existingMessagesMap.set(msg.id, {
              performanceValuesData: msg.performanceValuesData,
              performanceValuesComment: msg.performanceValuesComment,
              dataType: msg.dataType,
              parsedData: msg.parsedData,
              vropsRequest: msg.vropsRequest
            });
          }
        });
        
        const formattedMessages = response.chat.messages.map(msg => {
          // Mesaj içeriğinden vropsRequest'i parse etmeye çalış (eğer backend'den gelmediyse)
          let vropsRequest = null;
          
          // Eğer mesaj içeriğinde endpoint varsa parse et
          if (msg.content && typeof msg.content === 'string') {
            // ChatGPT response'undan endpoint çıkarmaya çalış
            const lines = msg.content.split('\n');
            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith('/suite-api/') || trimmedLine.startsWith('/api/')) {
                // Basit parse - sadece endpoint'i çıkar
                const [endpointPart, queryPart] = trimmedLine.split('?', 2);
                const endpoint = endpointPart.replace('/suite-api', '');
                const params = {};
                if (queryPart) {
                  const searchParams = new URLSearchParams(queryPart);
                  for (const [key, value] of searchParams.entries()) {
                    params[key] = value;
                  }
                }
                vropsRequest = {
                  endpoint: endpoint,
                  method: 'GET',
                  params: params,
                  body: {}
                };
                break;
              }
            }
          }
          
          // Mevcut mesajdan performanceValuesData'yı al (eğer varsa)
          const existingData = existingMessagesMap.get(msg.id);
          
          return {
            id: msg.id,
            type: msg.role === 'user' ? 'user' : 'system',
            content: msg.content,
            timestamp: new Date(msg.createdAt),
            questionModelId: msg.questionModelId,
            responseModelId: msg.responseModelId,
            vropsRequest: existingData?.vropsRequest || msg.vropsRequest || vropsRequest, // Önce mevcut, sonra backend'den gelen, sonra parse edilen
            parsedData: existingData?.parsedData || msg.parsedData, // Önce mevcut, sonra backend'den gelen
            dataType: existingData?.dataType || msg.dataType, // Önce mevcut, sonra backend'den gelen
            performanceValuesData: existingData?.performanceValuesData || msg.performanceValuesData, // Önce mevcut, sonra backend'den gelen
            performanceValuesComment: existingData?.performanceValuesComment || msg.performanceValuesComment // Önce mevcut, sonra backend'den gelen
          };
        });
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Mesajlar yüklenirken hata:', error);
    }
  };

  // Yeni mesaj geldiğinde scroll'u en alta kaydır (sadece kullanıcı en alttaysa)
  const scrollToBottom = (force = false) => {
    if (!force && !shouldAutoScrollRef.current) return; // Kullanıcı scroll yaptıysa scroll yapma
    
    // DOM güncellenmesini beklemek için setTimeout kullan
    setTimeout(() => {
      if ((force || shouldAutoScrollRef.current) && messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      } else if ((force || shouldAutoScrollRef.current) && messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Scroll pozisyonunu kontrol et - kullanıcı yukarı scroll yaptıysa otomatik scroll'u durdur
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const container = messagesContainerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    // Kullanıcı en alttan 100px yukarıdaysa otomatik scroll'u durdur
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    shouldAutoScrollRef.current = isNearBottom;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Yeni mesaj gönderildiğinde otomatik scroll'u tekrar aktif et
  useEffect(() => {
    if (isLoading) {
      // Yeni mesaj gönderilirken otomatik scroll'u aktif et
      shouldAutoScrollRef.current = true;
    } else {
      // Cevap geldiğinde (isLoading false olduğunda) scroll yap
      setTimeout(() => {
        scrollToBottom(true);
      }, 200);
    }
  }, [isLoading]);

  // Favorilere ekleme/çıkarma fonksiyonu
  const handleToggleFavorite = async (messageId, isFavorite) => {
    // Geçici ID kontrolü - Date.now() ile oluşturulan ID'ler geçicidir (13 haneli timestamp)
    const isTemporaryId = messageId > 1000000000000;
    
    if (isTemporaryId) {
      alert('Mesaj henüz kaydedilmedi. Lütfen birkaç saniye bekleyip tekrar deneyin.');
      return;
    }

    try {
      if (isFavorite) {
        await removeFromFavorites(messageId);
        setFavoriteMessageIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
      } else {
        try {
          await addToFavorites(messageId);
          setFavoriteMessageIds(prev => new Set(prev).add(messageId));
          if (onFavoriteAdded) {
            onFavoriteAdded();
          }
        } catch (addError) {
          // Eğer mesaj zaten favorilerdeyse, state'i güncelle
          if (addError.status === 400 || addError.message?.includes('zaten favorilerinizde')) {
            setFavoriteMessageIds(prev => new Set(prev).add(messageId));
            // Kullanıcıya bilgi ver ama hata olarak gösterme
            console.log('Mesaj zaten favorilerde:', messageId);
          } else {
            throw addError; // Diğer hataları yukarı fırlat
          }
        }
      }
    } catch (error) {
      console.error('❌ [UI] Favori işlemi sırasında hata:', {
        error: error.message,
        messageId,
        isFavorite
      });
    }
  };

  // Performans analizi gerektiren soru mu kontrol et
  const isPerformanceAnalysisQuestion = (message) => {
    const lowerMessage = message.toLowerCase();
    const performanceKeywords = ['yavaş', 'slow', 'finding', 'neden', 'sebep', 'performance', 'dondu', 'freeze', 'neden yavaş', 'neden dondu'];
    return performanceKeywords.some(keyword => lowerMessage.includes(keyword));
  };

  // Mesaj gönderme fonksiyonu
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    await sendMessageInternal(userMessage);
  };

  // Retry için mesaj gönderme fonksiyonu - belirli bir mesajı tekrar gönderir
  const handleRetryMessage = async (retryMessage) => {
    if (!retryMessage || !retryMessage.trim() || isLoading) return;

    const userMessage = retryMessage.trim();
    
    await sendMessageInternal(userMessage);
  };

  // İç mesaj gönderme fonksiyonu - ortak mantık
  const sendMessageInternal = async (userMessage) => {
    
    // ChatId yoksa yeni sohbet oluştur
    let chatIdToUse = currentChatId;
    if (!chatIdToUse) {
      // Yeni sohbet oluşturulacak, backend'den chatId gelecek
    }
    
    // Kullanıcı mesajını ekle (geçici olarak)
    const tempUserMessageId = Date.now();
    const newUserMessage = {
      id: tempUserMessageId,
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    
    // Mesaj gönderildiğinde otomatik scroll'u aktif et ve scroll yap
    shouldAutoScrollRef.current = true;
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);
    
    // Mesaj eklendikten sonra scroll'u tetikle (force ile)
    setTimeout(() => {
      scrollToBottom(true);
    }, 50);

    try {
      // Performans analizi gerektiren soru mu kontrol et
      if (isPerformanceAnalysisQuestion(userMessage)) {
        // Performans analizi endpoint'ine yönlendir
        console.log('Performance analysis detected, calling analyzePerformance...');
        const analysisResponse = await analyzePerformance(userMessage, null, chatIdToUse);
        console.log('Performance analysis response received:', analysisResponse);
        
        // ChatId güncelle
        if (analysisResponse.chatId && !chatIdToUse) {
          chatIdToUse = analysisResponse.chatId;
          setCurrentChatId(chatIdToUse);
          if (onChatCreated) {
            onChatCreated(chatIdToUse);
          }
        }
        
        // Kullanıcı mesajını güncelle (gerçek ID ile)
        if (analysisResponse.userMessageId) {
          setMessages(prev => prev.map(msg => 
            msg.id === tempUserMessageId 
              ? { ...msg, id: analysisResponse.userMessageId }
              : msg
          ));
        }
        
        const systemMessage = {
          id: analysisResponse.assistantMessageId || Date.now() + 1,
          type: 'system',
          content: `Performans analizi tamamlandı. ${analysisResponse.vmName || 'VM'} için detaylı analiz aşağıda gösteriliyor.`,
          timestamp: new Date(),
          performanceAnalysis: analysisResponse, // Performans analizi verisi
          dataType: 'performanceAnalysis'
        };
        console.log('System message created:', systemMessage);
        setMessages(prev => [...prev, systemMessage]);
        return;
      }

      // Normal chat akışı - Backend'e mesaj gönder
      const response = await sendMessage(userMessage, null, chatIdToUse);
      
      // ChatId güncelle
      if (response.chatId && !chatIdToUse) {
        chatIdToUse = response.chatId;
        setCurrentChatId(chatIdToUse);
        if (onChatCreated) {
          onChatCreated(chatIdToUse);
        }
      }
      
      // Kullanıcı mesajını güncelle (gerçek ID ile)
      if (response.userMessageId) {
        setMessages(prev => prev.map(msg => 
          msg.id === tempUserMessageId 
            ? { ...msg, id: response.userMessageId }
            : msg
        ));
      }
      
      // Eğer parse edilmiş vROPS verisi varsa, mesaj objesine ekle
      let systemMessageContent = response.gptResponse;
      
      // Performans değerleri için özel kontrol
      console.log('[FRONTEND] Performance values check:', {
        hasPerformanceValuesData: !!response.performanceValuesData,
        performanceValuesDataLength: response.performanceValuesData?.length,
        hasPerformanceValuesComment: !!response.performanceValuesComment,
        performanceValuesComment: response.performanceValuesComment
      });
      
      if (response.performanceValuesData && response.performanceValuesData.length > 0) {
        systemMessageContent = response.gptResponse || `Performans değerleri başarıyla alındı. ${response.performanceValuesData.length} metrik aşağıda gösteriliyor.`;
        const systemMessage = {
          id: response.assistantMessageId || Date.now() + 1,
          type: 'system',
          content: systemMessageContent,
          timestamp: new Date(),
          dataType: 'performanceValues', // Performans değerleri için özel dataType
          performanceValuesData: response.performanceValuesData, // Performans değerleri verisi
          performanceValuesComment: response.performanceValuesComment // ChatGPT yorumu
        };
        console.log('[FRONTEND] System message created with performance values:', {
          hasPerformanceValuesData: !!systemMessage.performanceValuesData,
          performanceValuesDataLength: systemMessage.performanceValuesData?.length,
          hasPerformanceValuesComment: !!systemMessage.performanceValuesComment,
          performanceValuesComment: systemMessage.performanceValuesComment,
          fullSystemMessage: systemMessage
        });
        setMessages(prev => {
          const newMessages = [...prev, systemMessage];
          console.log('[FRONTEND] Messages after adding performance values message:', {
            totalMessages: newMessages.length,
            lastMessage: newMessages[newMessages.length - 1],
            hasPerformanceValuesData: !!newMessages[newMessages.length - 1].performanceValuesData,
            lastMessageDataType: newMessages[newMessages.length - 1].dataType
          });
          return newMessages;
        });
      } else if (response.parsedData && response.dataType) {
        // Her veri tipi için özel mesaj
            if (response.dataType === 'alerts') {
              systemMessageContent = `vROPS verileri başarıyla alındı. ${response.parsedData.totalCount} alert aşağıda gösteriliyor.`;
            } else if (response.dataType === 'resourceDetail') {
              systemMessageContent = `Resource detayları başarıyla alındı. ${response.parsedData.name || 'Resource'} bilgileri aşağıda gösteriliyor.`;
            } else if (response.dataType === 'resources') {
              systemMessageContent = `vROPS verileri başarıyla alındı. ${response.parsedData.totalCount} resource aşağıda gösteriliyor.`;
            } else if (response.dataType === 'properties') {
              systemMessageContent = `vROPS verileri başarıyla alındı. ${response.parsedData.totalCount} property aşağıda gösteriliyor.`;
            } else if (response.dataType === 'symptoms') {
              systemMessageContent = `vROPS verileri başarıyla alındı. ${response.parsedData.totalCount || 0} semptom aşağıda gösteriliyor.`;
            } else if (response.dataType === 'topn') {
              const sortOrderText = response.parsedData.sortOrder === 'DESCENDING' ? 'En fazla' : 'En az';
              systemMessageContent = `vROPS verileri başarıyla alındı. ${sortOrderText} ${response.parsedData.totalCount} VM aşağıda gösteriliyor.`;
            } else {
              systemMessageContent = `vROPS verileri başarıyla alındı. Veriler aşağıda gösteriliyor.`;
            }
        
        // Başarılı mesajı ekle ve parsedData'yı mesaj objesine ekle
        const systemMessage = {
          id: response.assistantMessageId || Date.now() + 1,
          type: 'system',
          content: systemMessageContent,
          timestamp: new Date(),
          parsedData: response.parsedData, // Parse edilmiş veriyi mesaj objesine ekle
          dataType: response.dataType, // Veri tipini mesaj objesine ekle
          vropsRequest: response.vropsRequest, // API request parametrelerini ekle
          performanceValuesData: response.performanceValuesData, // Performans değerleri verisi
          performanceValuesComment: response.performanceValuesComment // ChatGPT yorumu
        };
        setMessages(prev => [...prev, systemMessage]);
      } else if (response.gptResponse) {
        // Sadece ChatGPT cevabı varsa göster (vROPS verisi yoksa)
        const systemMessage = {
          id: response.assistantMessageId || Date.now() + 1,
          type: 'system',
          content: response.gptResponse,
          timestamp: new Date(),
          vropsRequest: response.vropsRequest, // API request parametrelerini ekle (varsa)
          performanceValuesData: response.performanceValuesData, // Performans değerleri verisi
          performanceValuesComment: response.performanceValuesComment // ChatGPT yorumu
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
        } else if (response.dataType === 'symptoms') {
          systemMessageContent = `vROPS verileri başarıyla alındı. ${response.parsedData.totalCount || 0} semptom aşağıda gösteriliyor.`;
        } else if (response.dataType === 'topn') {
          const sortOrderText = response.parsedData.sortOrder === 'DESCENDING' ? 'En fazla' : 'En az';
          systemMessageContent = `vROPS verileri başarıyla alındı. ${sortOrderText} ${response.parsedData.totalCount} VM aşağıda gösteriliyor.`;
        } else {
          systemMessageContent = `vROPS verileri başarıyla alındı. Veriler aşağıda gösteriliyor.`;
        }

        const systemMessage = {
          id: Date.now() + 1,
          type: 'system',
          content: systemMessageContent,
          timestamp: new Date(),
          parsedData: response.parsedData,
          dataType: response.dataType,
          performanceValuesData: response.performanceValuesData,
          performanceValuesComment: response.performanceValuesComment
        };
        setMessages(prev => [...prev, systemMessage]);
      } else if (response.gptResponse) {
        const systemMessage = {
          id: Date.now() + 1,
          type: 'system',
          content: response.gptResponse,
          timestamp: new Date(),
          performanceValuesData: response.performanceValuesData, // Performans değerleri verisi
          performanceValuesComment: response.performanceValuesComment // ChatGPT yorumu
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

  // Endpoint'ten query string'i çıkar ve params'a yaz
  const handleEndpointBlur = () => {
    const endpoint = apiRequest.endpoint.trim();
    if (!endpoint) return;
    
    // Query string'i ayır
    const [pathPart, queryString] = endpoint.split('?', 2);
    
    if (queryString) {
      // Query string'i params objesine çevir
      try {
        const paramsObj = {};
        const searchParams = new URLSearchParams(queryString);
        for (const [key, value] of searchParams.entries()) {
          paramsObj[key] = value;
        }
        
        // Endpoint'i temizle (query string olmadan) ve params'ı güncelle
        setApiRequest(prev => ({
          ...prev,
          endpoint: pathPart,
          params: JSON.stringify(paramsObj, null, 2)
        }));
      } catch (e) {
        console.error('Query string parse error:', e);
      }
    }
  };

  // Params'tan query string oluştur ve endpoint'e ekle
  const handleParamsBlur = () => {
    try {
      const paramsObj = JSON.parse(apiRequest.params || '{}');
      if (Object.keys(paramsObj).length > 0) {
        // Query string oluştur
        const queryString = new URLSearchParams(paramsObj).toString();
        
        // Endpoint'ten mevcut query string'i temizle
        const [pathPart] = apiRequest.endpoint.split('?', 2);
        
        // Yeni query string'i endpoint'e ekle
        setApiRequest(prev => ({
          ...prev,
          endpoint: `${pathPart}?${queryString}`
        }));
      } else {
        // Params boşsa endpoint'ten query string'i kaldır
        const [pathPart] = apiRequest.endpoint.split('?', 2);
        setApiRequest(prev => ({
          ...prev,
          endpoint: pathPart
        }));
      }
    } catch (e) {
      console.error('Params parse error:', e);
    }
  };

  // Headers'a vROPS token ekle (eğer yoksa veya güncelle)
  const handleHeadersBlur = async () => {
    try {
      const headersObj = JSON.parse(apiRequest.headers || '{}');
      
      // Her zaman backend'den gerçek token'ı al ve güncelle
      try {
        const tokenResponse = await getVropsToken();
        if (tokenResponse.success && tokenResponse.headerValue) {
          headersObj['Authorization'] = tokenResponse.headerValue;
          setApiRequest(prev => ({
            ...prev,
            headers: JSON.stringify(headersObj, null, 2)
          }));
        }
      } catch (error) {
        console.error('vROPS token alınırken hata:', error);
      }
    } catch (e) {
      console.error('Headers parse error:', e);
    }
  };

  // API görünümünü aç - ChatGPT response'undan API bilgilerini çıkar
  const handleOpenApiView = async (message) => {
    // vROPS request bilgilerini mesajdan al
    let endpoint = '';
    let method = 'GET';
    let params = {};
    let body = {};
    
    console.log('[API VIEW] Mesaj objesi:', message);
    console.log('[API VIEW] message.vropsRequest:', JSON.stringify(message.vropsRequest, null, 2));
    
    if (message.vropsRequest) {
      // Backend'den gelen vropsRequest bilgisini kullan
      endpoint = message.vropsRequest.endpoint || '';
      method = message.vropsRequest.method || 'GET';
      params = message.vropsRequest.params || {};
      body = message.vropsRequest.body || {};
      
      console.log('[API VIEW] Parse edilen değerler:', {
        endpoint,
        method,
        params,
        paramsType: typeof params,
        paramsKeys: Object.keys(params),
        body
      });
      
      // Params'ın obje olduğundan emin ol
      if (typeof params !== 'object' || Array.isArray(params)) {
        console.warn('[API VIEW] Params obje değil, boş obje kullanılıyor');
        params = {};
      }
    } else {
      console.warn('[API VIEW] message.vropsRequest yok, mesaj içeriğinden parse edilmeye çalışılıyor');
      // Fallback: Eğer vropsRequest yoksa, mesaj içeriğinden çıkarmaya çalış
      if (message.content && typeof message.content === 'string') {
        const lines = message.content.split('\n');
        for (const line of lines) {
          const trimmedLine = line.trim();
          // /suite-api/ veya /api/ ile başlayan satırı bul
          if (trimmedLine.startsWith('/suite-api/') || trimmedLine.startsWith('/api/')) {
            // Endpoint'i parse et
            const [endpointPart, queryPart] = trimmedLine.split('?', 2);
            endpoint = endpointPart.replace('/suite-api', '');
            if (!endpoint.startsWith('/')) {
              endpoint = '/' + endpoint;
            }
            // Query parametrelerini parse et
            if (queryPart) {
              const searchParams = new URLSearchParams(queryPart);
              for (const [key, value] of searchParams.entries()) {
                params[key] = value;
              }
            }
            console.log('[API VIEW] Mesaj içeriğinden parse edildi:', { endpoint, params });
            break;
          }
        }
      }
      
      // Hala endpoint bulunamadıysa fallback
      if (!endpoint) {
        endpoint = '/api/resources';
        console.warn('[API VIEW] Endpoint bulunamadı, fallback kullanılıyor:', endpoint);
      }
    }
    
    // Headers objesi oluştur
    const headersObj = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // vROPS token'ı backend'den al ve header'a ekle
    try {
      const tokenResponse = await getVropsToken();
      console.log('[API VIEW] Token response:', tokenResponse);
      if (tokenResponse.success && tokenResponse.headerValue) {
        headersObj['Authorization'] = tokenResponse.headerValue;
        console.log('[API VIEW] Token header\'a eklendi');
      }
    } catch (error) {
      console.error('[API VIEW] vROPS token alınırken hata:', error);
    }
    
    // Params'ı JSON string'e çevir
    const paramsJson = Object.keys(params).length > 0 ? JSON.stringify(params, null, 2) : '{}';
    console.log('[API VIEW] Params JSON:', paramsJson);
    
    // Params'tan query string oluştur ve endpoint'e ekle (açılır açılmaz gelsin)
    let fullEndpoint = endpoint;
    if (Object.keys(params).length > 0) {
      try {
        // Array parametrelerini düzgün handle et (örn: resourceId=[id1, id2] -> resourceId=id1&resourceId=id2)
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          const value = params[key];
          if (Array.isArray(value)) {
            // Array ise her elemanı ayrı parametre olarak ekle
            value.forEach(item => {
              queryParams.append(key, item);
            });
          } else if (value !== null && value !== undefined && value !== '') {
            // Normal değer
            queryParams.append(key, value);
          }
        });
        const queryString = queryParams.toString();
        if (queryString) {
          fullEndpoint = `${endpoint}?${queryString}`;
        }
        console.log('[API VIEW] Query string oluşturuldu:', queryString);
      } catch (e) {
        console.error('[API VIEW] Query string oluşturulurken hata:', e);
        // Hata olsa bile devam et
      }
    }
    
    const apiRequestData = {
      endpoint: fullEndpoint, // Query string ile birlikte endpoint
      method: method,
      headers: JSON.stringify(headersObj, null, 2),
      params: paramsJson,
      body: Object.keys(body).length > 0 ? JSON.stringify(body, null, 2) : ''
    };
    
    console.log('[API VIEW] API Request Data:', JSON.stringify(apiRequestData, null, 2));
    
    setApiRequest(apiRequestData);
    setShowApiView(true);
  };

  // API isteğini çalıştır
  const handleExecuteApi = async () => {
    if (!apiRequest.endpoint || !apiRequest.endpoint.trim()) {
      alert('Lütfen endpoint girin.');
      return;
    }

    // Method kontrolü - şu anda sadece GET destekleniyor (uyarı ver ama engelleme)
    if (apiRequest.method !== 'GET') {
      const proceed = window.confirm('Şu anda sadece GET methodu desteklenmektedir. vROPS API\'si için GET kullanmanız önerilir. Devam etmek istiyor musunuz?');
      if (!proceed) {
        return;
      }
    }

    setIsExecutingApi(true);
    setApiExecutionResponse(''); // Önceki response'u temizle
    try {
      // Params'ı parse et ve query string'e çevir
      let queryString = '';
      try {
        const paramsObj = JSON.parse(apiRequest.params || '{}');
        if (Object.keys(paramsObj).length > 0) {
          queryString = new URLSearchParams(paramsObj).toString();
        }
      } catch (e) {
        console.error('Params parse error:', e);
      }
      
      // Query string'i endpoint'e ekle
      const fullEndpoint = queryString ? `${apiRequest.endpoint}?${queryString}` : apiRequest.endpoint;
      
      // Headers'ı parse et
      let headersObj = {};
      try {
        headersObj = JSON.parse(apiRequest.headers || '{}');
      } catch (e) {
        console.error('Headers parse error:', e);
        headersObj = {};
      }
      
      // Params'ı parse et
      let paramsObj = {};
      try {
        paramsObj = JSON.parse(apiRequest.params || '{}');
      } catch (e) {
        console.error('Params parse error:', e);
        paramsObj = {};
      }
      
      // Body'yi parse et
      let bodyObj = null;
      if (apiRequest.body && apiRequest.body.trim()) {
        try {
          bodyObj = JSON.parse(apiRequest.body);
        } catch (e) {
          console.error('Body parse error:', e);
          bodyObj = null;
        }
      }
      
      console.log('Executing API request:', { 
        endpoint: fullEndpoint, 
        method: apiRequest.method,
        headers: headersObj,
        params: paramsObj,
        body: bodyObj
      });
      
      const response = await executeVropsDirectRequest(
        fullEndpoint,
        headersObj,
        apiRequest.method,
        paramsObj,
        bodyObj
      );
      
      // Response'u JSON formatında göster
      setApiExecutionResponse(JSON.stringify({
        success: response.success,
        data: response.data,
        parsedData: response.parsedData,
        dataType: response.dataType
      }, null, 2));
    } catch (error) {
      console.error('API execution error:', error);
      setApiExecutionResponse(JSON.stringify({
        error: error.response?.data?.error || error.message || 'Bir hata oluştu',
        details: error.response?.data || null
      }, null, 2));
    } finally {
      setIsExecutingApi(false);
    }
  };

  // Copy fonksiyonları
  const handleCopyRequest = async () => {
    const requestText = JSON.stringify({
      endpoint: apiRequest.endpoint,
      method: apiRequest.method,
      headers: JSON.parse(apiRequest.headers || '{}'),
      body: apiRequest.body ? JSON.parse(apiRequest.body) : null
    }, null, 2);
    
    try {
      await navigator.clipboard.writeText(requestText);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = requestText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const handleCopyResponse = async () => {
    try {
      await navigator.clipboard.writeText(apiResponseRaw);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = apiResponseRaw;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const handleCopyExecutionResponse = async () => {
    try {
      await navigator.clipboard.writeText(apiExecutionResponse);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = apiExecutionResponse;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  // Split pane resize handler'ları
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const container = splitPaneRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      
      // Minimum ve maksimum genişlik sınırları
      if (newWidth >= 20 && newWidth <= 80) {
        setSplitPaneWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Layout:
  // - Dış div: Tüm yüksekliği kullanan dikey flex container
  // - Üst kısım: Mesajların olduğu, scroll edilebilen alan
  // - Alt kısım: Prompt / input alanı (her zaman görünür)
  // - Split pane: API görünümü açıksa sayfa ikiye ayrılır
  return (
    <div className="flex flex-col h-full min-h-0 relative" ref={splitPaneRef}>
      {showApiView ? (
        // Split pane görünümü
        <div className="flex h-full w-full relative">
          {/* Sol pane - Chat görünümü */}
          <div className="flex flex-col h-full min-h-0 relative" style={{ width: `${splitPaneWidth}%` }}>
      {/* Mesaj listesi alanı - geri kalan tüm yüksekliği kaplar */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto scroll-smooth w-full bg-gray-50 dark:bg-gray-900"
      >
        <div className="flex flex-col w-full px-4 py-8 md:py-12 gap-8">
          {messages.length === 0 ? (
            <EmptyStateMessage />
          ) : (
            // Mesajlar listelendiği alan
            <>
              {(() => {
                console.log('[FRONTEND RENDER] Total messages:', messages.length);
                messages.forEach((msg, idx) => {
                  if (msg.performanceValuesData || msg.dataType === 'performanceValues') {
                    console.log(`[FRONTEND RENDER] Message ${idx} with performance values:`, {
                      messageId: msg.id,
                      dataType: msg.dataType,
                      hasPerformanceValuesData: !!msg.performanceValuesData,
                      performanceValuesDataLength: msg.performanceValuesData?.length,
                      hasPerformanceValuesComment: !!msg.performanceValuesComment,
                      fullMessage: msg
                    });
                  }
                });
                return null;
              })()}
              {messages.map((message, index) => {
                // Debug: Performans değerleri için log
                if (message.performanceValuesData || message.dataType === 'performanceValues') {
                  console.log('[FRONTEND RENDER] Message with performance values:', {
                    messageId: message.id,
                    dataType: message.dataType,
                    hasPerformanceValuesData: !!message.performanceValuesData,
                    performanceValuesDataLength: message.performanceValuesData?.length,
                    hasPerformanceValuesComment: !!message.performanceValuesComment,
                    performanceValuesComment: message.performanceValuesComment?.substring(0, 100),
                    fullMessage: message
                  });
                }
                
                // Render koşulu kontrolü
                const shouldRenderData = (message.parsedData && message.dataType) || 
                                       (message.performanceAnalysis && message.dataType === 'performanceAnalysis') || 
                                       (message.performanceValuesData && message.performanceValuesData.length > 0) || 
                                       message.dataType === 'performanceValues';
                
                if (message.performanceValuesData || message.dataType === 'performanceValues') {
                  console.log('[FRONTEND RENDER] Render check:', {
                    messageId: message.id,
                    shouldRenderData,
                    hasParsedData: !!message.parsedData,
                    dataType: message.dataType,
                    hasPerformanceValuesData: !!message.performanceValuesData,
                    performanceValuesDataLength: message.performanceValuesData?.length
                  });
                }
                
                return (
                <div key={message.id} className="w-full animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  {/* Mesaj balonu */}
                  <div className={`flex w-full ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <MessageBubble 
                      message={message} 
                      favoriteMessageIds={favoriteMessageIds}
                      onToggleFavorite={handleToggleFavorite}
                      onFavoriteAdded={onFavoriteAdded}
                      messages={messages}
                      onRetry={handleRetryMessage}
                      onOpenApiView={handleOpenApiView}
                    />
                  </div>
                
                {/* Bu mesajın parsedData'sını hemen altında göster - Tam genişlikte */}
                {shouldRenderData && (
                  <div className="w-full mt-4">
                    {/* Debug: Render edildiğini göster */}
                    {message.performanceValuesData && console.log('[FRONTEND RENDER] Rendering performance values container for message:', message.id)}
                    {message.dataType === 'alerts' && message.parsedData.alerts && (
                      <div className="w-full mt-6 border-t border-gray-200 dark:border-gray-700 pt-6 px-4">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Alert Görselleştirme</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Toplam {message.parsedData.totalCount} alert bulundu
                          </p>
                          
                          {/* Özet istatistikler */}
                          {message.parsedData.summary && (
                            <div className="mt-2 grid grid-cols-4 gap-2">
                              <div className="bg-red-50 border border-red-200 rounded-md p-2">
                                <div className="text-xs text-red-600 font-semibold">Kritik</div>
                                <div className="text-lg font-bold text-red-700">
                                  {message.parsedData.summary.byLevel?.CRITICAL || 0}
                                </div>
                              </div>
                              <div className="bg-orange-50 border border-orange-200 rounded-md p-2">
                                <div className="text-xs text-orange-600 font-semibold">Acil</div>
                                <div className="text-lg font-bold text-orange-700">
                                  {message.parsedData.summary.byLevel?.IMMEDIATE || 0}
                                </div>
                              </div>
                              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
                                <div className="text-xs text-yellow-600 font-semibold">Aktif</div>
                                <div className="text-lg font-bold text-yellow-700">
                                  {message.parsedData.summary.byStatus?.ACTIVE || 0}
                                </div>
                              </div>
                              <div className="bg-gray-50 border border-gray-200 rounded-md p-2">
                                <div className="text-xs text-gray-600 font-semibold">Toplam</div>
                                <div className="text-lg font-bold text-gray-700">
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
                      <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Metric Görselleştirme</h3>
                          {message.parsedData.statKey && (
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              StatKey: <span className="font-mono text-gray-800 dark:text-gray-200">{message.parsedData.statKey}</span>
                              {message.parsedData.resourceId && (
                                <span className="ml-2">Resource ID: <span className="font-mono text-gray-800 dark:text-gray-200">{message.parsedData.resourceId}</span></span>
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
                      <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Latest Stats Görselleştirme</h3>
                          <p className="text-sm text-gray-600">
                            {message.parsedData.totalCount} resource için {message.parsedData.totalStats} stat gösteriliyor
                          </p>
                        </div>

                        {/* Latest Stats Tablo */}
                        <LatestStatsTable data={message.parsedData} />
                      </div>
                    )}
                    
                    {message.dataType === 'statKeys' && message.parsedData.statKeys && (
                      <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">StatKeys Görselleştirme</h3>
                          <p className="text-sm text-gray-600">
                            {message.parsedData.totalCount} statKey bulundu
                          </p>
                        </div>

                        {/* StatKeys Tablo */}
                        <StatKeysTable data={message.parsedData} />
                      </div>
                    )}

                    {message.dataType === 'resourceDetail' && message.parsedData.resourceId && (
                      <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Resource Detayları</h3>
                          <p className="text-sm text-gray-600">
                            {message.parsedData.name || 'Resource'} bilgileri
                          </p>
                        </div>

                        {/* Resource Detail - Tüm Detaylar */}
                        <ResourceDetailView data={message.parsedData} />
                      </div>
                    )}

                    {message.dataType === 'symptoms' && message.parsedData.symptoms && (
                      <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Semptomlar</h3>
                          <p className="text-sm text-gray-600">
                            {message.parsedData.totalCount || 0} semptom bulundu
                          </p>
                        </div>

                        {/* Symptoms View */}
                        <SymptomsView data={message.parsedData} />
                      </div>
                    )}

                    {message.dataType === 'topn' && message.parsedData.vms && (
                      <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">TopN Stats - En Fazla/Az Kaynak Tüketen VM'ler</h3>
                          <p className="text-sm text-gray-600">
                            {message.parsedData.sortOrder === 'DESCENDING' ? 'En Fazla' : 'En Az'} {message.parsedData.totalCount} VM gösteriliyor
                            {message.parsedData.statKeys && message.parsedData.statKeys.length > 0 && (
                              <span className="ml-2">
                                (Metrikler: {message.parsedData.statKeys.join(', ')})
                              </span>
                            )}
                          </p>
                        </div>

                        {/* TopN Stats Tablo */}
                        <TopNStatsTable data={message.parsedData} />
                      </div>
                    )}

                    {(() => {
                      const shouldShow = message.dataType === 'performanceValues' || (message.performanceValuesData && message.performanceValuesData.length > 0);
                      if (message.performanceValuesData || message.dataType === 'performanceValues') {
                        console.log('[FRONTEND RENDER] Performance values table render check:', {
                          messageId: message.id,
                          shouldShow,
                          dataType: message.dataType,
                          hasPerformanceValuesData: !!message.performanceValuesData,
                          performanceValuesDataLength: message.performanceValuesData?.length,
                          performanceValuesData: message.performanceValuesData
                        });
                      }
                      return shouldShow;
                    })() && (
                      <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Performans Değerleri</h3>
                          <p className="text-sm text-gray-600">
                            {message.performanceValuesData?.length || 0} performans metriği gösteriliyor
                          </p>
                        </div>

                        {/* Performans Değerleri Tablosu */}
                        {message.performanceValuesData && message.performanceValuesData.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Başlık</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">StatKey</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Değer</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {message.performanceValuesData.map((stat, index) => {
                                  // Title'dan birimi çıkar (parantez içindeki kısım)
                                  const unitMatch = stat.title.match(/\(([^)]+)\)/);
                                  const unit = unitMatch ? unitMatch[1] : '';
                                  
                                  return (
                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium">{stat.title}</td>
                                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 font-mono">{stat.statKey}</td>
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                        {stat.value !== null && stat.value !== undefined 
                                          ? `${stat.value.toFixed(2)}${unit ? ` (${unit})` : ''}` 
                                          : 'N/A'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* ChatGPT Yorumu */}
                        {message.performanceValuesComment && (
                          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                            <h4 className="text-sm font-semibold text-blue-900 mb-2">Analiz Yorumu</h4>
                            <p className="text-sm text-blue-800 whitespace-pre-wrap">{message.performanceValuesComment}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {message.dataType === 'resources' && message.parsedData.resources && (
                      <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
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
                      <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
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

                    {message.dataType === 'performanceAnalysis' && message.performanceAnalysis && (
                      <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Performans Analizi</h3>
                          <p className="text-sm text-gray-600">
                            {message.performanceAnalysis.vmName || 'VM'} için detaylı performans analizi
                          </p>
                        </div>

                        {/* Performance Analysis View */}
                        <PerformanceAnalysisView data={message.performanceAnalysis} />
                      </div>
                    )}
                  </div>
                )}
                </div>
                );
              })}

            {/* Yükleniyor durumu - ChatGPT typing indicator benzeri */}
            {isLoading && (
              <div className="flex items-center text-gray-500 dark:text-white gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 dark:border-white"></div>
                <span className="text-xs">İsteğiniz işleniyor...</span>
              </div>
            )}

              {/* Scroll'u en alta sabitlemek için referans */}
              <div ref={messagesEndRef} />
              <div className="h-32 w-full"></div>
            </>
          )}
        </div>
      </div>

      {/* Alt sabit input alanı */}
      <MessageInput
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        handleSendMessage={handleSendMessage}
        handleKeyPress={handleKeyPress}
        isLoading={isLoading}
        inputRef={inputRef}
      />
          </div>
          
          {/* Resizable divider */}
          <div
            className="w-1 bg-gray-300 hover:bg-primary cursor-col-resize transition-colors flex-shrink-0"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
          />
          
          {/* Sağ pane - API görünümü */}
          <div className="flex flex-col h-full min-h-0 bg-white border-l border-gray-200" style={{ width: `${100 - splitPaneWidth}%` }}>
            {/* API görünümü header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-bold text-text-light">API Görünümü</h3>
              <button
                onClick={() => setShowApiView(false)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Kapat"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            {/* API Request parametreleri */}
            <div className="border-t border-gray-200 p-4 bg-white overflow-y-auto">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-text-light mb-1">Endpoint</label>
                  <input
                    type="text"
                    value={apiRequest.endpoint}
                    onChange={(e) => setApiRequest(prev => ({ ...prev, endpoint: e.target.value }))}
                    onBlur={handleEndpointBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                    placeholder="/api/resources"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-text-light mb-1">Method</label>
                    <select
                      value={apiRequest.method}
                      onChange={(e) => setApiRequest(prev => ({ ...prev, method: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleCopyRequest}
                      className="p-2 text-gray-500 hover:text-primary rounded-md hover:bg-gray-100 transition-colors mb-1"
                      title="Request'i Kopyala"
                    >
                      <span className="material-symbols-outlined text-[18px]">content_copy</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-1">Headers (JSON)</label>
                  <textarea
                    value={apiRequest.headers}
                    onChange={(e) => setApiRequest(prev => ({ ...prev, headers: e.target.value }))}
                    onBlur={handleHeadersBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono resize-none"
                    rows={3}
                    placeholder='{"Content-Type": "application/json", "Authorization": "Bearer <token>"}'
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-1">Params (JSON - Query Parameters)</label>
                  <textarea
                    value={apiRequest.params}
                    onChange={(e) => setApiRequest(prev => ({ ...prev, params: e.target.value }))}
                    onBlur={handleParamsBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono resize-none"
                    rows={3}
                    placeholder='{"resourceKind": "VirtualMachine"}'
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-1">Body (JSON - POST/PUT için)</label>
                  <textarea
                    value={apiRequest.body}
                    onChange={(e) => setApiRequest(prev => ({ ...prev, body: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono resize-none"
                    rows={3}
                    placeholder='{"key": "value"}'
                  />
                </div>
                <button
                  onClick={handleExecuteApi}
                  disabled={isExecutingApi || !apiRequest.endpoint.trim()}
                  className="w-full px-4 py-2 bg-primary hover:bg-red-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isExecutingApi ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Çalıştırılıyor...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                      <span>Çalıştır</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* API Response (en alta taşındı) */}
            {apiExecutionResponse && (
              <div className="flex-1 min-h-0 flex flex-col border-t border-gray-200 bg-white">
                <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
                  <span className="text-sm font-medium text-text-light">API Response</span>
                  <button
                    onClick={handleCopyExecutionResponse}
                    className="p-1.5 text-gray-500 hover:text-primary rounded-md hover:bg-gray-100 transition-colors"
                    title="Response'u Kopyala"
                  >
                    <span className="material-symbols-outlined text-[18px]">content_copy</span>
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-auto p-4 bg-gray-50">
                  <textarea
                    value={apiExecutionResponse}
                    readOnly
                    className="w-full h-full font-mono text-xs bg-white border border-gray-300 rounded-md p-3 resize-none"
                    placeholder="API response burada görünecek..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Normal görünüm (split pane kapalı)
        <>
          {/* Mesaj listesi alanı - geri kalan tüm yüksekliği kaplar */}
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-y-auto scroll-smooth w-full bg-gray-50 dark:bg-gray-900"
          >
            <div className="flex flex-col w-full px-4 py-8 md:py-12 gap-8">
              {messages.length === 0 ? (
                <EmptyStateMessage />
              ) : (
                // Mesajlar listelendiği alan
                <>
                  {messages.map((message, index) => (
                    <div key={message.id} className="w-full animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                      {/* Mesaj balonu */}
                      <div className={`flex w-full ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <MessageBubble 
                          message={message} 
                          favoriteMessageIds={favoriteMessageIds}
                          onToggleFavorite={handleToggleFavorite}
                          onFavoriteAdded={onFavoriteAdded}
                          messages={messages}
                          onRetry={handleRetryMessage}
                          onOpenApiView={handleOpenApiView}
                        />
                      </div>
                    
                      {/* Bu mesajın parsedData'sını hemen altında göster - Tam genişlikte */}
                      {((message.parsedData && message.dataType) || (message.performanceAnalysis && message.dataType === 'performanceAnalysis') || (message.performanceValuesData && message.performanceValuesData.length > 0) || message.dataType === 'performanceValues') && (
                        <div className="w-full mt-4">
                          {message.dataType === 'alerts' && message.parsedData.alerts && (
                            <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
                              <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Alert Görselleştirme</h3>
                                <p className="text-sm text-gray-600">
                                  Toplam {message.parsedData.totalCount} alert bulundu
                                </p>
                                
                                {/* Özet istatistikler */}
                                {message.parsedData.summary && (
                                  <div className="mt-2 grid grid-cols-4 gap-2">
                                    <div className="bg-red-50 border border-red-200 rounded-md p-2">
                                      <div className="text-xs text-red-600 font-semibold">Kritik</div>
                                      <div className="text-lg font-bold text-red-700">
                                        {message.parsedData.summary.byLevel?.CRITICAL || 0}
                                      </div>
                                    </div>
                                    <div className="bg-orange-50 border border-orange-200 rounded-md p-2">
                                      <div className="text-xs text-orange-600 font-semibold">Acil</div>
                                      <div className="text-lg font-bold text-orange-700">
                                        {message.parsedData.summary.byLevel?.IMMEDIATE || 0}
                                      </div>
                                    </div>
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
                                      <div className="text-xs text-yellow-600 font-semibold">Aktif</div>
                                      <div className="text-lg font-bold text-yellow-700">
                                        {message.parsedData.summary.byStatus?.ACTIVE || 0}
                                      </div>
                                    </div>
                                    <div className="bg-gray-50 border border-gray-200 rounded-md p-2">
                                      <div className="text-xs text-gray-600 font-semibold">Toplam</div>
                                      <div className="text-lg font-bold text-gray-700">
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
                            <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
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
                            <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
                              <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Latest Stats Görselleştirme</h3>
                                <p className="text-sm text-gray-600">
                                  {message.parsedData.totalCount} resource için {message.parsedData.totalStats} stat gösteriliyor
                                </p>
                              </div>

                              {/* Latest Stats Tablo */}
                              <LatestStatsTable data={message.parsedData} />
                            </div>
                          )}
                          
                          {message.dataType === 'statKeys' && message.parsedData.statKeys && (
                            <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
                              <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">StatKeys Görselleştirme</h3>
                                <p className="text-sm text-gray-600">
                                  {message.parsedData.totalCount} statKey bulundu
                                </p>
                              </div>

                              {/* StatKeys Tablo */}
                              <StatKeysTable data={message.parsedData} />
                            </div>
                          )}

                          {message.dataType === 'resourceDetail' && message.parsedData.resourceId && (
                            <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
                              <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Resource Detayları</h3>
                                <p className="text-sm text-gray-600">
                                  {message.parsedData.name || 'Resource'} bilgileri
                                </p>
                              </div>

                              {/* Resource Detail - Tüm Detaylar */}
                              <ResourceDetailView data={message.parsedData} />
                            </div>
                          )}

                          {message.dataType === 'symptoms' && message.parsedData.symptoms && (
                            <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
                              <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Semptomlar</h3>
                                <p className="text-sm text-gray-600">
                                  {message.parsedData.totalCount || 0} semptom bulundu
                                </p>
                              </div>

                              {/* Symptoms View */}
                              <SymptomsView data={message.parsedData} />
                            </div>
                          )}

                          {message.dataType === 'topn' && message.parsedData.vms && (
                            <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
                              <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">TopN Stats - En Fazla/Az Kaynak Tüketen VM'ler</h3>
                                <p className="text-sm text-gray-600">
                                  {message.parsedData.sortOrder === 'DESCENDING' ? 'En Fazla' : 'En Az'} {message.parsedData.totalCount} VM gösteriliyor
                                  {message.parsedData.statKeys && message.parsedData.statKeys.length > 0 && (
                                    <span className="ml-2">
                                      (Metrikler: {message.parsedData.statKeys.join(', ')})
                                    </span>
                                  )}
                                </p>
                              </div>

                              {/* TopN Stats Tablo */}
                              <TopNStatsTable data={message.parsedData} />
                            </div>
                          )}

                          {(message.dataType === 'performanceValues' || (message.performanceValuesData && message.performanceValuesData.length > 0)) && (
                            <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
                              <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Performans Değerleri</h3>
                                <p className="text-sm text-gray-600">
                                  {message.performanceValuesData?.length || 0} performans metriği gösteriliyor
                                </p>
                              </div>

                              {/* Performans Değerleri Tablosu */}
                              {message.performanceValuesData && message.performanceValuesData.length > 0 && (
                                <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                                  <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Başlık</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">StatKey</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Değer</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {message.performanceValuesData.map((stat, index) => {
                                        // Title'dan birimi çıkar (parantez içindeki kısım)
                                        const unitMatch = stat.title.match(/\(([^)]+)\)/);
                                        const unit = unitMatch ? unitMatch[1] : '';
                                        
                                        return (
                                          <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">{stat.title}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 font-mono">{stat.statKey}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                              {stat.value !== null && stat.value !== undefined 
                                                ? `${stat.value.toFixed(2)}${unit ? ` (${unit})` : ''}` 
                                                : 'N/A'}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* ChatGPT Yorumu */}
                              {message.performanceValuesComment && (
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Analiz Yorumu</h4>
                                  <p className="text-sm text-blue-800 whitespace-pre-wrap">{message.performanceValuesComment}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {message.dataType === 'resources' && message.parsedData.resources && (
                            <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
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
                            <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
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

                          {message.dataType === 'performanceAnalysis' && message.performanceAnalysis && (
                            <div className="w-full mt-6 border-t border-gray-200 pt-6 px-4">
                              <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Performans Analizi</h3>
                                <p className="text-sm text-gray-600">
                                  {message.performanceAnalysis.vmName || 'VM'} için detaylı performans analizi
                                </p>
                              </div>

                              {/* Performance Analysis View */}
                              <PerformanceAnalysisView data={message.performanceAnalysis} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Yükleniyor durumu - ChatGPT typing indicator benzeri */}
                  {isLoading && (
                    <div className="flex items-center text-gray-500 dark:text-white gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 dark:border-white"></div>
                      <span className="text-xs">İsteğiniz işleniyor...</span>
                    </div>
                  )}

                  {/* Scroll'u en alta sabitlemek için referans */}
                  <div ref={messagesEndRef} />
                  <div className="h-32 w-full"></div>
                </>
              )}
            </div>
          </div>

          {/* Alt sabit input alanı */}
          <MessageInput
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            handleSendMessage={handleSendMessage}
            handleKeyPress={handleKeyPress}
            isLoading={isLoading}
            inputRef={inputRef}
          />
        </>
      )}
    </div>
  );
}

// Mesaj input komponenti - Mesaj yazma alanı
function MessageInput({ inputMessage, setInputMessage, handleSendMessage, handleKeyPress, isLoading, inputRef }) {
  return (
    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-background-light dark:from-gray-900 via-background-light dark:via-gray-900 to-transparent pt-10 pb-6 px-4">
      <div className="w-full flex flex-col gap-2 px-4">
        {/* Input alanı - tam oval kenarlı */}
        <div className="relative w-full rounded-xl bg-input-light dark:bg-gray-800 shadow-lg border border-border-light dark:border-gray-700 transition-all duration-200 py-2 px-6 outline-none focus-within:outline-none">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Talebinizi yazınız..."
            rows={1}
            className="w-full mt-1 bg-transparent text-text-light dark:text-gray-100 placeholder-text-secondary-light dark:placeholder-gray-400 border-0 focus:ring-0 focus:outline-none resize-none py-1 pl-2 pr-12 max-h-[200px] overflow-y-auto font-body text-base rounded-xl scrollbar-hide"
            style={{ minHeight: '32px' }}
            disabled={isLoading}
          />
          <div className="absolute inset-y-0 right-3 flex items-center gap-1">
            <button
              aria-label="Send message"
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="p-2 bg-primary text-white rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
            </button>
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-secondary-light dark:text-gray-400 font-light mt-6">
            Metric AI can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
    </div>
  );
}

// Boş durum ekranı komponenti - Mesaj yokken gösterilir
function EmptyStateMessage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 min-h-[60vh]">
      <div className="w-full max-w-3xl mx-auto px-4">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <img src={monitoringLogo} alt="Monitoring Logo" className="h-32 w-auto" />
        </div>
        {/* Ana karşılama metni */}
        <p className="text-2xl sm:text-2xl font-bold mb-3 text-text-light mb-10">
          VMware Altyapınızın Operasyonel Durumunu Görüntüleyin
        </p>
        {/* Açıklama metni */}
        <p className="text-sm sm:text-base text-text-secondary-light mb-14">
          Performans, kapasite ve risk analizleri için soru sorun;
          darboğazları, anormallikleri ve kritik noktaları sizin için özetleyeyim.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 text-left text-xs sm:text-sm max-w-3xl mx-auto">
          {/* Örnek prompt kartları - sadece görsel amaçlı */}
          <div className="rounded-xl border border-border-light bg-red-500 px-4 py-2.5 shadow-md">
            <div className="font-light text-text-light whitespace-nowrap text-white">
              Son 24 saatte CPU kullanımı yüksek VM&apos;leri listele
            </div>
          </div>
          <div className="rounded-xl border border-border-light bg-red-500 px-4 py-2.5 shadow-md">
            <div className="font-light text-text-light whitespace-nowrap text-white">
              Disk alanı %90&apos;ı geçen sunucuları göster
            </div>
          </div>
          <div className="rounded-xl border border-border-light bg-red-500 px-4 py-2.5 shadow-md">
            <div className="font-light text-text-light whitespace-nowrap text-white">
              &quot;x&quot; ile başlayan VM&apos;lerin CPU trendlerini getir
            </div>
          </div>
          <div className="rounded-xl border border-border-light bg-red-500 px-4 py-2.5 shadow-md">
            <div className="font-light text-text-light whitespace-nowrap text-white">
              Son 1 haftanın kritik alarmlarını özetle
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mesaj balonu komponenti - Her mesajı gösterir
function MessageBubble({ message, favoriteMessageIds, onToggleFavorite, onFavoriteAdded, messages, onRetry, onOpenApiView }) {
  const isUser = message.type === 'user';
  const isError = message.type === 'error';
  const [copySuccess, setCopySuccess] = useState(false);

  // Copy fonksiyonu - mesaj içeriğini panoya kopyalar
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopySuccess(true);
      // 2 saniye sonra geri bildirimi kaldır
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Kopyalama hatası:', err);
      // Fallback: eski yöntem
      try {
        const textArea = document.createElement('textarea');
        textArea.value = message.content;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback kopyalama hatası:', fallbackErr);
      }
    }
  };

  // Retry fonksiyonu - bir önceki kullanıcı mesajını bulup tekrar gönderir
  const handleRetry = () => {
    if (!messages || !onRetry) return;
    
    // Bu mesajın index'ini bul
    const currentIndex = messages.findIndex(msg => msg.id === message.id);
    if (currentIndex === -1) return;
    
    // Bu mesajdan önceki kullanıcı mesajını bul
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (messages[i].type === 'user') {
        // Kullanıcı mesajını tekrar gönder
        // onRetry'ye kullanıcı mesajını geçir
        const userMessage = messages[i].content;
        // onRetry bir callback fonksiyonu olmalı, mesajı input'a yazıp göndermeli
        if (onRetry && typeof onRetry === 'function') {
          onRetry(userMessage);
        }
        break;
      }
    }
  };

  if (isUser) {
    // Kullanıcı mesajları - sağda, primary renkli
    const isFavorite = favoriteMessageIds ? favoriteMessageIds.has(message.id) : false;
    return (
      <div className="flex flex-col items-end w-full gap-1 px-4">
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-xs font-medium text-text-secondary-light dark:text-gray-400">You</span>
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(message.id, isFavorite)}
              className={`p-1 rounded transition-colors ${
                isFavorite 
                  ? 'text-yellow-500 hover:text-yellow-600' 
                  : 'text-gray-400 hover:text-yellow-500'
              }`}
              title={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isFavorite ? 'star' : 'star_border'}
              </span>
            </button>
          )}
        </div>
        <div className="rounded-lg rounded-tr-sm bg-primary px-5 py-3.5 text-white shadow-md max-w-[90%]">
          <p className="text-base font-normal leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <div className="flex items-center gap-2 px-1">
          {message.timestamp && (
            <div className="text-xs text-text-secondary-light">
              {message.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          <button
            onClick={handleCopy}
            className={`p-1 rounded transition-colors ${
              copySuccess 
                ? 'text-green-500' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title={copySuccess ? 'Kopyalandı!' : 'Soruyu kopyala'}
          >
            {copySuccess ? (
              <span className="material-symbols-outlined text-[16px]">check</span>
            ) : (
              <GoCopy className="w-[16px] h-[16px]" />
            )}
          </button>
        </div>
      </div>
    );
  }

  // Sistem mesajları - solda, avatar ile
  return (
    <div className="flex gap-4 w-full px-4">
      <div className="flex-shrink-0 mt-1">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center shadow-lg">
          <BsStars className="text-white text-[20px]" />
        </div>
      </div>
      <div className="flex flex-col gap-2 min-w-0 flex-1 max-w-[90%]">
        <div className="flex items-baseline gap-2 px-1">
          <span className="text-sm font-bold text-text-light dark:text-gray-100">Metric AI</span>
          {message.timestamp && (
            <span className="text-xs text-text-secondary-light dark:text-gray-400">
              {message.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="text-text-light dark:text-gray-100 text-base leading-relaxed tracking-wide space-y-4">
          {/* Performans değerleri varsa mesaj içeriğini gösterme, sadece tablo gösterilecek */}
          {!(message.performanceValuesData && message.performanceValuesData.length > 0) && (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>
        {!isError && (
          <div className="flex items-center gap-2 mt-1">
            <button 
              onClick={handleCopy}
              className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors ${
                copySuccess 
                  ? 'text-green-500' 
                  : 'text-gray-500 hover:text-primary'
              }`}
              title={copySuccess ? 'Kopyalandı!' : 'Kopyala'}
            >
              {copySuccess ? (
                <span className="material-symbols-outlined text-[18px]">check</span>
              ) : (
                <GoCopy className="w-[18px] h-[18px]" />
              )}
            </button>
            <button 
              onClick={handleRetry}
              className="p-1.5 text-gray-500 hover:text-primary rounded-md hover:bg-gray-100 transition-colors" 
              title="Tekrar Dene"
            >
              <GoSync className="w-[18px] h-[18px]" />
            </button>
            {onOpenApiView && (
              <button 
                onClick={() => onOpenApiView(message)}
                className="p-1.5 text-gray-500 hover:text-primary rounded-md hover:bg-gray-100 transition-colors" 
                title="API Görünümü"
              >
                <GoFileCode className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>
        )}
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
      case 'GREEN': return 'bg-green-600 border-green-700';
      case 'YELLOW': return 'bg-yellow-400 border-yellow-500';
      case 'RED': return 'bg-red-600 border-red-700';
      case 'GRAY': return 'bg-gray-500 border-gray-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  // Health text rengini belirle
  const getHealthTextColor = (health) => {
    switch (health) {
      case 'GREEN': return 'text-white';
      case 'YELLOW': return 'text-black';
      case 'RED': return 'text-white';
      case 'GRAY': return 'text-white';
      default: return 'text-white';
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
    <div className="space-y-3">
      {/* Health ve Temel Bilgiler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Health Card */}
        <div className={`rounded-md shadow-sm border-2 p-4 transition-all hover:shadow-md ${getHealthColor(data.health)} flex items-center justify-between`}>
          <div className="flex-1">
            <div className={`text-sm font-semibold mb-2 ${getHealthTextColor(data.health)}`}>Sağlık Durumu</div>
            <div className={`text-2xl font-bold ${getHealthTextColor(data.health)}`}>{data.health || 'N/A'}</div>
          </div>
          {data.healthValue !== null && (() => {
            const centerX = 100;
            const centerY = 100;
            const radius = 80;
            const startAngle = -180; // Sol alt (0%)
            const endAngle = 0; // Sağ alt (100%)
            const totalAngle = endAngle - startAngle; // 180 derece
            
            // Açıyı radyana çevir
            const toRadians = (deg) => (deg * Math.PI) / 180;
            
            // Belirli bir açıdaki noktayı hesapla
            const getPoint = (angle) => {
              const rad = toRadians(angle);
              return {
                x: centerX + radius * Math.cos(rad),
                y: centerY + radius * Math.sin(rad)
              };
            };
            
            // Skor değerine göre açı hesapla
            const scoreAngle = startAngle + (totalAngle * data.healthValue / 100);
            const scorePoint = getPoint(scoreAngle);
            
            // Renk tonlarını belirle (sağlık durumuna göre)
            const getColorTones = () => {
              const isWhite = data.health === 'GREEN' || data.health === 'RED';
              if (isWhite) {
                return ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.8)'];
              } else {
                return ['rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.8)'];
              }
            };
            
            const tones = getColorTones();
            
            return (
              <div className="flex-shrink-0 ml-4">
                {/* Takometre Kadranı (Gauge) */}
                <div className="relative w-24 h-16">
                  <svg className="w-full h-full" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet">
                    {/* %25'lik dilimler - farklı tonlarda */}
                    {[0, 25, 50, 75, 100].map((percent, index) => {
                      if (index === 0) return null;
                      const segmentStart = startAngle + (totalAngle * (percent - 25) / 100);
                      const segmentEnd = startAngle + (totalAngle * percent / 100);
                      const segmentPath = `M ${getPoint(segmentStart).x} ${getPoint(segmentStart).y} A ${radius} ${radius} 0 0 1 ${getPoint(segmentEnd).x} ${getPoint(segmentEnd).y}`;
                      
                      return (
                        <path
                          key={index}
                          d={segmentPath}
                          fill="none"
                          stroke={tones[index - 1]}
                          strokeWidth="12"
                          strokeLinecap="round"
                        />
                      );
                    })}
                    
                    {/* Skor değerine göre dolu yay */}
                    {data.healthValue > 0 && (
                      <path
                        d={`M ${getPoint(startAngle).x} ${getPoint(startAngle).y} A ${radius} ${radius} 0 ${data.healthValue > 50 ? 1 : 0} 1 ${scorePoint.x} ${scorePoint.y}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="12"
                        strokeLinecap="round"
                        className={getHealthTextColor(data.health)}
                      />
                    )}
                    
                    {/* Kadran çizgileri (işaretler) */}
                    {[0, 25, 50, 75, 100].map((percent, index) => {
                      const angle = startAngle + (totalAngle * percent / 100);
                      const point = getPoint(angle);
                      const innerRadius = radius - 15;
                      const outerRadius = radius + 5;
                      const innerPoint = {
                        x: centerX + innerRadius * Math.cos(toRadians(angle)),
                        y: centerY + innerRadius * Math.sin(toRadians(angle))
                      };
                      const outerPoint = {
                        x: centerX + outerRadius * Math.cos(toRadians(angle)),
                        y: centerY + outerRadius * Math.sin(toRadians(angle))
                      };
                      
                      return (
                        <line
                          key={index}
                          x1={innerPoint.x}
                          y1={innerPoint.y}
                          x2={outerPoint.x}
                          y2={outerPoint.y}
                          stroke="currentColor"
                          strokeWidth="2"
                          className={getHealthTextColor(data.health)}
                          opacity="0.6"
                        />
                      );
                    })}
                    
                    {/* Skor değeri kadranın altında */}
                    <text
                      x="100"
                      y="110"
                      textAnchor="middle"
                      className={`${getHealthTextColor(data.health)} text-2xl font-bold`}
                      fill="currentColor"
                      fontSize="24"
                      fontWeight="bold"
                    >
                      {data.healthValue.toFixed(0)}
                    </text>
                  </svg>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Resource Type */}
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-2.5 transition-all hover:shadow-md">
          <div className="text-xs text-gray-600 mb-1">Resource Tipi</div>
          <div className="text-sm font-semibold text-gray-900">{data.resourceKindKey || 'N/A'}</div>
          <div className="text-xs text-gray-500 mt-0.5">Adapter: {data.adapterKindKey || 'N/A'}</div>
        </div>

        {/* Creation Time */}
        {data.creationTime && (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-2.5 transition-all hover:shadow-md">
            <div className="text-xs text-gray-600 mb-1">Oluşturulma Tarihi</div>
            <div className="text-xs font-semibold text-gray-900">
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
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-2.5">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Rozetler (Badges)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {data.badges.map((badge, index) => (
              <div
                key={index}
                className={`rounded-md border-2 p-2 text-center transition-all hover:scale-105 hover:shadow-md cursor-default ${getBadgeColor(badge.color)}`}
              >
                <div className="text-[10px] font-semibold mb-0.5 leading-tight">{getBadgeTypeLabel(badge.type)}</div>
                <div className="text-base font-bold">
                  {badge.score === -1 ? 'N/A' : badge.score.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resource Identifiers */}
      {data.identifiers && data.identifiers.length > 0 && (
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-2.5">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Resource Tanımlayıcıları</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">İsim</th>
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Değer</th>
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Veri Tipi</th>
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Benzersizlik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.identifiers.map((ident, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-2 py-1.5 text-xs text-gray-900 font-medium">{ident.name}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-600 font-mono break-all">{ident.value || '-'}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-600">{ident.dataType}</td>
                    <td className="px-2 py-1.5 text-xs">
                      {ident.isPartOfUniqueness ? (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px]">Evet</span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-[10px]">Hayır</span>
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
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-2.5">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Durum Bilgileri</h4>
          <div className="space-y-1.5">
            {data.statusStates.map((state, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex-1">
                  <div className="text-[10px] font-semibold text-gray-600 mb-0.5">Adapter Instance ID</div>
                  <div className="text-[10px] text-gray-500 font-mono mb-1.5 break-all">{state.adapterInstanceId}</div>
                  <div className="flex gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${getStatusColor(state.resourceStatus)}`}>
                      {state.resourceStatus}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${getStatusColor(state.resourceState)}`}>
                      {state.resourceState}
                    </span>
                  </div>
                  {state.statusMessage && (
                    <div className="text-[10px] text-gray-500 mt-1.5">{state.statusMessage}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Links */}
      {data.links && data.links.length > 0 && (
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-2.5">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">İlgili Linkler</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {data.links
              .filter(link => 
                link.name !== 'linkToSelf' && 
                link.name !== 'credentialsOfResource' && 
                link.name !== 'latestPropertiesOfResource'
              )
              .map((link, index) => {
                // Link tipine göre icon belirle
                const getLinkIcon = (linkName) => {
                  switch (linkName) {
                    case 'relationsOfResource':
                      return (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      );
                    case 'propertiesOfResource':
                      return (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      );
                    case 'alertsOfResource':
                      return (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      );
                    case 'symptomsOfResource':
                      return (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343 5.657l-.707-.707m2.828-9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      );
                    case 'statKeysOfResource':
                      return (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      );
                    case 'latestStatsOfResource':
                      return (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      );
                    default:
                      return null;
                  }
                };

                return (
                  <button
                    key={index}
                    onClick={() => handleLinkClick(link)}
                    className="p-2 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-all hover:shadow-sm text-left cursor-pointer flex items-center gap-2"
                  >
                    <div className="text-gray-600 flex-shrink-0">
                      {getLinkIcon(link.name)}
                    </div>
                    <div className="text-xs font-semibold text-gray-900">{getLinkTitle(link.name)}</div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Resource Link Modal - Portal ile sayfanın genelinde açılıyor */}
      {isModalOpen && createPortal(
        <ResourceLinkModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          link={selectedLink}
          resourceId={data.resourceId}
        />,
        document.body
      )}
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
      <div className="text-center py-12 bg-white border border-gray-200 rounded-md">
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
    <div className="space-y-2">
      {/* Özet Bilgiler ve Filtreler - Tek Satırda Kompakt */}
      <div className="bg-white rounded-md shadow-sm border border-gray-200 p-2">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Özet Bilgiler */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Toplam:</span>
              <span className="text-sm font-bold text-gray-900">{data.totalCount || 0}</span>
            </div>
            <div className="h-4 w-px bg-gray-300"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Gösterilen:</span>
              <span className="text-sm font-semibold text-blue-600">{filteredAndSortedData.length}</span>
            </div>
            {resourceKinds.length > 0 && (
              <>
                <div className="h-4 w-px bg-gray-300"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Tip:</span>
                  <span className="text-sm font-semibold text-gray-900">{resourceKinds.length}</span>
                </div>
              </>
            )}
          </div>

          {/* Ayırıcı */}
          <div className="h-6 w-px bg-gray-300"></div>

          {/* Filtreler */}
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {/* Resource Kind Filtresi */}
            {resourceKinds.length > 0 && (
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500 whitespace-nowrap">Tip:</label>
                <select
                  value={selectedResourceKind}
                  onChange={(e) => {
                    setSelectedResourceKind(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[120px]"
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
            <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
              <label className="text-xs text-gray-500 whitespace-nowrap">Ara:</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Ad, ID veya tip..."
                className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Sayfa Başına Kayıt Sayısı */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-500 whitespace-nowrap">Sayfa:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
            </div>

            {/* Kayıt Bilgisi */}
            <div className="text-xs text-gray-500 whitespace-nowrap">
              {startIndex + 1}-{Math.min(endIndex, filteredAndSortedData.length)} / {filteredAndSortedData.length}
            </div>
          </div>
        </div>
      </div>

      {/* Resources Tablosu */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 w-12"></th>
                <th
                  className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                  style={{ width: 'calc((100% - 3rem) / 4)' }}
                >
                  Resource Adı {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('resourceKindKey')}
                  style={{ width: 'calc((100% - 3rem) / 4)' }}
                >
                  Resource Tipi {sortConfig.key === 'resourceKindKey' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('health')}
                  style={{ width: 'calc((100% - 3rem) / 4)' }}
                >
                  Sağlık Durumu {sortConfig.key === 'health' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('creationTime')}
                  style={{ width: 'calc((100% - 3rem) / 4)' }}
                >
                  Oluşturulma {sortConfig.key === 'creationTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.map((resource, index) => (
                <tr key={resource.resourceId || index} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5 text-xs relative">
                    {resource.resourceId && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === resource.resourceId ? null : resource.resourceId);
                          }}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="İşlemler"
                        >
                          <VscVmRunning className="w-5 h-5" />
                        </button>
                        
                        {openMenuId === resource.resourceId && (
                          <>
                            {/* Overlay - menü dışına tıklanınca kapat */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            {/* Dropdown Menü */}
                            <div className="absolute left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-20">
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
                  <td className="px-2 py-1.5 text-xs overflow-hidden">
                    <div className="text-gray-900 font-medium truncate">{resource.name || 'N/A'}</div>
                    {resource.resourceId && (
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">{resource.resourceId}</div>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-gray-900 truncate">{resource.resourceKindKey || 'N/A'}</td>
                  <td className="px-2 py-1.5 text-xs">
                    {resource.health ? (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold border ${getHealthColor(resource.health)}`}>
                        {resource.health}
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-gray-600 truncate">
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

      {/* Resource Query Modal - Portal ile sayfanın genelinde açılıyor */}
            {isQueryModalOpen && selectedResource && createPortal(
              <ResourceQueryModal
                isOpen={isQueryModalOpen}
                onClose={() => {
                  setIsQueryModalOpen(false);
                  setSelectedResource(null);
                }}
                resource={selectedResource}
                onQuerySubmit={onResourceQueryRequest}
              />,
              document.body
            )}

            {/* Resource Link Modal - Portal ile sayfanın genelinde açılıyor */}
            {isLinkModalOpen && selectedLink && createPortal(
              <ResourceLinkModal
                isOpen={isLinkModalOpen}
                onClose={() => {
                  setIsLinkModalOpen(false);
                  setSelectedLink(null);
                }}
                link={selectedLink}
                resourceId={selectedLink.href?.match(/\/resources\/([^\/\?]+)/)?.[1] || null}
              />,
              document.body
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="bg-white rounded-md shadow-xl max-w-2xl w-full mx-4 p-6 relative z-[10000]"
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
        <div className="mb-4 p-4 bg-gray-50 rounded-md border border-gray-200">
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
            className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
            className="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!query.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="text-center py-12 bg-white border border-gray-200 rounded-md">
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
      <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
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
      <div className="bg-white rounded-md shadow-sm border border-gray-200 p-4 space-y-3">
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
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
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

// Symptoms görünümü komponenti - ResourceLinkModal'dan kopyalandı
function SymptomsView({ data }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Sıralama fonksiyonu
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sıralanmış veri
  const sortedData = useMemo(() => {
    let result = [...(data.symptoms || [])];
    
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
  }, [data.symptoms, sortConfig]);

  // Sayfalama hesaplamaları
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Sayfa değiştiğinde scroll'u yukarı kaydır
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Symptom kritiklik rengini belirle
  const getCriticalityColor = (criticality) => {
    switch (criticality) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300';
      case 'WARNING': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'INFORMATION': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Timestamp formatla
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!data || !data.symptoms || data.symptoms.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-gray-200 rounded-md">
        <div className="text-gray-400 mb-2">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-600 font-semibold">Symptom bulunamadı</p>
        <p className="text-sm text-gray-500 mt-1">Bu resource için symptom yok</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Özet Bilgiler */}
      <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div>
            <div className="text-xs text-gray-600">Toplam Symptom</div>
            <div className="text-lg font-bold text-gray-900">{data.totalCount || 0}</div>
          </div>
          {data.summary && (
            <>
              <div>
                <div className="text-xs text-gray-600">CRITICAL</div>
                <div className="text-base font-bold text-red-600">{data.summary.byCriticality?.CRITICAL || 0}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">WARNING</div>
                <div className="text-base font-bold text-yellow-600">{data.summary.byCriticality?.WARNING || 0}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">INFORMATION</div>
                <div className="text-base font-bold text-blue-600">{data.summary.byCriticality?.INFORMATION || 0}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">KPI</div>
                <div className="text-base font-bold text-gray-900">{data.summary.byKpi?.kpi || 0}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sayfa Başına Kayıt Sayısı */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">Sayfa başına:</label>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
          </select>
        </div>
        <div className="text-xs text-gray-600">
          {startIndex + 1}-{Math.min(endIndex, sortedData.length)} / {sortedData.length} kayıt
        </div>
      </div>

      {/* Symptom Listesi */}
      <div className="space-y-2">
        {paginatedData.map((symptom, index) => (
          <div key={symptom.id || index} className="bg-white border border-gray-200 rounded-md p-2 shadow-sm">
            {/* Symptom Header */}
            <div className="flex items-start justify-between mb-2 pb-2 border-b border-gray-200">
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900">{symptom.symptomDefinitionId || 'N/A'}</h4>
                {symptom.statKey && (
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">StatKey: {symptom.statKey}</p>
                )}
                {symptom.resourceId && (
                  <p className="text-[10px] text-gray-400 mt-0.5 font-mono">Resource ID: {symptom.resourceId}</p>
                )}
              </div>
              <div className="flex gap-1">
                {/* Symptom Criticality */}
                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold border ${getCriticalityColor(symptom.symptomCriticality)}`}>
                  {symptom.symptomCriticality || 'N/A'}
                </span>
                {/* KPI Badge */}
                {symptom.kpi && (
                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold border bg-purple-100 text-purple-800 border-purple-300">
                    KPI
                  </span>
                )}
              </div>
            </div>

            {/* Symptom Detayları */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2">
              <div>
                <div className="text-gray-600 text-[10px] mb-0.5">Başlangıç</div>
                <div className="text-gray-900">{formatTimestamp(symptom.startTimeUTC)}</div>
              </div>
              {symptom.cancelTimeUTC && symptom.cancelTimeUTC > 0 && (
                <div>
                  <div className="text-gray-600 text-[10px] mb-0.5">İptal</div>
                  <div className="text-gray-900">{formatTimestamp(symptom.cancelTimeUTC)}</div>
                </div>
              )}
              <div>
                <div className="text-gray-600 text-[10px] mb-0.5">Güncelleme</div>
                <div className="text-gray-900">{formatTimestamp(symptom.updateTimeUTC)}</div>
              </div>
              {symptom.id && (
                <div>
                  <div className="text-gray-600 text-[10px] mb-0.5">Symptom ID</div>
                  <div className="text-gray-900 font-mono text-[10px] break-all">{symptom.id}</div>
                </div>
              )}
            </div>

            {/* Message */}
            {symptom.message && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-[10px] text-gray-600 mb-0.5">Mesaj:</div>
                <div className="text-xs text-gray-900 bg-gray-50 p-1.5 rounded-md border border-gray-200 font-mono break-all">
                  {symptom.message.replace(/&gt;/g, '>').replace(/&lt;/g, '<')}
                </div>
              </div>
            )}

            {/* Fault Devices */}
            {symptom.faultDevices && symptom.faultDevices.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-[10px] text-gray-600 mb-0.5">Fault Devices:</div>
                <div className="text-xs text-gray-900">
                  {symptom.faultDevices.map((device, idx) => (
                    <span key={idx} className="inline-block px-1.5 py-0.5 bg-gray-100 rounded text-[10px] mr-1 mb-0.5">
                      {device}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sayfalama Kontrolleri */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-600">
            Sayfa {currentPage} / {totalPages}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              İlk
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Önceki
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

