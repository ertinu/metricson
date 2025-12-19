// Latest stats verilerini tablo formatında gösteren komponent
import { useState, useMemo } from 'react';

function LatestStatsTable({ data }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedResources, setExpandedResources] = useState(new Set());

  // Sıralama fonksiyonu
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Resource'ları düzleştir - her stat için bir satır oluştur
  const flattenedData = useMemo(() => {
    const result = [];
    data.resources.forEach((resource) => {
      resource.stats.forEach((stat) => {
        result.push({
          resourceId: resource.resourceId,
          statKey: stat.statKey,
          timestamp: stat.timestamp,
          value: stat.value,
          formattedDate: stat.formattedDate,
          formattedValue: stat.formattedValue,
          unit: stat.unit
        });
      });
    });
    return result;
  }, [data.resources]);

  // Sıralanmış veri
  const sortedData = useMemo(() => {
    let result = [...flattenedData];
    
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
  }, [flattenedData, sortConfig]);

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

  // Resource'u genişlet/daralt
  const toggleResource = (resourceId) => {
    setExpandedResources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resourceId)) {
        newSet.delete(resourceId);
      } else {
        newSet.add(resourceId);
      }
      return newSet;
    });
  };

  if (!data || !data.resources || data.resources.length === 0) {
    return (
      <div className="mt-6 bg-white border border-gray-200 rounded-md p-4">
        <p className="text-gray-600">Latest stats verisi bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
        {/* Sayfa başına kayıt sayısı seçici */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Sayfa başına:</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Tablo */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th 
                  className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('statKey')}
                >
                  StatKey {sortConfig.key === 'statKey' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('timestamp')}
                >
                  Zaman {sortConfig.key === 'timestamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
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
              {paginatedData.map((item, index) => (
                <tr key={`${item.resourceId}-${item.statKey}-${index}`} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5 text-xs text-gray-900">
                    <span className="font-mono text-xs">{item.statKey}</span>
                  </td>
                  <td className="px-2 py-1.5 text-xs text-gray-900">
                    {item.formattedDate}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-gray-900 font-medium">
                    {item.formattedValue}
                  </td>
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

export default LatestStatsTable;

