// StatKeys verilerini tablo formatında gösteren komponent
import { useState, useMemo } from 'react';
import MetricInfoModal from './MetricInfoModal';

function StatKeysTable({ data }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
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

  if (!data || !data.statKeys || data.statKeys.length === 0) {
    return (
      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">StatKeys verisi bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Modal */}
      <MetricInfoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedStatKey(null);
        }}
        statKey={selectedStatKey}
        resourceId={data.resourceId}
      />

      {/* Resource ID bilgisi */}
      {data.resourceId && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">
            Resource ID: <span className="font-mono text-gray-800">{data.resourceId}</span>
          </p>
        </div>
      )}

      {/* Kategori filtresi */}
      {data.categories && data.categories.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <label className="text-sm text-gray-600 font-semibold">Kategori:</label>
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tümü ({data.totalCount})</option>
            {data.categories.map(category => (
              <option key={category} value={category}>
                {category} ({data.byCategory[category].length})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Sayfa başına kayıt sayısı seçici */}
      <div className="mb-4 flex items-center justify-between">
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

      {/* Tablo */}
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
                  onClick={() => handleSort('name')}
                >
                  StatKey Adı {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-700"
                >
                  Birim
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('key')}
                >
                  Tam StatKey {sortConfig.key === 'key' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-32">
                  İşlem
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.map((item, index) => (
                <tr 
                  key={`${item.key}-${index}`} 
                  className="hover:bg-gray-50 relative"
                  onMouseEnter={() => {
                    setHoveredRow(index);
                    setSelectedStatKey(item.key);
                  }}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                    {item.category || 'Diğer'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.unit || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <span className="font-mono text-xs">{item.key}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {hoveredRow === index && (
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
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
      
      {/* Sayfalama kontrolleri */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
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

export default StatKeysTable;

