package com.sanju.assistant;

import android.content.ComponentName;
import android.content.Intent;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;

@CapacitorPlugin(name="NotificationAccess")
public class NotificationAccessPlugin extends Plugin {
  @PluginMethod public void status(PluginCall call) { JSObject r=new JSObject(); r.put("enabled", enabled()); r.put("connected", SanjuNotificationListenerService.isConnected()); call.resolve(r); }
  @PluginMethod public void openSettings(PluginCall call) { try { Intent i=new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS"); i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); getContext().startActivity(i); call.resolve(); } catch(Exception e){ call.reject(e.getMessage()); } }
  @PluginMethod public void recent(PluginCall call) { String raw=getContext().getSharedPreferences("sanju_notifications",0).getString("items","[]"); JSObject r=new JSObject(); try { r.put("items",new JSONArray(raw)); } catch(Exception e){ r.put("items",new JSONArray()); } call.resolve(r); }
  private boolean enabled(){ String flat=Settings.Secure.getString(getContext().getContentResolver(),"enabled_notification_listeners"); String expected=new ComponentName(getContext(),SanjuNotificationListenerService.class).flattenToString(); return flat!=null && flat.toLowerCase().contains(expected.toLowerCase()); }
}
