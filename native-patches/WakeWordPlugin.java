package com.sanju.assistant;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(name = "WakeWord", permissions = {
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "mic")
})
public class WakeWordPlugin extends Plugin {

    @Override
    public void load() {
        // Live delivery to the WebView while the app process is alive.
        WakeWordService.listener = cmd -> {
            JSObject d = new JSObject();
            d.put("command", cmd);
            notifyListeners("wake", d);
        };
    }

    @Override
    protected void handleOnDestroy() {
        WakeWordService.listener = null;
        super.handleOnDestroy();
    }

    @PluginMethod public void requestPermission(PluginCall call) {
        if (getPermissionState("mic") != com.getcapacitor.PermissionState.GRANTED) requestPermissionForAlias("mic", call, "micCallback");
        else { JSObject r = new JSObject(); r.put("granted", true); call.resolve(r); }
    }

    @PermissionCallback private void micCallback(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", getPermissionState("mic") == com.getcapacitor.PermissionState.GRANTED);
        call.resolve(r);
    }

    @PluginMethod public void start(PluginCall call) {
        if (getPermissionState("mic") != com.getcapacitor.PermissionState.GRANTED) { call.reject("Microphone permission not granted"); return; }
        String phrase = call.getString("phrase", "Hey Sanju");
        Intent i = new Intent(getContext(), WakeWordService.class);
        i.putExtra("phrase", phrase);
        try {
            if (Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(i); else getContext().startService(i);
            JSObject r = new JSObject(); r.put("started", true); call.resolve(r);
        } catch (Exception e) { call.reject("Wake service failed: " + e.getMessage()); }
    }

    @PluginMethod public void stop(PluginCall call) {
        try {
            getContext().stopService(new Intent(getContext(), WakeWordService.class));
            JSObject r = new JSObject(); r.put("stopped", true); call.resolve(r);
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    /** Free the microphone while the in-app mic button is listening. */
    @PluginMethod public void pause(PluginCall call) {
        WakeWordService s = WakeWordService.instance;
        if (s != null) s.pauseListening();
        call.resolve();
    }

    @PluginMethod public void resume(PluginCall call) {
        WakeWordService s = WakeWordService.instance;
        if (s != null) s.resumeListening();
        call.resolve();
    }

    /** Health info used by the JS self-heal watchdog and the Self Diagnostic panel. */
    @PluginMethod public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("running", WakeWordService.running);
        r.put("lastError", WakeWordService.lastError);
        r.put("failures", WakeWordService.consecutiveFailures);
        r.put("restarts", WakeWordService.restarts);
        r.put("lastHeard", WakeWordService.lastHeard);
        r.put("strategy", WakeWordService.strategyName);
        call.resolve(r);
    }

    @PluginMethod public void getPending(PluginCall call) {
        SharedPreferences sp = getContext().getSharedPreferences("sanju_wake_prefs", 0);
        String c = sp.getString("pending_command", null);
        long at = sp.getLong("pending_at", 0);
        sp.edit().remove("pending_command").remove("pending_at").apply();
        boolean fresh = c != null && (System.currentTimeMillis() - at) < 15000; // never replay stale commands
        JSObject r = new JSObject();
        r.put("found", fresh);
        r.put("command", fresh ? c : "");
        call.resolve(r);
    }
}
