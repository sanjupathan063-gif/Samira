package com.sanju.assistant;

import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Environment;
import android.os.StatFs;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Real device numbers for the HUD gauges: RAM, storage, battery. No permissions needed. */
@CapacitorPlugin(name = "DeviceStats")
public class DeviceStatsPlugin extends Plugin {

    @PluginMethod
    public void get(PluginCall call) {
        JSObject r = new JSObject();
        try {
            ActivityManager am = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
            ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
            am.getMemoryInfo(mi);
            r.put("ramTotal", mi.totalMem);
            r.put("ramAvail", mi.availMem);

            StatFs sf = new StatFs(Environment.getDataDirectory().getPath());
            r.put("diskTotal", sf.getTotalBytes());
            r.put("diskFree", sf.getAvailableBytes());

            Intent b = getContext().registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            int pct = -1;
            boolean charging = false;
            if (b != null) {
                int level = b.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = b.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
                if (level >= 0 && scale > 0) pct = Math.round(level * 100f / scale);
                int status = b.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                charging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL;
            }
            r.put("battery", pct);
            r.put("charging", charging);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("stats failed: " + e.getMessage());
        }
    }
}
