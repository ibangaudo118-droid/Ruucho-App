package com.ruucho.app;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    public class VioExitBridge {
        @JavascriptInterface
        public void exitApp() {
            runOnUiThread(() -> finishAndRemoveTask());
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Draw edge-to-edge: let the WebView extend under the status bar and nav bar
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Light icons on the status bar and navigation bar (good for a dark header/footer)
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
            .setAppearanceLightStatusBars(false);

        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
            .setAppearanceLightNavigationBars(false);

        Bridge bridgeForExit = getBridge();

        if (bridgeForExit != null && bridgeForExit.getWebView() != null) {
            WebView webView = bridgeForExit.getWebView();

            webView.addJavascriptInterface(
                new VioExitBridge(),
                "VioExitBridge"
            );
        }

        getOnBackPressedDispatcher().addCallback(
            this,
            new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    Bridge bridge = getBridge();

                    if (bridge == null) {
                        setEnabled(false);
                        getOnBackPressedDispatcher().onBackPressed();
                        setEnabled(true);
                        return;
                    }

                    JSONObject data = new JSONObject();

                    try {
                        data.put(
                            "canGoBack",
                            bridge.getWebView().canGoBack()
                        );
                    } catch (Exception ignored) {
                    }

                    bridge.triggerJSEvent(
                        "backButton",
                        "window",
                        data.toString()
                    );
                }
            }
        );
    }
            }
