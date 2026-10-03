package com.sanju.assistant;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.IBinder;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import java.util.ArrayList;
import java.util.Locale;

public class WakeWordService extends Service {
    private static final String CHANNEL_ID = "sanju_wake";
    private static final String PREFS = "sanju_wake_prefs";
    private SpeechRecognizer recognizer;
    private String phrase = "hey sanju";
    private boolean stopping = false;

    @Override public void onCreate() {
        super.onCreate();
        createChannel();
        Notification n = new Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("SANJU Wake Word")
                .setContentText("বলুন: Hey Sanju")
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setOngoing(true)
                .build();
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(7310, n, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
        } else {
            startForeground(7310, n);
        }
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.hasExtra("phrase")) phrase = intent.getStringExtra("phrase");
        if (phrase == null || phrase.trim().isEmpty()) phrase = "Hey Sanju";
        stopping = false;
        startRecognition();
        return START_STICKY;
    }

    private void startRecognition() {
        if (stopping) return;
        if (!SpeechRecognizer.isRecognitionAvailable(this)) return;
        try { if (recognizer != null) recognizer.destroy(); } catch (Exception ignored) {}
        recognizer = SpeechRecognizer.createSpeechRecognizer(this);
        recognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle params) {}
            @Override public void onBeginningOfSpeech() {}
            @Override public void onRmsChanged(float rmsdB) {}
            @Override public void onBufferReceived(byte[] buffer) {}
            @Override public void onEndOfSpeech() {}
            @Override public void onPartialResults(Bundle partialResults) { check(partialResults); }
            @Override public void onEvent(int eventType, Bundle params) {}
            @Override public void onResults(Bundle results) { check(results); restartSoon(); }
            @Override public void onError(int error) { restartSoon(); }
        });
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "bn-IN");
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "bn-IN");
        i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
        i.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
        recognizer.startListening(i);
    }

    private void check(Bundle b) {
        ArrayList<String> list = b == null ? null : b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (list == null) return;
        for (String raw : list) {
            if (raw == null) continue;
            String t = raw.trim().toLowerCase(Locale.ROOT);
            String p = phrase.trim().toLowerCase(Locale.ROOT);
            boolean hit = t.contains(p) || t.contains("hey sanju") || t.contains("হেই সাঞ্জু") || t.contains("হে সাঞ্জু") || t.contains("হেই জার্ভিস") || t.contains("hey jarvis");
            if (hit) {
                String command = t;
                command = command.replace(p, "").replace("hey sanju", "").replace("hey jarvis", "").replace("হেই সাঞ্জু", "").replace("হে সাঞ্জু", "").trim();
                SharedPreferences sp = getSharedPreferences(PREFS, MODE_PRIVATE);
                sp.edit().putString("pending_command", command).apply();
                Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
                if (launch != null) {
                    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    launch.putExtra("sanju_wake", true);
                    launch.putExtra("sanju_command", command);
                    startActivity(launch);
                }
                try { recognizer.stopListening(); } catch (Exception ignored) {}
                restartSoon();
                return;
            }
        }
    }

    private void restartSoon() {
        if (stopping) return;
        new android.os.Handler(getMainLooper()).postDelayed(this::startRecognition, 500);
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "SANJU Wake Word", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Background wake word listener");
            ((NotificationManager)getSystemService(Context.NOTIFICATION_SERVICE)).createNotificationChannel(ch);
        }
    }

    @Override public void onDestroy() {
        stopping = true;
        try { if (recognizer != null) recognizer.destroy(); } catch (Exception ignored) {}
        recognizer = null;
        super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
}
