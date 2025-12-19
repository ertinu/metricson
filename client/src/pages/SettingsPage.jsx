// Settings sayfası - Kullanıcı ve AI model yönetimi (sadece admin) - Popup modal olarak
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { getChats, deleteChat, getFavorites, removeFromFavorites, searchChats, deleteAllChats, deleteBulkChats, deleteBulkFavorites, deleteAllFavorites, getChat } from '../services/api';
import { IoAddCircleOutline } from "react-icons/io5";

// Hamburger menü komponenti - Kullanıcı işlemleri için
function UserActionsMenu({ userId, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      // Butonun pozisyonunu hesapla
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + window.scrollY + 4,
          right: window.innerWidth - rect.right
        });
      }
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      <div className="relative" ref={buttonRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          title="İşlemler"
        >
          <span className="material-symbols-outlined text-[18px]">more_vert</span>
        </button>
      </div>
      {isOpen && (
        <div 
          ref={menuRef}
          className="fixed w-32 bg-white border border-gray-200 rounded-md shadow-lg z-[10001]"
          style={{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }}
        >
          <button
            onClick={() => {
              onDelete(userId);
              setIsOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-md"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            <span>Sil</span>
          </button>
        </div>
      )}
    </>
  );
}

// Hamburger menü komponenti - AI Model işlemleri için
function ModelActionsMenu({ model, onEdit, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      // Butonun pozisyonunu hesapla
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + window.scrollY + 4,
          right: window.innerWidth - rect.right
        });
      }
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      <div className="relative" ref={buttonRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          title="İşlemler"
        >
          <span className="material-symbols-outlined text-[18px]">more_vert</span>
        </button>
      </div>
      {isOpen && (
        <div 
          ref={menuRef}
          className="fixed w-36 bg-white border border-gray-200 rounded-md shadow-lg z-[10001]"
          style={{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }}
        >
          <button
            onClick={() => {
              onEdit(model);
              setIsOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-2 rounded-md"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            <span>Düzenle</span>
          </button>
          <button
            onClick={() => {
              onDelete(model.id);
              setIsOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-md"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            <span>Sil</span>
          </button>
        </div>
      )}
    </>
  );
}

// Hamburger menü komponenti - vROPS işlemleri için
function VropsActionsMenu({ config, onEdit, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      // Butonun pozisyonunu hesapla
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + window.scrollY + 4,
          right: window.innerWidth - rect.right
        });
      }
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      <div className="relative" ref={buttonRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          title="İşlemler"
        >
          <span className="material-symbols-outlined text-[18px]">more_vert</span>
        </button>
      </div>
      {isOpen && (
        <div 
          ref={menuRef}
          className="fixed w-36 bg-white border border-gray-200 rounded-md shadow-lg z-[10001]"
          style={{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }}
        >
          <button
            onClick={() => {
              onEdit(config);
              setIsOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-2 rounded-md"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            <span>Düzenle</span>
          </button>
          <button
            onClick={() => {
              onDelete(config.id);
              setIsOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-md"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            <span>Sil</span>
          </button>
        </div>
      )}
    </>
  );
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function SettingsPage({ isOpen, onClose, onChatSelect, initialTab }) {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab || 'users'); // 'users', 'ai-models', 'vrops', 'history', 'favorites'
  
  // Kullanıcı yönetimi state'leri
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ username: '', password: '', email: '', name: '', surname: '', isAdmin: false });
  
  // AI model yönetimi state'leri
  const [aiModels, setAiModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showModelForm, setShowModelForm] = useState(false);
  const [modelForm, setModelForm] = useState({ name: '', apiToken: '', modelVersion: '', baseUrl: 'https://api.openai.com/v1' });
  const [editingModel, setEditingModel] = useState(null);
  
  // vROPS yönetimi state'leri
  const [vropsConfigs, setVropsConfigs] = useState([]);
  const [loadingVrops, setLoadingVrops] = useState(false);
  const [showVropsForm, setShowVropsForm] = useState(false);
  const [vropsForm, setVropsForm] = useState({ name: '', url: '', username: '', password: '', description: '', isActive: true });
  const [editingVrops, setEditingVrops] = useState(null);

  // Geçmiş (History) state'leri
  const [chats, setChats] = useState([]);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyChats, setHistoryChats] = useState([]);
  const [selectedChatIds, setSelectedChatIds] = useState(new Set());
  const [historyChatMessages, setHistoryChatMessages] = useState({});
  const [expandedHistoryChatId, setExpandedHistoryChatId] = useState(null);

  // Favoriler state'leri
  const [favorites, setFavorites] = useState([]);
  const [favoritesSearchQuery, setFavoritesSearchQuery] = useState('');
  const [favoritesPageSize, setFavoritesPageSize] = useState(50);
  const [favoritesCurrentPage, setFavoritesCurrentPage] = useState(1);
  const [favoritesTotal, setFavoritesTotal] = useState(0);
  const [selectedFavoriteIds, setSelectedFavoriteIds] = useState(new Set());

  // initialTab değiştiğinde activeTab'i güncelle
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;

    if (!isAuthenticated || !user?.isAdmin) {
      onClose();
      return;
    }

    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'ai-models') {
      loadAiModels();
    } else if (activeTab === 'vrops') {
      loadVropsConfigs();
    } else if (activeTab === 'history') {
      loadChats();
    } else if (activeTab === 'favorites') {
      loadFavorites();
    }
  }, [isOpen, isAuthenticated, user, onClose, activeTab]);

  // Kullanıcıları yükle
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // AI modellerini yükle
  const loadAiModels = async () => {
    try {
      setLoadingModels(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/ai-models`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setAiModels(response.data.models);
      }
    } catch (error) {
      console.error('AI modelleri yüklenirken hata:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  // Kullanıcı oluştur
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/auth/users`, userForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        alert('Kullanıcı başarıyla oluşturuldu.');
        setShowUserForm(false);
        setUserForm({ username: '', password: '', email: '', name: '', surname: '', isAdmin: false });
        loadUsers();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Kullanıcı oluşturulurken bir hata oluştu.');
    }
  };

  // Kullanıcı sil
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_BASE_URL}/api/auth/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        alert('Kullanıcı başarıyla silindi.');
        loadUsers();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Kullanıcı silinirken bir hata oluştu.');
    }
  };

  // AI modeli oluştur
  const handleCreateModel = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/ai-models`, modelForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        alert('AI modeli başarıyla oluşturuldu.');
        setShowModelForm(false);
        setModelForm({ name: '', apiToken: '', modelVersion: '', baseUrl: 'https://api.openai.com/v1' });
        loadAiModels();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'AI modeli oluşturulurken bir hata oluştu.');
    }
  };

  // AI modeli güncelle
  const handleUpdateModel = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_BASE_URL}/api/ai-models/${editingModel.id}`, modelForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        alert('AI modeli başarıyla güncellendi.');
        setShowModelForm(false);
        setEditingModel(null);
        setModelForm({ name: '', apiToken: '', modelVersion: '', baseUrl: 'https://api.openai.com/v1' });
        loadAiModels();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'AI modeli güncellenirken bir hata oluştu.');
    }
  };

  // AI modeli sil
  const handleDeleteModel = async (modelId) => {
    if (!window.confirm('Bu AI modelini silmek istediğinize emin misiniz?')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_BASE_URL}/api/ai-models/${modelId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        alert('AI modeli başarıyla silindi.');
        loadAiModels();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'AI modeli silinirken bir hata oluştu.');
    }
  };

  // Model düzenleme formunu aç
  const handleEditModel = (model) => {
    setEditingModel(model);
    setModelForm({
      name: model.name,
      apiToken: '', // Güvenlik nedeniyle token gösterilmez
      modelVersion: model.modelVersion,
      baseUrl: model.baseUrl || 'https://api.openai.com/v1'
    });
    setShowModelForm(true);
  };

  // vROPS konfigürasyonlarını yükle
  const loadVropsConfigs = async () => {
    try {
      setLoadingVrops(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/vrops-config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setVropsConfigs(response.data.configs);
      }
    } catch (error) {
      console.error('vROPS konfigürasyonları yüklenirken hata:', error);
    } finally {
      setLoadingVrops(false);
    }
  };

  // vROPS konfigürasyonu oluştur
  const handleCreateVrops = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/vrops-config`, vropsForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        alert('vROPS konfigürasyonu başarıyla oluşturuldu.');
        setShowVropsForm(false);
        setVropsForm({ name: '', url: '', username: '', password: '', description: '', isActive: true });
        loadVropsConfigs();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'vROPS konfigürasyonu oluşturulurken bir hata oluştu.');
    }
  };

  // vROPS konfigürasyonu güncelle
  const handleUpdateVrops = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_BASE_URL}/api/vrops-config/${editingVrops.id}`, vropsForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        alert('vROPS konfigürasyonu başarıyla güncellendi.');
        setShowVropsForm(false);
        setEditingVrops(null);
        setVropsForm({ name: '', url: '', username: '', password: '', description: '', isActive: true });
        loadVropsConfigs();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'vROPS konfigürasyonu güncellenirken bir hata oluştu.');
    }
  };

  // vROPS konfigürasyonu sil
  const handleDeleteVrops = async (configId) => {
    if (!window.confirm('Bu vROPS konfigürasyonunu silmek istediğinize emin misiniz?')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_BASE_URL}/api/vrops-config/${configId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        alert('vROPS konfigürasyonu başarıyla silindi.');
        loadVropsConfigs();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'vROPS konfigürasyonu silinirken bir hata oluştu.');
    }
  };

  // vROPS düzenleme formunu aç
  const handleEditVrops = async (config) => {
    setEditingVrops(config);
    // Şifreyi güvenlik nedeniyle göstermiyoruz, kullanıcı yeni şifre girmeli
    setVropsForm({
      name: config.name,
      url: config.url,
      username: config.username,
      password: '', // Güvenlik nedeniyle şifre gösterilmez
      description: config.description || '',
      isActive: config.isActive
    });
    setShowVropsForm(true);
  };

  // Geçmiş (History) fonksiyonları
  const loadChats = async () => {
    try {
      const response = await getChats();
      if (response.success) {
        setChats(response.chats || []);
      }
    } catch (error) {
      console.error('Load chats error:', error);
    }
  };

  const handleHistorySearch = async (query) => {
    setHistorySearchQuery(query);
    if (query.trim()) {
      try {
        const response = await searchChats(query);
        if (response.success) {
          setHistoryChats(response.chats || []);
        }
      } catch (error) {
        console.error('Search chats error:', error);
      }
    } else {
      setHistoryChats([]);
    }
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
    const allIds = (historySearchQuery.trim() ? historyChats : chats).map(chat => chat.id);
    setSelectedChatIds(new Set(allIds));
  };

  const deselectAllChats = () => {
    setSelectedChatIds(new Set());
  };

  const handleBulkDeleteChats = async () => {
    if (selectedChatIds.size === 0) {
      alert('Lütfen silmek istediğiniz sohbetleri seçin.');
      return;
    }
    if (window.confirm(`${selectedChatIds.size} sohbeti silmek istediğinize emin misiniz?`)) {
      try {
        await deleteBulkChats(Array.from(selectedChatIds));
        setSelectedChatIds(new Set());
        await loadChats();
        if (historySearchQuery.trim()) {
          await handleHistorySearch(historySearchQuery);
        }
      } catch (error) {
        console.error('Bulk delete chats error:', error);
      }
    }
  };

  const handleDeleteAllChats = async () => {
    if (window.confirm('Tüm sohbetleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      try {
        await deleteAllChats();
        setSelectedChatIds(new Set());
        await loadChats();
      } catch (error) {
        console.error('Delete all chats error:', error);
      }
    }
  };

  const handleChatDelete = async (chatId) => {
    if (window.confirm('Bu sohbeti silmek istediğinize emin misiniz?')) {
      try {
        await deleteChat(chatId);
        await loadChats();
        if (historySearchQuery.trim()) {
          await handleHistorySearch(historySearchQuery);
        }
      } catch (error) {
        console.error('Delete chat error:', error);
      }
    }
  };

  const loadHistoryChatMessages = async (chatId) => {
    if (historyChatMessages[chatId]) {
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

  // Favoriler fonksiyonları
  const loadFavorites = async () => {
    try {
      const offset = (favoritesCurrentPage - 1) * favoritesPageSize;
      const response = await getFavorites(favoritesPageSize, offset, favoritesSearchQuery);
      if (response.success) {
        setFavorites(response.favorites || []);
        setFavoritesTotal(response.total || 0);
      }
    } catch (error) {
      console.error('Load favorites error:', error);
    }
  };

  const handleFavoritesSearch = async (query) => {
    setFavoritesSearchQuery(query);
    setFavoritesCurrentPage(1);
    setSelectedFavoriteIds(new Set());
    const response = await getFavorites(favoritesPageSize, 0, query);
    if (response.success) {
      setFavorites(response.favorites || []);
      setFavoritesTotal(response.total || 0);
    }
  };

  const handleFavoritesPageChange = async (newPage) => {
    setFavoritesCurrentPage(newPage);
    setSelectedFavoriteIds(new Set());
    const offset = (newPage - 1) * favoritesPageSize;
    const response = await getFavorites(favoritesPageSize, offset, favoritesSearchQuery);
    if (response.success) {
      setFavorites(response.favorites || []);
      setFavoritesTotal(response.total || 0);
    }
  };

  const handleFavoritesPageSizeChange = async (newSize) => {
    setFavoritesPageSize(newSize);
    setFavoritesCurrentPage(1);
    setSelectedFavoriteIds(new Set());
    const response = await getFavorites(newSize, 0, favoritesSearchQuery);
    if (response.success) {
      setFavorites(response.favorites || []);
      setFavoritesTotal(response.total || 0);
    }
  };

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

  const selectAllFavorites = () => {
    const allIds = favorites.map(fav => fav.id);
    setSelectedFavoriteIds(new Set(allIds));
  };

  const deselectAllFavorites = () => {
    setSelectedFavoriteIds(new Set());
  };

  const handleBulkDeleteFavorites = async () => {
    if (selectedFavoriteIds.size === 0) {
      alert('Lütfen silmek istediğiniz favorileri seçin.');
      return;
    }
    if (window.confirm(`${selectedFavoriteIds.size} favoriyi silmek istediğinize emin misiniz?`)) {
      try {
        await deleteBulkFavorites(Array.from(selectedFavoriteIds));
        setSelectedFavoriteIds(new Set());
        await loadFavorites();
      } catch (error) {
        console.error('Bulk delete favorites error:', error);
      }
    }
  };

  const handleDeleteAllFavorites = async () => {
    if (window.confirm('Tüm favorileri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      try {
        await deleteAllFavorites();
        setSelectedFavoriteIds(new Set());
        await loadFavorites();
      } catch (error) {
        console.error('Delete all favorites error:', error);
      }
    }
  };

  const handleRemoveFavorite = async (favoriteId) => {
    if (window.confirm('Bu favoriyi kaldırmak istediğinize emin misiniz?')) {
      try {
        await removeFromFavorites(favoriteId);
        await loadFavorites();
      } catch (error) {
        console.error('Remove favorite error:', error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl border-[3px] border-[#e7e7e7] max-w-[1024px] w-full mx-4 h-[calc(85vh-250px)] flex overflow-hidden relative z-[10000]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sol Sidebar - Menüler */}
        <aside className="w-64 flex flex-col bg-gray-50 border-r border-gray-200 flex-shrink-0">
          <div className="h-16 flex items-center px-6 border-b border-gray-200">
            <button
              onClick={onClose}
              className="text-gray-500 rounded-md p-1 mt-4"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'users'
                  ? 'bg-gray-200 text-gray-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">people</span>
              Kullanıcı Yönetimi
            </button>
            <button
              onClick={() => setActiveTab('ai-models')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'ai-models'
                  ? 'bg-gray-200 text-gray-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
              AI Model Yönetimi
            </button>
            <button
              onClick={() => setActiveTab('vrops')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'vrops'
                  ? 'bg-gray-200 text-gray-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">cloud</span>
              vROPS Yönetimi
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'history'
                  ? 'bg-gray-200 text-gray-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">history</span>
              Geçmiş
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'favorites'
                  ? 'bg-gray-200 text-gray-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">star</span>
              Favoriler
            </button>
          </nav>
        </aside>

        {/* Sağ İçerik Alanı */}
        <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8">
            <h1 className="text-lg font-medium mb-16 text-gray-700">
              {activeTab === 'users' && 'Kullanıcı Yönetimi'}
              {activeTab === 'ai-models' && 'AI Model Yönetimi'}
              {activeTab === 'vrops' && 'vROPS Yönetimi'}
              {activeTab === 'history' && 'Geçmiş Sohbetler'}
              {activeTab === 'favorites' && 'Favoriler'}
            </h1>

          {/* Kullanıcı Yönetimi */}
          {activeTab === 'users' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-medium text-gray-700">Kullanıcılar</h2>
                <button
                  onClick={() => {
                    setShowUserForm(true);
                    setUserForm({ username: '', password: '', email: '', name: '', surname: '', isAdmin: false });
                  }}
                  className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                  title="Yeni Kullanıcı"
                >
                  <IoAddCircleOutline className="text-[24px]" />
                </button>
              </div>


              {loadingUsers ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-600 uppercase tracking-wider border-b border-gray-100">
                          Ad Soyad
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-600 uppercase tracking-wider border-b border-gray-100">
                          Kullanıcı Adı
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-600 uppercase tracking-wider border-b border-gray-100">
                          E-posta
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-600 uppercase tracking-wider border-b border-gray-100">
                          Yetki
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-600 uppercase tracking-wider border-b border-gray-100">
                          Oluşturulma
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-gray-100">
                          <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-700">
                            {u.name || u.surname ? `${u.name || ''} ${u.surname || ''}`.trim() : '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                            {u.username}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                            {u.email || '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                            {u.isAdmin ? (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                                Admin
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-semibold">
                                Kullanıcı
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                            {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-medium">
                            {u.id !== user.id && (
                              <UserActionsMenu userId={u.id} onDelete={handleDeleteUser} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* AI Model Yönetimi */}
          {activeTab === 'ai-models' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-medium text-gray-700">AI Modelleri</h2>
                <button
                  onClick={() => {
                    setShowModelForm(true);
                    setEditingModel(null);
                    setModelForm({ name: '', apiToken: '', modelVersion: '', baseUrl: 'https://api.openai.com/v1' });
                  }}
                  className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                  title="Yeni Model"
                >
                  <IoAddCircleOutline className="text-[24px]" />
                </button>
              </div>


              {loadingModels ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-600 uppercase tracking-wider border-b border-gray-100">
                          Model İsmi
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-600 uppercase tracking-wider border-b border-gray-100">
                          Model Versiyonu
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-600 uppercase tracking-wider border-b border-gray-100">
                          Base URL
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-600 uppercase tracking-wider border-b border-gray-100">
                          Durum
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-600 uppercase tracking-wider border-b border-gray-100">
                          Oluşturulma
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {aiModels.map((model) => (
                        <tr key={model.id} className="border-b border-gray-100">
                          <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-700">
                            {model.name}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                            {model.modelVersion}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                            {model.baseUrl}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                            {model.isActive ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                                Aktif
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-semibold">
                                Pasif
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                            {new Date(model.createdAt).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-medium">
                            <ModelActionsMenu 
                              model={model} 
                              onEdit={handleEditModel} 
                              onDelete={handleDeleteModel} 
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* vROPS Yönetimi */}
          {activeTab === 'vrops' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-medium text-gray-700">vROPS Konfigürasyonları</h2>
                <button
                  onClick={() => {
                    setShowVropsForm(true);
                    setEditingVrops(null);
                    setVropsForm({ name: '', url: '', username: '', password: '', description: '', isActive: true });
                  }}
                  className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                  title="Yeni vROPS"
                >
                  <IoAddCircleOutline className="text-[24px]" />
                </button>
              </div>


              {loadingVrops ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-600 uppercase tracking-wider border-b border-gray-100">
                          vROPS Adı
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-600 uppercase tracking-wider border-b border-gray-100">
                          URL
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-600 uppercase tracking-wider border-b border-gray-100">
                          Durum
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-600 uppercase tracking-wider border-b border-gray-100">
                          Oluşturulma
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {vropsConfigs.map((config) => (
                        <tr key={config.id} className="border-b border-gray-100">
                          <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-700">
                            {config.name}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                            {config.url}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                            {config.isActive ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                                Aktif
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-semibold">
                                Pasif
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                            {new Date(config.createdAt).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-medium">
                            <VropsActionsMenu 
                              config={config} 
                              onEdit={handleEditVrops} 
                              onDelete={handleDeleteVrops} 
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {vropsConfigs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Henüz vROPS konfigürasyonu yok. Yeni bir konfigürasyon ekleyin.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Geçmiş (History) */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => handleHistorySearch(e.target.value)}
                  placeholder="Sohbet içerisinde ara..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                />
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[18px]">search</span>
              </div>

              {/* Action Buttons */}
              {(historySearchQuery.trim().length > 0 ? historyChats.length > 0 : chats.length > 0) && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAllChats}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Tümünü Seç
                    </button>
                    <button
                      onClick={deselectAllChats}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Seçimi Kaldır
                    </button>
                    {selectedChatIds.size > 0 && (
                      <span className="text-xs text-gray-600">
                        {selectedChatIds.size} sohbet seçili
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedChatIds.size > 0 && (
                      <button
                        onClick={handleBulkDeleteChats}
                        className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        Seçili Olanları Sil ({selectedChatIds.size})
                      </button>
                    )}
                    <button
                      onClick={handleDeleteAllChats}
                      className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      Tümünü Sil
                    </button>
                  </div>
                </div>
              )}

              {/* Chat List */}
              <div className="border border-gray-100 rounded-md overflow-hidden">
                <div className="overflow-y-auto max-h-[50vh]">
                  {historySearchQuery.trim().length === 0 ? (
                    chats.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        Henüz sohbet yok.
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {chats.map(chat => (
                          <div
                            key={chat.id}
                            className={`p-3 hover:bg-gray-50 transition-colors ${
                              selectedChatIds.has(chat.id) ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedChatIds.has(chat.id)}
                                onChange={() => toggleChatSelection(chat.id)}
                                className="w-4 h-4 text-primary rounded"
                              />
                              <button
                                onClick={() => {
                                  if (onChatSelect) onChatSelect(chat.id);
                                  onClose();
                                }}
                                className="flex-1 text-left"
                              >
                                <p className="text-xs font-medium text-gray-700">{chat.title || 'Yeni Sohbet'}</p>
                                <p className="text-[10px] text-gray-600 mt-1">
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
                                onClick={() => handleChatDelete(chat.id)}
                                className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                                title="Sil"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                            {expandedHistoryChatId === chat.id && historyChatMessages[chat.id] && (
                              <div className="mt-2 pt-2 border-t border-gray-100 bg-gray-50 p-2 max-h-[200px] overflow-y-auto rounded-md">
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
                    <div className="divide-y divide-gray-100">
                      {historyChats.map(chat => (
                        <div
                          key={chat.id}
                          className={`p-3 hover:bg-gray-50 transition-colors ${
                            selectedChatIds.has(chat.id) ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedChatIds.has(chat.id)}
                              onChange={() => toggleChatSelection(chat.id)}
                              className="w-4 h-4 text-primary rounded"
                            />
                            <button
                              onClick={() => {
                                if (onChatSelect) onChatSelect(chat.id);
                                onClose();
                              }}
                              className="flex-1 text-left"
                            >
                              <p className="text-xs font-medium text-gray-700">{chat.title || 'Yeni Sohbet'}</p>
                              <p className="text-xs text-gray-500 mt-1">
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
                              onClick={() => handleChatDelete(chat.id)}
                              className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                              title="Sil"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                          {expandedHistoryChatId === chat.id && historyChatMessages[chat.id] && (
                            <div className="mt-2 pt-2 border-t border-gray-100 bg-gray-50 p-2 max-h-[200px] overflow-y-auto rounded-md">
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

          {/* Favoriler */}
          {activeTab === 'favorites' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={favoritesSearchQuery}
                  onChange={(e) => handleFavoritesSearch(e.target.value)}
                  placeholder="Favorilerde ara..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                />
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[18px]">search</span>
              </div>

              {/* Action Buttons */}
              {favorites.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAllFavorites}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Tümünü Seç
                    </button>
                    <button
                      onClick={deselectAllFavorites}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Seçimi Kaldır
                    </button>
                    {selectedFavoriteIds.size > 0 && (
                      <span className="text-xs text-gray-600">
                        {selectedFavoriteIds.size} favori seçili
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={favoritesPageSize}
                      onChange={(e) => handleFavoritesPageSizeChange(parseInt(e.target.value))}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value={10}>10</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    {selectedFavoriteIds.size > 0 && (
                      <button
                        onClick={handleBulkDeleteFavorites}
                        className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        Seçili Olanları Sil ({selectedFavoriteIds.size})
                      </button>
                    )}
                    <button
                      onClick={handleDeleteAllFavorites}
                      className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      Tümünü Sil
                    </button>
                  </div>
                </div>
              )}

              {/* Favorites List */}
              <div className="border border-gray-100 rounded-md overflow-hidden">
                <div className="overflow-y-auto max-h-[50vh]">
                  {favorites.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      Henüz favori yok.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {favorites.map(fav => (
                        <div
                          key={fav.id}
                          className={`p-3 hover:bg-gray-50 transition-colors ${
                            selectedFavoriteIds.has(fav.id) ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedFavoriteIds.has(fav.id)}
                              onChange={() => toggleFavoriteSelection(fav.id)}
                              className="w-4 h-4 text-primary rounded"
                            />
                            <div className="flex-1">
                              <p className="text-xs text-gray-700 break-words">{fav.content}</p>
                              {fav.favoritedAt && (
                                <p className="text-[10px] text-gray-600 mt-1">
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
                            <button
                              onClick={() => handleRemoveFavorite(fav.id)}
                              className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                              title="Favoriden çıkar"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Pagination */}
              {favoritesTotal > favoritesPageSize && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-600">
                    Toplam {favoritesTotal} favori · Sayfa {favoritesCurrentPage} / {Math.ceil(favoritesTotal / favoritesPageSize)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFavoritesPageChange(favoritesCurrentPage - 1)}
                      disabled={favoritesCurrentPage === 1}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Önceki
                    </button>
                    <button
                      onClick={() => handleFavoritesPageChange(favoritesCurrentPage + 1)}
                      disabled={favoritesCurrentPage >= Math.ceil(favoritesTotal / favoritesPageSize)}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </main>
      </div>

      {/* Kullanıcı Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black bg-opacity-50" onClick={() => {
          setShowUserForm(false);
          setUserForm({ username: '', password: '', email: '', name: '', surname: '', isAdmin: false });
        }}>
          <div className="bg-white rounded-3xl shadow-2xl border-[2px] border-[#e7e7e7] max-w-xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-xs font-medium text-gray-700">
                {userForm.username ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
              </h3>
              <button
                onClick={() => {
                  setShowUserForm(false);
                  setUserForm({ username: '', password: '', email: '', name: '', surname: '', isAdmin: false });
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-8 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Ad</label>
                  <input
                    type="text"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Soyad</label>
                  <input
                    type="text"
                    value={userForm.surname}
                    onChange={(e) => setUserForm({ ...userForm, surname: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Kullanıcı Adı</label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Şifre</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">E-posta (Opsiyonel)</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={userForm.isAdmin}
                  onChange={(e) => setUserForm({ ...userForm, isAdmin: e.target.checked })}
                  className="h-3 w-3 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label className="ml-2 text-[10px] text-gray-600">Admin Yetkisi</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-3 py-1.5 text-xs bg-primary text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserForm(false);
                    setUserForm({ username: '', password: '', email: '', name: '', surname: '', isAdmin: false });
                  }}
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Model Form Modal */}
      {showModelForm && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black bg-opacity-50" onClick={() => {
          setShowModelForm(false);
          setEditingModel(null);
          setModelForm({ name: '', apiToken: '', modelVersion: '', baseUrl: 'https://api.openai.com/v1' });
        }}>
          <div className="bg-white rounded-3xl shadow-2xl border-[2px] border-[#e7e7e7] max-w-xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-xs font-medium text-gray-700">
                {editingModel ? 'Model Düzenle' : 'Yeni AI Modeli'}
              </h3>
              <button
                onClick={() => {
                  setShowModelForm(false);
                  setEditingModel(null);
                  setModelForm({ name: '', apiToken: '', modelVersion: '', baseUrl: 'https://api.openai.com/v1' });
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={editingModel ? handleUpdateModel : handleCreateModel} className="p-8 space-y-3.5">
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Model İsmi</label>
                <input
                  type="text"
                  value={modelForm.name}
                  onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">API Token</label>
                <input
                  type="password"
                  value={modelForm.apiToken}
                  onChange={(e) => setModelForm({ ...modelForm, apiToken: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-transparent"
                  required={!editingModel}
                  placeholder={editingModel ? 'Değiştirmek için yeni token girin' : ''}
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Model Versiyonu</label>
                <input
                  type="text"
                  value={modelForm.modelVersion}
                  onChange={(e) => setModelForm({ ...modelForm, modelVersion: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-transparent"
                  required
                  placeholder="örn: gpt-4, gpt-3.5-turbo"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Base URL</label>
                <input
                  type="text"
                  value={modelForm.baseUrl}
                  onChange={(e) => setModelForm({ ...modelForm, baseUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-transparent"
                  placeholder="https://api.openai.com/v1"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-3 py-1.5 text-xs bg-primary text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  {editingModel ? 'Güncelle' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModelForm(false);
                    setEditingModel(null);
                    setModelForm({ name: '', apiToken: '', modelVersion: '', baseUrl: 'https://api.openai.com/v1' });
                  }}
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* vROPS Form Modal */}
      {showVropsForm && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black bg-opacity-50" onClick={() => {
          setShowVropsForm(false);
          setEditingVrops(null);
          setVropsForm({ name: '', url: '', username: '', password: '', description: '', isActive: true });
        }}>
          <div className="bg-white rounded-3xl shadow-2xl border-[2px] border-[#e7e7e7] max-w-xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-xs font-medium text-gray-700">
                {editingVrops ? 'vROPS Düzenle' : 'Yeni vROPS Konfigürasyonu'}
              </h3>
              <button
                onClick={() => {
                  setShowVropsForm(false);
                  setEditingVrops(null);
                  setVropsForm({ name: '', url: '', username: '', password: '', description: '', isActive: true });
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={editingVrops ? handleUpdateVrops : handleCreateVrops} className="p-8 space-y-3.5">
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">vROPS Adı</label>
                <input
                  type="text"
                  value={vropsForm.name}
                  onChange={(e) => setVropsForm({ ...vropsForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-transparent"
                  required
                  placeholder="örn: Production vROPS"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">URL</label>
                <input
                  type="url"
                  value={vropsForm.url}
                  onChange={(e) => setVropsForm({ ...vropsForm, url: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-transparent"
                  required
                  placeholder="https://vrops.example.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Kullanıcı Adı</label>
                <input
                  type="text"
                  value={vropsForm.username}
                  onChange={(e) => setVropsForm({ ...vropsForm, username: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Şifre</label>
                <input
                  type="password"
                  value={vropsForm.password}
                  onChange={(e) => setVropsForm({ ...vropsForm, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-transparent"
                  required={!editingVrops}
                  placeholder={editingVrops ? 'Değiştirmek için yeni şifre girin' : ''}
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Açıklama</label>
                <textarea
                  value={vropsForm.description}
                  onChange={(e) => setVropsForm({ ...vropsForm, description: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-transparent resize-none"
                  rows={2}
                  placeholder="vROPS hakkında açıklama..."
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={vropsForm.isActive}
                  onChange={(e) => setVropsForm({ ...vropsForm, isActive: e.target.checked })}
                  className="h-3 w-3 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label className="ml-2 text-[10px] text-gray-600">Aktif</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-3 py-1.5 text-xs bg-primary text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  {editingVrops ? 'Güncelle' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowVropsForm(false);
                    setEditingVrops(null);
                    setVropsForm({ name: '', url: '', username: '', password: '', description: '', isActive: true });
                  }}
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;

