// Ana App komponenti - Chat arayüzünü içerir
import { useState } from 'react';
import ChatInterface from './components/ChatInterface';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Başlık */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Metric AI Portal
          </h1>
          <p className="text-gray-400">
            vROPS işlemlerinizi doğal dil ile yönetin
          </p>
        </header>

        {/* Chat arayüzü */}
        <ChatInterface />
      </div>
    </div>
  );
}

export default App;

