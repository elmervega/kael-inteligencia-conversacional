package quest.kael.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // registerPlugin() registra el StatusBarPlugin antes de que BridgeActivity
        // inicialice el WebView — el orden importa para que la configuración del
        // capacitor.config.ts (style: DARK, overlaysWebView: false) se aplique
        // desde el primer frame y no produzca un flash de barra blanca.
        super.onCreate(savedInstanceState);
    }
}
