import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId:   'cm.omboa.app',
  appName: "O'Mboa",
  webDir:  'dist/omboa/browser',
  server: {
    // En dev, pointe vers le serveur Angular local
    // En prod, Capacitor embarque le build statique
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
