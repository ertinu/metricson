// Alert filtreleme komponenti - Alert'leri seviye, durum, etki gibi kriterlere göre filtreler
import { useState, useMemo, useEffect } from 'react';

function AlertFilters({ data, onFilter, summary }) {
  const [filters, setFilters] = useState({
    alertLevel: '',
    status: '',
    alertImpact: '',
    search: ''
  });

  // Filtrelenmiş veri
  const filteredData = useMemo(() => {
    let result = [...data];

    // Alert level filtresi
    if (filters.alertLevel) {
      result = result.filter(item => item.alertLevel === filters.alertLevel);
    }

    // Status filtresi
    if (filters.status) {
      result = result.filter(item => item.status === filters.status);
    }

    // Impact filtresi
    if (filters.alertImpact) {
      result = result.filter(item => item.alertImpact === filters.alertImpact);
    }

    // Arama filtresi (alert adında ara)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(item => 
        item.alertDefinitionName?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [data, filters]);

  // Filtre değiştiğinde parent'a bildir
  useEffect(() => {
    if (onFilter) {
      onFilter(filteredData);
    }
  }, [filteredData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Unique değerleri al
  const alertLevels = useMemo(() => 
    [...new Set(data.map(item => item.alertLevel))].filter(Boolean).sort(),
    [data]
  );

  const statuses = useMemo(() => 
    [...new Set(data.map(item => item.status))].filter(Boolean).sort(),
    [data]
  );

  const impacts = useMemo(() => 
    [...new Set(data.map(item => item.alertImpact))].filter(Boolean).sort(),
    [data]
  );

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      alertLevel: '',
      status: '',
      alertImpact: '',
      search: ''
    });
  };

  return (
    <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Filtreler</h2>
        <button
          onClick={clearFilters}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Filtreleri Temizle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Arama */}
        <div>
          <label className="block text-sm text-gray-700 mb-2 font-medium">Ara</label>
          <input
            type="text"
            placeholder="Alert adında ara..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Alert Level */}
        <div>
          <label className="block text-sm text-gray-700 mb-2 font-medium">Seviye</label>
          <select
            value={filters.alertLevel}
            onChange={(e) => handleFilterChange('alertLevel', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tüm Seviyeler</option>
            {alertLevels.map(level => (
              <option key={level} value={level}>
                {level} ({summary?.byLevel?.[level] || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm text-gray-700 mb-2 font-medium">Durum</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tüm Durumlar</option>
            {statuses.map(status => (
              <option key={status} value={status}>
                {status} ({summary?.byStatus?.[status] || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Impact */}
        <div>
          <label className="block text-sm text-gray-700 mb-2 font-medium">Etki</label>
          <select
            value={filters.alertImpact}
            onChange={(e) => handleFilterChange('alertImpact', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tüm Etkiler</option>
            {impacts.map(impact => (
              <option key={impact} value={impact}>
                {impact} ({summary?.byImpact?.[impact] || 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filtre sonuç sayısı */}
      <div className="mt-4 text-sm text-gray-600">
        {filteredData.length} / {data.length} kayıt gösteriliyor
      </div>
    </div>
  );
}

export default AlertFilters;

