// Chat sayfası - Ana sohbet arayüzü
import ChatInterface from '../components/ChatInterface';

function ChatPage() {
  return (
    // Tüm sayfayı yatayda bölen ana container (sol: sohbet listesi, sağ: chat alanı)
    // Arka plan ve tema açık (light) moda çekildi
    <div className="min-h-screen flex bg-gray-100 text-gray-900">
      {/* Sol taraf: sohbet listesi / ChatGPT tarzı sidebar */}
      <aside className="w-72 border-r border-gray-200 bg-white flex flex-col">
        {/* Logo ve başlık alanı */}
        <div className="px-4 py-5 border-b border-gray-200">
          <div className="text-sm font-semibold text-gray-500 tracking-widest uppercase">
            Metric AI
          </div>
          <h1 className="mt-1 text-lg font-bold text-white">
            vROPS Asistanı
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            vROPS işlemlerinizi doğal dil ile yönetin
          </p>
        </div>

        {/* Yeni sohbet butonu */}
        <div className="px-4 py-3 border-b border-gray-200">
          {/* Şu an için sadece görsel amaçlı - işlevsellik istenirse state ile yönetilebilir */}
          <button
            className="w-full flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 hover:border-gray-400 transition-colors"
          >
            {/* Yeni sohbet butonu ikonu (basit artı işareti) */}
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 text-white text-xs font-bold">
              +
            </span>
            <span>Yeni sohbet</span>
          </button>
        </div>

        {/* Sohbet listesi - Şu an için statik örnekler */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 text-sm">
          {/* Aktif sohbet örneği */}
          <button className="w-full text-left px-3 py-2 rounded-md bg-gray-200 text-gray-900 border border-gray-300 hover:bg-gray-300 transition-colors">
            Bugünkü vROPS durumu
          </button>
          {/* Önceki sohbet örnekleri */}
          <button className="w-full text-left px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors">
            CPU kullanımı yüksek VM&apos;ler
          </button>
          <button className="w-full text-left px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors">
            Disk alanı raporu
          </button>
          <button className="w-full text-left px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors">
            Son 24 saat olay özeti
          </button>
        </div>

        {/* Sol alt bilgi alanı */}
        <div className="px-4 py-3 border-t border-gray-200 text-[11px] text-gray-500">
          {/* Portalın kısa açıklaması */}
          Metric AI Portal · vROPS entegrasyonu ile ChatGPT benzeri deneyim
        </div>
      </aside>

      {/* Sağ taraf: asıl chat alanı */}
      <main className="flex-1 flex flex-col bg-gray-50">
        {/* Üst bar - basit, sade başlık (ChatGPT üst barına benzer) */}
        <header className="h-14 border-b border-gray-200 flex items-center px-6 bg-white">
          <h2 className="text-sm font-semibold text-gray-800">
            Aktif Sohbet
          </h2>
        </header>

        {/* Chat içeriği - tamamını kaplayan alan */}
        <section className="flex-1 flex flex-col px-4 md:px-8 py-4">
          {/* Chat arayüzü - Yükseklik ve yerleşim burada yönetiliyor */}
          {/* Sağ taraftaki chat alanı, tüm kullanılabilir genişliği kaplar */}
          <div className="flex-1 flex flex-col">
            <ChatInterface />
          </div>
        </section>
      </main>
    </div>
  );
}

export default ChatPage;

