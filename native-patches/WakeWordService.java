package com.sanju.assistant;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import java.util.ArrayList;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Self-healing wake word listener.
 *  - Mutes the recognizer "beep" so it no longer goes tun-tun-tun on every restart.
 *  - Matches many Bengali / Hindi / English spellings of "Sanju" (not only "hey sanju").
 *  - Acts on the FINAL result so the command spoken after the wake word is not lost.
 *  - Reacts to every SpeechRecognizer error: backoff, language fallback ladder, offline toggle.
 *  - Can be paused while the in-app mic is used (two recognizers cannot share the mic).
 */
public class WakeWordService extends Service {
    public interface WakeListener { void onWake(String command); }

    public static volatile WakeListener listener;
    public static volatile WakeWordService instance;
    public static volatile boolean running = false;
    public static volatile int lastError = 0;
    public static volatile int consecutiveFailures = 0;
    public static volatile int restarts = 0;
    public static volatile String lastHeard = "";
    public static volatile String strategyName = "";
    public static volatile long lastWakeAt = 0;

    private static final String CHANNEL_ID = "sanju_wake";
    private static final String ALERT_CHANNEL_ID = "sanju_wake_alert";
    private static final String PREFS = "sanju_wake_prefs";

    // Language ladder: if one fails repeatedly the service moves to the next by itself.
    private static final String[] LANGS = { "bn-BD", "bn-IN", "en-IN", "en-US", "" };

    private static final Pattern NAME = Pattern.compile(
        "(sanju|sanjoo|sanjhu|sonju|sunju|sanzu|sunzu|jarvis|"
        + "\u09B8\u099E\u09CD\u099C\u09C1|\u09B8\u09BE\u099E\u09CD\u099C\u09C1|\u09B8\u09BE\u09A8\u099C\u09C1|\u09B8\u09A8\u099C\u09C1|"
        + "\u09B8\u099E\u09CD\u099C\u09C2|\u09B8\u09BE\u099E\u09CD\u099C\u09C2|\u09B8\u09A8\u09CD\u099C\u09C1|\u09B8\u099E\u09CD\u099D\u09C1|"
        + "\u099C\u09BE\u09B0\u09CD\u09AD\u09BF\u09B8|\u099C\u09BE\u09B0\u09AD\u09BF\u09B8|"
        + "\u0938\u0902\u091C\u0942|\u0938\u093E\u0902\u091C\u0942|\u0938\u0902\u091C\u0941)");

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable restartTask = this::startRecognition;
    private final Runnable unmuteTask = this::unmuteBeep;

    private SpeechRecognizer recognizer;
    private AudioManager audio;
    private Pattern phrasePattern = null;
    private String phrase = "Hey Sanju";
    private String partialHit = null;
    private boolean stopping = false;
    private boolean paused = false;
    private boolean preferOffline = false;
    private int strategy = 0;

    private static final int[] BEEP_STREAMS = {
        AudioManager.STREAM_MUSIC, AudioManager.STREAM_NOTIFICATION, AudioManager.STREAM_SYSTEM
    };
    private final boolean[] mutedByUs = new boolean[BEEP_STREAMS.length];

    // ------------------------------------------------------------ lifecycle

    @Override public void onCreate() {
        super.onCreate();
        instance = this;
        running = true;
        updateStrategyName();
        createChannels();
        try {
            Notification n = buildOngoingNotification();
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(7310, n, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
            } else {
                startForeground(7310, n);
            }
        } catch (Exception e) {
            // e.g. microphone permission missing on Android 14 -> don't crash, stop cleanly
            lastError = -3;
            stopping = true;
            stopSelf();
        }
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        SharedPreferences sp = getSharedPreferences(PREFS, MODE_PRIVATE);
        String p = null;
        if (intent != null && intent.hasExtra("phrase")) p = intent.getStringExtra("phrase");
        if (p == null || p.trim().isEmpty()) p = sp.getString("phrase", "Hey Sanju");
        phrase = p;
        sp.edit().putString("phrase", phrase).apply();
        phrasePattern = buildPhrasePattern(phrase);
        stopping = false;
        paused = false;
        scheduleRestart(100);
        return START_STICKY;
    }

    @Override public void onDestroy() {
        stopping = true;
        running = false;
        instance = null;
        handler.removeCallbacksAndMessages(null);
        unmuteBeep();
        destroyRecognizer();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    // ------------------------------------------------------------ pause/resume (called by the plugin)

    public void pauseListening() {
        handler.post(() -> {
            paused = true;
            handler.removeCallbacks(restartTask);
            destroyRecognizer();
            unmuteBeep();
        });
    }

    public void resumeListening() {
        handler.post(() -> {
            paused = false;
            scheduleRestart(800);
        });
    }

    // ------------------------------------------------------------ recognition

    private void startRecognition() {
        if (stopping || paused) return;
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            lastError = -1;
            scheduleRestart(5000);
            return;
        }
        destroyRecognizer();
        partialHit = null;
        try {
            recognizer = SpeechRecognizer.createSpeechRecognizer(this);
            recognizer.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle params) {}
                @Override public void onBeginningOfSpeech() {}
                @Override public void onRmsChanged(float rmsdB) {}
                @Override public void onBufferReceived(byte[] buffer) {}
                @Override public void onEndOfSpeech() {}
                @Override public void onEvent(int eventType, Bundle params) {}
                @Override public void onPartialResults(Bundle partialResults) { onPartial(partialResults); }
                @Override public void onResults(Bundle results) { onFinal(results); }
                @Override public void onError(int error) { onRecognitionError(error); }
            });
            Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            String lang = LANGS[strategy];
            if (!lang.isEmpty()) {
                i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
                i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang);
            }
            i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
            i.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
            if (preferOffline) i.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
            muteBeep();
            recognizer.startListening(i);
            restarts++;
        } catch (Exception e) {
            lastError = -2;
            consecutiveFailures++;
            scheduleRestart(backoff());
        }
    }

    private void onPartial(Bundle b) {
        ArrayList<String> list = b == null ? null : b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (list == null || list.isEmpty()) return;
        lastHeard = list.get(0);
        for (String raw : list) {
            if (raw != null && extractCommand(raw) != null) { partialHit = raw; break; }
        }
    }

    private void onFinal(Bundle b) {
        ArrayList<String> list = b == null ? null : b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (list != null && !list.isEmpty()) {
            consecutiveFailures = 0;
            lastError = 0;
            lastHeard = list.get(0);
            boolean hit = false;
            for (String raw : list) {
                if (raw != null && extractCommand(raw) != null) { fire(raw); hit = true; break; }
            }
            if (!hit && partialHit != null) fire(partialHit);
        } else if (partialHit != null) {
            fire(partialHit);
        }
        partialHit = null;
        scheduleRestart(350);
    }

    private void onRecognitionError(int error) {
        lastError = error;
        if (partialHit != null) { String p = partialHit; partialHit = null; fire(p); }
        switch (error) {
            case 7:  // ERROR_NO_MATCH
            case 6:  // ERROR_SPEECH_TIMEOUT -> just silence, normal
                consecutiveFailures = 0;
                scheduleRestart(350);
                break;
            case 9:  // ERROR_INSUFFICIENT_PERMISSIONS
                stopping = true;
                stopSelf();
                break;
            case 12: // ERROR_LANGUAGE_NOT_SUPPORTED
            case 13: // ERROR_LANGUAGE_UNAVAILABLE
                advanceStrategy();
                scheduleRestart(500);
                break;
            case 1:  // NETWORK_TIMEOUT
            case 2:  // NETWORK
            case 4:  // SERVER
                preferOffline = true;
                consecutiveFailures++;
                if (consecutiveFailures >= 3) advanceStrategy();
                scheduleRestart(backoff());
                break;
            default: // 3 AUDIO, 5 CLIENT, 8 BUSY, 10, 11 ...
                consecutiveFailures++;
                if (consecutiveFailures >= 4) advanceStrategy();
                scheduleRestart(backoff());
        }
    }

    private void advanceStrategy() {
        strategy = (strategy + 1) % LANGS.length;
        if (strategy == 0) preferOffline = false;
        consecutiveFailures = 0;
        updateStrategyName();
    }

    private void updateStrategyName() {
        String l = LANGS[strategy];
        strategyName = (l.isEmpty() ? "default" : l) + (preferOffline ? "+offline" : "");
    }

    private int backoff() {
        return (int) Math.min(10000L, 500L << Math.min(consecutiveFailures, 5));
    }

    private void scheduleRestart(long delayMs) {
        if (stopping) return;
        handler.removeCallbacks(restartTask);
        handler.postDelayed(restartTask, delayMs);
    }

    private void destroyRecognizer() {
        if (recognizer == null) return;
        try { recognizer.cancel(); } catch (Exception ignored) {}
        try { recognizer.destroy(); } catch (Exception ignored) {}
        recognizer = null;
    }

    // ------------------------------------------------------------ wake matching

    private static String normalize(String raw) {
        return raw.toLowerCase(Locale.ROOT).replace("\u200c", "").replace("\u200d", "").trim();
    }

    private Pattern buildPhrasePattern(String p) {
        String n = normalize(p);
        if (n.isEmpty() || n.equals("hey sanju")) return null;
        return Pattern.compile(Pattern.quote(n));
    }

    /** null = no wake word; "" = wake word only; otherwise the command said after the wake word. */
    private String extractCommand(String raw) {
        String t = normalize(raw);
        int end = -1;
        Matcher m = NAME.matcher(t);
        if (m.find()) end = m.end();
        else if (phrasePattern != null) {
            Matcher pm = phrasePattern.matcher(t);
            if (pm.find()) end = pm.end();
        }
        if (end < 0) return null;
        return t.substring(end).replaceAll("^[\\s,.!?\u0964:;\\-]+", "").trim();
    }

    private void fire(String raw) {
        long now = System.currentTimeMillis();
        if (now - lastWakeAt < 3000) return;
        String command = extractCommand(raw);
        if (command == null) return;
        lastWakeAt = now;

        getSharedPreferences(PREFS, MODE_PRIVATE).edit()
            .putString("pending_command", command)
            .putLong("pending_at", now)
            .apply();

        WakeListener l = listener;
        if (l != null) { try { l.onWake(command); } catch (Exception ignored) {} }

        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            launch.putExtra("sanju_wake", true);
            launch.putExtra("sanju_command", command);
            try { startActivity(launch); } catch (Exception ignored) {}
            // Android 10+ may silently block starting an activity from the background,
            // so also post a tap-to-open heads-up notification as a fallback.
            if (Build.VERSION.SDK_INT >= 29) postWakeAlert(launch, command);
        }
    }

    // ------------------------------------------------------------ beep muting

    private boolean adjust(int stream, int direction) {
        try {
            audio.adjustStreamVolume(stream, direction, 0);
            return true;
        } catch (Exception e) { return false; }
    }

    private void muteBeep() {
        try {
            if (audio == null) audio = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audio == null || audio.isMusicActive()) return;
            boolean any = false;
            for (int i = 0; i < BEEP_STREAMS.length; i++) {
                if (mutedByUs[i]) { any = true; continue; }
                if (Build.VERSION.SDK_INT >= 23 && audio.isStreamMute(BEEP_STREAMS[i])) continue; // user already muted it
                if (adjust(BEEP_STREAMS[i], AudioManager.ADJUST_MUTE)) { mutedByUs[i] = true; any = true; }
            }
            if (any) {
                handler.removeCallbacks(unmuteTask);
                handler.postDelayed(unmuteTask, 900);
            }
        } catch (Exception ignored) {}
    }

    private void unmuteBeep() {
        if (audio == null) return;
        for (int i = 0; i < BEEP_STREAMS.length; i++) {
            if (!mutedByUs[i]) continue;
            adjust(BEEP_STREAMS[i], AudioManager.ADJUST_UNMUTE);
            mutedByUs[i] = false;
        }
    }

    // ------------------------------------------------------------ notifications

    private Notification buildOngoingNotification() {
        Notification.Builder b = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, CHANNEL_ID) : new Notification.Builder(this);
        b.setContentTitle("SANJU Wake Word")
         .setContentText("\u09AC\u09B2\u09C1\u09A8: Hey Sanju")
         .setSmallIcon(android.R.drawable.ic_btn_speak_now)
         .setOngoing(true);
        return b.build();
    }

    private void postWakeAlert(Intent launch, String command) {
        try {
            int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
            PendingIntent pi = PendingIntent.getActivity(this, 7311, launch, flags);
            Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, ALERT_CHANNEL_ID) : new Notification.Builder(this);
            b.setContentTitle("SANJU")
             .setContentText(command.isEmpty() ? "\u0986\u09AE\u09BF \u09B6\u09C1\u09A8\u099B\u09BF \u2014 \u0996\u09C1\u09B2\u09A4\u09C7 \u099F\u09CD\u09AF\u09BE\u09AA \u0995\u09B0\u09CB" : command)
             .setSmallIcon(android.R.drawable.ic_btn_speak_now)
             .setContentIntent(pi)
             .setAutoCancel(true)
             .setTimeoutAfter(6000);
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.notify(7311, b.build());
        } catch (Exception ignored) {}
    }

    private void createChannels() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "SANJU Wake Word", NotificationManager.IMPORTANCE_LOW);
        ch.setDescription("Background wake word listener");
        nm.createNotificationChannel(ch);
        NotificationChannel al = new NotificationChannel(ALERT_CHANNEL_ID, "SANJU Wake Alert", NotificationManager.IMPORTANCE_HIGH);
        al.setSound(null, null);
        nm.createNotificationChannel(al);
    }
}
