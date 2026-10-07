package com.sanju.assistant;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private final Runnable dispatchSanjuBack = () -> {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().evaluateJavascript(
                "(window.__sanjuHandleBack ? window.__sanjuHandleBack() : false)",
                value -> {
                    if (("false".equals(value) || "null".equals(value)) && Build.VERSION.SDK_INT < 33) {
                        MainActivity.super.onBackPressed();
                    }
                }
            );
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PhoneControlPlugin.class);
        registerPlugin(VoiceInputPlugin.class);
        registerPlugin(TtsPlugin.class);
        registerPlugin(WakeWordPlugin.class);
        registerPlugin(SanjuSchedulerPlugin.class);
        registerPlugin(AccessibilityControlPlugin.class);
        registerPlugin(CallAssistantPlugin.class);
        registerPlugin(NotificationAccessPlugin.class);
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                () -> dispatchSanjuBack.run()
            );
        }
    }

    @Override
    public void onBackPressed() {
        // Legacy Android only. Android 13+ uses OnBackInvokedCallback above.
        if (Build.VERSION.SDK_INT < 33) dispatchSanjuBack.run();
        else super.onBackPressed();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent != null && intent.getBooleanExtra("sanju_wake", false)) {
            final String command = intent.getStringExtra("sanju_command");
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().postDelayed(() -> {
                    String safe = command == null ? "" : command.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ");
                    getBridge().getWebView().evaluateJavascript("window.dispatchEvent(new CustomEvent('sanjuWake',{detail:{command:'" + safe + "'}}));", null);
                }, 500);
            }
        }
    }
}
