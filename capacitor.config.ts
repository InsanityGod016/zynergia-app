import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zynergia.app',
  appName: 'Zynergia',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      showSpinner: false
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
