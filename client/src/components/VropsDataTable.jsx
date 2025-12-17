// vROPS verilerini tablo formatında gösteren genel komponent
// Alert, metric, property gibi farklı veri tipleri için kullanılabilir
import { useState, useMemo } from 'react';

function VropsDataTable({ data, dataType }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [pageSize, setPageSize] = useState(50); // Sayfa başına kayıt sayısı
  const [currentPage, setCurrentPage] = useState(1); // Mevcut sayfa

  // Sıralama fonksiyonu
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sıralanmış veri
  const sortedData = useMemo(() => {
    let result = [...data];
    
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
  }, [data, sortConfig]);

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

  // Alert tipi için özel render
  if (dataType === 'alerts') {
    return (
      <div className="mt-6">
        {/* Sayfa başına kayıt sayısı seçici */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Sayfa başına:</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1); // Sayfa boyutu değişince ilk sayfaya dön
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
            {startIndex + 1}-{Math.min(endIndex, sortedData.length)} / {sortedData.length} kayıt
          </div>
        </div>

        {/* Tablo - Light mode */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('alertDefinitionName')}
                  >
                    Alert Adı {sortConfig.key === 'alertDefinitionName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('alertLevel')}
                  >
                    Seviye {sortConfig.key === 'alertLevel' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    Durum {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('startTimeUTC')}
                  >
                    Başlangıç {sortConfig.key === 'startTimeUTC' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('alertImpact')}
                  >
                    Etki {sortConfig.key === 'alertImpact' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedData.map((alert, index) => (
                  <tr key={alert.alertId || index} className="hover:bg-gray-50">
                    <td className="px-2 py-1.5 text-xs text-gray-900">{alert.alertDefinitionName}</td>
                    <td className="px-2 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                        alert.alertLevel === 'CRITICAL' ? 'bg-red-100 text-red-800 border border-red-200' :
                        alert.alertLevel === 'IMMEDIATE' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                        alert.alertLevel === 'WARNING' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                        'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {alert.alertLevel}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        alert.status === 'ACTIVE' ? 'bg-green-100 text-green-800 border border-green-200' :
                        alert.status === 'CANCELED' ? 'bg-gray-100 text-gray-800 border border-gray-200' :
                        'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-600">
                      {formatTimestamp(alert.startTimeUTC)}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-900">{alert.alertImpact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Sayfalama kontrolleri */}
        {totalPages > 1 && (
          <div className="mt-2 flex items-center justify-between">
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

  // Diğer veri tipleri için genel render (ileride eklenecek)
  return (
    <div className="mt-6">
      <div className="bg-gray-800 rounded-lg p-4">
        <p className="text-gray-400">Bu veri tipi için tablo görünümü henüz eklenmedi.</p>
      </div>
    </div>
  );
}

// Timestamp'i okunabilir formata çevir
function formatTimestamp(timestamp) {
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
}

export default VropsDataTable;

