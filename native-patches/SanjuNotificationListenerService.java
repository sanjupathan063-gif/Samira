package com.sanju.assistant;

import android.app.Notification;
import android.content.Intent;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

public class SanjuNotificationListenerService extends NotificationListenerService {
    private static final String PREFS = "sanju_notifications";
    private static final String KEY = "items";
    private static final int MAX = 100;
    private static SanjuNotificationListenerService instance;

    @Override public void onCreate() { super.onCreate(); instance = this; }
    @Override public void onDestroy() { instance = null; super.onDestroy(); }

    @Override public void onNotificationPosted(StatusBarNotification sbn) { save(sbn, false); broadcast(sbn, "posted"); }
    @Override public void onNotificationRemoved(StatusBarNotification sbn) { broadcast(sbn, "removed"); }

    public static boolean isConnected() { return instance != null; }

    private void broadcast(StatusBarNotification sbn, String event) {
        try {
            Intent i = new Intent("com.sanju.assistant.NOTIFICATION_EVENT");
            i.setPackage(getPackageName());
            i.putExtra("event", event);
            i.putExtra("package", sbn.getPackageName());
            i.putExtra("id", sbn.getId());
            i.putExtra("title", title(sbn));
            i.putExtra("text", text(sbn));
            sendBroadcast(i);
        } catch (Exception ignored) {}
    }

    private void save(StatusBarNotification sbn, boolean replay) {
        try {
            JSONObject item = new JSONObject();
            item.put("id", sbn.getKey());
            item.put("package", sbn.getPackageName());
            item.put("title", title(sbn));
            item.put("text", text(sbn));
            item.put("timestamp", sbn.getPostTime());
            item.put("ongoing", sbn.isOngoing());
            android.content.SharedPreferences p = getSharedPreferences(PREFS, MODE_PRIVATE);
            JSONArray old = new JSONArray(p.getString(KEY, "[]"));
            JSONArray out = new JSONArray();
            out.put(item);
            for (int i=0;i<old.length() && out.length()<MAX;i++) {
                JSONObject x=old.optJSONObject(i); if(x!=null && !sbn.getKey().equals(x.optString("id"))) out.put(x);
            }
            p.edit().putString(KEY, out.toString()).apply();
        } catch(Exception ignored) {}
    }
    private String title(StatusBarNotification s) { return extras(s).getString(Notification.EXTRA_TITLE, ""); }
    private String text(StatusBarNotification s) {
        Bundle b=extras(s); CharSequence t=b.getCharSequence(Notification.EXTRA_BIG_TEXT); if(t==null)t=b.getCharSequence(Notification.EXTRA_TEXT); return t==null?"":t.toString();
    }
    private Bundle extras(StatusBarNotification s) { Notification n=s.getNotification(); return n==null||n.extras==null?new Bundle():n.extras; }
}
