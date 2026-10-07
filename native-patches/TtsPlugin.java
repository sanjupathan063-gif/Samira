package com.sanju.assistant;

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;

@CapacitorPlugin(name = "SanjuTts")
public class TtsPlugin extends Plugin implements TextToSpeech.OnInitListener {

    private TextToSpeech tts;
    private boolean ready = false;

    @Override
    public void load() {
        tts = new TextToSpeech(getContext(), this);
    }

    @Override
    public void onInit(int status) {
        ready = (status == TextToSpeech.SUCCESS);
        if (ready) {
            tts.setSpeechRate(1.0f);
            tts.setPitch(1.0f);
        }
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text");
        String lang = call.getString("lang", "bn");
        String style = call.getString("style", "cinematic");
        if (text == null || text.isEmpty()) {
            call.reject("text is required");
            return;
        }
        if (!ready || tts == null) {
            call.reject("TTS not ready");
            return;
        }

        // ভাষা fallback চেইন: চাওয়া ভাষা -> হিন্দি -> ইংরেজি -> ডিভাইসের ডিফল্ট
        Locale[] chain;
        if (lang.startsWith("bn")) {
            chain = new Locale[]{ new Locale("bn", "BD"), new Locale("hi", "IN"), Locale.US };
        } else if (lang.startsWith("hi")) {
            chain = new Locale[]{ new Locale("hi", "IN"), Locale.US };
        } else {
            chain = new Locale[]{ Locale.US, new Locale("en", "IN") };
        }

        Locale chosen = null;
        for (Locale loc : chain) {
            int result = tts.isLanguageAvailable(loc);
            if (result == TextToSpeech.LANG_AVAILABLE
                    || result == TextToSpeech.LANG_COUNTRY_AVAILABLE
                    || result == TextToSpeech.LANG_COUNTRY_VAR_AVAILABLE) {
                chosen = loc;
                break;
            }
        }
        if (chosen == null) chosen = Locale.getDefault();
        tts.setLanguage(chosen);

        // যতটা সম্ভব একটা নরম/মেয়েলি ভয়েস বেছে নেওয়ার চেষ্টা — ডিভাইসের TTS ইঞ্জিনে
        // এমন ভয়েস ইনস্টল থাকলে। না থাকলে শুধু pitch একটু বাড়িয়ে নরম করা হয়।
        try {
            android.speech.tts.Voice pick = null;
            for (android.speech.tts.Voice v : tts.getVoices()) {
                if (v.getLocale() == null || !v.getLocale().getLanguage().equals(chosen.getLanguage())) continue;
                String n = v.getName().toLowerCase(Locale.US);
                if (n.contains("female") || n.contains("f#") || n.contains("#female") || n.contains("_f_") || n.endsWith("-f")) {
                    pick = v;
                    break;
                }
            }
            if (pick != null) tts.setVoice(pick);
        } catch (Exception ignored) {
            /* কিছু ইঞ্জিনে getVoices() সাপোর্ট নেই — চুপচাপ ডিফল্ট ভয়েস ব্যবহার হবে */
        }
        if ("robotic".equalsIgnoreCase(style)) {
            tts.setPitch(0.82f);
            tts.setSpeechRate(0.88f);
        } else if ("human".equalsIgnoreCase(style)) {
            tts.setPitch(1.02f);
            tts.setSpeechRate(0.98f);
        } else {
            tts.setPitch(0.92f);
            tts.setSpeechRate(0.90f);
        }

        final String utteranceId = "sanju_" + System.currentTimeMillis();
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override public void onStart(String utteranceId) {}
            @Override
            public void onDone(String utteranceId) {
                JSObject ret = new JSObject();
                ret.put("done", true);
                call.resolve(ret);
            }
            @Override
            public void onError(String utteranceId) {
                call.reject("TTS playback error");
            }
        });

        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (tts != null) tts.stop();
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
    }
}
