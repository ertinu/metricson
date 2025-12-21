// Chat sayfası - Yeni tasarım ile ChatGPT benzeri arayüz
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatInterface from '../components/ChatInterface';
import SettingsPage from './SettingsPage';
import { useAuth } from '../contexts/AuthContext';
import { getChats, createChat, deleteChat, getFavorites, removeFromFavorites, searchChats, deleteAllChats, deleteBulkChats, deleteBulkFavorites, deleteAllFavorites, getChat } from '../services/api';
import metricAILogo from '../metricAI-logo.png';
import { FaRankingStar } from 'react-icons/fa6';
import { TiStarFullOutline } from 'react-icons/ti';
import { MdPlaylistRemove } from 'react-icons/md';

// Dialog component - Portal ile uyumlu
function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Evet', cancelText = 'İptal', type = 'warning' }) {
  if (!isOpen) return null;

  const confirmColor = type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-red-600';

  return (
    <div className="fixed inset-0 z-[10003] flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-100 mb-2">{title}</h3>
          <p className="text-xs text-gray-600 dark:text-gray-300 mb-6">{message}</p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-2 text-xs text-white rounded-md transition-colors ${confirmColor}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatPage() {
  const [chats, setChats] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [executeMessage, setExecuteMessage] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyChats, setHistoryChats] = useState([]);
  const [selectedChatIds, setSelectedChatIds] = useState(new Set());
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [favoritesSearchQuery, setFavoritesSearchQuery] = useState('');
  const [favoritesPageSize, setFavoritesPageSize] = useState(50);
  const [favoritesCurrentPage, setFavoritesCurrentPage] = useState(1);
  const [favoritesTotal, setFavoritesTotal] = useState(0);
  const [selectedFavoriteIds, setSelectedFavoriteIds] = useState(new Set());
  const [historyChatMessages, setHistoryChatMessages] = useState({}); // chatId -> messages
  const [expandedHistoryChatId, setExpandedHistoryChatId] = useState(null);
  const [isExecutingFavorite, setIsExecutingFavorite] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [initialSettingsTab, setInitialSettingsTab] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'warning' });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // localStorage'dan dark mode durumunu oku
    const saved = localStorage.getItem('darkMode');
    return saved ? saved === 'true' : false;
  });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Sohbetleri yükle - Sadece bir kez çalıştır (dependency array boş)
  // React StrictMode development'ta iki kez çalıştırır, bu normaldir
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await loadChats();
        // Sidebar için favorileri yükle (ilk 100 favori)
        await loadFavorites(100, 0, '');
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadChats = async () => {
    try {
      setLoadingChats(true);
      const response = await getChats();
      if (response.success) {
        setChats(response.chats);
      }
    } catch (error) {
      console.error('Load chats error:', error);
    } finally {
      setLoadingChats(false);
    }
  };

  const loadFavorites = async (limit = 1000, offset = 0, search = '') => {
    try {
      const response = await getFavorites(limit, offset, search);
      if (response.success) {
        setFavorites(response.favorites || []);
        setFavoritesTotal(response.total || 0);
      } else {
        console.error('Favoriler yüklenemedi:', response);
        setFavorites([]);
        setFavoritesTotal(0);
      }
    } catch (error) {
      console.error('Favoriler yüklenirken hata:', error);
      setFavorites([]);
      setFavoritesTotal(0);
    }
  };

  const handleNewChat = async () => {
    // Eğer mevcut bir chat varsa ve o chat'te hiç mesaj yoksa, yeni chat oluşturma
    if (currentChatId) {
      // Önce chats array'inden kontrol et (daha hızlı)
      const currentChat = chats.find(chat => chat.id === currentChatId);
      if (currentChat) {
        const messageCount = currentChat.messageCount || 0;
        // Eğer mesaj yoksa, yeni chat oluşturma, bunun yerine mevcut chat'e focus yap
        if (messageCount === 0) {
          // Mevcut chat'e focus yapmak için executeMessage'i boş string ile tetikle
          // Bu ChatInterface'te input'a focus yapılmasını sağlayacak
          setExecuteMessage('');
          setTimeout(() => setExecuteMessage(null), 300);
          return;
        }
      } else {
        // Chat array'de yoksa, API'den kontrol et
        try {
          const response = await getChat(currentChatId);
          if (response.success && response.chat) {
            const messageCount = response.chat.messages?.length || 0;
            // Eğer mesaj yoksa, yeni chat oluşturma, bunun yerine mevcut chat'e focus yap
            if (messageCount === 0) {
              setExecuteMessage('');
              setTimeout(() => setExecuteMessage(null), 300);
              return;
            }
          }
        } catch (error) {
          console.error('Chat kontrol edilirken hata:', error);
          // Hata durumunda devam et, yeni chat oluştur
        }
      }
    }
    
    // Mevcut chat yoksa veya mesaj varsa yeni chat oluştur
    try {
      const response = await createChat();
      if (response.success) {
        setCurrentChatId(response.chat.id);
        await loadChats();
      }
    } catch (error) {
      console.error('Yeni sohbet oluşturulurken hata:', error);
    }
  };

  const handleChatSelect = (chatId) => {
    setCurrentChatId(chatId);
  };

  // Dark mode toggle
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    // HTML element'e dark class ekle/çıkar
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Dark mode durumunu uygula
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleChatDelete = async (chatId, e) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: 'Sohbet Sil',
      message: 'Bu sohbeti silmek istediğinize emin misiniz?',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteChat(chatId);
          if (currentChatId === chatId) {
            setCurrentChatId(null);
          }
          await loadChats();
        } catch (error) {
          console.error('Delete chat error:', error);
        }
      }
    });
  };

  const handleDeleteAllChats = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Tüm Sohbetleri Sil',
      message: 'Tüm sohbetleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteAllChats();
          setCurrentChatId(null);
          await loadChats();
        } catch (error) {
          console.error('Delete all chats error:', error);
        }
      }
    });
  };

  const handleFavoriteClick = async (favorite) => {
    // Favori mesajını input alanına yaz
    setExecuteMessage(favorite.content);
    // executeMessage'ı temizle (bir sonraki tıklama için)
    setTimeout(() => setExecuteMessage(null), 500);
  };

  const handleRemoveFavorite = async (favoriteId, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('Bu favoriyi kaldırmak istediğinize emin misiniz?')) {
      try {
        await removeFromFavorites(favoriteId);
        // Sidebar için favorileri yeniden yükle
        await loadFavorites(100, 0, '');
        // Eğer popup açıksa, popup'taki favorileri de yenile
        if (showFavoritesModal) {
          await loadFavorites(favoritesPageSize, (favoritesCurrentPage - 1) * favoritesPageSize, favoritesSearchQuery);
        }
        setSelectedFavoriteIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(favoriteId);
          return newSet;
        });
      } catch (error) {
        console.error('Remove favorite error:', error);
      }
    }
  };

  // Favoriler popup'ını aç ve favorileri yükle
  const handleOpenFavoritesModal = async () => {
    setShowFavoritesModal(true);
    setFavoritesCurrentPage(1);
    setFavoritesSearchQuery('');
    setSelectedFavoriteIds(new Set());
    await loadFavorites(favoritesPageSize, 0, '');
  };

  // Favoriler arama
  const handleFavoritesSearch = async (query) => {
    setFavoritesSearchQuery(query);
    setFavoritesCurrentPage(1);
    setSelectedFavoriteIds(new Set());
    await loadFavorites(favoritesPageSize, 0, query);
  };

  // Favoriler sayfa değiştirme
  const handleFavoritesPageChange = async (newPage) => {
    setFavoritesCurrentPage(newPage);
    setSelectedFavoriteIds(new Set());
    const offset = (newPage - 1) * favoritesPageSize;
    await loadFavorites(favoritesPageSize, offset, favoritesSearchQuery);
  };

  // Favoriler sayfa boyutu değiştirme
  const handleFavoritesPageSizeChange = async (newSize) => {
    setFavoritesPageSize(newSize);
    setFavoritesCurrentPage(1);
    setSelectedFavoriteIds(new Set());
    await loadFavorites(newSize, 0, favoritesSearchQuery);
  };

  // Favoriler seçimi
  const toggleFavoriteSelection = (favoriteId) => {
    setSelectedFavoriteIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(favoriteId)) {
        newSet.delete(favoriteId);
      } else {
        newSet.add(favoriteId);
      }
      return newSet;
    });
  };

  // Tüm favorileri seç
  const selectAllFavorites = () => {
    const allIds = favorites.map(fav => fav.id);
    setSelectedFavoriteIds(new Set(allIds));
  };

  // Favori seçimini kaldır
  const deselectAllFavorites = () => {
    setSelectedFavoriteIds(new Set());
  };

  // Toplu favori silme
  const handleBulkDeleteFavorites = async () => {
    if (selectedFavoriteIds.size === 0) {
      alert('Lütfen silmek istediğiniz favorileri seçin.');
      return;
    }
    if (window.confirm(`${selectedFavoriteIds.size} favoriyi silmek istediğinize emin misiniz?`)) {
      try {
        await deleteBulkFavorites(Array.from(selectedFavoriteIds));
        setSelectedFavoriteIds(new Set());
        await loadFavorites(favoritesPageSize, (favoritesCurrentPage - 1) * favoritesPageSize, favoritesSearchQuery);
      } catch (error) {
        console.error('Bulk delete favorites error:', error);
      }
    }
  };

  // Tüm favorileri sil
  const handleDeleteAllFavorites = async () => {
    if (window.confirm('Tüm favorileri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      try {
        await deleteAllFavorites();
        setSelectedFavoriteIds(new Set());
        await loadFavorites(favoritesPageSize, 0, favoritesSearchQuery);
      } catch (error) {
        console.error('Delete all favorites error:', error);
      }
    }
  };

  // Geçmiş sohbet mesajlarını yükle
  const loadHistoryChatMessages = async (chatId) => {
    if (historyChatMessages[chatId]) {
      // Zaten yüklenmişse, genişlet/daralt
      if (expandedHistoryChatId === chatId) {
        setExpandedHistoryChatId(null);
      } else {
        setExpandedHistoryChatId(chatId);
      }
      return;
    }

    try {
      const response = await getChat(chatId);
      if (response.success && response.chat.messages) {
        setHistoryChatMessages(prev => ({
          ...prev,
          [chatId]: response.chat.messages
        }));
        setExpandedHistoryChatId(chatId);
      }
    } catch (error) {
      console.error('Load history chat messages error:', error);
    }
  };

  const handleHistorySearch = async (query) => {
    setHistorySearchQuery(query);
    if (query.trim().length === 0) {
      setHistoryChats([]);
      return;
    }
    try {
      const response = await searchChats(query);
      if (response.success) {
        setHistoryChats(response.chats);
      }
    } catch (error) {
      console.error('Search chats error:', error);
    }
  };

  const handleBulkDeleteChats = async () => {
    if (selectedChatIds.size === 0) {
      // Alert dialog için state eklenebilir, şimdilik alert kullanıyoruz
      alert('Lütfen silmek istediğiniz sohbetleri seçin.');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Sohbetleri Sil',
      message: `${selectedChatIds.size} sohbeti silmek istediğinize emin misiniz?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteBulkChats(Array.from(selectedChatIds));
          setSelectedChatIds(new Set());
          await loadChats();
          await handleHistorySearch(historySearchQuery); // Arama sonuçlarını güncelle
        } catch (error) {
          console.error('Bulk delete chats error:', error);
        }
      }
    });
  };

  const toggleChatSelection = (chatId) => {
    setSelectedChatIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chatId)) {
        newSet.delete(chatId);
      } else {
        newSet.add(chatId);
      }
      return newSet;
    });
  };

  const selectAllChats = () => {
    // Arama yapılmışsa historyChats'ı, yoksa chats'i kullan
    const chatsToSelect = historySearchQuery.trim().length > 0 ? historyChats : chats;
    const allIds = chatsToSelect.map(chat => chat.id);
    setSelectedChatIds(new Set(allIds));
  };

  const deselectAllChats = () => {
    setSelectedChatIds(new Set());
  };

  // Tarih gruplama fonksiyonu
  const groupChatsByDate = (chatsList) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const todayChats = [];
    const weekChats = [];
    const olderChats = [];

    chatsList.forEach(chat => {
      const chatDate = new Date(chat.updatedAt);
      if (chatDate >= today) {
        todayChats.push(chat);
      } else if (chatDate >= weekAgo) {
        weekChats.push(chat);
      } else {
        olderChats.push(chat);
      }
    });

    return { todayChats, weekChats, olderChats };
  };

  const { todayChats, weekChats, olderChats } = groupChatsByDate(chats);

  return (
    <div className="bg-background-light dark:bg-gray-900 font-display text-text-light dark:text-gray-100 antialiased overflow-hidden h-screen flex">
      {/* Sol Sidebar */}
      <aside className="hidden md:flex w-[260px] flex-col h-full bg-sidebar-light dark:bg-gray-800 border-r border-border-light dark:border-gray-700 flex-shrink-0 transition-all duration-300">
        <div className="flex flex-col h-full p-3 gap-2">
          {/* New Chat Butonu */}
          <button 
            onClick={handleNewChat}
            className="flex w-full items-center gap-3 rounded-md border border-border-light dark:border-gray-700 px-3 py-3 text-sm font-medium text-text-light dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group mb-2"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[18px]">add</span>
            </div>
            <span>New Chat</span>
          </button>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-6 pr-1">
            {loadingChats ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {/* Today */}
                {todayChats.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="px-3 text-xs font-semibold text-text-secondary-light dark:text-gray-400 uppercase tracking-wider">Bugün</h3>
                    {todayChats.map(chat => (
                      <button
                        key={chat.id}
                        onClick={() => handleChatSelect(chat.id)}
                        className={`flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors relative group text-left ${
                          currentChatId === chat.id ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 text-[18px]">
                          {currentChatId === chat.id ? 'chat_bubble' : 'chat_bubble_outline'}
                        </span>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-sm font-normal text-text-light dark:text-gray-100">{chat.title || 'Yeni Sohbet'}</p>
                        </div>
                        <button
                          onClick={(e) => handleChatDelete(chat.id, e)}
                          className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-gray-100 pl-2"
                        >
                          <span className="material-symbols-outlined text-gray-500 text-[16px]">delete</span>
                        </button>
                      </button>
                    ))}
                  </div>
                )}

                {/* Previous 7 Days */}
                {weekChats.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="px-3 text-xs font-semibold text-text-secondary-light dark:text-gray-400 uppercase tracking-wider">Son 7 Gün</h3>
                    {weekChats.map(chat => (
                      <button
                        key={chat.id}
                        onClick={() => handleChatSelect(chat.id)}
                        className={`flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors relative group text-left ${
                          currentChatId === chat.id ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 text-[18px]">
                          {currentChatId === chat.id ? 'chat_bubble' : 'chat_bubble_outline'}
                        </span>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-sm font-normal text-gray-700">{chat.title || 'Yeni Sohbet'}</p>
                        </div>
                        <button
                          onClick={(e) => handleChatDelete(chat.id, e)}
                          className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-gray-100 pl-2"
                        >
                          <span className="material-symbols-outlined text-gray-500 text-[16px]">delete</span>
                        </button>
                      </button>
                    ))}
                  </div>
                )}

                {/* Older */}
                {olderChats.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="px-3 text-xs font-semibold text-text-secondary-light dark:text-gray-400 uppercase tracking-wider">Daha Eski</h3>
                    {olderChats.map(chat => (
                      <button
                        key={chat.id}
                        onClick={() => handleChatSelect(chat.id)}
                        className={`flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors relative group text-left ${
                          currentChatId === chat.id ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 text-[18px]">
                          {currentChatId === chat.id ? 'chat_bubble' : 'chat_bubble_outline'}
                        </span>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-sm font-normal text-gray-700">{chat.title || 'Yeni Sohbet'}</p>
                        </div>
                        <button
                          onClick={(e) => handleChatDelete(chat.id, e)}
                          className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-gray-100 pl-2"
                        >
                          <span className="material-symbols-outlined text-gray-500 text-[16px]">delete</span>
                        </button>
                      </button>
                    ))}
                  </div>
                )}

                {chats.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                    Henüz sohbet yok. Yeni bir sohbet başlatın.
                  </div>
                )}

                {chats.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border-light dark:border-gray-700">
                    <button
                      onClick={handleDeleteAllChats}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                      <span>Tümünü Sil</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom Section */}
          <div className="border-t border-border-light dark:border-gray-700 pt-3 flex flex-col gap-1">
            <button 
              onClick={() => {
                setInitialSettingsTab(null);
                setShowSettingsModal(true);
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 text-[20px]">settings</span>
              <span className="flex-1 text-sm font-medium text-text-light dark:text-gray-100">Settings</span>
            </button>
            <div className="flex w-full items-center gap-3 rounded-md px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white font-bold text-xs">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-sm font-bold text-text-light dark:text-gray-100">{user?.username || 'Kullanıcı'}</span>
                <span className="text-xs text-text-secondary-light dark:text-gray-400">{user?.isAdmin ? 'Admin' : 'Kullanıcı'}</span>
              </div>
              <button
                onClick={logout}
                className="p-1 rounded transition-colors"
                title="Çıkış Yap"
              >
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 text-[18px]">logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative min-w-0 bg-background-light dark:bg-gray-900">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border-light dark:border-gray-700 bg-sidebar-light/95 dark:bg-gray-800/95 backdrop-blur sticky top-0 z-20">
          <button className="text-gray-600 dark:text-gray-300 hover:text-text-light dark:hover:text-gray-100">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="font-bold text-text-light dark:text-gray-100">Chat</span>
          <button className="text-gray-600 dark:text-gray-300 hover:text-text-light dark:hover:text-gray-100">
            <span className="material-symbols-outlined">add</span>
          </button>
        </header>

        {/* Chat Area */}
        <div className="flex-1 flex h-full">
          <div className="flex-1 flex flex-col border-r border-border-light dark:border-gray-700 min-w-0">
            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-border-light dark:border-gray-700 px-4 py-3 bg-panel-light dark:bg-gray-800 flex-shrink-0">
              <div className="flex gap-2" role="tablist">
                <button
                  aria-selected="true"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary border-b-2 border-primary"
                  role="tab"
                >
                  <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                  Aktif Sohbet
                </button>
                <button
                  onClick={() => {
                    setInitialSettingsTab('history');
                    setShowSettingsModal(true);
                  }}
                  aria-selected="false"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary-light dark:text-gray-400 hover:text-text-light dark:hover:text-gray-100 hover:border-b-2 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                  role="tab"
                >
                  <span className="material-symbols-outlined text-[18px]">history</span>
                  Geçmiş
                </button>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={toggleDarkMode}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                >
                  {isDarkMode ? (
                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 text-[18px]">light_mode</span>
                  ) : (
                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 text-[18px]">dark_mode</span>
                  )}
                </button>
                <img src={metricAILogo} alt="Metric AI" className="h-8 w-auto" />
              </div>
            </div>

            {/* Chat Interface */}
            <ChatInterface 
              chatId={currentChatId} 
              onChatCreated={(newChatId) => {
                setCurrentChatId(newChatId);
                loadChats();
              }}
              onFavoriteAdded={() => loadFavorites(100, 0, '')}
              executeMessage={executeMessage}
            />
          </div>
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="hidden xl:flex w-[320px] flex-col h-full bg-sidebar-light dark:bg-gray-800 border-l border-border-light dark:border-gray-700 flex-shrink-0 transition-all duration-300 p-4 gap-4 overflow-y-auto">
        {/* Quick Actions */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-text-light dark:text-gray-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 text-[20px]">bolt</span>
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button className="flex flex-col items-center justify-center p-3 rounded-md border border-border-light dark:border-gray-700 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm text-text-secondary-light dark:text-gray-300">
              <span className="material-symbols-outlined text-[20px] mb-1 text-primary">query_stats</span>
              Run TopN Query
            </button>
            <button className="flex flex-col items-center justify-center p-3 rounded-md border border-border-light dark:border-gray-700 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm text-text-secondary-light dark:text-gray-300">
              <span className="material-symbols-outlined text-[20px] mb-1 text-primary">lightbulb</span>
              Tips
            </button>
            <button className="flex flex-col items-center justify-center p-3 rounded-md border border-border-light dark:border-gray-700 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm text-text-secondary-light dark:text-gray-300">
              <span className="material-symbols-outlined text-[20px] mb-1 text-primary">download</span>
              Export
            </button>
            <button className="flex flex-col items-center justify-center p-3 rounded-md border border-border-light dark:border-gray-700 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm text-text-secondary-light dark:text-gray-300">
              <span className="material-symbols-outlined text-[20px] mb-1 text-primary">bar_chart</span>
              Statistics
            </button>
          </div>
        </div>

        {/* Favoriler */}
        <div className="border-t border-border-light dark:border-gray-700 pt-6 flex flex-col gap-3 mt-6">
          <button
            onClick={() => {
              setInitialSettingsTab('favorites');
              setShowSettingsModal(true);
            }}
            className="text-sm font-bold text-text-light dark:text-gray-100 flex items-center gap-2 hover:text-primary transition-colors cursor-pointer"
          >
            <FaRankingStar className="text-gray-600 dark:text-gray-300 text-[20px]" />
            Favorites
          </button>
          <div className="flex flex-col gap-2">
            {favorites.slice(0, 10).map(fav => (
              <div
                key={fav.id}
                className="flex items-start gap-2 p-2 rounded-md border border-border-light dark:border-gray-700 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors group relative"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDialog({
                      isOpen: true,
                      title: 'Favori Kaldır',
                      message: 'Bu favoriyi kaldırmak istediğinize emin misiniz?',
                      type: 'danger',
                      onConfirm: async () => {
                        try {
                          await removeFromFavorites(fav.id);
                          await loadFavorites(100, 0, '');
                        } catch (error) {
                          console.error('Remove favorite error:', error);
                        }
                      }
                    });
                  }}
                  className="text-red-600 hover:text-red-700 flex-shrink-0 mt-0.5 transition-colors"
                  title="Favoriyi Kaldır"
                >
                  <MdPlaylistRemove className="text-[14px]" />
                </button>
                <div 
                  className="flex-1 overflow-hidden min-w-0 cursor-pointer"
                  onClick={() => handleFavoriteClick(fav)}
                  title={fav.content}
                >
                  <p className="truncate text-xs font-medium text-text-light dark:text-gray-100">{fav.content}</p>
                </div>
              </div>
            ))}
            {favorites.length > 10 && (
              <button
                onClick={handleOpenFavoritesModal}
                className="text-xs text-primary hover:underline text-center py-2"
              >
                {favorites.length - 10} favori daha...
              </button>
            )}
            {favorites.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-xs">
                Henüz favori yok.
              </div>
            )}
          </div>
        </div>

      </aside>

      {/* Geçmiş Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-text-light">Geçmiş Sohbetler</h2>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistorySearchQuery('');
                  setHistoryChats([]);
                  setSelectedChatIds(new Set());
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => handleHistorySearch(e.target.value)}
                  placeholder="Sohbet içerisinde ara..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[20px]">search</span>
              </div>
            </div>

            {/* Action Buttons */}
            {(historySearchQuery.trim().length > 0 ? historyChats.length > 0 : chats.length > 0) && (
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllChats}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Tümünü Seç
                  </button>
                  <button
                    onClick={deselectAllChats}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Seçimi Kaldır
                  </button>
                  {selectedChatIds.size > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedChatIds.size} sohbet seçili
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedChatIds.size > 0 && (
                    <button
                      onClick={handleBulkDeleteChats}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      Seçili Olanları Sil ({selectedChatIds.size})
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: 'Tüm Sohbetleri Sil',
                        message: 'Tüm sohbetleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
                        type: 'danger',
                        onConfirm: async () => {
                          try {
                            await deleteAllChats();
                            setCurrentChatId(null);
                            await loadChats();
                            setShowHistoryModal(false);
                          } catch (error) {
                            console.error('Delete all chats error:', error);
                          }
                        }
                      });
                    }}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Tümünü Sil
                  </button>
                </div>
              </div>
            )}

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto p-4">
              {historySearchQuery.trim().length === 0 ? (
                // Arama yapılmadığında tüm sohbetleri göster
                chats.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Henüz sohbet yok.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {chats.map(chat => (
                      <div
                        key={chat.id}
                        className={`rounded-md border border-gray-200 ${
                          selectedChatIds.has(chat.id) ? 'bg-blue-50 border-blue-300' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedChatIds.has(chat.id)}
                            onChange={() => toggleChatSelection(chat.id)}
                            className="w-4 h-4 text-primary rounded"
                          />
                          <button
                            onClick={() => {
                              setCurrentChatId(chat.id);
                              setShowHistoryModal(false);
                              setHistorySearchQuery('');
                              setHistoryChats([]);
                              setSelectedChatIds(new Set());
                              setExpandedHistoryChatId(null);
                            }}
                            className="flex-1 text-left"
                          >
                            <p className="text-sm font-medium text-text-light">{chat.title || 'Yeni Sohbet'}</p>
                            <p className="text-xs text-text-secondary-light mt-1">
                              {new Date(chat.updatedAt).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })} · {chat.messageCount} mesaj
                            </p>
                          </button>
                          <button
                            onClick={() => loadHistoryChatMessages(chat.id)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                            title="Mesajları göster"
                          >
                            <span className={`material-symbols-outlined text-[18px] transition-transform ${
                              expandedHistoryChatId === chat.id ? 'rotate-180' : ''
                            }`}>expand_more</span>
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleChatDelete(chat.id, e);
                              // Sohbet silindikten sonra listeyi güncelle
                              await loadChats();
                            }}
                            className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                            title="Sil"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                        {expandedHistoryChatId === chat.id && historyChatMessages[chat.id] && (
                          <div className="border-t border-gray-200 bg-gray-50 p-3 max-h-[300px] overflow-y-auto">
                            <div className="space-y-2">
                              {historyChatMessages[chat.id].map((msg, idx) => (
                                <div
                                  key={msg.id || idx}
                                  className={`p-2 rounded text-xs ${
                                    msg.role === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  <div className="font-semibold mb-1">
                                    {msg.role === 'user' ? 'Kullanıcı' : 'Asistan'}
                                  </div>
                                  <div className="whitespace-pre-wrap break-words">
                                    {msg.content.substring(0, 200)}{msg.content.length > 200 ? '...' : ''}
                                  </div>
                                  <div className="text-xs opacity-70 mt-1">
                                    {new Date(msg.createdAt).toLocaleString('tr-TR')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : historyChats.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Arama sonucu bulunamadı.
                </div>
              ) : (
                <div className="space-y-2">
                  {historyChats.map(chat => (
                    <div
                      key={chat.id}
                      className={`rounded-md border border-gray-200 ${
                        selectedChatIds.has(chat.id) ? 'bg-blue-50 border-blue-300' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedChatIds.has(chat.id)}
                          onChange={() => toggleChatSelection(chat.id)}
                          className="w-4 h-4 text-primary rounded"
                        />
                        <button
                          onClick={() => {
                            setCurrentChatId(chat.id);
                            setShowHistoryModal(false);
                            setHistorySearchQuery('');
                            setHistoryChats([]);
                            setSelectedChatIds(new Set());
                            setExpandedHistoryChatId(null);
                          }}
                          className="flex-1 text-left"
                        >
                          <p className="text-sm font-medium text-text-light">{chat.title || 'Yeni Sohbet'}</p>
                          <p className="text-xs text-text-secondary-light mt-1">
                            {new Date(chat.updatedAt).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })} · {chat.messageCount} mesaj
                          </p>
                        </button>
                        <button
                          onClick={() => loadHistoryChatMessages(chat.id)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                          title="Mesajları göster"
                        >
                          <span className={`material-symbols-outlined text-[18px] transition-transform ${
                            expandedHistoryChatId === chat.id ? 'rotate-180' : ''
                          }`}>expand_more</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChatDelete(chat.id, e);
                            handleHistorySearch(historySearchQuery);
                          }}
                          className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                          title="Sil"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                      {expandedHistoryChatId === chat.id && historyChatMessages[chat.id] && (
                        <div className="border-t border-gray-200 bg-gray-50 p-3 max-h-[300px] overflow-y-auto">
                          <div className="space-y-2">
                            {historyChatMessages[chat.id].map((msg, idx) => (
                              <div
                                key={msg.id || idx}
                                className={`p-2 rounded text-xs ${
                                  msg.role === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                <div className="font-semibold mb-1">
                                  {msg.role === 'user' ? 'Kullanıcı' : 'Asistan'}
                                </div>
                                <div className="whitespace-pre-wrap break-words">
                                  {msg.content.substring(0, 200)}{msg.content.length > 200 ? '...' : ''}
                                </div>
                                <div className="text-xs opacity-70 mt-1">
                                  {new Date(msg.createdAt).toLocaleString('tr-TR')}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Favoriler Modal */}
      {showFavoritesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-text-light">Favoriler</h2>
              <button
                onClick={() => {
                  setShowFavoritesModal(false);
                  setFavoritesSearchQuery('');
                  setSelectedFavoriteIds(new Set());
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <input
                  type="text"
                  value={favoritesSearchQuery}
                  onChange={(e) => handleFavoritesSearch(e.target.value)}
                  placeholder="Favorilerde ara..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[20px]">search</span>
              </div>
            </div>

            {/* Action Buttons */}
            {favorites.length > 0 && (
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllFavorites}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Tümünü Seç
                  </button>
                  <button
                    onClick={deselectAllFavorites}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Seçimi Kaldır
                  </button>
                  {selectedFavoriteIds.size > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedFavoriteIds.size} favori seçili
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={favoritesPageSize}
                    onChange={(e) => handleFavoritesPageSizeChange(parseInt(e.target.value))}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  {selectedFavoriteIds.size > 0 && (
                    <button
                      onClick={handleBulkDeleteFavorites}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      Seçili Olanları Sil ({selectedFavoriteIds.size})
                    </button>
                  )}
                <button
                    onClick={handleDeleteAllFavorites}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Tümünü Sil
                  </button>
                </div>
              </div>
            )}

            {/* Favorites List */}
            <div className="flex-1 overflow-y-auto p-4">
              {favorites.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {favoritesSearchQuery.trim() ? 'Arama sonucu bulunamadı.' : 'Henüz favori yok.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {favorites.map(fav => (
                    <div
                      key={fav.id}
                      className={`flex items-start gap-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors ${
                        selectedFavoriteIds.has(fav.id) ? 'bg-blue-50 border-blue-300' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFavoriteIds.has(fav.id)}
                        onChange={() => toggleFavoriteSelection(fav.id)}
                        className="w-4 h-4 text-primary rounded mt-1"
                      />
                      <button
                        onClick={() => {
                          handleFavoriteClick(fav);
                          setShowFavoritesModal(false);
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-start gap-2">
                          <TiStarFullOutline className="text-primary text-[20px] flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-text-light break-words">{fav.content}</p>
                            {fav.favoritedAt && (
                              <p className="text-xs text-text-secondary-light mt-1 opacity-70">
                                {new Date(fav.favoritedAt).toLocaleDateString('tr-TR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFavorite(fav.id, e);
                        }}
                        className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                        title="Favoriden çıkar"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {favoritesTotal > favoritesPageSize && (
              <div className="flex items-center justify-between p-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Toplam {favoritesTotal} favori · Sayfa {favoritesCurrentPage} / {Math.ceil(favoritesTotal / favoritesPageSize)}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFavoritesPageChange(favoritesCurrentPage - 1)}
                    disabled={favoritesCurrentPage === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => handleFavoritesPageChange(favoritesCurrentPage + 1)}
                    disabled={favoritesCurrentPage >= Math.ceil(favoritesTotal / favoritesPageSize)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sonraki
                </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {user?.isAdmin && (
        <SettingsPage 
          isOpen={showSettingsModal} 
          onClose={() => {
            setShowSettingsModal(false);
            setInitialSettingsTab(null);
          }}
          onChatSelect={(chatId) => {
            setCurrentChatId(chatId);
            setShowSettingsModal(false);
            setInitialSettingsTab(null);
          }}
          onDataChanged={async () => {
            // Settings'te veri değiştiğinde ChatPage'deki verileri yenile
            await loadChats();
            await loadFavorites(100, 0, '');
          }}
          initialTab={initialSettingsTab}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, type: 'warning' })}
        onConfirm={confirmDialog.onConfirm || (() => {})}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />
    </div>
  );
}

export default ChatPage;
