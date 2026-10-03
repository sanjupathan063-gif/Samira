package com.sanju.assistant;

import android.Manifest;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.provider.ContactsContract;
import android.content.ContentResolver;
import android.database.Cursor;
import android.net.Uri;
import android.telephony.SmsManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.List;

@CapacitorPlugin(
    name = "PhoneControl",
    permissions = {
        @Permission(strings = { Manifest.permission.CALL_PHONE }, alias = "call"),
        @Permission(strings = { Manifest.permission.SEND_SMS }, alias = "sms"),
        @Permission(strings = { Manifest.permission.READ_CONTACTS }, alias = "contacts")
    }
)
public class PhoneControlPlugin extends Plugin {

    @PluginMethod
    public void requestCallPermission(PluginCall call) {
        if (getPermissionState("call") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("call", call, "callPermsCallback");
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @PermissionCallback
    private void callPermsCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("call") == com.getcapacitor.PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestSmsPermission(PluginCall call) {
        if (getPermissionState("sms") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "smsPermsCallback");
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @PermissionCallback
    private void smsPermsCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("sms") == com.getcapacitor.PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void callNumber(PluginCall call) {
        String number = call.getString("number");
        if (number == null || number.isEmpty()) {
            call.reject("number is required");
            return;
        }
        if (getPermissionState("call") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("CALL_PHONE permission not granted");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_CALL);
            intent.setData(Uri.parse("tel:" + number));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to place call: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestContactsPermission(PluginCall call) {
        if (getPermissionState("contacts") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("contacts", call, "contactsPermsCallback");
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @PermissionCallback
    private void contactsPermsCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("contacts") == com.getcapacitor.PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void callContact(PluginCall call) {
        String name = call.getString("name");
        if (name == null || name.trim().isEmpty()) { call.reject("name is required"); return; }
        if (getPermissionState("contacts") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("READ_CONTACTS permission not granted"); return;
        }
        ContentResolver resolver = getContext().getContentResolver();
        Cursor cursor = null;
        try {
            String selection = ContactsContract.Contacts.DISPLAY_NAME + " LIKE ?";
            cursor = resolver.query(ContactsContract.Contacts.CONTENT_URI,
                    new String[]{ContactsContract.Contacts._ID, ContactsContract.Contacts.DISPLAY_NAME},
                    selection, new String[]{"%" + name.trim() + "%"}, null);
            if (cursor == null || !cursor.moveToFirst()) { call.reject("Contact not found: " + name); return; }
            String contactId = cursor.getString(cursor.getColumnIndexOrThrow(ContactsContract.Contacts._ID));
            Cursor phones = resolver.query(ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                    new String[]{ContactsContract.CommonDataKinds.Phone.NUMBER},
                    ContactsContract.CommonDataKinds.Phone.CONTACT_ID + "=?", new String[]{contactId}, null);
            if (phones == null || !phones.moveToFirst()) { if (phones != null) phones.close(); call.reject("No phone number for: " + name); return; }
            String number = phones.getString(phones.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Phone.NUMBER));
            phones.close();
            if (getPermissionState("call") != com.getcapacitor.PermissionState.GRANTED) { call.reject("CALL_PHONE permission not granted"); return; }
            Intent intent = new Intent(Intent.ACTION_CALL);
            intent.setData(Uri.parse("tel:" + number));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject ret = new JSObject(); ret.put("name", name); ret.put("number", number); call.resolve(ret);
        } catch (Exception e) { call.reject("Failed to call contact: " + e.getMessage()); }
        finally { if (cursor != null) cursor.close(); }
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.trim().isEmpty()) { call.reject("url is required"); return; }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) { call.reject("Failed to open URL: " + e.getMessage()); }
    }

    @PluginMethod
    public void mediaControl(PluginCall call) {
        String action = call.getString("action", "play");
        int keyCode;
        if ("pause".equals(action)) keyCode = android.view.KeyEvent.KEYCODE_MEDIA_PAUSE;
        else if ("next".equals(action)) keyCode = android.view.KeyEvent.KEYCODE_MEDIA_NEXT;
        else if ("previous".equals(action)) keyCode = android.view.KeyEvent.KEYCODE_MEDIA_PREVIOUS;
        else keyCode = android.view.KeyEvent.KEYCODE_MEDIA_PLAY;
        try {
            android.media.AudioManager am = (android.media.AudioManager)getContext().getSystemService(android.content.Context.AUDIO_SERVICE);
            long now = android.os.SystemClock.uptimeMillis();
            am.dispatchMediaKeyEvent(new android.view.KeyEvent(now, now, android.view.KeyEvent.ACTION_DOWN, keyCode, 0));
            am.dispatchMediaKeyEvent(new android.view.KeyEvent(now, now, android.view.KeyEvent.ACTION_UP, keyCode, 0));
            call.resolve();
        } catch (Exception e) { call.reject("Media control failed: " + e.getMessage()); }
    }

    @PluginMethod
    public void sendSms(PluginCall call) {
        String number = call.getString("number");
        String message = call.getString("message");
        if (number == null || message == null) {
            call.reject("number and message are required");
            return;
        }
        if (getPermissionState("sms") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("SEND_SMS permission not granted");
            return;
        }
        try {
            SmsManager smsManager = SmsManager.getDefault();
            smsManager.sendTextMessage(number, null, message, null, null);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to send SMS: " + e.getMessage());
        }
    }

    @PluginMethod
    public void listApps(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            List<ApplicationInfo> apps = pm.getInstalledApplications(PackageManager.GET_META_DATA);
            JSArray result = new JSArray();
            for (ApplicationInfo app : apps) {
                if (pm.getLaunchIntentForPackage(app.packageName) == null) continue;
                JSObject entry = new JSObject();
                entry.put("label", pm.getApplicationLabel(app).toString());
                entry.put("packageName", app.packageName);
                result.put(entry);
            }
            JSObject ret = new JSObject();
            ret.put("apps", result);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to list apps: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openApp(PluginCall call) {
        String packageName = call.getString("packageName");
        if (packageName == null) {
            call.reject("packageName is required");
            return;
        }
        try {
            PackageManager pm = getContext().getPackageManager();
            Intent launchIntent = pm.getLaunchIntentForPackage(packageName);
            if (launchIntent == null) {
                call.reject("App not found: " + packageName);
                return;
            }
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(launchIntent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to open app: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setAlarm(PluginCall call) {
        Integer hour = call.getInt("hour");
        Integer minute = call.getInt("minute");
        String message = call.getString("message", "Sanju Alarm");
        if (hour == null || minute == null) {
            call.reject("hour and minute are required");
            return;
        }
        try {
            Intent intent = new Intent(android.provider.AlarmClock.ACTION_SET_ALARM);
            intent.putExtra(android.provider.AlarmClock.EXTRA_HOUR, hour);
            intent.putExtra(android.provider.AlarmClock.EXTRA_MINUTES, minute);
            intent.putExtra(android.provider.AlarmClock.EXTRA_MESSAGE, message);
            intent.putExtra(android.provider.AlarmClock.EXTRA_SKIP_UI, true);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to set alarm: " + e.getMessage());
        }
    }

    @PluginMethod
    public void toggleFlashlight(PluginCall call) {
        Boolean on = call.getBoolean("on", true);
        try {
            android.hardware.camera2.CameraManager cameraManager =
                (android.hardware.camera2.CameraManager) getContext().getSystemService(android.content.Context.CAMERA_SERVICE);
            String[] ids = cameraManager.getCameraIdList();
            String torchId = null;
            for (String id : ids) {
                android.hardware.camera2.CameraCharacteristics chars = cameraManager.getCameraCharacteristics(id);
                Boolean hasFlash = chars.get(android.hardware.camera2.CameraCharacteristics.FLASH_INFO_AVAILABLE);
                if (hasFlash != null && hasFlash) {
                    torchId = id;
                    break;
                }
            }
            if (torchId == null) {
                call.reject("No flashlight found on this device");
                return;
            }
            cameraManager.setTorchMode(torchId, on);
            JSObject ret = new JSObject();
            ret.put("on", on);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to toggle flashlight: " + e.getMessage());
        }
    }

    @PluginMethod
    public void adjustVolume(PluginCall call) {
        String direction = call.getString("direction", "up"); // "up" | "down" | "mute"
        try {
            android.media.AudioManager am =
                (android.media.AudioManager) getContext().getSystemService(android.content.Context.AUDIO_SERVICE);
            int flag = android.media.AudioManager.FLAG_SHOW_UI;
            if ("mute".equals(direction)) {
                am.adjustStreamVolume(android.media.AudioManager.STREAM_MUSIC, android.media.AudioManager.ADJUST_MUTE, flag);
            } else if ("down".equals(direction)) {
                am.adjustStreamVolume(android.media.AudioManager.STREAM_MUSIC, android.media.AudioManager.ADJUST_LOWER, flag);
            } else {
                am.adjustStreamVolume(android.media.AudioManager.STREAM_MUSIC, android.media.AudioManager.ADJUST_RAISE, flag);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to adjust volume: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openWifiPanel(PluginCall call) {
        try {
            Intent intent;
            if (android.os.Build.VERSION.SDK_INT >= 29) {
                intent = new Intent(android.provider.Settings.Panel.ACTION_WIFI);
            } else {
                intent = new Intent(android.provider.Settings.ACTION_WIFI_SETTINGS);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to open WiFi panel: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openBluetoothPanel(PluginCall call) {
        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to open Bluetooth panel: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openBrightnessSettings(PluginCall call) {
        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_DISPLAY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to open display settings: " + e.getMessage());
        }
    }
}
