package com.sanju.assistant;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;
import java.util.LinkedHashSet;

/**
 * In-app microphone.
 * Self-correcting: if the phone's recogniser cannot understand the requested language (error 7/12/13/5)
 * it automatically retries with the next language (bn-BD -> bn-IN -> en-IN -> en-US -> default),
 * keeps partial results so a half-heard sentence is not lost, and gives the user more time to finish speaking.
 */
@CapacitorPlugin(
    name = "VoiceInput",
    permissions = {
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "mic")
    }
)
public class VoiceInputPlugin extends Plugin {

    private SpeechRecognizer speechRecognizer;
    private String[] ladder = new String[0];
    private int ladderIndex = 0;
    private String bestPartial = "";
    private boolean finished = false;
    private PluginCall activeCall;
    private int busyRetries = 0;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private AudioManager audio;
    private static final int[] BEEP_STREAMS = {
        AudioManager.STREAM_MUSIC, AudioManager.STREAM_NOTIFICATION, AudioManager.STREAM_SYSTEM
    };
    private final boolean[] mutedByUs = new boolean[BEEP_STREAMS.length];

    /** Same "tun-tun" muting as the wake word service: every new recognizer start used to beep. */
    private void muteBeep() {
        try {
            boolean silent = getContext().getSharedPreferences("sanju_wake_prefs", 0).getBoolean("silent", true);
            if (!silent) return;
            if (audio == null) audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (audio == null || audio.isMusicActive()) return;
            for (int i = 0; i < BEEP_STREAMS.length; i++) {
                if (mutedByUs[i]) continue;
                if (Build.VERSION.SDK_INT >= 23 && audio.isStreamMute(BEEP_STREAMS[i])) continue;
                try { audio.adjustStreamVolume(BEEP_STREAMS[i], AudioManager.ADJUST_MUTE, 0); mutedByUs[i] = true; }
                catch (Exception ignored) {}
            }
        } catch (Exception ignored) {}
    }

    private void unmuteBeep() {
        if (audio == null) return;
        for (int i = 0; i < BEEP_STREAMS.length; i++) {
            if (!mutedByUs[i]) continue;
            try { audio.adjustStreamVolume(BEEP_STREAMS[i], AudioManager.ADJUST_UNMUTE, 0); } catch (Exception ignored) {}
            mutedByUs[i] = false;
        }
    }

    @Override
    protected void handleOnDestroy() {
        unmuteBeep();
        super.handleOnDestroy();
    }

    @PluginMethod
    public void requestMicPermission(PluginCall call) {
        if (getPermissionState("mic") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("mic", call, "micPermsCallback");
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @PermissionCallback
    private void micPermsCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("mic") == com.getcapacitor.PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void listen(PluginCall call) {
        if (getPermissionState("mic") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("RECORD_AUDIO permission not granted");
            return;
        }
        final String requested = call.getString("language", "bn-BD");

        getActivity().runOnUiThread(() -> {
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
                call.reject("speech_error_unavailable");
                return;
            }
            LinkedHashSet<String> set = new LinkedHashSet<>();
            set.add(requested == null ? "bn-BD" : requested);
            set.add("bn-BD");
            set.add("bn-IN");
            set.add("en-IN");
            set.add("en-US");
            set.add("");
            ladder = set.toArray(new String[0]);
            ladderIndex = 0;
            bestPartial = "";
            finished = false;
            busyRetries = 0;
            activeCall = call;
            startAttempt();
        });
    }

    private void startAttempt() {
        if (finished || activeCall == null) return;
        destroyRecognizer();
        bestPartial = "";
        final String language = ladder[ladderIndex];

        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(getContext());

        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        if (!language.isEmpty()) {
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, language);
        }
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());
        // Give people time to think/finish the sentence instead of cutting them off.
        intent.putExtra("android.speech.extra.SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS", 2200);
        intent.putExtra("android.speech.extra.SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS", 1800);
        intent.putExtra("android.speech.extra.SPEECH_INPUT_MINIMUM_LENGTH_MILLIS", 2500);

        speechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle params) {}
            @Override public void onBeginningOfSpeech() {}
            @Override public void onRmsChanged(float rmsdB) {}
            @Override public void onBufferReceived(byte[] buffer) {}
            @Override public void onEndOfSpeech() {}
            @Override public void onEvent(int eventType, Bundle params) {}

            @Override
            public void onPartialResults(Bundle partialResults) {
                ArrayList<String> p = partialResults == null ? null
                    : partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (p != null && !p.isEmpty() && p.get(0) != null && !p.get(0).trim().isEmpty()) {
                    bestPartial = p.get(0);
                }
            }

            @Override
            public void onError(int error) {
                // Heard something but the final result failed: use what we heard.
                if ((error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT)
                        && !bestPartial.isEmpty()) {
                    finishWithText(bestPartial, language);
                    return;
                }
                // Microphone still held by the wake word service (busy) -> wait a moment, retry the same language.
                if ((error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY || error == SpeechRecognizer.ERROR_AUDIO) && busyRetries < 3) {
                    busyRetries++;
                    mainHandler.postDelayed(() -> startAttempt(), 700);
                    return;
                }
                // Language not understood / not installed / recogniser hiccup -> try the next language by itself.
                boolean retryable = error == SpeechRecognizer.ERROR_NO_MATCH
                    || error == 12 || error == 13
                    || error == SpeechRecognizer.ERROR_CLIENT
                    || error == SpeechRecognizer.ERROR_AUDIO;
                if (retryable && ladderIndex < ladder.length - 1) {
                    ladderIndex++;
                    startAttempt();
                    return;
                }
                finishWithError("speech_error_" + error);
            }

            @Override
            public void onResults(Bundle results) {
                ArrayList<String> matches = results == null ? null
                    : results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                String text = "";
                if (matches != null) {
                    for (String m : matches) {
                        if (m != null && !m.trim().isEmpty()) { text = m; break; }
                    }
                }
                if (text.isEmpty()) text = bestPartial;
                if (text.isEmpty() && ladderIndex < ladder.length - 1) {
                    ladderIndex++;
                    startAttempt();
                    return;
                }
                finishWithText(text, language);
            }
        });

        muteBeep();
        speechRecognizer.startListening(intent);
    }

    private void finishWithText(String text, String language) {
        if (finished || activeCall == null) return;
        finished = true;
        JSObject ret = new JSObject();
        ret.put("text", text == null ? "" : text);
        ret.put("language", language);
        PluginCall c = activeCall;
        activeCall = null;
        destroyRecognizer();
        unmuteBeep();
        c.resolve(ret);
    }

    private void finishWithError(String message) {
        if (finished || activeCall == null) return;
        finished = true;
        PluginCall c = activeCall;
        activeCall = null;
        destroyRecognizer();
        unmuteBeep();
        c.reject(message);
    }

    private void destroyRecognizer() {
        if (speechRecognizer != null) {
            try { speechRecognizer.cancel(); } catch (Exception ignored) {}
            try { speechRecognizer.destroy(); } catch (Exception ignored) {}
            speechRecognizer = null;
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            unmuteBeep();
            if (speechRecognizer != null) {
                try { speechRecognizer.stopListening(); } catch (Exception ignored) {}
            }
        });
        call.resolve();
    }
}
