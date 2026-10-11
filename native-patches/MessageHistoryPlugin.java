package com.sanju.assistant;

import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashSet;
import java.util.Set;

/** JS bridge for the permanent message history (all data stays on this phone). */
@CapacitorPlugin(name = "MessageHistory")
public class MessageHistoryPlugin extends Plugin {

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(MsgHistoryCapture.PREFS, Context.MODE_PRIVATE);
    }

    private boolean accessEnabled() {
        String flat = Settings.Secure.getString(getContext().getContentResolver(), "enabled_notification_listeners");
        String expected = new ComponentName(getContext(), SanjuNotificationListenerService.class).flattenToString();
        return flat != null && flat.toLowerCase().contains(expected.toLowerCase());
    }

    @PluginMethod
    public void status(PluginCall call) {
        SharedPreferences sp = prefs();
        JSObject r = new JSObject();
        r.put("enabled", sp.getBoolean(MsgHistoryCapture.KEY_ENABLED, false));
        r.put("skipCodes", sp.getBoolean(MsgHistoryCapture.KEY_SKIP_CODES, true));
        r.put("access", accessEnabled());
        r.put("connected", SanjuNotificationListenerService.isConnected());
        r.put("count", MsgHistoryDb.get(getContext()).count());
        Set<String> chosen = MsgHistoryCapture.apps(sp);
        JSArray catalog = new JSArray();
        for (String[] a : MsgHistoryCapture.CATALOG) {
            JSObject o = new JSObject();
            o.put("pkg", a[0]);
            o.put("name", a[1]);
            o.put("on", chosen.contains(a[0]));
            catalog.put(o);
        }
        r.put("apps", catalog);
        call.resolve(r);
    }

    /** Any of: enabled (bool), skipCodes (bool), apps (array of package names). */
    @PluginMethod
    public void setConfig(PluginCall call) {
        SharedPreferences.Editor e = prefs().edit();
        Boolean enabled = call.getBoolean("enabled");
        if (enabled != null) e.putBoolean(MsgHistoryCapture.KEY_ENABLED, enabled.booleanValue());
        Boolean skip = call.getBoolean("skipCodes");
        if (skip != null) e.putBoolean(MsgHistoryCapture.KEY_SKIP_CODES, skip.booleanValue());
        JSArray apps = call.getArray("apps");
        if (apps != null) {
            Set<String> allowed = new HashSet<String>();
            for (String[] a : MsgHistoryCapture.CATALOG) allowed.add(a[0]);
            Set<String> pick = new HashSet<String>();
            for (int i = 0; i < apps.length(); i++) {
                String p = apps.optString(i, "");
                if (allowed.contains(p)) pick.add(p);
            }
            e.putStringSet(MsgHistoryCapture.KEY_APPS, pick);
        }
        e.apply();
        status(call);
    }

    @PluginMethod
    public void list(PluginCall call) {
        try {
            Integer limit = call.getInt("limit", 100);
            Integer offset = call.getInt("offset", 0);
            Boolean unsentOnly = call.getBoolean("unsentOnly", false);
            Boolean msgOnly = call.getBoolean("msgOnly", false);
            JSObject r = new JSObject();
            r.put("items", MsgHistoryDb.get(getContext()).list(
                limit == null ? 100 : limit.intValue(),
                offset == null ? 0 : offset.intValue(),
                call.getString("pkg", ""),
                call.getString("q", ""),
                unsentOnly != null && unsentOnly.booleanValue(),
                msgOnly != null && msgOnly.booleanValue()));
            r.put("total", MsgHistoryDb.get(getContext()).count());
            call.resolve(r);
        } catch (Exception ex) {
            call.reject("list failed: " + ex.getMessage());
        }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        Long id = call.getLong("id");
        if (id == null) {
            call.reject("id is required");
            return;
        }
        MsgHistoryDb.get(getContext()).delete(id.longValue());
        call.resolve();
    }

    @PluginMethod
    public void clear(PluginCall call) {
        MsgHistoryDb.get(getContext()).clear();
        call.resolve();
    }
}
