// Performans Analizi Servisi - VM performans analizi için veri toplama ve birleştirme
// Bu servis, VM'in konfigürasyon ve performans verilerini toplar, normalize eder ve ChatGPT'ye gönderilecek formata hazırlar
import { executeVropsRequest, getResourceInfo } from './vrops.js';

/**
 * VM ismini resource ID'ye çevirir
 * @param {String} vmName - VM ismi (örn: "test-vm-01")
 * @returns {String|null} Resource ID veya null
 */
export async function findVMByName(vmName) {
  try {
    // vROPS API'de resource arama endpoint'i: /api/resources?name={vmName}&resourceKindKey=VirtualMachine
    const requestConfig = {
      endpoint: '/api/resources',
      method: 'GET',
      params: {
        name: vmName,
        resourceKindKey: 'VirtualMachine'
      },
      body: {}
    };

    const response = await executeVropsRequest(requestConfig);
    
    // Response'dan ilk eşleşen VM'i bul
    if (response.data && response.data.resourceList && response.data.resourceList.length > 0) {
      const vm = response.data.resourceList[0];
      return vm.identifier || null;
    }

    return null;
  } catch (error) {
    console.error('VM bulunamadı:', error.message);
    throw new Error(`VM bulunamadı: ${error.message}`);
  }
}

/**
 * VM'in properties verilerini çeker ve sadece belirtilen metrikleri filtreler
 * @param {String} resourceId - Resource ID
 * @returns {Object} Filtrelenmiş properties verisi
 */
export async function fetchVMProperties(resourceId) {
  try {
    const requestConfig = {
      endpoint: `/api/resources/${resourceId}/properties`,
      method: 'GET',
      params: {},
      body: {}
    };

    console.log('--- FETCH VM PROPERTIES REQUEST ---');
    console.log('Resource ID:', resourceId);
    console.log('Request Config:', JSON.stringify(requestConfig, null, 2));

    const response = await executeVropsRequest(requestConfig);
    
    console.log('--- FETCH VM PROPERTIES RESPONSE ---');
    console.log('Response Status:', response.status);
    console.log('Response Data Keys:', response.data ? Object.keys(response.data) : 'No data');
    console.log('Response Data Property Count:', response.data?.property ? response.data.property.length : 0);
    
    // İlk 10 property'yi logla (debug için)
    if (response.data?.property && Array.isArray(response.data.property)) {
      console.log('First 10 Properties:');
      response.data.property.slice(0, 10).forEach((prop, index) => {
        console.log(`  [${index}] ${prop.name}: ${prop.value}`);
      });
    }
    
    // Property mapping: normalized key -> vROPS property name patterns
    // vROPS'tan gelen property name'ler farklı format'ta olabilir, bu yüzden pattern matching kullanıyoruz
    const propertyMapping = [
      // CPU Properties - Öncelik sırasına göre (daha spesifik olanlar önce)
      { key: 'numCpu', patterns: ['numSockets', 'numCpu'], context: 'hardware' },
      { key: 'speed', patterns: ['speed'] },
      { key: 'limit', patterns: ['cpu.*limit', '^cpu\\|limit$'], context: 'cpu' },
      { key: 'shares', patterns: ['cpu.*shares', '^cpu\\|shares$'], context: 'cpu' },
      { key: 'reservation', patterns: ['cpu.*reservation', '^cpu\\|reservation$'], context: 'cpu' },
      { key: 'vcpu_hotadd', patterns: ['vcpu_hotadd'] },
      { key: 'vcpu_hotremove', patterns: ['vcpu_hotremove'] },
      { key: 'numCoresPerSocket', patterns: ['numCoresPerSocket'] },
      
      // Memory Properties
      { key: 'memoryCap', patterns: ['memoryCap'] },
      { key: 'memoryKB', patterns: ['memoryKB'] },
      { key: 'memoryShares', patterns: ['memory.*shares'], context: 'memory' },
      { key: 'guestOSMemNotCollecting', patterns: ['guestOSMemNotCollecting'] },
      { key: 'memoryLimit', patterns: ['memory.*limit'], context: 'memory' },
      
      // Storage Properties
      { key: 'diskSpace', patterns: ['diskSpace'] },
      { key: 'replicaPreference', patterns: ['replicaPreference'] },
      { key: 'numRDMs', patterns: ['numRDMs'] },
      { key: 'disk_consolidation_needed', patterns: ['disk_consolidation_needed', 'consolidation'] },
      
      // Other Properties
      { key: 'compliance', patterns: ['compliance'] },
      { key: 'toolsVersion', patterns: ['toolsVersion'] },
      { key: 'mor', patterns: ['snapshot.*mor'], context: 'snapshot' }
    ];

    console.log('Property Mapping:', JSON.stringify(propertyMapping, null, 2));

    // Properties'i filtrele ve normalize et
    const properties = {};
    if (response.data && response.data.property && Array.isArray(response.data.property)) {
      response.data.property.forEach(prop => {
        const propNameLower = prop.name.toLowerCase();
        
        // Her bir mapping için kontrol et
        for (const mapping of propertyMapping) {
          // Pattern matching
          const matches = mapping.patterns.some(pattern => {
            // Regex pattern (örn: "cpu.*limit" veya "^cpu\\|limit$")
            if (pattern.includes('.*') || pattern.includes('\\|') || pattern.startsWith('^')) {
              try {
                const regex = new RegExp(pattern, 'i');
                return regex.test(prop.name);
              } catch (e) {
                // Regex hatası durumunda basit string kontrolü
                return propNameLower.includes(pattern.toLowerCase().replace(/[.*^$]/g, ''));
              }
            }
            // Basit string içerme kontrolü
            return propNameLower.includes(pattern.toLowerCase());
          });

          // Context kontrolü (eğer varsa)
          const contextMatch = !mapping.context || propNameLower.includes(mapping.context.toLowerCase());

          if (matches && contextMatch) {
            // Normalize edilmiş key'i al
            const key = mapping.key;
            // Eğer bu key zaten varsa ve yeni değer daha spesifik ise (daha uzun name), güncelle
            if (!properties[key] || prop.name.length > properties[key].name.length) {
              properties[key] = {
                name: prop.name,
                value: prop.value !== undefined && prop.value !== null ? prop.value : null
              };
              console.log(`Matched Property: ${prop.name} -> ${key} = ${prop.value}`);
            }
            break; // Eşleşme bulundu, diğer mapping'leri kontrol etme
          }
        }
      });
    }

    console.log('Filtered Properties Count:', Object.keys(properties).length);
    console.log('Filtered Properties:', JSON.stringify(properties, null, 2));
    console.log('--- FETCH VM PROPERTIES END ---');

    return {
      resourceId: resourceId,
      properties: properties
    };
  } catch (error) {
    console.error('Properties çekilemedi:', error.message);
    console.error('Properties Error Details:', error.response?.data || error.stack);
    throw new Error(`Properties çekilemedi: ${error.message}`);
  }
}

/**
 * VM'in performans stats verilerini çeker
 * @param {String} resourceId - Resource ID
 * @param {Number} begin - Başlangıç zamanı (epoch milliseconds UTC)
 * @param {Number} end - Bitiş zamanı (epoch milliseconds UTC)
 * @returns {Object} Performance stats verisi
 */
export async function fetchVMPerformanceStats(resourceId, begin, end) {
  try {
    // Performans analizi için gerekli statKey'ler
    const statKeys = [
      // System Attributes
      'System Attributes|health',
      'System Attributes|total_alert_count',
      'System Attributes|alert_count_critical',
      'badge|health',
      'badge|risk',
      
      // CPU Metrikleri
      'cpu|usage_average',
      'cpu|readyPct',
      'cpu|peak_vcpu_ready',
      'cpu|costopPct',
      'cpu|iowaitPct',
      'cpu|swapwaitPct',
      'cpu|demandPct',
      
      // Memory Metrikleri
      'mem|usage_average',
      'mem|consumed_average',
      'mem|balloonPct',
      'mem|swapinRate_average',
      'mem|swapoutRate_average',
      'mem|host_contentionPct',
      'mem|vmMemoryDemand',
      
      // Storage Metrikleri
      'storage|totalReadLatency_average',
      'storage|totalWriteLatency_average',
      'guest|disk_queue',
      
      // Network Metrikleri
      'net|usage_average',
      'net:droppedPct',
      
      // Summary Metrikleri
      'summary|oversized',
      'summary|undersized',
      'summary|oversized|vcpus',
      'summary|undersized|memory',
      
      // Guest Metrikleri
      'guest|cpu_queue',
      'guest|contextSwapRate_latest',
      'guest|page.outRate_latest',
      'guest|mem.free_latest',
      'guest|tools_running_status'
    ];

    const requestConfig = {
      endpoint: '/api/resources/stats/query',
      method: 'POST',
      params: {},
      body: {
        resourceId: [resourceId],
        statKey: statKeys,
        begin: begin,
        end: end,
        rollUpType: 'AVG',
        intervalType: 'HOURS',
        intervalQuantifier: 1
      }
    };

    const response = await executeVropsRequest(requestConfig);
    
    // Stats verilerini özetle (min, max, avg)
    const summarizedStats = summarizeStats(response.data);
    
    return {
      resourceId: resourceId,
      stats: summarizedStats, // Özetlenmiş stats verisi
      rawStats: response.data || {}, // Ham veri (debug için)
      timeRange: {
        begin: begin,
        end: end
      }
    };
  } catch (error) {
    console.error('Performance stats çekilemedi:', error.message);
    throw new Error(`Performance stats çekilemedi: ${error.message}`);
  }
}

/**
 * Stats verilerini özetler - Her bir statKey için min, max, avg hesaplar
 * vROPS stats/query response formatı:
 * {
 *   "values": [{
 *     "resourceId": "...",
 *     "stat-list": {
 *       "stat": [{
 *         "timestamps": [1765736014914, ...],
 *         "statKey": { "key": "cpu|usage_average" },
 *         "data": [0.788, 0.85, ...]
 *       }]
 *     }
 *   }]
 * }
 * @param {Object} statsResponse - vROPS'tan gelen stats response
 * @returns {Object} Özetlenmiş stats verisi
 */
function summarizeStats(statsResponse) {
  if (!statsResponse) {
    console.log('summarizeStats: statsResponse is null or undefined');
    return {};
  }

  // vROPS stats/query response formatını kontrol et
  if (!statsResponse.values || !Array.isArray(statsResponse.values) || statsResponse.values.length === 0) {
    console.log('summarizeStats: No values array found in response');
    return {};
  }

  const summarized = {};

  // Her bir resource için işle (genellikle tek bir resource olur)
  statsResponse.values.forEach(resourceValue => {
    const statList = resourceValue['stat-list'];
    
    if (!statList || !statList.stat || !Array.isArray(statList.stat)) {
      console.log('summarizeStats: No stat-list found for resource:', resourceValue.resourceId);
      return;
    }

    // Her bir stat için işle
    statList.stat.forEach(stat => {
      const statKey = stat.statKey?.key || stat.statKey || 'unknown';
      const data = stat.data || [];

      if (data.length === 0) {
        summarized[statKey] = {
          min: null,
          max: null,
          avg: null,
          count: 0
        };
        return;
      }

      // Sayısal değerleri filtrele (null, undefined, NaN olmayanlar)
      const numericValues = data
        .map(val => {
          // Eğer obje ise value property'sini al
          if (typeof val === 'object' && val !== null) {
            return val.value !== undefined ? val.value : val;
          }
          // String ise parse et
          if (typeof val === 'string') {
            const parsed = parseFloat(val);
            return !isNaN(parsed) ? parsed : null;
          }
          // Number ise kontrol et
          return typeof val === 'number' && !isNaN(val) ? val : null;
        })
        .filter(v => v !== null && v !== undefined);

      if (numericValues.length === 0) {
        summarized[statKey] = {
          min: null,
          max: null,
          avg: null,
          count: 0
        };
        return;
      }

      // Min, Max, Avg hesapla
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const avg = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;

      summarized[statKey] = {
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2)),
        avg: parseFloat(avg.toFixed(2)),
        count: numericValues.length
      };
    });
  });

  console.log('summarizeStats: Özetlenmiş', Object.keys(summarized).length, 'statKey');
  if (Object.keys(summarized).length > 0) {
    const firstKey = Object.keys(summarized)[0];
    console.log('summarizeStats: Örnek özet (' + firstKey + '):', summarized[firstKey]);
  }
  
  return summarized;
}

/**
 * VM'in tüm verilerini toplar ve birleştirir
 * @param {String} resourceId - Resource ID
 * @param {String} vmName - VM ismi (opsiyonel, log için)
 * @returns {Object} Birleştirilmiş VM verisi
 */
export async function collectAllVMData(resourceId, vmName = null) {
  try {
    // Son 1 hafta için zaman aralığı hesapla (UTC epoch milliseconds)
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000); // 7 gün önce

    // VM bilgisini çek (isim için)
    let vmInfo = null;
    try {
      vmInfo = await getResourceInfo(resourceId);
    } catch (error) {
      console.warn('VM bilgisi çekilemedi, devam ediliyor:', error.message);
    }

    // Paralel olarak properties ve performance stats çek
    const [propertiesData, performanceData] = await Promise.all([
      fetchVMProperties(resourceId).catch(err => {
        console.error('Properties hatası:', err.message);
        return { resourceId, properties: {} };
      }),
      fetchVMPerformanceStats(resourceId, oneWeekAgo, now).catch(err => {
        console.error('Performance stats hatası:', err.message);
        return { resourceId, stats: {}, timeRange: { begin: oneWeekAgo, end: now } };
      })
    ]);

    // Verileri birleştir
    const collectedData = {
      vmId: resourceId,
      vmName: vmName || vmInfo?.resourceKey?.name || 'Bilinmiyor',
      resourceKindKey: vmInfo?.resourceKey?.resourceKindKey || 'VirtualMachine',
      configuration: {
        cpu: {
          numCpu: propertiesData.properties.numCpu?.value || null,
          speed: propertiesData.properties.speed?.value || null,
          limit: propertiesData.properties.limit?.value || null, // CPU limit
          shares: propertiesData.properties.shares?.value || null, // CPU shares
          reservation: propertiesData.properties.reservation?.value || null,
          vcpuHotadd: propertiesData.properties.vcpu_hotadd?.value || null,
          vcpuHotremove: propertiesData.properties.vcpu_hotremove?.value || null,
          numCoresPerSocket: propertiesData.properties.numCoresPerSocket?.value || null
        },
        memory: {
          memoryCap: propertiesData.properties.memoryCap?.value || null,
          memoryKB: propertiesData.properties.memoryKB?.value || null,
          shares: propertiesData.properties.memoryShares?.value || null, // Memory shares
          guestOSMemNotCollecting: propertiesData.properties.guestOSMemNotCollecting?.value || null,
          limit: propertiesData.properties.memoryLimit?.value || null // Memory limit
        },
        storage: {
          diskSpace: propertiesData.properties.diskSpace?.value || null,
          replicaPreference: propertiesData.properties.replicaPreference?.value || null,
          numRDMs: propertiesData.properties.numRDMs?.value || null,
          diskConsolidationNeeded: propertiesData.properties.disk_consolidation_needed?.value || null
        },
        other: {
          compliance: propertiesData.properties.compliance?.value || null,
          toolsVersion: propertiesData.properties.toolsVersion?.value || null,
          snapshotMor: propertiesData.properties.mor?.value || null
        }
      },
      performance: performanceData.stats || {},
      timeRange: performanceData.timeRange || { begin: oneWeekAgo, end: now }
    };

    return collectedData;
  } catch (error) {
    console.error('VM verileri toplanamadı:', error.message);
    throw new Error(`VM verileri toplanamadı: ${error.message}`);
  }
}

/**
 * ChatGPT'ye gönderilecek formata dönüştürür
 * Stats verileri zaten özetlenmiş olarak gelir (min, max, avg)
 * @param {Object} vmData - collectAllVMData'dan gelen veri
 * @returns {Object} ChatGPT için formatlanmış veri
 */
export function formatDataForGPT(vmData) {
  // Performance stats zaten summarizeStats ile özetlenmiş olmalı
  // Eğer rawStats varsa, onu kullanma, sadece özetlenmiş stats'ı kullan
  const performanceSummary = vmData.performance || {};
  
  return {
    vmName: vmData.vmName,
    vmId: vmData.vmId,
    configuration: vmData.configuration,
    performance: performanceSummary, // Özetlenmiş stats (min, max, avg)
    timeRange: vmData.timeRange
  };
}

