// Performans Analizi Görünümü Komponenti
// ChatGPT'den gelen performans analizi raporunu gösterir ve toplanan verileri görselleştirir
import { useState, useEffect } from 'react';

function PerformanceAnalysisView({ data }) {
  // Debug için data'yı logla
  useEffect(() => {
    console.log('PerformanceAnalysisView - Received data:', data);
  }, [data]);
  const [expandedSections, setExpandedSections] = useState({
    analysis: true,
    configuration: false,
    performance: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Markdown formatını parse et (basit versiyon)
  const parseMarkdown = (text) => {
    if (!text) return '';
    
    // **COMMENT** formatındaki yorumları 2 satır aşağıya indir (satır başı olarak)
    // Önce ** ile başlayıp ** ile biten ve COMMENT içeren yorumları bul ve işle
    let processed = text.replace(/\*\*([^*]+?)\*\*/g, (match, content) => {
      // Eğer içerik COMMENT içeriyorsa, öncesine 2 satır boşluk ekle (satır başı olarak)
      if (content.toUpperCase().includes('COMMENT')) {
        return '\n\n**' + content + '**';
      }
      // Diğer ** içerikler için normal bold olarak bırak
      return '**' + content + '**';
    });
    
    // Başlıkları parse et
    let parsed = processed
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-4">$1</h1>')
      // Bold text - önce COMMENT içerenleri işle (zaten işlendi, sadece HTML'e çevir)
      .replace(/\*\*([^*]+?COMMENT[^*]*?)\*\*/gi, '<strong class="font-semibold text-gray-900">$1</strong>')
      // Diğer bold text'ler
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      // Bullet points
      .replace(/^\- (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
      // Line breaks - önce çift satır sonları (paragraflar)
      .replace(/\n\n+/g, '</p><p class="mb-3">')
      // Sonra tek satır sonları
      .replace(/\n/g, '<br />');
    
    // Liste itemlerini <ul> ile sar
    parsed = parsed.replace(/(<li.*<\/li>)/g, '<ul class="list-disc list-inside mb-3 space-y-1">$1</ul>');
    
    return `<p class="mb-3">${parsed}</p>`;
  };

  // Debug: data kontrolü
  if (!data) {
    console.log('PerformanceAnalysisView - No data provided');
    return (
      <div className="text-center py-12 bg-white border border-gray-200 rounded-md">
        <div className="text-gray-400 mb-2">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-gray-600 font-semibold">Performans analizi verisi bulunamadı</p>
      </div>
    );
  }

  // Debug: data içeriğini kontrol et
  console.log('PerformanceAnalysisView - Data structure:', {
    hasAnalysis: !!data.analysis,
    hasCollectedData: !!data.collectedData,
    hasVmName: !!data.vmName,
    hasVmId: !!data.vmId,
    analysisLength: data.analysis?.length || 0,
    dataKeys: Object.keys(data)
  });

  return (
    <div className="space-y-4">
      {/* VM Bilgileri */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-md p-4 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{data.vmName || 'Bilinmiyor'}</h3>
            <p className="text-sm text-gray-600 mt-1">VM ID: <span className="font-mono">{data.vmId || 'N/A'}</span></p>
          </div>
          {data.timestamp && (
            <div className="text-xs text-gray-500">
              {new Date(data.timestamp).toLocaleString('tr-TR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>
      </div>

      {/* ChatGPT Analizi */}
      {data.analysis && (
        <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('analysis')}
            className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
          >
            <h2 className="text-xl font-bold text-gray-900">Performans Analizi</h2>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${expandedSections.analysis ? 'transform rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.analysis && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(data.analysis) }}
              />
            </div>
          )}
        </div>
      )}

      {/* Debug: Eğer analysis yoksa debug bilgilerini göster */}
      {!data.analysis && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="text-yellow-800 font-semibold mb-2">⚠️ Analiz verisi bulunamadı</div>
          <div className="text-xs text-yellow-700 space-y-1">
            <div><strong>Data Keys:</strong> {JSON.stringify(Object.keys(data || {}))}</div>
            <div><strong>Has Analysis:</strong> {String(!!data.analysis)}</div>
            <div><strong>Analysis Type:</strong> {typeof data.analysis}</div>
            <div><strong>Full Data:</strong> {JSON.stringify(data, null, 2).substring(0, 500)}...</div>
          </div>
        </div>
      )}

      {/* Konfigürasyon Bilgileri */}
      {data.collectedData && data.collectedData.configuration && (
        <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('configuration')}
            className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
          >
            <h2 className="text-xl font-bold text-gray-900">Konfigürasyon Bilgileri</h2>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${expandedSections.configuration ? 'transform rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.configuration && (
            <div className="px-6 py-4 border-t border-gray-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* CPU Konfigürasyonu */}
                <div className="bg-gray-50 rounded-md p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">CPU</h3>
                  <div className="space-y-2 text-sm">
                    {data.collectedData.configuration.cpu.numCpu !== null && data.collectedData.configuration.cpu.numCpu !== undefined && (
                      <div>
                        <span className="text-gray-600">CPU Sayısı:</span>
                        <span className="ml-2 font-medium text-gray-900">{parseFloat(data.collectedData.configuration.cpu.numCpu)}</span>
                      </div>
                    )}
                    {data.collectedData.configuration.cpu.speed !== null && data.collectedData.configuration.cpu.speed !== undefined && (
                      <div>
                        <span className="text-gray-600">CPU Hızı:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {(parseFloat(data.collectedData.configuration.cpu.speed) / 1000000000).toFixed(2)} GHz
                        </span>
                      </div>
                    )}
                    {data.collectedData.configuration.cpu.limit !== null && data.collectedData.configuration.cpu.limit !== undefined && (
                      <div>
                        <span className="text-gray-600">CPU Limit:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {parseFloat(data.collectedData.configuration.cpu.limit) === -1 ? 'Sınırsız' : `${data.collectedData.configuration.cpu.limit} MHz`}
                        </span>
                      </div>
                    )}
                    {data.collectedData.configuration.cpu.shares !== null && data.collectedData.configuration.cpu.shares !== undefined && (
                      <div>
                        <span className="text-gray-600">CPU Shares:</span>
                        <span className="ml-2 font-medium text-gray-900">{parseFloat(data.collectedData.configuration.cpu.shares)}</span>
                      </div>
                    )}
                    {data.collectedData.configuration.cpu.reservation !== null && data.collectedData.configuration.cpu.reservation !== undefined && (
                      <div>
                        <span className="text-gray-600">CPU Rezervasyon:</span>
                        <span className="ml-2 font-medium text-gray-900">{parseFloat(data.collectedData.configuration.cpu.reservation)} MHz</span>
                      </div>
                    )}
                    {data.collectedData.configuration.cpu.vcpuHotadd !== null && data.collectedData.configuration.cpu.vcpuHotadd !== undefined && (
                      <div>
                        <span className="text-gray-600">vCPU Hot Add:</span>
                        <span className={`ml-2 font-medium ${data.collectedData.configuration.cpu.vcpuHotadd === 'true' || data.collectedData.configuration.cpu.vcpuHotadd === true ? 'text-green-600' : 'text-gray-600'}`}>
                          {data.collectedData.configuration.cpu.vcpuHotadd === 'true' || data.collectedData.configuration.cpu.vcpuHotadd === true ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                    )}
                    {data.collectedData.configuration.cpu.vcpuHotremove !== null && data.collectedData.configuration.cpu.vcpuHotremove !== undefined && (
                      <div>
                        <span className="text-gray-600">vCPU Hot Remove:</span>
                        <span className={`ml-2 font-medium ${data.collectedData.configuration.cpu.vcpuHotremove === 'true' || data.collectedData.configuration.cpu.vcpuHotremove === true ? 'text-green-600' : 'text-gray-600'}`}>
                          {data.collectedData.configuration.cpu.vcpuHotremove === 'true' || data.collectedData.configuration.cpu.vcpuHotremove === true ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                    )}
                    {data.collectedData.configuration.cpu.numCoresPerSocket !== null && data.collectedData.configuration.cpu.numCoresPerSocket !== undefined && (
                      <div>
                        <span className="text-gray-600">Core/Socket:</span>
                        <span className="ml-2 font-medium text-gray-900">{parseFloat(data.collectedData.configuration.cpu.numCoresPerSocket)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Memory Konfigürasyonu */}
                <div className="bg-gray-50 rounded-md p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Memory</h3>
                  <div className="space-y-2 text-sm">
                    {data.collectedData.configuration.memory.memoryCap !== null && data.collectedData.configuration.memory.memoryCap !== undefined && (
                      <div>
                        <span className="text-gray-600">Memory Cap:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {(parseFloat(data.collectedData.configuration.memory.memoryCap) / 1024 / 1024).toFixed(2)} GB
                        </span>
                      </div>
                    )}
                    {data.collectedData.configuration.memory.memoryKB !== null && data.collectedData.configuration.memory.memoryKB !== undefined && (
                      <div>
                        <span className="text-gray-600">Toplam Memory:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {(parseFloat(data.collectedData.configuration.memory.memoryKB) / 1024 / 1024).toFixed(2)} GB
                        </span>
                      </div>
                    )}
                    {data.collectedData.configuration.memory.shares !== null && data.collectedData.configuration.memory.shares !== undefined && (
                      <div>
                        <span className="text-gray-600">Memory Shares:</span>
                        <span className="ml-2 font-medium text-gray-900">{parseFloat(data.collectedData.configuration.memory.shares)}</span>
                      </div>
                    )}
                    {data.collectedData.configuration.memory.guestOSMemNotCollecting !== null && data.collectedData.configuration.memory.guestOSMemNotCollecting !== undefined && (
                      <div>
                        <span className="text-gray-600">Guest OS Memory:</span>
                        <span className={`ml-2 font-medium ${parseFloat(data.collectedData.configuration.memory.guestOSMemNotCollecting) === 1 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {parseFloat(data.collectedData.configuration.memory.guestOSMemNotCollecting) === 1 ? 'Toplanmıyor' : 'Toplanıyor'}
                        </span>
                      </div>
                    )}
                    {data.collectedData.configuration.memory.limit !== null && data.collectedData.configuration.memory.limit !== undefined && (
                      <div>
                        <span className="text-gray-600">Memory Limit:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {parseFloat(data.collectedData.configuration.memory.limit) === -1 ? 'Sınırsız' : `${(parseFloat(data.collectedData.configuration.memory.limit) / 1024 / 1024).toFixed(2)} GB`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Storage Konfigürasyonu */}
                <div className="bg-gray-50 rounded-md p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Storage</h3>
                  <div className="space-y-2 text-sm">
                    {data.collectedData.configuration.storage.diskSpace !== null && data.collectedData.configuration.storage.diskSpace !== undefined && (
                      <div>
                        <span className="text-gray-600">Disk Alanı:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {parseFloat(data.collectedData.configuration.storage.diskSpace) === -1 
                            ? 'Sınırsız' 
                            : `${(parseFloat(data.collectedData.configuration.storage.diskSpace) / 1024 / 1024 / 1024).toFixed(2)} GB`}
                        </span>
                      </div>
                    )}
                    {data.collectedData.configuration.storage.replicaPreference !== null && data.collectedData.configuration.storage.replicaPreference !== undefined && (
                      <div>
                        <span className="text-gray-600">Replica Preference:</span>
                        <span className="ml-2 font-medium text-gray-900">{data.collectedData.configuration.storage.replicaPreference}</span>
                      </div>
                    )}
                    {data.collectedData.configuration.storage.numRDMs !== null && data.collectedData.configuration.storage.numRDMs !== undefined && (
                      <div>
                        <span className="text-gray-600">RDM Sayısı:</span>
                        <span className="ml-2 font-medium text-gray-900">{parseFloat(data.collectedData.configuration.storage.numRDMs)}</span>
                      </div>
                    )}
                    {data.collectedData.configuration.storage.diskConsolidationNeeded !== null && data.collectedData.configuration.storage.diskConsolidationNeeded !== undefined && (
                      <div>
                        <span className="text-gray-600">Disk Konsolidasyon:</span>
                        <span className={`ml-2 font-medium ${data.collectedData.configuration.storage.diskConsolidationNeeded === 'true' || data.collectedData.configuration.storage.diskConsolidationNeeded === true ? 'text-red-600' : 'text-green-600'}`}>
                          {data.collectedData.configuration.storage.diskConsolidationNeeded === 'true' || data.collectedData.configuration.storage.diskConsolidationNeeded === true ? 'Gerekli' : 'Gerekli Değil'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Diğer Konfigürasyon Bilgileri */}
              <div className="bg-gray-50 rounded-md p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Diğer Bilgiler</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {data.collectedData.configuration.other.compliance !== null && data.collectedData.configuration.other.compliance !== undefined && (
                    <div>
                      <span className="text-gray-600">Compliance:</span>
                      <span className={`ml-2 font-medium ${data.collectedData.configuration.other.compliance === 'Compliant' ? 'text-green-600' : 'text-red-600'}`}>
                        {data.collectedData.configuration.other.compliance}
                      </span>
                    </div>
                  )}
                  {data.collectedData.configuration.other.toolsVersion !== null && data.collectedData.configuration.other.toolsVersion !== undefined && (
                    <div>
                      <span className="text-gray-600">VMware Tools:</span>
                      <span className={`ml-2 font-medium ${data.collectedData.configuration.other.toolsVersion.includes('Not Installed') ? 'text-red-600' : 'text-green-600'}`}>
                        {data.collectedData.configuration.other.toolsVersion}
                      </span>
                    </div>
                  )}
                  {data.collectedData.configuration.other.snapshotMor !== null && data.collectedData.configuration.other.snapshotMor !== undefined && (
                    <div>
                      <span className="text-gray-600">Snapshot MOR:</span>
                      <span className="ml-2 font-medium text-gray-900 font-mono text-xs">{data.collectedData.configuration.other.snapshotMor}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performans Verileri */}
      {data.collectedData && data.collectedData.performance && (
        <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('performance')}
            className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
          >
            <h2 className="text-xl font-bold text-gray-900">Performans Metrikleri</h2>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${expandedSections.performance ? 'transform rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.performance && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="text-sm text-gray-600 mb-4">
                <p>Zaman Aralığı: {data.collectedData.timeRange && (
                  <>
                    {new Date(data.collectedData.timeRange.begin).toLocaleString('tr-TR')} - {new Date(data.collectedData.timeRange.end).toLocaleString('tr-TR')}
                  </>
                )}</p>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm text-gray-600">
                  Performans metrikleri detayları JSON formatında mevcut. İleride burada grafik ve tablo görünümleri eklenebilir.
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">JSON Verisini Göster</summary>
                  <pre className="mt-2 text-xs bg-white p-3 rounded-md border border-gray-200 overflow-auto max-h-96">
                    {JSON.stringify(data.collectedData.performance, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PerformanceAnalysisView;

