import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import { isLocalDemoBuild, isLocalReviewBuild } from './src/lib/demo-build.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const requestedDemo = mode === 'demo' && env.VITE_DEMO_MODE === 'true'
  const requestedReview = mode === 'review' && env.VITE_REVIEW_MODE === 'true'
  if ((requestedDemo || requestedReview) && process.env.CI) {
    throw new Error('Los builds locales de demostración o revisión están prohibidos en CI.')
  }
  const demoBuild = isLocalDemoBuild({ mode, flag: env.VITE_DEMO_MODE, ci: process.env.CI })
  const reviewBuild = isLocalReviewBuild({ mode, flag: env.VITE_REVIEW_MODE, ci: process.env.CI })
  const nativeBuild = mode === 'native' && env.VITE_NATIVE_BUILD === 'true'

  return {
    plugins: [react()],
    publicDir: demoBuild || nativeBuild ? false : undefined,
    define: {
      'import.meta.env.VITE_REVIEW_MODE': JSON.stringify(reviewBuild ? 'true' : 'false'),
    },
    resolve: {
      alias: {
        '#app-root': path.resolve(__dirname, demoBuild ? './src/demo/DemoExperience.jsx' : './src/App.jsx'),
        '@': path.resolve(__dirname, './src'),
      },
    },
    // IMPORTANTE: NO marcar plugins de Capacitor como "external".
    // El WebView nativo no puede resolver bare imports en runtime — externalizarlos
    // crashea el bundle completo y deja la app en pantalla blanca (causa del
    // rechazo 2.1a de Apple). Los plugins deben ir DENTRO del bundle; en web son
    // no-op porque todo uso está protegido con isNative.
  }
});
