// TopN Stats verilerini tablo formatında gösteren komponent
// En fazla/az kaynak tüketen VM'leri listeler
import { useState, useMemo } from 'react';

function TopNStatsTable({ data }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatKey, setSelectedStatKey] = useState(null);

  // İlk statKey'i varsayılan olarak seç
  useMemo(() => {
    if (data?.statKeys && data.statKeys.length > 0 && !selectedStatKey) {
      setSelectedStatKey(data.statKeys[0]);
    }
  }, [data?.statKeys, selectedStatKey]);

  // Sıralama fonksiyonu
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // VM'leri düzleştir - seçili statKey'e göre
  const flattenedData = useMemo(() => {
    if (!data?.vms || !Array.isArray(data.vms)) {
      return [];
    }

    const result = [];
    data.vms.forEach((vm) => {
      // Seçili statKey varsa sadece onu göster, yoksa tüm statKey'leri göster
      const statKeysToShow = selectedStatKey 
        ? [selectedStatKey] 
        : (vm.statKeys || []);

      statKeysToShow.forEach((statKey) => {
        const stat = vm.stats[statKey];
        if (stat) {
          result.push({
            rank: vm.rank,
            resourceId: vm.resourceId,
            name: vm.name || vm.resourceId || 'N/A',
            statKey: statKey,
            value: stat.value,
            formattedValue: stat.formattedValue,
            unit: stat.unit,
            avgValue: stat.avgValue,
            latestValue: stat.latestValue
          });
        }
      });
    });
    return result;
  }, [data?.vms, selectedStatKey]);

  // Sıralanmış veri
  const sortedData = useMemo(() => {
    let result = [...flattenedData];
    
    if (sortConfig.key) {
      result = result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        // Null/undefined değerleri en alta al
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        // Sayısal değerler için karşılaştırma
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          const comparison = aVal > bVal ? 1 : -1;
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        }
        
        // String değerler için karşılaştırma
        const comparison = String(aVal).localeCompare(String(bVal));
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

  if (!data || !data.vms || data.vms.length === 0) {
    return (
      <div className="mt-6 bg-white border border-gray-200 rounded-md p-4">
        <p className="text-gray-600">TopN stats verisi bulunamadı.</p>
      </div>
    );
  }

  const sortOrderText = data.sortOrder === 'DESCENDING' ? 'En Fazla' : 'En Az';

  return (
    <div className="mt-6">
      {/* StatKey seçici */}
      {data.statKeys && data.statKeys.length > 1 && (
        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm text-gray-700 font-medium">Metrik:</label>
          <select
            value={selectedStatKey || ''}
            onChange={(e) => {
              setSelectedStatKey(e.target.value || null);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tüm Metrikler</option>
            {data.statKeys.map((statKey) => (
              <option key={statKey} value={statKey}>
                {statKey}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-600">
            ({sortOrderText} {data.totalCount} VM)
          </span>
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
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('rank')}
                >
                  Sıra {sortConfig.key === 'rank' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  VM İsmi {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('statKey')}
                >
                  Metrik {sortConfig.key === 'statKey' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('value')}
                >
                  Değer {sortConfig.key === 'value' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.map((item, index) => (
                <tr key={`${item.resourceId}-${item.statKey}-${index}`} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-900 font-medium">
                    #{item.rank}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-900 font-medium">
                        {item.name}
                      </span>
                      <span className="text-xs text-gray-500 font-mono mt-0.5">
                        {item.resourceId}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700">
                    <span className="font-mono text-xs">{item.statKey}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-900 font-semibold">
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

export default TopNStatsTable;

