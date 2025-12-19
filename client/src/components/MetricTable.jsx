// Metric verilerini tablo formatında gösteren komponent
import { useState, useMemo } from 'react';

function MetricTable({ data }) {
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
    let result = [...(data.metrics || [])];
    
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
  }, [data.metrics, sortConfig]);

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

  if (!data || !data.metrics || data.metrics.length === 0) {
    return (
      <div className="mt-6 bg-white border border-gray-200 rounded-md p-4">
        <p className="text-gray-600">Metric verisi bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Özet istatistikler */}
      {data.summary && (
        <div className="mb-2 grid grid-cols-4 gap-2">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
            <div className="text-xs text-blue-600 font-semibold">Minimum</div>
            <div className="text-lg font-bold text-blue-700">
              {data.summary.min !== null && data.summary.min !== undefined && !isNaN(data.summary.min) 
                ? `${Number(data.summary.min).toFixed(2)} ${data.unit || ''}` 
                : 'N/A'}
            </div>
            {data.summary.minTimestamp && (
              <div className="text-xs text-blue-500 mt-1">
                {new Date(data.summary.minTimestamp).toLocaleString('tr-TR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            )}
          </div>
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="text-xs text-green-600 font-semibold">Maksimum</div>
            <div className="text-xl font-bold text-green-700">
              {data.summary.max !== null && data.summary.max !== undefined && !isNaN(data.summary.max)
                ? `${Number(data.summary.max).toFixed(2)} ${data.unit || ''}` 
                : 'N/A'}
            </div>
            {data.summary.maxTimestamp && (
              <div className="text-xs text-green-500 mt-1">
                {new Date(data.summary.maxTimestamp).toLocaleString('tr-TR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            )}
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-md p-2">
            <div className="text-xs text-purple-600 font-semibold">Ortalama</div>
            <div className="text-lg font-bold text-purple-700">
              {data.summary.avg !== null && data.summary.avg !== undefined && !isNaN(data.summary.avg)
                ? `${Number(data.summary.avg).toFixed(2)} ${data.unit || ''}` 
                : 'N/A'}
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-md p-2">
            <div className="text-xs text-orange-600 font-semibold">Son Değer</div>
            <div className="text-lg font-bold text-orange-700">
              {data.summary.latest !== null && data.summary.latest !== undefined && !isNaN(data.summary.latest)
                ? `${Number(data.summary.latest).toFixed(2)} ${data.unit || ''}` 
                : 'N/A'}
            </div>
            {data.summary.latestTimestamp && (
              <div className="text-xs text-orange-500 mt-1">
                {new Date(data.summary.latestTimestamp).toLocaleString('tr-TR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            )}
          </div>
        </div>
      )}

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
                  onClick={() => handleSort('timestamp')}
                >
                  Zaman {sortConfig.key === 'timestamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('value')}
                >
                  Değer ({data.unit || ''}) {sortConfig.key === 'value' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.map((metric, index) => (
                <tr key={metric.timestamp || index} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5 text-xs text-gray-900">{metric.formattedDate}</td>
                  <td className="px-2 py-1.5 text-xs text-gray-900 font-medium">{metric.formattedValue}</td>
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

export default MetricTable;

