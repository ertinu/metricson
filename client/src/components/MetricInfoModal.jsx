// Metrik açıklama popup komponenti
import { useState, useEffect } from 'react';
import { sendMessage } from '../services/api';

function MetricInfoModal({ isOpen, onClose, statKey, resourceId }) {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && statKey) {
      // Modal açıldığında ChatGPT'ye soru gönder
      setIsLoading(true);
      setError(null);
      setDescription('');

      const question = `Bu vROPS metrik ne işe yarar: ${statKey}. Kısa ve öz bir açıklama yap, Türkçe olarak.`;
      
      // resourceId varsa API'ye gönder
      sendMessage(question, resourceId)
        .then((response) => {
          if (response.gptResponse) {
            setDescription(response.gptResponse);
          } else {
            setError('Açıklama alınamadı.');
          }
        })
        .catch((err) => {
          setError(err.response?.data?.error || err.message || 'Bir hata oluştu');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Modal kapandığında state'i temizle
      setDescription('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, statKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Metrik Açıklaması</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* StatKey */}
        {statKey && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">StatKey:</div>
            <div className="font-mono text-sm text-gray-900">{statKey}</div>
          </div>
        )}

        {/* Description */}
        <div className="mb-4 min-h-[100px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Açıklama alınıyor...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          ) : description ? (
            <>
              <div className="text-sm text-gray-600 mb-2">Açıklama:</div>
              <div className="text-gray-900 leading-relaxed">
                {description.split(/\n\n+/).map((paragraph, index) => {
                  // Paragrafı **bold** formatına göre parse et
                  const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <div key={index} className={index > 0 ? 'mt-4' : ''}>
                      {parts.map((part, partIndex) => {
                        // **bold** formatını kontrol et
                        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                          const boldText = part.slice(2, -2);
                          return <strong key={partIndex} className="font-semibold text-gray-900">{boldText}</strong>;
                        }
                        // Normal metin - satır sonlarını <br> ile değiştir
                        return (
                          <span key={partIndex}>
                            {part.split('\n').map((line, lineIndex, lines) => (
                              <span key={lineIndex}>
                                {line}
                                {lineIndex < lines.length - 1 && <br />}
                              </span>
                            ))}
                          </span>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

export default MetricInfoModal;

