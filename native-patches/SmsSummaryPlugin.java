package com.sanju.assistant;

import android.Manifest;
import android.database.Cursor;
import android.net.Uri;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.Calendar;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Counts SMS in the inbox (unread + received since a time). Reads only counts and sender
 * names; message text is never read or stored. Needs READ_SMS (asked at runtime).
 */
@CapacitorPlugin(
    name = "SmsSummary",
    permissions = { @Permission(strings = { Manifest.permission.READ_SMS }, alias = "sms") }
)
public class SmsSummaryPlugin extends Plugin {

    /** Optional: since (ms), noPrompt (bool: never show the permission dialog). */
    @PluginMethod
    public void unread(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            Boolean noPrompt = call.getBoolean("noPrompt", false);
            if (noPrompt != null && noPrompt.booleanValue()) {
                JSObject r = new JSObject();
                r.put("granted", false);
                call.resolve(r);
                return;
            }
            requestPermissionForAlias("sms", call, "smsPermsCallback");
            return;
        }
        resolveSummary(call);
    }

    @PermissionCallback
    private void smsPermsCallback(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            resolveSummary(call);
        } else {
            JSObject r = new JSObject();
            r.put("granted", false);
            call.resolve(r);
        }
    }

    private void resolveSummary(PluginCall call) {
        JSObject r = new JSObject();
        Cursor c = null;
        try {
            Calendar cal = Calendar.getInstance();
            cal.set(Calendar.HOUR_OF_DAY, 0);
            cal.set(Calendar.MINUTE, 0);
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);
            Long sinceArg = call.getLong("since");
            long from = sinceArg == null ? cal.getTimeInMillis() : sinceArg.longValue();

            int unread = 0;
            int recent = 0;
            int rows = 0;
            Map<String, Integer> senders = new LinkedHashMap<String, Integer>();
            c = getContext().getContentResolver().query(
                Uri.parse("content://sms/inbox"),
                new String[] { "address", "date", "read" },
                "date>=? OR read=0",
                new String[] { String.valueOf(from) },
                "date DESC");
            if (c != null) {
                while (c.moveToNext() && rows < 800) {
                    rows++;
                    long date = c.getLong(1);
                    int read = c.getInt(2);
                    if (read == 0) unread++;
                    if (date >= from) {
                        recent++;
                        String a = c.getString(0);
                        if (a == null || a.isEmpty()) a = "?";
                        Integer n = senders.get(a);
                        senders.put(a, n == null ? 1 : n.intValue() + 1);
                    }
                }
            }
            JSArray top = new JSArray();
            for (Map.Entry<String, Integer> e : senders.entrySet()) {
                if (top.length() >= 3) break;
                JSObject o = new JSObject();
                o.put("address", e.getKey());
                o.put("count", e.getValue().intValue());
                top.put(o);
            }
            r.put("granted", true);
            r.put("unread", unread);
            r.put("recent", recent);
            r.put("top", top);
            call.resolve(r);
        } catch (Exception ex) {
            call.reject("sms summary failed: " + ex.getMessage());
        } finally {
            if (c != null) c.close();
        }
    }
}
