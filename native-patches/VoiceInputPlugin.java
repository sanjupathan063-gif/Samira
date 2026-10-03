package com.sanju.assistant;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
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

@CapacitorPlugin(
    name = "VoiceInput",
    permissions = {
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "mic")
    }
)
public class VoiceInputPlugin extends Plugin {

    private SpeechRecognizer speechRecognizer;

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
        final String language = call.getString("language", "bn-BD");

        getActivity().runOnUiThread(() -> {
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
                call.reject("এই ডিভাইসে speech recognition সাপোর্ট নেই");
                return;
            }
            if (speechRecognizer != null) {
                speechRecognizer.destroy();
            }
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(getContext());

            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);

            speechRecognizer.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle params) {}
                @Override public void onBeginningOfSpeech() {}
                @Override public void onRmsChanged(float rmsdB) {}
                @Override public void onBufferReceived(byte[] buffer) {}
                @Override public void onEndOfSpeech() {}

                @Override
                public void onError(int error) {
                    call.reject("speech_error_" + error);
                    if (speechRecognizer != null) {
                        speechRecognizer.destroy();
                        speechRecognizer = null;
                    }
                }

                @Override
                public void onResults(Bundle results) {
                    ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    JSObject ret = new JSObject();
                    ret.put("text", matches != null && !matches.isEmpty() ? matches.get(0) : "");
                    call.resolve(ret);
                    if (speechRecognizer != null) {
                        speechRecognizer.destroy();
                        speechRecognizer = null;
                    }
                }

                @Override public void onPartialResults(Bundle partialResults) {}
                @Override public void onEvent(int eventType, Bundle params) {}
            });

            speechRecognizer.startListening(intent);
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (speechRecognizer != null) {
                speechRecognizer.stopListening();
            }
        });
        call.resolve();
    }
}
