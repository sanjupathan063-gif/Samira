package com.sanju.assistant;

import android.content.ComponentName;
import android.content.Intent;
import android.provider.Settings;
import android.text.TextUtils;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AccessibilityControl")
public class AccessibilityControlPlugin extends Plugin {
    private static boolean enabled(android.content.Context context) {
        int enabled = 0;
        try { enabled = Settings.Secure.getInt(context.getContentResolver(), Settings.Secure.ACCESSIBILITY_ENABLED); } catch (Exception ignored) {}
        if (enabled != 1) return false;
        String services = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (TextUtils.isEmpty(services)) return false;
        String expected = new ComponentName(context, SanjuAccessibilityService.class).flattenToString();
        for (String item : services.split(":")) if (expected.equalsIgnoreCase(item)) return true;
        return false;
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) { call.reject("Cannot open accessibility settings: " + e.getMessage()); }
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("enabled", enabled(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void perform(PluginCall call) {
        String action = call.getString("action", "home");
        if (!enabled(getContext()) || SanjuAccessibilityService.instance == null) {
            call.reject("Accessibility service is not enabled");
            return;
        }
        boolean ok = SanjuAccessibilityService.instance.performAction(action);
        if (ok) call.resolve(); else call.reject("Unsupported or failed accessibility action: " + action);
    }
}
