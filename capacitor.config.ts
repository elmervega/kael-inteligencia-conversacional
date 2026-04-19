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
    url: 'https://kael.quest',
    // hostname + androidScheme = "El Truco Maestro" de persistencia de cookies.
    // Sin hostname, el WebView tiene origen "capacitor://localhost" → las cookies
    // de kael.quest se tratan como TERCEROS → Android puede borrarlas en force-kill.
    // Con hostname = 'kael.quest', el WebView adopta ese origen como propio →
    // cookies de kael.quest son PRIMERA PARTE → persistencia nativa garantizada.
    hostname: 'kael.quest',
    androidScheme: 'https',
    cleartext: false,
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
    // Habilita el manejo nativo de cookies a través del CookieManager de Android.
    // Asegura que el bridge de Capacitor use la capa nativa para leer/escribir
    // cookies, reforzando la persistencia junto con CookieManager.flush() de MainActivity.
    CapacitorCookies: {
      enabled: true,
    },
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
