package com.sanju.assistant;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * SANJU Call Assistant — AI answering session.
 * Runs entirely natively so it does not depend on the WebView being awake.
 * Flow: greet (AI disclosure) -> listen -> Groq -> speak -> listen ... -> goodbye + hang up.
 * NOTE: Android may block microphone access during a phone call on many devices;
 * if the recognizer cannot hear the caller the session ends politely (see hardFail()).
 */
final class CallAiSession {

    private static final int MAX_TURNS = 12;
    private static final long MAX_MS = 5L * 60L * 1000L;

    private final Context ctx;
    private final SharedPreferences sp;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final JSONArray convo = new JSONArray();
    final List<String[]> transcript = new ArrayList<>(); // {"caller"|"sanju", text}

    private SpeechRecognizer rec;
    private volatile boolean active = false;
    private int silences = 0;
    private int hardErrors = 0;
    private int turns = 0;
    private long startedAt = 0;
    private String lang = "bn-BD";
    private String owner = "বস";
    private boolean pausedWake = false;

    CallAiSession(Context c, SharedPreferences prefs) {
        CallSpeaker.prewarm(c, langFor(prefs));
        this.ctx = c.getApplicationContext();
        this.sp = prefs;
    }

    boolean hasCallerSpeech() {
        for (String[] t : transcript) if ("caller".equals(t[0])) return true;
        return false;
    }

    String transcriptText() {
        StringBuilder sb = new StringBuilder();
        for (String[] t : transcript) {
            sb.append("caller".equals(t[0]) ? "কলার: " : "সাঞ্জু: ").append(t[1]).append('\n');
        }
        return sb.toString();
    }

    // ------------------------------------------------------------------ lifecycle


    private static String langFor(SharedPreferences prefs) {
        String l = prefs.getString("lang", "bn-BD");
        return (l == null || l.trim().isEmpty()) ? "bn-BD" : l;
    }
    void start() {
        if (active) return;
        active = true;
        startedAt = System.currentTimeMillis();
        lang = sp.getString("lang", "bn-BD");
        owner = sp.getString("userName", "বস");
        if (owner == null || owner.trim().isEmpty()) owner = "বস";
        try { convo.put(msg("system", systemPrompt())); } catch (Exception ignored) {}
        try {
            WakeWordService w = WakeWordService.instance;
            if (w != null) { w.pauseListening(); pausedWake = true; }
        } catch (Throwable ignored) {}
        setSpeaker(true);
        // AI disclosure comes first, always.
        final String greet = "হ্যালো, আমি সাঞ্জু, " + owner + " এর এআই অ্যাসিস্ট্যান্ট। উনি এখন কথা বলতে পারছেন না। "
                + "আপনি চাইলে আমাকে বার্তা দিতে পারেন।";
        say("sanju", greet);
        try { convo.put(msg("assistant", greet)); } catch (Exception ignored) {}
        main.postDelayed(new Runnable() {
            @Override public void run() {
                if (!active) return;
                CallSpeaker.speak(ctx, greet, lang, new Runnable() {
                    @Override public void run() { listen(); }
                });
            }
        }, 0);
    }

    /** Called when the call ends (or we are told to stop). Safe to call many times. */
    void stop() {
        active = false;
        destroyRec();
        CallSpeaker.stop();
        setSpeaker(false);
        if (pausedWake) {
            try {
                WakeWordService w = WakeWordService.instance;
                if (w != null) w.resumeListening();
            } catch (Throwable ignored) {}
            pausedWake = false;
        }
    }

    // ------------------------------------------------------------------ listening

    private void listen() {
        if (!active) return;
        if (turns >= MAX_TURNS || System.currentTimeMillis() - startedAt > MAX_MS) {
            finishWith("আপনার বার্তা জানিয়ে দেব। ধন্যবাদ, ভালো থাকবেন।");
            return;
        }
        main.post(new Runnable() {
            @Override public void run() {
                if (!active) return;
                try {
                    destroyRec();
                    if (!SpeechRecognizer.isRecognitionAvailable(ctx)) { hardFail(); return; }
                    rec = SpeechRecognizer.createSpeechRecognizer(ctx);
                    rec.setRecognitionListener(listener);
                    Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
                    i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
                    rec.startListening(i);
                } catch (Exception e) {
                    hardFail();
                }
            }
        });
    }

    private final RecognitionListener listener = new RecognitionListener() {
        @Override public void onReadyForSpeech(Bundle params) {}
        @Override public void onBeginningOfSpeech() {}
        @Override public void onRmsChanged(float rmsdB) {}
        @Override public void onBufferReceived(byte[] buffer) {}
        @Override public void onEndOfSpeech() {}
        @Override public void onPartialResults(Bundle partialResults) {}
        @Override public void onEvent(int eventType, Bundle params) {}

        @Override public void onError(int error) {
            if (!active) return;
            if (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
                silences++;
                if (silences >= 3) {
                    finishWith("আপনাকে শুনতে পাচ্ছি না। পরে আবার কল করবেন, ধন্যবাদ।");
                } else if (silences == 1) {
                    say("sanju", "হ্যালো, শুনতে পাচ্ছেন?");
                    CallSpeaker.speak(ctx, "হ্যালো, শুনতে পাচ্ছেন?", lang, new Runnable() {
                        @Override public void run() { listen(); }
                    });
                } else {
                    listen();
                }
                return;
            }
            hardErrors++;
            if (hardErrors >= 2) hardFail();
            else main.postDelayed(new Runnable() {
                @Override public void run() { listen(); }
            }, 600);
        }

        @Override public void onResults(Bundle results) {
            if (!active) return;
            ArrayList<String> list = results == null ? null
                    : results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            String text = (list == null || list.isEmpty()) ? "" : list.get(0).trim();
            if (text.isEmpty()) { onError(SpeechRecognizer.ERROR_NO_MATCH); return; }
            silences = 0;
            hardErrors = 0;
            turns++;
            say("caller", text);
            try { convo.put(msg("user", text)); } catch (Exception ignored) {}
            destroyRec();
            reply();
        }
    };

    // ------------------------------------------------------------------ AI reply

    private void reply() {
        final String key = sp.getString("apiKey", "");
        final String model = sp.getString("model", "openai/gpt-oss-20b");
        new Thread(new Runnable() {
            @Override public void run() {
                String out;
                try {
                    if (key == null || key.isEmpty()) throw new Exception("no key");
                    out = GroqClient.chat(key, model, convo, 700);
                    if (out == null || out.trim().isEmpty()) throw new Exception("empty");
                } catch (Exception e) {
                    out = "ঠিক আছে, আপনার বার্তা আমি জানিয়ে দেব। ধন্যবাদ। [END]";
                }
                final boolean end = out.contains("[END]");
                final String clean = out.replace("[END]", "").trim();
                try { convo.put(msg("assistant", clean)); } catch (Exception ignored) {}
                say("sanju", clean);
                main.post(new Runnable() {
                    @Override public void run() {
                        if (!active) return;
                        CallSpeaker.speak(ctx, clean, lang, new Runnable() {
                            @Override public void run() {
                                if (!active) return;
                                if (end) hangUpSoon(); else listen();
                            }
                        });
                    }
                });
            }
        }).start();
    }

    private void finishWith(String goodbye) {
        say("sanju", goodbye);
        CallSpeaker.speak(ctx, goodbye, lang, new Runnable() {
            @Override public void run() { hangUpSoon(); }
        });
    }

    /** The recognizer cannot hear the caller (very common during calls) -> leave a polite message and end. */
    private void hardFail() {
        if (!active) return;
        finishWith(owner + " এখন কথা বলতে পারছেন না। দয়া করে একটু পরে আবার কল করবেন। ধন্যবাদ।");
    }

    private void hangUpSoon() {
        main.postDelayed(new Runnable() {
            @Override public void run() {
                if (active) CallStateReceiver.endCall(ctx);
            }
        }, 350);
    }

    // ------------------------------------------------------------------ helpers

    private void say(String who, String text) {
        synchronized (transcript) { transcript.add(new String[]{who, text}); }
    }

    private void destroyRec() {
        try {
            if (rec != null) { rec.cancel(); rec.destroy(); }
        } catch (Exception ignored) {}
        rec = null;
    }

    private void setSpeaker(boolean on) {
        try {
            AudioManager am = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
            if (am != null) am.setSpeakerphoneOn(on);
        } catch (Exception ignored) {}
    }

    private static JSONObject msg(String role, String content) throws Exception {
        JSONObject o = new JSONObject();
        o.put("role", role);
        o.put("content", content);
        return o;
    }

    private String systemPrompt() {
        return "তুমি সাঞ্জু — " + owner + " এর এআই ভয়েস অ্যাসিস্ট্যান্ট, এখন ফোন কলে কলারের সাথে কথা বলছ। "
                + "নিয়ম: (১) তুমি যে এআই তা লুকাবে না। (২) প্রতিবার ১-২টি ছোট বাক্যে কথা বলো, কলার যে ভাষায় বলে সেই ভাষায় (ডিফল্ট বাংলা)। "
                + "(৩) কাজ: কলারের নাম, কী দরকার ও কতটা জরুরি তা জেনে বার্তা নেওয়া। "
                + "(৪) " + owner + " এর ব্যক্তিগত তথ্য, ঠিকানা, রুটিন বা অবস্থান কখনো বলবে না; কোনো প্রতিশ্রুতি বা সিদ্ধান্ত দেবে না। "
                + "(৫) OTP, পাসওয়ার্ড, কার্ড/ব্যাংকের তথ্য চাইলে বা দিতে বললে বিনয়ের সাথে সরাসরি না করবে। "
                + "(৬) কলার বার্তা শেষ করলে বা বিদায় জানালে সংক্ষিপ্ত ধন্যবাদ জানিয়ে উত্তরের শেষে [END] লিখবে। "
                + "(৭) মার্কডাউন, ইমোজি বা তালিকা ব্যবহার করবে না — শুধু সরল কথ্য বাক্য।";
    }
}

/** Shared text-to-speech used by the call features. */
final class CallSpeaker {
    private static TextToSpeech tts;
    private static boolean ready = false;
    private static boolean failed = false;
    private static final List<Object[]> QUEUE = new ArrayList<>(); // {text, lang, Runnable}
    private static final Map<String, Runnable> DONE = new HashMap<>();
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    static synchronized void prewarm(final Context ctx, final String lang) {
        if (tts != null || failed) return;
        tts = new TextToSpeech(ctx.getApplicationContext(), new TextToSpeech.OnInitListener() {
            @Override public void onInit(int status) {
                synchronized (CallSpeaker.class) {
                    if (status != TextToSpeech.SUCCESS) { failed = true; return; }
                    ready = true;
                    try {
                        tts.setAudioAttributes(new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
                    } catch (Throwable ignored) {}
                    tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                        @Override public void onStart(String id) {}
                        @Override public void onDone(String id) { finish(id); }
                        @Override public void onError(String id) { finish(id); }
                    });
                }
            }
        });
    }

    static synchronized void speak(final Context ctx, final String text, final String lang, final Runnable done) {
        if (text == null || text.trim().isEmpty()) { fire(done); return; }
        if (failed) { fire(done); return; }
        if (tts == null) {
            QUEUE.add(new Object[]{text, lang, done});
            tts = new TextToSpeech(ctx.getApplicationContext(), new TextToSpeech.OnInitListener() {
                @Override public void onInit(int status) {
                    synchronized (CallSpeaker.class) {
                        if (status != TextToSpeech.SUCCESS) {
                            failed = true;
                            for (Object[] q : QUEUE) fire((Runnable) q[2]);
                            QUEUE.clear();
                            return;
                        }
                        ready = true;
                        try {
                            tts.setAudioAttributes(new AudioAttributes.Builder()
                                    .setUsage(AudioAttributes.USAGE_ASSISTANT)
                                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                    .build());
                        } catch (Throwable ignored) {}
                        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                            @Override public void onStart(String utteranceId) {}
                            @Override public void onDone(String utteranceId) { finish(utteranceId); }
                            @Override public void onError(String utteranceId) { finish(utteranceId); }
                        });
                        for (Object[] q : QUEUE) speakNow((String) q[0], (String) q[1], (Runnable) q[2]);
                        QUEUE.clear();
                    }
                }
            });
            return;
        }
        if (!ready) { QUEUE.add(new Object[]{text, lang, done}); return; }
        speakNow(text, lang, done);
    }

    private static void speakNow(String text, String lang, Runnable done) {
        try {
            Locale[] chain;
            if (lang != null && lang.startsWith("en")) chain = new Locale[]{Locale.US, new Locale("en", "IN")};
            else if (lang != null && lang.startsWith("hi")) chain = new Locale[]{new Locale("hi", "IN"), Locale.US};
            else chain = new Locale[]{new Locale("bn", "BD"), new Locale("bn", "IN"), new Locale("hi", "IN"), Locale.US};
            Locale chosen = null;
            for (Locale l : chain) {
                int r = tts.isLanguageAvailable(l);
                if (r == TextToSpeech.LANG_AVAILABLE || r == TextToSpeech.LANG_COUNTRY_AVAILABLE
                        || r == TextToSpeech.LANG_COUNTRY_VAR_AVAILABLE) { chosen = l; break; }
            }
            if (chosen == null) chosen = Locale.getDefault();
            tts.setLanguage(chosen);
            tts.setPitch(1.0f);
            tts.setSpeechRate(0.95f);
            String id = "call_" + System.nanoTime();
            if (done != null) synchronized (DONE) { DONE.put(id, done); }
            int rc = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id);
            if (rc != TextToSpeech.SUCCESS) finish(id);
        } catch (Exception e) {
            fire(done);
        }
    }

    private static void finish(String id) {
        Runnable r;
        synchronized (DONE) { r = DONE.remove(id); }
        fire(r);
    }

    private static void fire(Runnable r) {
        if (r != null) MAIN.post(r);
    }

    static synchronized void stop() {
        try { if (tts != null) tts.stop(); } catch (Exception ignored) {}
        synchronized (DONE) { DONE.clear(); }
        QUEUE.clear();
    }
}

/** Minimal blocking Groq chat client (call from a background thread only). */
final class GroqClient {
    static String chat(String apiKey, String model, JSONArray messages, int maxTokens) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL("https://api.groq.com/openai/v1/chat/completions").openConnection();
        try {
            c.setRequestMethod("POST");
            c.setConnectTimeout(8000);
            c.setReadTimeout(20000);
            c.setDoOutput(true);
            c.setRequestProperty("Content-Type", "application/json");
            c.setRequestProperty("Authorization", "Bearer " + apiKey);
            JSONObject body = new JSONObject();
            body.put("model", model);
            body.put("messages", messages);
            body.put("max_tokens", maxTokens);
            body.put("temperature", 0.4);
            OutputStream os = c.getOutputStream();
            os.write(body.toString().getBytes("UTF-8"));
            os.close();
            int code = c.getResponseCode();
            InputStream is = (code >= 200 && code < 300) ? c.getInputStream() : c.getErrorStream();
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            if (is != null) {
                byte[] buf = new byte[4096];
                int n;
                while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
                is.close();
            }
            if (code < 200 || code >= 300) throw new Exception("HTTP " + code);
            JSONObject j = new JSONObject(bo.toString("UTF-8"));
            return j.getJSONArray("choices").getJSONObject(0).getJSONObject("message").optString("content", "").trim();
        } finally {
            c.disconnect();
        }
    }
}
