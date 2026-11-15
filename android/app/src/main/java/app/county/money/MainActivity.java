package app.county.money;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.view.WindowManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import org.json.JSONObject;
import androidx.core.splashscreen.SplashScreen;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        splash.setOnExitAnimationListener(provider -> provider.remove());
        registerPlugin(CountyNativePlugin.class);
        super.onCreate(savedInstanceState);
        boolean dark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        try {
            String stored = getSharedPreferences("CapacitorStorage", MODE_PRIVATE).getString("county-data", null);
            String appearance = stored == null ? "system" : new JSONObject(stored).optString("theme", "system");
            if ("dark".equals(appearance)) dark = true;
            if ("light".equals(appearance)) dark = false;
        } catch (Exception ignored) {}
        int launchColor = Color.parseColor(dark ? "#303236" : "#D8D6C9");
        getWindow().setBackgroundDrawable(new ColorDrawable(launchColor));
        if (getBridge() != null) getBridge().getWebView().setBackgroundColor(launchColor);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
    }
}
