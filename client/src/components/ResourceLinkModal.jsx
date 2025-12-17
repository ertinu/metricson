// Resource Link Modal - İlgili linkler için popup modal komponenti
import { useState, useEffect, useMemo } from 'react';
import { executeVropsDirectRequest } from '../services/api';
import MetricInfoModal from './MetricInfoModal';
import LatestStatsTable from './LatestStatsTable';

function ResourceLinkModal({ isOpen, onClose, link, resourceId }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    if (isOpen && link) {
      // Modal açıldığında direkt vROPS API'ye istek gönder
      setIsLoading(true);
      setError(null);
      setData(null);

      // Link'ten endpoint'i al (tam href'i gönder)
      const endpoint = link.href;

      executeVropsDirectRequest(endpoint)
        .then((response) => {
          console.log('ResourceLinkModal - API Response:', response);
          if (response.success && response.parsedData && response.dataType) {
            console.log('ResourceLinkModal - Parsed Data:', response.parsedData);
            console.log('ResourceLinkModal - Resources:', response.parsedData.resources);
            console.log('ResourceLinkModal - Resources length:', response.parsedData.resources?.length);
            setData({
              parsedData: response.parsedData,
              dataType: response.dataType
            });
          } else {
            console.error('ResourceLinkModal - Response format error:', response);
            setError('Veri alınamadı');
          }
        })
        .catch((err) => {
          setError(err.response?.data?.error || err.message || 'Bir hata oluştu');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Modal kapandığında state'i temizle
      setData(null);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, link]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col relative z-[10000]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">{link ? getLinkTitle(link.name) : ''}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-4 text-gray-600">Veriler yükleniyor...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          ) : data && data.dataType === 'relationships' ? (
            <RelationshipsView data={data.parsedData} />
          ) : data && data.dataType === 'alerts' ? (
            <AlertsView data={data.parsedData} />
          ) : data && data.dataType === 'statKeys' ? (
            <StatKeysView data={data.parsedData} />
          ) : data && data.dataType === 'symptoms' ? (
            <SymptomsView data={data.parsedData} />
          ) : data && data.dataType === 'properties' ? (
            <PropertiesView data={data.parsedData} />
          ) : data && data.dataType === 'latestStats' ? (
            <LatestStatsView data={data.parsedData} resourceId={resourceId} />
          ) : data ? (
            <div className="text-gray-600">Bu veri tipi için görünüm henüz eklenmedi: {data.dataType}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Relationships görünümü komponenti
function RelationshipsView({ data }) {
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

  return (
    <div className="space-y-2">
      {/* Özet Bilgiler */}
      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-xs text-gray-600">Toplam Resource</div>
            <div className="text-lg font-bold text-gray-900">{data.totalCount || 0}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">İlişki Tipi</div>
            <div className="text-sm font-semibold text-gray-900">{data.relationshipType || 'ALL'}</div>
          </div>
          {data.pageInfo && (
            <div>
              <div className="text-xs text-gray-600">Sayfa Bilgisi</div>
              <div className="text-xs text-gray-900">
                Sayfa {data.pageInfo.page + 1} / {Math.ceil(data.pageInfo.totalCount / data.pageInfo.pageSize)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resource Listesi */}
      {data.resources && data.resources.length > 0 ? (
        <div className="space-y-2">
          {data.resources.map((resource, index) => (
            <div key={resource.resourceId || index} className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
              {/* Resource Header */}
              <div className="flex items-start justify-between mb-2 pb-2 border-b border-gray-200">
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-900">{resource.name || 'N/A'}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {resource.resourceKindKey || 'N/A'} • {resource.adapterKindKey || 'N/A'}
                  </p>
                  {resource.resourceId && (
                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono">ID: {resource.resourceId}</p>
                  )}
                </div>
                {/* Badges */}
                {resource.badges && resource.badges.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {resource.badges.map((badge, badgeIndex) => (
                      <div
                        key={badgeIndex}
                        className={`px-1.5 py-0.5 rounded text-xs font-semibold border ${getBadgeColor(badge.color)}`}
                      >
                        {getBadgeTypeLabel(badge.type)}: {badge.score === -1 ? 'N/A' : badge.score.toFixed(1)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Identifiers */}
              {resource.identifiers && resource.identifiers.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-semibold text-gray-600 mb-1">Tanımlayıcılar</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                    {resource.identifiers.map((ident, identIndex) => (
                      <div key={identIndex} className="text-xs">
                        <div className="text-gray-500">{ident.name}:</div>
                        <div className="text-gray-900 font-mono break-all text-[10px]">{ident.value || '-'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Creation Time */}
              {resource.creationTime && (
                <div className="mt-2 text-[10px] text-gray-500">
                  Oluşturulma: {new Date(resource.creationTime).toLocaleString('tr-TR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          İlişkili resource bulunamadı
        </div>
      )}
    </div>
  );
}

// Alerts görünümü komponenti
function AlertsView({ data }) {
  // Alert seviyesi rengini belirle
  const getAlertLevelColor = (level) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300';
      case 'IMMEDIATE': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'WARNING': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'INFO': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Alert durumu rengini belirle
  const getAlertStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-300';
      case 'CANCELED': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'ACKNOWLEDGED': return 'bg-blue-100 text-blue-800 border-blue-300';
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

  return (
    <div className="space-y-2">
      {/* Özet Bilgiler */}
      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <div className="text-xs text-gray-600">Toplam Alert</div>
            <div className="text-lg font-bold text-gray-900">{data.totalCount || 0}</div>
          </div>
          {data.summary && (
            <>
              <div>
                <div className="text-xs text-gray-600">CRITICAL</div>
                <div className="text-base font-bold text-red-600">{data.summary.byLevel?.CRITICAL || 0}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">WARNING</div>
                <div className="text-base font-bold text-yellow-600">{data.summary.byLevel?.WARNING || 0}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">ACTIVE</div>
                <div className="text-base font-bold text-green-600">{data.summary.byStatus?.ACTIVE || 0}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Alert Listesi */}
      {data.alerts && data.alerts.length > 0 ? (
        <div className="space-y-2">
          {data.alerts.map((alert, index) => (
            <div key={alert.alertId || index} className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
              {/* Alert Header */}
              <div className="flex items-start justify-between mb-2 pb-2 border-b border-gray-200">
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-900">{alert.alertDefinitionName || 'N/A'}</h4>
                  {alert.resourceId && (
                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono">Resource ID: {alert.resourceId}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  {/* Alert Level */}
                  <span className={`px-1.5 py-0.5 rounded text-xs font-semibold border ${getAlertLevelColor(alert.alertLevel)}`}>
                    {alert.alertLevel || 'N/A'}
                  </span>
                  {/* Alert Status */}
                  <span className={`px-1.5 py-0.5 rounded text-xs font-semibold border ${getAlertStatusColor(alert.status)}`}>
                    {alert.status || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Alert Detayları */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div>
                  <div className="text-gray-600 text-[10px] mb-0.5">Başlangıç</div>
                  <div className="text-gray-900">{formatTimestamp(alert.startTimeUTC)}</div>
                </div>
                {alert.cancelTimeUTC && alert.cancelTimeUTC > 0 && (
                  <div>
                    <div className="text-gray-600 text-[10px] mb-0.5">İptal</div>
                    <div className="text-gray-900">{formatTimestamp(alert.cancelTimeUTC)}</div>
                  </div>
                )}
                <div>
                  <div className="text-gray-600 text-[10px] mb-0.5">Güncelleme</div>
                  <div className="text-gray-900">{formatTimestamp(alert.updateTimeUTC)}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-[10px] mb-0.5">Etki</div>
                  <div className="text-gray-900">{alert.alertImpact || 'N/A'}</div>
                </div>
              </div>

              {/* Control State */}
              {alert.controlState && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-[10px] text-gray-600">Kontrol Durumu: <span className="font-semibold text-gray-900">{alert.controlState}</span></div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <div className="text-gray-400 mb-2">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 font-semibold">Alert bulunamadı</p>
          <p className="text-sm text-gray-500 mt-1">Bu resource için aktif alert yok</p>
        </div>
      )}
    </div>
  );
}

// StatKeys görünümü komponenti
function StatKeysView({ data }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStatKey, setSelectedStatKey] = useState(null);

  // Sıralama fonksiyonu
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filtrelenmiş ve sıralanmış veri
  const filteredAndSortedData = useMemo(() => {
    let result = [...(data.statKeys || [])];
    
    // Kategori filtresi
    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category === selectedCategory);
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
  }, [data.statKeys, sortConfig, selectedCategory]);

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

  const handleOpenModal = (statKey) => {
    setSelectedStatKey(statKey);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStatKey(null);
  };

  if (!data || !data.statKeys || data.statKeys.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
        <div className="text-gray-400 mb-2">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-gray-600 font-semibold">StatKey bulunamadı</p>
        <p className="text-sm text-gray-500 mt-1">Bu resource için statKey yok</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Özet Bilgiler */}
      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div>
            <div className="text-xs text-gray-600">Toplam StatKey</div>
            <div className="text-lg font-bold text-gray-900">{data.totalCount || 0}</div>
          </div>
          {data.resourceId && (
            <div>
              <div className="text-xs text-gray-600">Resource ID</div>
              <div className="text-xs font-mono text-gray-900 break-all">{data.resourceId}</div>
            </div>
          )}
          {data.categories && data.categories.length > 0 && (
            <div>
              <div className="text-xs text-gray-600">Kategori Sayısı</div>
              <div className="text-sm font-semibold text-gray-900">{data.categories.length}</div>
            </div>
          )}
        </div>
      </div>

      {/* Kategori Filtresi */}
      {data.categories && data.categories.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-gray-600 font-semibold">Kategori:</label>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Tümü</option>
              {data.categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      )}

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
          {startIndex + 1}-{Math.min(endIndex, filteredAndSortedData.length)} / {filteredAndSortedData.length} kayıt
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('category')}
                >
                  Kategori {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  StatKey Adı {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Birim</th>
                <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 w-24">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.map((item, index) => (
                <tr
                  key={`${item.key}-${index}`}
                  className="hover:bg-gray-50 relative"
                  onMouseEnter={() => setHoveredRow(index)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td className="px-2 py-1.5 text-xs text-gray-900">{item.category || 'Diğer'}</td>
                  <td className="px-2 py-1.5 text-xs text-gray-900 font-medium">{item.name}</td>
                  <td className="px-2 py-1.5 text-xs text-gray-600">{item.unit || '-'}</td>
                  <td className="px-2 py-1.5 text-xs text-gray-900 w-24 relative">
                    {hoveredRow === index && (
                      <button
                        onClick={() => handleOpenModal(item.key)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg whitespace-nowrap"
                      >
                        Ne işe yarar?
                      </button>
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

      {/* Metric Info Modal */}
      <MetricInfoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        statKey={selectedStatKey}
        resourceId={data.resourceId}
      />
    </div>
  );
}

// Symptoms görünümü komponenti
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
      <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
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
      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
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
          <div key={symptom.id || index} className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
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
                <div className="text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200 font-mono break-all">
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

// Properties görünümü komponenti
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
    <div className="space-y-2">
      {/* Özet Bilgiler */}
      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div>
            <div className="text-xs text-gray-600">Toplam Property</div>
            <div className="text-lg font-bold text-gray-900">{data.totalCount || 0}</div>
          </div>
          {data.resourceId && (
            <div>
              <div className="text-xs text-gray-600">Resource ID</div>
              <div className="text-xs font-mono text-gray-900 break-all">{data.resourceId}</div>
            </div>
          )}
          {data.categories && data.categories.length > 0 && (
            <div>
              <div className="text-xs text-gray-600">Kategori Sayısı</div>
              <div className="text-sm font-semibold text-gray-900">{data.categories.length}</div>
            </div>
          )}
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 space-y-2">
        {/* Kategori Filtresi */}
        {data.categories && data.categories.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-gray-600 font-semibold">Kategori:</label>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <label className="text-xs text-gray-600 font-semibold">Ara:</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Property adı veya değerinde ara..."
            className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
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
                  className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('category')}
                >
                  Kategori {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('displayName')}
                >
                  Property Adı {sortConfig.key === 'displayName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('value')}
                >
                  Değer {sortConfig.key === 'value' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.map((prop, index) => (
                <tr key={`${prop.name}-${index}`} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5 text-xs text-gray-900">{prop.category || 'General'}</td>
                  <td className="px-2 py-1.5 text-xs text-gray-900 font-medium font-mono break-all">{prop.displayName || prop.name}</td>
                  <td className="px-2 py-1.5 text-xs text-gray-600 break-all">{prop.value || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

// Latest Stats görünümü komponenti
function LatestStatsView({ data, resourceId }) {
  // LatestStatsTable komponenti zaten hazır, onu kullanıyoruz
  // Ancak data yapısını kontrol edip uygun formata çevirmemiz gerekebilir
  if (!data || !data.resources || data.resources.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
        <div className="text-gray-400 mb-2">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-gray-600 font-semibold">Latest Stats bulunamadı</p>
        <p className="text-sm text-gray-500 mt-1">Bu resource için latest stats yok</p>
      </div>
    );
  }

  // LatestStatsTable komponenti data.resources array'ini bekliyor
  // Eğer data yapısı farklıysa, uygun formata çeviriyoruz
  const tableData = {
    resources: data.resources || [],
    resourceId: resourceId || data.resourceId || null
  };

  return <LatestStatsTable data={tableData} />;
}

export default ResourceLinkModal;

