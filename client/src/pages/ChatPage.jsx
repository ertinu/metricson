// Chat sayfası - Yeni tasarım ile ChatGPT benzeri arayüz
import ChatInterface from '../components/ChatInterface';

function ChatPage() {
  return (
    <div className="bg-background-light font-display text-text-light antialiased overflow-hidden h-screen flex">
      {/* Sol Sidebar */}
      <aside className="hidden md:flex w-[260px] flex-col h-full bg-sidebar-light border-r border-border-light flex-shrink-0 transition-all duration-300">
        <div className="flex flex-col h-full p-3 gap-2">
          {/* New Chat Butonu */}
          <button className="flex w-full items-center gap-3 rounded-lg border border-border-light px-3 py-3 text-sm font-medium text-text-light hover:bg-gray-50 transition-colors group mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[18px]">add</span>
            </div>
            <span>New chat</span>
          </button>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-6 pr-1">
            {/* Today */}
            <div className="flex flex-col gap-2">
              <h3 className="px-3 text-xs font-semibold text-text-secondary-light uppercase tracking-wider">Today</h3>
              <a className="flex items-center gap-3 rounded-lg bg-gray-100 px-3 py-2.5 transition-colors relative group" href="#">
                <span className="material-symbols-outlined text-gray-600 text-[18px]">chat_bubble</span>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-normal text-text-light">vROPS Durum Analizi</p>
                </div>
                <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-gray-100 pl-2">
                  <span className="material-symbols-outlined text-gray-500 text-[16px]">more_horiz</span>
                </div>
              </a>
              <a className="flex items-center gap-3 rounded-lg hover:bg-gray-50 px-3 py-2.5 transition-colors group" href="#">
                <span className="material-symbols-outlined text-gray-600 text-[18px]">chat_bubble_outline</span>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-normal text-gray-700">CPU Kullanım Raporu</p>
                </div>
              </a>
            </div>

            {/* Previous 7 Days */}
            <div className="flex flex-col gap-2">
              <h3 className="px-3 text-xs font-semibold text-text-secondary-light uppercase tracking-wider">Previous 7 Days</h3>
              <a className="flex items-center gap-3 rounded-lg hover:bg-gray-50 px-3 py-2.5 transition-colors" href="#">
                <span className="material-symbols-outlined text-gray-600 text-[18px]">chat_bubble_outline</span>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-normal text-gray-700">Disk Alanı Analizi</p>
                </div>
              </a>
              <a className="flex items-center gap-3 rounded-lg hover:bg-gray-50 px-3 py-2.5 transition-colors" href="#">
                <span className="material-symbols-outlined text-gray-600 text-[18px]">chat_bubble_outline</span>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-normal text-gray-700">Alert Özeti</p>
                </div>
              </a>
              <a className="flex items-center gap-3 rounded-lg hover:bg-gray-50 px-3 py-2.5 transition-colors" href="#">
                <span className="material-symbols-outlined text-gray-600 text-[18px]">chat_bubble_outline</span>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-normal text-gray-700">VM Performans Analizi</p>
                </div>
              </a>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-border-light pt-3 flex flex-col gap-1">
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-3 hover:bg-gray-50 transition-colors text-left">
              <span className="material-symbols-outlined text-gray-600 text-[20px]">settings</span>
              <span className="flex-1 text-sm font-medium text-text-light">Settings</span>
            </button>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-3 hover:bg-gray-50 transition-colors text-left">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white font-bold text-xs">
                MA
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-text-light">Metric AI</span>
                <span className="text-xs text-text-secondary-light">vROPS Portal</span>
              </div>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative min-w-0 bg-background-light">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border-light bg-sidebar-light/95 backdrop-blur sticky top-0 z-20">
          <button className="text-gray-600 hover:text-text-light">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="font-bold text-text-light">Chat</span>
          <button className="text-gray-600 hover:text-text-light">
            <span className="material-symbols-outlined">add</span>
          </button>
        </header>

        {/* Chat Area */}
        <div className="flex-1 flex h-full">
          <div className="flex-1 flex flex-col border-r border-border-light min-w-0">
            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-border-light px-4 py-3 bg-panel-light flex-shrink-0">
              <div className="flex gap-2" role="tablist">
                <button
                  aria-selected="true"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary border-b-2 border-primary"
                  role="tab"
                >
                  <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                  Aktif Sohbet
                </button>
                <button
                  aria-selected="false"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary-light hover:text-text-light hover:border-b-2 hover:border-gray-300 transition-colors"
                  role="tab"
                >
                  <span className="material-symbols-outlined text-[18px]">history</span>
                  Geçmiş
                </button>
              </div>
              <button
                className="p-1.5 text-gray-500 hover:text-primary rounded-md hover:bg-gray-100 transition-colors"
                title="New Tab"
              >
                <span className="material-symbols-outlined text-[20px]">add_box</span>
              </button>
            </div>

            {/* Chat Interface */}
            <ChatInterface />
          </div>
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="hidden xl:flex w-[320px] flex-col h-full bg-sidebar-light border-l border-border-light flex-shrink-0 transition-all duration-300 p-4 gap-4 overflow-y-auto">
        {/* Quick Actions */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-text-light flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-600 text-[20px]">bolt</span>
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button className="flex flex-col items-center justify-center p-3 rounded-lg border border-border-light bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-text-secondary-light">
              <span className="material-symbols-outlined text-[20px] mb-1 text-primary">edit</span>
              Özet Çıkar
            </button>
            <button className="flex flex-col items-center justify-center p-3 rounded-lg border border-border-light bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-text-secondary-light">
              <span className="material-symbols-outlined text-[20px] mb-1 text-primary">add_notes</span>
              Anahtar Noktalar
            </button>
            <button className="flex flex-col items-center justify-center p-3 rounded-lg border border-border-light bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-text-secondary-light">
              <span className="material-symbols-outlined text-[20px] mb-1 text-primary">translate</span>
              Çevir
            </button>
            <button className="flex flex-col items-center justify-center p-3 rounded-lg border border-border-light bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-text-secondary-light">
              <span className="material-symbols-outlined text-[20px] mb-1 text-primary">share</span>
              Paylaş
            </button>
          </div>
        </div>

        {/* Related Data */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-text-light flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-600 text-[20px]">data_array</span>
            Favoriler
          </h3>
          <div className="flex flex-col gap-2">
            <a className="flex items-center gap-3 p-3 rounded-lg border border-border-light bg-gray-50 hover:bg-gray-100 transition-colors" href="#">
              <span className="material-symbols-outlined text-blue-500 text-[20px]">folder_open</span>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-text-light">vROPS Raporları</p>
                <p className="text-xs text-text-secondary-light">Son güncelleme: 2 saat önce</p>
              </div>
            </a>
            <a className="flex items-center gap-3 p-3 rounded-lg border border-border-light bg-gray-50 hover:bg-gray-100 transition-colors" href="#">
              <span className="material-symbols-outlined text-green-500 text-[20px]">table_chart</span>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-text-light">Performans Metrikleri</p>
                <p className="text-xs text-text-secondary-light">Son güncelleme: Dün</p>
              </div>
            </a>
            <a className="flex items-center gap-3 p-3 rounded-lg border border-border-light bg-gray-50 hover:bg-gray-100 transition-colors" href="#">
              <span className="material-symbols-outlined text-purple-500 text-[20px]">link</span>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-text-light">vROPS API Dokümantasyonu</p>
                <p className="text-xs text-text-secondary-light">Harici Kaynak</p>
              </div>
            </a>
          </div>
        </div>

      </aside>
    </div>
  );
}

export default ChatPage;
