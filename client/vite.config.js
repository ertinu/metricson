// Vite konfigürasyon dosyası - React ve build ayarlarını yapılandırır
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Backend API isteklerini proxy'ler
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});

