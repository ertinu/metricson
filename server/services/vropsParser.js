// vROPS Response Parser Servisi - vROPS API'den gelen JSON response'larını parse eder ve temizler
// Her veri tipi (alerts, metrics, properties, statkeys, symptoms) için özel parser fonksiyonları içerir

/**
 * Alert response'unu parse eder
 * vROPS'tan gelen alert listesini temizler ve frontend'e gönderilecek formata çevirir
 * @param {Object} vropsResponse - vROPS API'den gelen ham response
 * @returns {Object} Parse edilmiş alert verisi
 */
export function parseAlertsResponse(vropsResponse) {
  // Eğer alert yoksa boş döndür
  if (!vropsResponse?.alerts || !Array.isArray(vropsResponse.alerts)) {
    return {
      alerts: [],
      totalCount: 0,
      pageInfo: null,
      summary: {
        byLevel: {},
        byStatus: {},
        byImpact: {}
      }
    };
  }

  const alerts = vropsResponse.alerts.map(alert => ({
    alertId: alert.alertId,
    alertDefinitionName: alert.alertDefinitionName || 'N/A',
    alertLevel: alert.alertLevel, // CRITICAL, IMMEDIATE, WARNING, INFO
    status: alert.status, // ACTIVE, CANCELED, ACKNOWLEDGED
    startTimeUTC: alert.startTimeUTC,
    cancelTimeUTC: alert.cancelTimeUTC || 0,
    updateTimeUTC: alert.updateTimeUTC || alert.startTimeUTC,
    resourceId: alert.resourceId,
    alertImpact: alert.alertImpact || 'N/A', // HEALTH, RISK, EFFICIENCY
    controlState: alert.controlState || 'N/A' // OPEN, CLOSED
  }));

  // İstatistiksel özet oluştur
  const summary = {
    byLevel: {
      CRITICAL: alerts.filter(a => a.alertLevel === 'CRITICAL').length,
      IMMEDIATE: alerts.filter(a => a.alertLevel === 'IMMEDIATE').length,
      WARNING: alerts.filter(a => a.alertLevel === 'WARNING').length,
      INFO: alerts.filter(a => a.alertLevel === 'INFO').length,
    },
    byStatus: {
      ACTIVE: alerts.filter(a => a.status === 'ACTIVE').length,
      CANCELED: alerts.filter(a => a.status === 'CANCELED').length,
      ACKNOWLEDGED: alerts.filter(a => a.status === 'ACKNOWLEDGED').length,
    },
    byImpact: {
      HEALTH: alerts.filter(a => a.alertImpact === 'HEALTH').length,
      RISK: alerts.filter(a => a.alertImpact === 'RISK').length,
      EFFICIENCY: alerts.filter(a => a.alertImpact === 'EFFICIENCY').length,
    }
  };

  return {
    alerts: alerts,
    totalCount: vropsResponse.pageInfo?.totalCount || alerts.length,
    pageInfo: vropsResponse.pageInfo || null,
    summary: summary
  };
}

/**
 * Metric response'unu parse eder
 * vROPS'tan gelen metric verilerini temizler ve frontend'e gönderilecek formata çevirir
 * vROPS stats API response yapısı:
 * {
 *   "values": [{
 *     "resourceId": "...",
 *     "stat-list": {
 *       "stat": [{
 *         "timestamps": [1765736014914, ...],
 *         "statKey": { "key": "cpu|usage_average" },
 *         "data": [0.788, ...]
 *       }]
 *     }
 *   }]
 * }
 * @param {Object} vropsResponse - vROPS API'den gelen ham response
 * @param {Object} requestConfig - Orijinal request config (endpoint, params vs.)
 * @returns {Object} Parse edilmiş metric verisi
 */
export function parseMetricsResponse(vropsResponse, requestConfig = {}) {
  if (!vropsResponse || !vropsResponse.values || !Array.isArray(vropsResponse.values)) {
    return {
      metrics: [],
      totalCount: 0,
      statKey: null,
      resourceId: null,
      unit: null,
      summary: {
        min: null,
        max: null,
        avg: null,
        latest: null
      }
    };
  }

  // İlk value objesini al (genellikle tek bir resource için sorgu yapılır)
  const firstValue = vropsResponse.values[0];
  const resourceId = firstValue?.resourceId || extractResourceIdFromEndpoint(requestConfig.endpoint) || null;
  
  // stat-list içindeki stat array'ini al
  const statList = firstValue?.['stat-list'];
  if (!statList || !statList.stat || !Array.isArray(statList.stat) || statList.stat.length === 0) {
    return {
      metrics: [],
      totalCount: 0,
      statKey: null,
      resourceId: resourceId,
      unit: null,
      summary: {
        min: null,
        max: null,
        avg: null,
        latest: null
      }
    };
  }

  // İlk stat objesini al (genellikle tek bir statKey sorgulanır)
  const firstStat = statList.stat[0];
  const statKey = firstStat?.statKey?.key || requestConfig.params?.statKey || 'unknown';
  const timestamps = firstStat?.timestamps || [];
  const data = firstStat?.data || [];

  // Timestamps ve data array'lerini birleştirerek metric objeleri oluştur
  // Her timestamp için bir data değeri olmalı
  const metrics = [];
  const maxLength = Math.min(timestamps.length, data.length);
  
  for (let i = 0; i < maxLength; i++) {
    // value'yu sayıya çevir (string olarak gelebilir)
    const rawValue = data[i];
    const numericValue = typeof rawValue === 'number' 
      ? rawValue 
      : (rawValue !== null && rawValue !== undefined && rawValue !== '' 
          ? parseFloat(rawValue) 
          : null);
    
    // Geçerli sayısal değer kontrolü
    const value = (numericValue !== null && !isNaN(numericValue)) ? numericValue : null;
    
    metrics.push({
      timestamp: timestamps[i],
      value: value, // Sayısal değer (grafik için)
      formattedDate: formatTimestamp(timestamps[i]),
      formattedValue: formatMetricValue(value, statKey) // Formatlanmış string (tablo için)
    });
  }

  // İstatistiksel özet oluştur
  const numericValues = metrics.map(m => m.value).filter(v => typeof v === 'number' && !isNaN(v));
  
  // Min ve max değerlerin timestamp'lerini bul
  let minTimestamp = null;
  let maxTimestamp = null;
  let latestTimestamp = null;
  
  if (numericValues.length > 0) {
    const minValue = Math.min(...numericValues);
    const maxValue = Math.max(...numericValues);
    
    // Min değere sahip ilk metric'i bul
    const minMetric = metrics.find(m => m.value === minValue);
    if (minMetric) {
      minTimestamp = minMetric.timestamp;
    }
    
    // Max değere sahip ilk metric'i bul
    const maxMetric = metrics.find(m => m.value === maxValue);
    if (maxMetric) {
      maxTimestamp = maxMetric.timestamp;
    }
  }
  
  // Latest timestamp (son metric'in timestamp'i)
  if (metrics.length > 0) {
    latestTimestamp = metrics[metrics.length - 1].timestamp;
  }
  
  const summary = {
    min: numericValues.length > 0 ? Math.min(...numericValues) : null,
    max: numericValues.length > 0 ? Math.max(...numericValues) : null,
    avg: numericValues.length > 0 ? (numericValues.reduce((a, b) => a + b, 0) / numericValues.length) : null,
    latest: metrics.length > 0 ? metrics[metrics.length - 1].value : null,
    minTimestamp: minTimestamp,
    maxTimestamp: maxTimestamp,
    latestTimestamp: latestTimestamp
  };

  // Unit belirleme (statKey'e göre)
  const unit = detectUnit(statKey);

  return {
    metrics: metrics,
    totalCount: metrics.length,
    statKey: statKey,
    resourceId: resourceId,
    unit: unit,
    summary: summary,
    timeRange: {
      start: metrics.length > 0 ? metrics[0].timestamp : null,
      end: metrics.length > 0 ? metrics[metrics.length - 1].timestamp : null
    }
  };
}

/**
 * Endpoint'ten resource ID'yi çıkarır
 * Örn: /api/resources/33/stats -> 33
 */
function extractResourceIdFromEndpoint(endpoint) {
  if (!endpoint) return null;
  const match = endpoint.match(/\/resources\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Timestamp'i okunabilir formata çevirir
 */
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

/**
 * Metric değerini birimle birlikte formatlar
 * KB cinsinden değerleri GB'ye çevirir
 */
function formatMetricValue(value, statKey) {
  if (value === null || value === undefined || isNaN(value) || value === '') {
    return 'N/A';
  }
  
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(numValue)) {
    return 'N/A';
  }
  
  const lowerKey = (statKey || '').toLowerCase();
  
  // diskspace|used ve diskspace|provisionedSpace için KB'den GB'ye çevir
  if (lowerKey.includes('diskspace') && (lowerKey.includes('used') || lowerKey.includes('provisionedspace'))) {
    // KB'den GB'ye çevir: KB / 1024 / 1024 = GB
    const valueInGB = numValue / 1024 / 1024;
    return `${valueInGB.toFixed(2)} GB`;
  }
  
  // mem|consumed_average için KB'den MB'ye çevir
  if (lowerKey.startsWith('mem|') && lowerKey.includes('consumed')) {
    // KB'den MB'ye çevir: KB / 1024 = MB
    const valueInMB = numValue / 1024;
    return `${valueInMB.toFixed(2)} MB`;
  }
  
  // Diğer metrikler için unit kontrolü yap
  const unit = detectUnit(statKey);
  if (unit === '%') {
    return `${numValue.toFixed(2)}%`;
  } else if (unit === 'MB' || unit === 'GB') {
    return `${numValue.toFixed(2)} ${unit}`;
  } else if (unit === 'MHz' || unit === 'GHz') {
    return `${numValue.toFixed(2)} ${unit}`;
  } else if (unit === 'KB/s') {
    return `${numValue.toFixed(2)} KB/s`;
  }
  
  return numValue.toFixed(2);
}

/**
 * StatKey'e göre birim belirler
 */
function detectUnit(statKey) {
  if (!statKey) return '';
  
  const lowerKey = statKey.toLowerCase();
  
  // CPU metrikleri - usage kontrolünden ÖNCE kontrol et (cpu|usagemhz_average için)
  if (lowerKey.includes('cpu') && (lowerKey.includes('mhz') || lowerKey.includes('ghz'))) {
    if (lowerKey.includes('ghz')) return 'GHz';
    return 'MHz';
  }
  
  // VirtualDisk read/write metrikleri - KB/s
  if (lowerKey.includes('virtualdisk') && (lowerKey.includes('read') || lowerKey.includes('write'))) {
    return 'KB/s';
  }
  
  // Disk space metrikleri - GB
  if (lowerKey.includes('diskspace') && (lowerKey.includes('used') || lowerKey.includes('provisionedspace'))) {
    return 'GB';
  }
  
  // VirtualDisk usage - %
  if (lowerKey.includes('virtualdisk') && lowerKey.includes('usage')) {
    return '%';
  }
  
  // Usage kontrolü - ama mhz/ghz içermiyorsa
  if ((lowerKey.includes('usage') || lowerKey.includes('utilization') || lowerKey.includes('percent')) 
      && !lowerKey.includes('mhz') && !lowerKey.includes('ghz')) {
    return '%';
  }
  
  // Memory metrikleri: 'memory', 'mem|' ile başlayan veya 'mem' içeren
  if (lowerKey.includes('memory') || lowerKey.startsWith('mem|') || 
      (lowerKey.includes('mem') && !lowerKey.includes('memory'))) {
    // mem|consumed_average = MB
    if (lowerKey.includes('consumed')) {
      return 'MB';
    }
    if (lowerKey.includes('mb')) return 'MB';
    if (lowerKey.includes('gb')) return 'GB';
    return 'MB'; // Varsayılan
  }
  
  // Disk metrikleri (diskspace hariç)
  if (lowerKey.includes('disk') && !lowerKey.includes('diskspace')) {
    if (lowerKey.includes('mb')) return 'MB';
    if (lowerKey.includes('gb')) return 'GB';
    return 'MB'; // Varsayılan
  }
  
  return '';
}

/**
 * Response tipini endpoint'e göre belirler
 * @param {String} endpoint - vROPS API endpoint'i (örn: /api/alerts, /api/resources/33/stats)
 * @returns {String} Veri tipi ('alerts', 'metrics', 'latestStats', 'properties', 'statkeys', 'symptoms', 'unknown')
 */
export function detectResponseType(endpoint) {
  if (!endpoint || typeof endpoint !== 'string') {
    return 'unknown';
  }

  const lowerEndpoint = endpoint.toLowerCase();

  if (lowerEndpoint.includes('/alerts')) {
    return 'alerts';
  }
  if (lowerEndpoint.includes('/stats/latest')) {
    return 'latestStats';
  }
  if (lowerEndpoint.includes('/stats/topn')) {
    return 'topn';
  }
  if (lowerEndpoint.includes('/stats') || lowerEndpoint.includes('/metrics')) {
    return 'metrics';
  }
  if (lowerEndpoint.includes('/properties')) {
    return 'properties';
  }
  if (lowerEndpoint.includes('/statkeys')) {
    return 'statKeys';
  }
  if (lowerEndpoint.includes('/symptoms')) {
    return 'symptoms';
  }
  // Relationships endpoint'i: /api/resources/{id}/relationships
  if (lowerEndpoint.includes('/relationships')) {
    return 'relationships';
  }
  // Resource detail endpoint'i: /api/resources/{id} (stats, statkeys, properties içermiyorsa)
  if (lowerEndpoint.includes('/resources/') && 
      !lowerEndpoint.includes('/stats') && 
      !lowerEndpoint.includes('/statkeys') && 
      !lowerEndpoint.includes('/properties') &&
      !lowerEndpoint.includes('/relationships')) {
    // UUID formatında resource ID kontrolü
    const resourceIdMatch = lowerEndpoint.match(/\/resources\/([a-f0-9-]{36})$/);
    if (resourceIdMatch) {
      return 'resourceDetail';
    }
  }
  if (lowerEndpoint.includes('/resources') && !lowerEndpoint.includes('/stats')) {
    return 'resources';
  }

  return 'unknown';
}

/**
 * Latest stats response'unu parse eder
 * @param {Object} vropsResponse - vROPS API'den gelen latest stats response
 * @returns {Object} Parse edilmiş latest stats verisi
 */
export function parseLatestStatsResponse(vropsResponse) {
  if (!vropsResponse || !vropsResponse.values || !Array.isArray(vropsResponse.values)) {
    return {
      resources: [],
      totalCount: 0
    };
  }

  const resources = [];

  vropsResponse.values.forEach((value) => {
    const resourceId = value.resourceId || null;
    const statList = value['stat-list'];
    
    if (!statList || !statList.stat || !Array.isArray(statList.stat)) {
      return;
    }

    const stats = statList.stat.map((stat) => {
      const statKey = stat.statKey?.key || 'unknown';
      const timestamp = stat.timestamps && stat.timestamps.length > 0 ? stat.timestamps[0] : null;
      const dataValue = stat.data && stat.data.length > 0 ? stat.data[0] : null;
      
      // Value'yu sayıya çevir
      const numericValue = typeof dataValue === 'number' 
        ? dataValue 
        : (dataValue !== null && dataValue !== undefined && dataValue !== '' 
            ? parseFloat(dataValue) 
            : null);

      return {
        statKey: statKey,
        timestamp: timestamp,
        value: numericValue,
        formattedDate: timestamp ? formatTimestamp(timestamp) : 'N/A',
        formattedValue: numericValue !== null && !isNaN(numericValue) 
          ? formatMetricValue(numericValue, statKey) 
          : 'N/A',
        unit: detectUnit(statKey)
      };
    });

    resources.push({
      resourceId: resourceId,
      stats: stats,
      statsCount: stats.length
    });
  });

  return {
    resources: resources,
    totalCount: resources.length,
    totalStats: resources.reduce((sum, r) => sum + r.statsCount, 0)
  };
}

/**
 * StatKeys response'unu parse eder
 * @param {Object} vropsResponse - vROPS API'den gelen statkeys response
 * @param {Object} requestConfig - Orijinal request config (resourceId için)
 * @returns {Object} Parse edilmiş statkeys verisi
 */
export function parseStatKeysResponse(vropsResponse, requestConfig = {}) {
  if (!vropsResponse || !vropsResponse['stat-key'] || !Array.isArray(vropsResponse['stat-key'])) {
    // resourceId'yi params'tan veya endpoint'ten çıkar
    const resourceId = requestConfig.params?.resourceId || extractResourceIdFromEndpoint(requestConfig.endpoint) || null;
    return {
      statKeys: [],
      totalCount: 0,
      resourceId: resourceId
    };
  }

  const statKeys = vropsResponse['stat-key'].map((item, index) => {
    const key = item.key || '';
    // StatKey'i kategorilere ayır (örn: "System Attributes|health" -> category: "System Attributes", name: "health")
    const parts = key.split('|');
    const category = parts.length > 1 ? parts[0] : '';
    const name = parts.length > 1 ? parts.slice(1).join('|') : key;
    
    return {
      key: key,
      category: category,
      name: name,
      unit: detectUnit(key) // Birim tespiti
    };
  });

  // Kategorilere göre grupla
  const byCategory = {};
  statKeys.forEach(statKey => {
    const cat = statKey.category || 'Diğer';
    if (!byCategory[cat]) {
      byCategory[cat] = [];
    }
    byCategory[cat].push(statKey);
  });

  // resourceId'yi params'tan veya endpoint'ten çıkar
  const resourceId = requestConfig.params?.resourceId || extractResourceIdFromEndpoint(requestConfig.endpoint) || null;

  return {
    statKeys: statKeys,
    totalCount: statKeys.length,
    resourceId: resourceId,
    byCategory: byCategory,
    categories: Object.keys(byCategory).sort()
  };
}

/**
 * Resource detail response'unu parse eder
 * @param {Object} vropsResponse - vROPS API'den gelen resource detail response
 * @returns {Object} Parse edilmiş resource detail verisi
 */
export function parseResourceDetailResponse(vropsResponse) {
  if (!vropsResponse) {
    return {
      resourceId: null,
      name: null,
      adapterKindKey: null,
      resourceKindKey: null,
      creationTime: null,
      health: null,
      healthValue: null,
      dtEnabled: null,
      badges: [],
      identifiers: [],
      statusStates: [],
      links: []
    };
  }

  const resourceKey = vropsResponse.resourceKey || {};
  const identifiers = (resourceKey.resourceIdentifiers || []).map(ident => ({
    name: ident.identifierType?.name || 'N/A',
    value: ident.value || '',
    dataType: ident.identifierType?.dataType || 'STRING',
    isPartOfUniqueness: ident.identifierType?.isPartOfUniqueness || false
  }));

  const badges = (vropsResponse.badges || []).map(badge => ({
    type: badge.type,
    color: badge.color,
    score: badge.score
  }));

  const statusStates = (vropsResponse.resourceStatusStates || []).map(state => ({
    adapterInstanceId: state.adapterInstanceId,
    resourceStatus: state.resourceStatus,
    resourceState: state.resourceState,
    statusMessage: state.statusMessage || ''
  }));

  const links = (vropsResponse.links || []).map(link => ({
    href: link.href,
    rel: link.rel,
    name: link.name
  }));

  return {
    resourceId: vropsResponse.identifier || null,
    name: resourceKey.name || 'N/A',
    adapterKindKey: resourceKey.adapterKindKey || null,
    resourceKindKey: resourceKey.resourceKindKey || null,
    creationTime: vropsResponse.creationTime || null,
    health: vropsResponse.resourceHealth || null,
    healthValue: vropsResponse.resourceHealthValue || null,
    dtEnabled: vropsResponse.dtEnabled || false,
    badges: badges,
    identifiers: identifiers,
    statusStates: statusStates,
    links: links
  };
}

/**
 * Relationships response'unu parse eder
 * @param {Object} vropsResponse - vROPS API'den gelen relationships response
 * @returns {Object} Parse edilmiş relationships verisi
 */
export function parseRelationshipsResponse(vropsResponse) {
  console.log('parseRelationshipsResponse - Input:', JSON.stringify(vropsResponse, null, 2));
  
  if (!vropsResponse || !vropsResponse.resourceList || !Array.isArray(vropsResponse.resourceList)) {
    console.log('parseRelationshipsResponse - No resourceList found or not array');
    return {
      resources: [],
      totalCount: 0,
      relationshipType: null,
      pageInfo: null
    };
  }
  
  console.log('parseRelationshipsResponse - resourceList length:', vropsResponse.resourceList.length);

  const resources = vropsResponse.resourceList.map(resource => {
    const resourceKey = resource.resourceKey || {};
    const identifiers = (resourceKey.resourceIdentifiers || []).map(ident => ({
      name: ident.identifierType?.name || 'N/A',
      value: ident.value || '',
      dataType: ident.identifierType?.dataType || 'STRING',
      isPartOfUniqueness: ident.identifierType?.isPartOfUniqueness || false
    }));

    const badges = (resource.badges || []).map(badge => ({
      type: badge.type,
      color: badge.color,
      score: badge.score
    }));

    return {
      resourceId: resource.identifier || null,
      name: resourceKey.name || 'N/A',
      adapterKindKey: resourceKey.adapterKindKey || null,
      resourceKindKey: resourceKey.resourceKindKey || null,
      creationTime: resource.creationTime || null,
      dtEnabled: resource.dtEnabled || false,
      badges: badges,
      identifiers: identifiers
    };
  });

  return {
    resources: resources,
    totalCount: vropsResponse.pageInfo?.totalCount || resources.length,
    relationshipType: vropsResponse.relationshipType || 'ALL',
    pageInfo: vropsResponse.pageInfo || null
  };
}

/**
 * Symptoms response'unu parse eder
 * @param {Object} vropsResponse - vROPS API'den gelen symptoms response
 * @returns {Object} Parse edilmiş symptoms verisi
 */
export function parseSymptomsResponse(vropsResponse) {
  if (!vropsResponse || !vropsResponse.symptom || !Array.isArray(vropsResponse.symptom)) {
    return {
      symptoms: [],
      totalCount: 0,
      pageInfo: null,
      summary: {
        byCriticality: {},
        byKpi: { kpi: 0, nonKpi: 0 }
      }
    };
  }

  const symptoms = vropsResponse.symptom.map(symptom => ({
    id: symptom.id || null,
    resourceId: symptom.resourceId || null,
    startTimeUTC: symptom.startTimeUTC || null,
    updateTimeUTC: symptom.updateTimeUTC || null,
    cancelTimeUTC: symptom.cancelTimeUTC || 0,
    kpi: symptom.kpi || false,
    symptomCriticality: symptom.symptomCriticality || 'N/A',
    symptomDefinitionId: symptom.symptomDefinitionId || null,
    statKey: symptom.statKey || null,
    message: symptom.message || 'N/A',
    faultDevices: symptom.faultDevices || []
  }));

  // İstatistiksel özet oluştur
  const summary = {
    byCriticality: {
      CRITICAL: symptoms.filter(s => s.symptomCriticality === 'CRITICAL').length,
      WARNING: symptoms.filter(s => s.symptomCriticality === 'WARNING').length,
      INFORMATION: symptoms.filter(s => s.symptomCriticality === 'INFORMATION').length,
    },
    byKpi: {
      kpi: symptoms.filter(s => s.kpi === true).length,
      nonKpi: symptoms.filter(s => s.kpi === false).length
    }
  };

  return {
    symptoms: symptoms,
    totalCount: vropsResponse.pageInfo?.totalCount || symptoms.length,
    pageInfo: vropsResponse.pageInfo || null,
    summary: summary
  };
}

/**
 * Properties response'unu parse eder
 * @param {Object} vropsResponse - vROPS API'den gelen properties response
 * @returns {Object} Parse edilmiş properties verisi
 */
export function parsePropertiesResponse(vropsResponse) {
  if (!vropsResponse || !vropsResponse.property || !Array.isArray(vropsResponse.property)) {
    return {
      properties: [],
      totalCount: 0,
      resourceId: null,
      byCategory: {}
    };
  }

  const properties = vropsResponse.property.map(prop => {
    // Property name'den kategori çıkar (örn: "config|extraConfig|vcpu_hotadd" -> category: "config", name: "extraConfig|vcpu_hotadd")
    const parts = prop.name.split('|');
    const category = parts.length > 1 ? parts[0] : 'General';
    const name = parts.length > 1 ? parts.slice(1).join('|') : prop.name;
    
    return {
      name: prop.name,
      category: category,
      displayName: name,
      value: prop.value || ''
    };
  });

  // Kategorilere göre grupla
  const byCategory = {};
  properties.forEach(prop => {
    const cat = prop.category || 'General';
    if (!byCategory[cat]) {
      byCategory[cat] = [];
    }
    byCategory[cat].push(prop);
  });

  return {
    properties: properties,
    totalCount: properties.length,
    resourceId: vropsResponse.resourceId || null,
    byCategory: byCategory,
    categories: Object.keys(byCategory).sort()
  };
}

/**
 * Resources list response'unu parse eder
 * @param {Object} vropsResponse - vROPS API'den gelen resources list response
 * @returns {Object} Parse edilmiş resources list verisi
 */
export function parseResourcesResponse(vropsResponse) {
  if (!vropsResponse || !vropsResponse.resourceList || !Array.isArray(vropsResponse.resourceList)) {
    return {
      resources: [],
      totalCount: 0,
      pageInfo: vropsResponse.pageInfo || null
    };
  }

  const resources = vropsResponse.resourceList.map(resource => {
    const resourceKey = resource.resourceKey || {};
    const badges = (resource.badges || []).map(badge => ({
      type: badge.type,
      color: badge.color,
      score: badge.score
    }));

    return {
      resourceId: resource.identifier || null,
      name: resourceKey.name || 'N/A',
      adapterKindKey: resourceKey.adapterKindKey || null,
      resourceKindKey: resourceKey.resourceKindKey || null,
      creationTime: resource.creationTime || null,
      health: resource.resourceHealth || null,
      healthValue: resource.resourceHealthValue || null,
      badges: badges
    };
  });

  return {
    resources: resources,
    totalCount: vropsResponse.pageInfo?.totalCount || resources.length,
    pageInfo: vropsResponse.pageInfo || null
  };
}

/**
 * TopN Stats response'unu parse eder
 * En fazla/az kaynak tüketen VM'leri listelemek için kullanılan endpoint'in response'unu parse eder
 * @param {Object} vropsResponse - vROPS API'den gelen topn stats response
 * @param {Object} requestConfig - Orijinal request config (sortOrder, statKey vs. için)
 * @returns {Object} Parse edilmiş topn stats verisi
 */
export function parseTopNStatsResponse(vropsResponse, requestConfig = {}) {
  if (!vropsResponse || !vropsResponse.resourceStatGroups || !Array.isArray(vropsResponse.resourceStatGroups)) {
    return {
      vms: [],
      totalCount: 0,
      sortOrder: null,
      statKeys: [],
      summary: {}
    };
  }

  const sortOrder = vropsResponse.sortOrder || requestConfig.params?.sortOrder || 'DESCENDING';
  const resourceStatGroups = vropsResponse.resourceStatGroups;
  
  // Request'teki statKey'i al (normalize edilmiş format için)
  const requestedStatKey = requestConfig.params?.statKey || null;
  
  // StatKey normalize fonksiyonu - "virtualDisk:Aggregate of all instances|usage" -> "virtualDisk|usage"
  const normalizeStatKey = (statKey) => {
    if (!statKey) return statKey;
    // ":Aggregate of all instances" gibi kısımları kaldır
    return statKey.replace(/:[^|]*/g, '');
  };

  // Tüm statKey'leri topla (her VM için farklı statKey'ler olabilir)
  const allStatKeys = new Set();
  resourceStatGroups.forEach(group => {
    if (group.resourceStats && Array.isArray(group.resourceStats)) {
      group.resourceStats.forEach(resourceStat => {
        if (resourceStat.stat && resourceStat.stat.statKey && resourceStat.stat.statKey.key) {
          const rawStatKey = resourceStat.stat.statKey.key;
          // StatKey'i normalize et veya request'teki statKey'i kullan
          const normalizedStatKey = requestedStatKey || normalizeStatKey(rawStatKey);
          allStatKeys.add(normalizedStatKey);
        }
      });
    }
  });

  // VM'leri parse et
  const vms = [];
  
  // VM isimlerini requestConfig'den al (eğer varsa)
  // requestConfig.vmNameMap bir obje olarak gelir (Map değil)
  const vmNameMapObj = requestConfig.vmNameMap || {};
  
  resourceStatGroups.forEach((group, index) => {
    const resourceId = group.groupKey || null;
    const resourceStats = group.resourceStats || [];
    
    // VM ismini objeden al, yoksa resourceId kullan
    const vmName = vmNameMapObj[resourceId] || resourceId || 'N/A';
    
    // Her statKey için değerleri topla
    const stats = {};
    
    resourceStats.forEach(resourceStat => {
      const stat = resourceStat.stat;
      if (!stat || !stat.statKey || !stat.statKey.key) {
        return;
      }
      
      // StatKey'i normalize et - request'teki statKey varsa onu kullan, yoksa normalize et
      const rawStatKey = stat.statKey.key;
      const statKey = requestedStatKey || normalizeStatKey(rawStatKey);
      const data = stat.data || [];
      
      // Ortalama değeri hesapla (data array'indeki tüm değerlerin ortalaması)
      let avgValue = null;
      if (data.length > 0) {
        const numericData = data
          .map(val => typeof val === 'number' ? val : parseFloat(val))
          .filter(val => !isNaN(val));
        
        if (numericData.length > 0) {
          avgValue = numericData.reduce((sum, val) => sum + val, 0) / numericData.length;
        }
      }
      
      // Son değeri al (en güncel değer)
      const latestValue = data.length > 0 ? data[data.length - 1] : null;
      const latestNumericValue = latestValue !== null && latestValue !== undefined 
        ? (typeof latestValue === 'number' ? latestValue : parseFloat(latestValue))
        : null;
      
      // Geçerli sayısal değer kontrolü
      const finalValue = (!isNaN(latestNumericValue) && latestNumericValue !== null) 
        ? latestNumericValue 
        : ((!isNaN(avgValue) && avgValue !== null) ? avgValue : null);
      
      stats[statKey] = {
        statKey: statKey,
        value: finalValue,
        avgValue: avgValue,
        latestValue: latestNumericValue,
        formattedValue: finalValue !== null && !isNaN(finalValue) 
          ? formatMetricValue(finalValue, statKey) 
          : 'N/A',
        unit: detectUnit(statKey),
        timestamps: stat.timestamps || [],
        data: data
      };
    });
    
    // VM objesi oluştur
    const vm = {
      rank: index + 1, // Sıralama (1'den başlar)
      resourceId: resourceId,
      name: vmName, // VM ismi Map'ten alındı
      stats: stats,
      statKeys: Object.keys(stats),
      // En yüksek değere sahip statKey'i bul (sıralama için)
      primaryStatKey: Object.keys(stats).length > 0 ? Object.keys(stats)[0] : null,
      primaryValue: Object.keys(stats).length > 0 && stats[Object.keys(stats)[0]] 
        ? stats[Object.keys(stats)[0]].value 
        : null
    };
    
    vms.push(vm);
  });

  // İstatistiksel özet oluştur
  const summary = {
    totalVMs: vms.length,
    sortOrder: sortOrder,
    statKeys: Array.from(allStatKeys),
    // Her statKey için min/max/avg değerleri
    byStatKey: {}
  };

  allStatKeys.forEach(statKey => {
    const values = vms
      .map(vm => vm.stats[statKey]?.value)
      .filter(val => val !== null && !isNaN(val));
    
    if (values.length > 0) {
      summary.byStatKey[statKey] = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        count: values.length
      };
    }
  });

  return {
    vms: vms,
    totalCount: vms.length,
    sortOrder: sortOrder,
    statKeys: Array.from(allStatKeys),
    summary: summary
  };
}

/**
 * vROPS response'unu tipine göre parse eder
 * @param {Object} vropsResponse - vROPS API'den gelen ham response
 * @param {String} responseType - Veri tipi ('alerts', 'metrics', vs.)
 * @param {Object} requestConfig - Orijinal request config (metrics için gerekli)
 * @returns {Object} Parse edilmiş veri
 */
export function parseVropsResponse(vropsResponse, responseType, requestConfig = {}) {
  switch (responseType) {
    case 'alerts':
      return parseAlertsResponse(vropsResponse);
    case 'metrics':
      return parseMetricsResponse(vropsResponse, requestConfig);
    case 'latestStats':
      return parseLatestStatsResponse(vropsResponse);
    case 'statKeys':
      return parseStatKeysResponse(vropsResponse, requestConfig);
    case 'resourceDetail':
      return parseResourceDetailResponse(vropsResponse);
    case 'relationships':
      return parseRelationshipsResponse(vropsResponse);
    case 'symptoms':
      return parseSymptomsResponse(vropsResponse);
    case 'properties':
      return parsePropertiesResponse(vropsResponse);
    case 'resources':
      return parseResourcesResponse(vropsResponse);
    case 'topn':
      return parseTopNStatsResponse(vropsResponse, requestConfig);
    default:
      return { data: vropsResponse, type: 'unknown' };
  }
}

