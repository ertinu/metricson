// Alert görselleştirme sayfası - vROPS alert'lerini tablo ve filtrelerle gösterir
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VropsDataTable from '../../components/VropsDataTable';
import AlertFilters from '../../components/filters/AlertFilters';

function AlertsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // localStorage'dan vROPS data'sını yükle
    const savedData = localStorage.getItem('vropsData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.dataType === 'alerts' && parsed.data) {
          setData(parsed.data);
        } else {
          // Yanlış veri tipi veya veri yoksa chat sayfasına yönlendir
          navigate('/');
        }
      } catch (error) {
        console.error('Data parse hatası:', error);
        navigate('/');
      }
    } else {
      // Data yoksa chat sayfasına yönlendir
      navigate('/');
    }
    setLoading(false);
  }, [navigate]);

  // Filtrelenmiş veriyi güncelle
  const handleFilterChange = (filteredData) => {
    setData(prevData => ({
      ...prevData,
      alerts: filteredData
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Yükleniyor...</div>
      </div>
    );
  }

  if (!data || !data.alerts) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Veri bulunamadı</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Başlık ve geri dön butonu */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Alert Görselleştirme</h1>
            <p className="text-gray-400">
              Toplam {data.totalCount} alert bulundu
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Chat'e Dön
          </button>
        </div>

        {/* Özet istatistikler */}
        {data.summary && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400">Kritik</div>
              <div className="text-2xl font-bold text-red-500">
                {data.summary.byLevel?.CRITICAL || 0}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400">Acil</div>
              <div className="text-2xl font-bold text-orange-500">
                {data.summary.byLevel?.IMMEDIATE || 0}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400">Aktif</div>
              <div className="text-2xl font-bold text-yellow-500">
                {data.summary.byStatus?.ACTIVE || 0}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400">Toplam</div>
              <div className="text-2xl font-bold">
                {data.totalCount}
              </div>
            </div>
          </div>
        )}

        {/* Filtreler */}
        <AlertFilters 
          data={data.alerts} 
          onFilter={handleFilterChange}
          summary={data.summary}
        />

        {/* Tablo */}
        <VropsDataTable 
          data={data.alerts} 
          dataType="alerts" 
        />
      </div>
    </div>
  );
}

export default AlertsPage;

