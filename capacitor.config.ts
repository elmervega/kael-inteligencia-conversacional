import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Identificador único de la app en Google Play y el dispositivo.
  // Formato reverse-domain obligatorio. No cambiar después de publicar en Play Store.
  appId: 'quest.kael.app',
  appName: 'Kael',

  // webDir apunta a la carpeta de build estático de Next.js.
  // Con server.url configurado abajo, este directorio NO se usa en runtime;
  // Capacitor lo ignora y sirve la URL en vivo. Igual debe existir.
  webDir: 'public',

  server: {
    // La app abre directamente kael.quest en pantalla completa.
    // No hay build estático local — el WebView actúa como un browser sin chrome.
    url: 'https://kael.quest',
    // Permite que el WebView de Android cargue la URL sin restricciones CORS internas.
    cleartext: false,   // HTTPS → cleartext desactivado (correcto para producción)
    androidScheme: 'https',
  },

  android: {
    // La barra de estado (hora, batería, señal) permanece visible con el color del sistema.
    // Se complementa con el plugin @capacitor/status-bar en MainActivity.
    backgroundColor: '#050505',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,   // activar solo en development
  },

  plugins: {
    StatusBar: {
      style: 'DARK',            // iconos blancos sobre fondo oscuro
      backgroundColor: '#050505',
      overlaysWebView: false,   // la barra de estado ocupa espacio propio, no se superpone
      animation: 'FADE',
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#050505',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
}

export default config
