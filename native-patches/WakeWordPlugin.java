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
    @PluginMethod public void requestPermission(PluginCall call) {
        if (getPermissionState("mic") != com.getcapacitor.PermissionState.GRANTED) requestPermissionForAlias("mic", call, "micCallback");
        else { JSObject r=new JSObject(); r.put("granted",true); call.resolve(r); }
    }
    @PermissionCallback private void micCallback(PluginCall call){ JSObject r=new JSObject(); r.put("granted",getPermissionState("mic")==com.getcapacitor.PermissionState.GRANTED); call.resolve(r); }
    @PluginMethod public void start(PluginCall call){
        if(getPermissionState("mic")!=com.getcapacitor.PermissionState.GRANTED){call.reject("Microphone permission not granted");return;}
        String phrase=call.getString("phrase","Hey Sanju");
        Intent i=new Intent(getContext(),WakeWordService.class); i.putExtra("phrase",phrase);
        try { if(Build.VERSION.SDK_INT>=26) getContext().startForegroundService(i); else getContext().startService(i); JSObject r=new JSObject();r.put("started",true);call.resolve(r); } catch(Exception e){call.reject("Wake service failed: "+e.getMessage());}
    }
    @PluginMethod public void stop(PluginCall call){ try { getContext().stopService(new Intent(getContext(),WakeWordService.class)); JSObject r=new JSObject();r.put("stopped",true);call.resolve(r);}catch(Exception e){call.reject(e.getMessage());} }
    @PluginMethod public void getPending(PluginCall call){
        SharedPreferences sp=getContext().getSharedPreferences("sanju_wake_prefs",0);
        String c=sp.getString("pending_command",""); sp.edit().remove("pending_command").apply();
        JSObject r=new JSObject(); r.put("command",c); call.resolve(r);
    }
}
