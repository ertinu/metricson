// Vite konfigürasyon dosyası - React ve build ayarlarını yapılandırır
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Backend API isteklerini proxy'ler - Optimize edilmiş ayarlar
      '/api': {
        target: 'http://127.0.0.1:3001', // localhost yerine 127.0.0.1 (DNS çözümlemesi yok)
        changeOrigin: true,
        secure: false,
        // Connection pooling ve keep-alive
        ws: true, // WebSocket desteği
        // Timeout ayarları
        timeout: 30000,
        // Proxy ayarları
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('❌ [VITE PROXY] Proxy hatası:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`📡 [VITE PROXY] İstek proxy'leniyor: ${req.method} ${req.url}`);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log(`✅ [VITE PROXY] Response alındı: ${req.method} ${req.url} - ${proxyRes.statusCode}`);
          });
        }
      }
    }
  }
});

