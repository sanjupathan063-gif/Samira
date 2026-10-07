package com.sanju.assistant;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * JS bridge for the SANJU Call Assistant.
 * Events pushed to JS: "callState" {state, number, name, ...} and "callEnded" {record}.
 */
@CapacitorPlugin(
    name = "CallAssistant",
    permissions = {
        @Permission(strings = { Manifest.permission.READ_PHONE_STATE, Manifest.permission.READ_CALL_LOG }, alias = "callstate"),
        @Permission(strings = { Manifest.permission.ANSWER_PHONE_CALLS }, alias = "answer"),
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "mic"),
        @Permission(strings = { Manifest.permission.READ_CONTACTS }, alias = "contacts")
    }
)
public class CallAssistantPlugin extends Plugin {

    private static CallAssistantPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
        super.handleOnDestroy();
    }

    static void emit(String event, JSObject data) {
        CallAssistantPlugin p = instance;
        if (p != null) p.notifyListeners(event, data);
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(CallStateReceiver.PREFS, Context.MODE_PRIVATE);
    }

    private boolean granted(String alias) {
        return getPermissionState(alias) == PermissionState.GRANTED;
    }

    private JSObject stateObject() {
        SharedPreferences sp = prefs();
        JSObject r = new JSObject();
        r.put("callstate", granted("callstate"));
        r.put("answer", granted("answer"));
        r.put("mic", granted("mic"));
        r.put("contacts", granted("contacts"));
        r.put("enabled", sp.getBoolean("enabled", false));
        r.put("announce", sp.getBoolean("announce", true));
        r.put("autoAnswerSec", sp.getInt("autoAnswerSec", 0));
        r.put("hasKey", !sp.getString("apiKey", "").isEmpty());
        r.put("sdk", Build.VERSION.SDK_INT);
        r.put("ringing", CallStateReceiver.ringing);
        r.put("offhook", CallStateReceiver.offhook);
        r.put("number", CallStateReceiver.number);
        r.put("name", CallStateReceiver.name);
        return r;
    }

    @PluginMethod
    public void askPermissions(PluginCall call) {
        requestPermissionForAliases(new String[]{ "callstate", "answer", "mic", "contacts" }, call, "permsDone");
    }

    @PermissionCallback
    private void permsDone(PluginCall call) {
        call.resolve(stateObject());
    }

    @PluginMethod
    public void getState(PluginCall call) {
        call.resolve(stateObject());
    }

    /** Save settings from JS. Only keys that are present are changed. */
    @PluginMethod
    public void setup(PluginCall call) {
        SharedPreferences.Editor e = prefs().edit();
        if (call.hasOption("enabled")) e.putBoolean("enabled", Boolean.TRUE.equals(call.getBoolean("enabled", false)));
        if (call.hasOption("announce")) e.putBoolean("announce", Boolean.TRUE.equals(call.getBoolean("announce", true)));
        if (call.hasOption("autoAnswerSec")) {
            Integer v = call.getInt("autoAnswerSec", 0);
            e.putInt("autoAnswerSec", v == null ? 0 : Math.max(0, Math.min(v, 120)));
        }
        if (call.hasOption("userName")) e.putString("userName", call.getString("userName", "বস"));
        if (call.hasOption("apiKey")) e.putString("apiKey", call.getString("apiKey", ""));
        if (call.hasOption("model")) e.putString("model", call.getString("model", "openai/gpt-oss-20b"));
        if (call.hasOption("lang")) e.putString("lang", call.getString("lang", "bn-BD"));
        e.apply();
        call.resolve(stateObject());
    }

    @PluginMethod
    public void answer(PluginCall call) {
        boolean ok = CallStateReceiver.answerForUser(getContext());
        JSObject r = new JSObject();
        r.put("ok", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void hangup(PluginCall call) {
        boolean ok = CallStateReceiver.hangupByUser(getContext());
        JSObject r = new JSObject();
        r.put("ok", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void simulate(PluginCall call) {
        String text = CallStateReceiver.simulate(getContext(), call.getString("number", ""), call.getString("name", ""));
        JSObject r = new JSObject();
        r.put("text", text);
        call.resolve(r);
    }

    @PluginMethod
    public void getLog(PluginCall call) {
        try {
            JSObject r = new JSObject();
            r.put("log", new JSArray(prefs().getString("calllog", "[]")));
            call.resolve(r);
        } catch (Exception e) {
            call.reject("log read failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void clearLog(PluginCall call) {
        prefs().edit().remove("calllog").apply();
        call.resolve();
    }
}
