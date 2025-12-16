// Resource detay sayfası - Belirli bir resource'un detaylı bilgilerini gösterir
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sendMessage } from '../services/api';

function ResourceDetailPage() {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const [resourceData, setResourceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!resourceId) {
      setError('Resource ID bulunamadı');
      setIsLoading(false);
      return;
    }

    // Resource detaylarını çek
    const fetchResourceDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // ChatGPT'ye resource detail endpoint'i üretmesini söyle
        const question = `/api/resources/${resourceId} endpoint'ini çalıştır`;
        const response = await sendMessage(question);
        
        if (response.parsedData && response.dataType === 'resourceDetail') {
          setResourceData(response.parsedData);
        } else {
          setError('Resource detayları alınamadı');
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResourceDetail();
  }, [resourceId]);

  // Health rengini belirle
  const getHealthColor = (health) => {
    switch (health) {
      case 'GREEN': return 'text-green-600 bg-green-50 border-green-200';
      case 'YELLOW': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'RED': return 'text-red-600 bg-red-50 border-red-200';
      case 'GRAY': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Resource detayları yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Hata</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  if (!resourceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Resource detayları bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="mb-4 text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Geri Dön
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{resourceData.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Resource ID: {resourceData.resourceId}</p>
        </div>

        {/* Health ve Temel Bilgiler */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Health Card */}
          <div className={`bg-white rounded-lg shadow-sm border-2 p-6 ${getHealthColor(resourceData.health)}`}>
            <div className="text-sm font-semibold mb-2">Sağlık Durumu</div>
            <div className="text-3xl font-bold mb-1">{resourceData.health}</div>
            {resourceData.healthValue !== null && (
              <div className="text-sm opacity-75">Skor: {resourceData.healthValue.toFixed(1)}</div>
            )}
          </div>

          {/* Resource Type */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-2">Resource Tipi</div>
            <div className="text-xl font-semibold text-gray-900">{resourceData.resourceKindKey || 'N/A'}</div>
            <div className="text-sm text-gray-500 mt-1">Adapter: {resourceData.adapterKindKey || 'N/A'}</div>
          </div>

          {/* Creation Time */}
          {resourceData.creationTime && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm text-gray-600 mb-2">Oluşturulma Tarihi</div>
              <div className="text-lg font-semibold text-gray-900">
                {new Date(resourceData.creationTime).toLocaleString('tr-TR', {
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
        {resourceData.badges && resourceData.badges.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Rozetler (Badges)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {resourceData.badges.map((badge, index) => (
                <div
                  key={index}
                  className={`rounded-lg border-2 p-4 text-center ${getBadgeColor(badge.color)}`}
                >
                  <div className="text-xs font-semibold mb-2">{getBadgeTypeLabel(badge.type)}</div>
                  <div className="text-2xl font-bold">
                    {badge.score === -1 ? 'N/A' : badge.score.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resource Identifiers */}
        {resourceData.identifiers && resourceData.identifiers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Resource Tanımlayıcıları</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">İsim</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Değer</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Veri Tipi</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Benzersizlik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {resourceData.identifiers.map((ident, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{ident.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{ident.value || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{ident.dataType}</td>
                      <td className="px-4 py-3 text-sm">
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
        {resourceData.statusStates && resourceData.statusStates.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Durum Bilgileri</h2>
            <div className="space-y-3">
              {resourceData.statusStates.map((state, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900 mb-1">Adapter Instance ID</div>
                    <div className="text-xs text-gray-600 font-mono mb-2">{state.adapterInstanceId}</div>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(state.resourceStatus)}`}>
                        {state.resourceStatus}
                      </span>
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(state.resourceState)}`}>
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
        {resourceData.links && resourceData.links.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">İlgili Linkler</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {resourceData.links.map((link, index) => (
                <a
                  key={index}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    // Link'e göre navigasyon yap
                    if (link.name === 'statKeysOfResource') {
                      navigate(`/statkeys?resourceId=${resourceData.resourceId}`);
                    } else if (link.name === 'alertsOfResource') {
                      navigate(`/data/alerts?resourceId=${resourceData.resourceId}`);
                    } else if (link.name === 'latestStatsOfResource') {
                      navigate(`/stats/latest?resourceId=${resourceData.resourceId}`);
                    }
                  }}
                  className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                >
                  <div className="text-sm font-semibold text-gray-900">{link.name}</div>
                  <div className="text-xs text-gray-500 mt-1 font-mono truncate">{link.href}</div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResourceDetailPage;

