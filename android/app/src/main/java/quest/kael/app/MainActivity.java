package quest.kael.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // Flush periódico mientras la app está en primer plano.
    // Samsung y otros OEMs agresivos envían SIGKILL al proceso cuando el usuario
    // cierra todas las apps, sin llamar onPause/onStop/onDestroy.
    // Escribir al disco cada 10s garantiza que la cookie de sesión de NextAuth
    // sobreviva aunque el proceso sea matado sin aviso.
    private final Handler flushHandler = new Handler(Looper.getMainLooper());
    private final Runnable flushTask = new Runnable() {
        @Override
        public void run() {
            CookieManager.getInstance().flush();
            flushHandler.postDelayed(this, 10_000);
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(bridge.getWebView(), true);
    }

    @Override
    public void onResume() {
        super.onResume();
        // Flush inmediato al volver al frente (cubre el caso de app restaurada)
        CookieManager.getInstance().flush();
        // Iniciar ciclo de flush periódico
        flushHandler.post(flushTask);
    }

    @Override
    public void onBackPressed() {
        // Siempre minimizar — nunca navegar en el historial del WebView.
        // Navegar atrás llevaría a /login (página previa) y el usuario creería
        // que fue desconectado aunque la sesión siga activa.
        moveTaskToBack(true);
    }

    @Override
    public void onPause() {
        super.onPause();
        // Detener el ciclo periódico y hacer un flush final.
        // Cubre el cierre normal de la app (lifecycle completo).
        flushHandler.removeCallbacks(flushTask);
        CookieManager.getInstance().flush();
    }

    @Override
    public void onStop() {
        super.onStop();
        CookieManager.getInstance().flush();
    }
}
