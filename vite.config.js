import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // In web/dev mode, stub out native-only Capacitor plugins.
      'onesignal-capacitor': path.resolve(__dirname, 'src/lib/stubs/onesignal-stub.js'),
    },
  },
  build: {
    rollupOptions: {
      external: [
        '@revenuecat/purchases-capacitor',
        'onesignal-capacitor',
        '@capacitor/status-bar',
        '@capacitor/app',
      ]
    }
  }
});
