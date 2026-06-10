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
  // IMPORTANTE: NO marcar plugins de Capacitor como "external".
  // El WebView nativo no puede resolver bare imports en runtime — externalizarlos
  // crashea el bundle completo y deja la app en pantalla blanca (causa del
  // rechazo 2.1a de Apple). Los plugins deben ir DENTRO del bundle; en web son
  // no-op porque todo uso está protegido con isNative.
});
