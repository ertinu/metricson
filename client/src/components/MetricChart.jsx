// Metric verilerini grafik formatında gösteren komponent
// X ekseni zoom (zaman aralığı filtreleme) ve tam ekran özellikleri içerir
import { useState, useRef, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush, ReferenceLine } from 'recharts';

function MetricChart({ data }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chartHeight, setChartHeight] = useState(450);
  const chartRef = useRef(null);

  if (!data || !data.metrics || data.metrics.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
        <p className="text-gray-600">Grafik için veri bulunamadı.</p>
      </div>
    );
  }

  // Grafik için veri formatına çevir - timestamp'e göre sırala
  const chartData = useMemo(() => {
    if (!data || !data.metrics || data.metrics.length === 0) {
      console.log('MetricChart - No metrics data:', data);
      return [];
    }

    const processed = data.metrics
      .map((metric, index) => {
        const value = typeof metric.value === 'number' 
          ? metric.value 
          : (metric.value !== null && metric.value !== undefined 
              ? parseFloat(metric.value) 
              : null);
        
        // Timestamp'i sayıya çevir (epoch milliseconds)
        const timestamp = typeof metric.timestamp === 'number' 
          ? metric.timestamp 
          : parseInt(metric.timestamp) || 0;
        
        // Tarih formatı - daha kısa ve okunabilir
        const dateObj = new Date(timestamp);
        const timeLabel = dateObj.toLocaleString('tr-TR', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        
        return {
          time: timeLabel,
          timestamp: timestamp,
          value: value,
          formattedValue: metric.formattedValue,
          originalValue: metric.value, // Debug için
          index: index
        };
      })
      .filter(item => {
        const isValid = item.value !== null && item.value !== undefined && !isNaN(item.value) && item.timestamp > 0;
        if (!isValid) {
          console.log('MetricChart - Filtered out invalid item:', item);
        }
        return isValid;
      })
      .sort((a, b) => a.timestamp - b.timestamp); // Zaman sırasına göre sırala

    console.log('MetricChart - Processed chartData:', {
      originalCount: data.metrics.length,
      processedCount: processed.length,
      sample: processed.slice(0, 3),
      allValues: processed.map(d => ({ value: d.value, time: d.time, timestamp: d.timestamp })),
      valueRange: {
        min: Math.min(...processed.map(d => d.value)),
        max: Math.max(...processed.map(d => d.value))
      },
      timestampRange: {
        min: new Date(Math.min(...processed.map(d => d.timestamp))).toISOString(),
        max: new Date(Math.max(...processed.map(d => d.timestamp))).toISOString()
      }
    });

    return processed;
  }, [data.metrics]);

  // Brush ile filtrelenmiş veri (zoom için) - Brush komponenti kendi state'ini yönetiyor
  const filteredChartData = chartData;

  // Tam ekran toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      // Tam ekran aç
      const element = chartRef.current;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      // Tam ekran kapat
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Fullscreen değişikliklerini dinle ve yüksekliği güncelle
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreen = !!document.fullscreenElement;
      setIsFullscreen(fullscreen);
      setChartHeight(fullscreen ? window.innerHeight - 200 : 400);
    };

    const handleResize = () => {
      if (isFullscreen) {
        setChartHeight(window.innerHeight - 200);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [isFullscreen]);

  // Brush değişiklik handler'ı - şimdilik sadece log
  const handleBrushChange = (brushData) => {
    // Brush komponenti kendi state'ini yönetiyor, biz sadece log tutuyoruz
    if (brushData) {
      console.log('Brush changed:', brushData);
    }
  };

  // Zoom sıfırla - Brush'ı resetlemek için
  const resetZoom = () => {
    // Brush komponenti kendi state'ini yönetiyor
    // Sayfayı yenilemek yerine, Brush'ı kaldırıp tekrar ekleyebiliriz
    // Ama şimdilik kullanıcıya bilgi verelim
    alert('Zoom\'u sıfırlamak için alt çubuğu manuel olarak genişletin.');
  };

  return (
    <div ref={chartRef} className={`bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-md p-6 shadow-lg ${isFullscreen ? 'fixed inset-0 z-50 overflow-auto' : ''}`}>
      {/* Grafik başlık ve kontroller */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Metric Grafiği</h3>
          {data.statKey && (
            <p className="text-sm text-gray-600">
              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{data.statKey}</span>
              {data.unit && <span className="ml-2 text-gray-500">({data.unit})</span>}
              {data.resourceId && (
                <span className="ml-2 text-xs text-gray-400">Resource: {data.resourceId}</span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetZoom}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700 transition-all shadow-sm hover:shadow"
            title="Zoom Sıfırla"
          >
            ↺ Tümünü Göster
          </button>
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700 transition-all shadow-sm hover:shadow"
            title="Tam Ekran"
          >
            {isFullscreen ? '✕ Kapat' : '⛶ Tam Ekran'}
          </button>
        </div>
      </div>

      {/* Grafik */}
      {chartData.length > 0 ? (
        <div className="bg-white rounded-md border border-gray-200 shadow-inner p-4" style={{ height: `${chartHeight}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={filteredChartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis 
                dataKey="time"
                type="category"
                stroke="#6b7280"
                fontSize={11}
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fill: '#6b7280' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: '#6b7280' }}
                domain={['auto', 'auto']}
                allowDataOverflow={false}
                label={{ 
                  value: data.unit || 'Değer', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: '#6b7280' }
                }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value) => {
                  const numValue = typeof value === 'number' ? value : parseFloat(value);
                  return [`${!isNaN(numValue) ? numValue.toFixed(2) : 'N/A'} ${data.unit || ''}`, 'Değer'];
                }}
                labelFormatter={(label) => `⏰ ${label}`}
                cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '5 5' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                name={`${data.statKey || 'Metric'} (${data.unit || ''})`}
                isAnimationActive={false}
                connectNulls={false}
              />
              {/* Brush - X ekseni zoom için */}
              {chartData.length > 1 && (
                <Brush 
                  dataKey="time"
                  height={30}
                  stroke="#3b82f6"
                  fill="#e0e7ff"
                  onChange={handleBrushChange}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-500 bg-white rounded-md border border-gray-200">
          Grafik için geçerli veri bulunamadı
        </div>
      )}

      {/* Grafik bilgileri */}
      <div className="mt-4 space-y-2">
        {/* Tarih aralığı */}
        {chartData.length > 0 && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-md px-4 py-2 border border-gray-200">
            <span className="font-semibold">📅 Zaman Aralığı:</span>
            <span className="font-mono">
              {new Date(chartData[0].timestamp).toLocaleString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
            <span className="text-gray-400">→</span>
            <span className="font-mono">
              {new Date(chartData[chartData.length - 1].timestamp).toLocaleString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          </div>
        )}
        
        {/* Diğer bilgiler */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4 flex-wrap">
            <span>📊 {chartData.length} veri noktası gösteriliyor</span>
          </div>
          <div className="text-gray-400">
            Alt çubuktan zaman aralığını seçerek zoom yapabilirsiniz
          </div>
        </div>
      </div>
    </div>
  );
}

export default MetricChart;

