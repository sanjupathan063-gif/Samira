package com.sanju.assistant;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.ContactsContract;
import android.telecom.TelecomManager;
import android.telephony.TelephonyManager;

import com.getcapacitor.JSObject;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.regex.Pattern;

/**
 * SANJU Call Assistant — incoming call handling.
 *  - who is calling (contact name or number) -> spoken announcement
 *  - optional auto-answer after N seconds -> AI answering session (CallAiSession)
 *  - voice command (via wake word service): "call কেটে দাও" / "call ধরো"
 *  - after the call: short summary saved to the call log + notification
 * Needs: READ_PHONE_STATE, READ_CALL_LOG (number), ANSWER_PHONE_CALLS (answer/end), READ_CONTACTS (name).
 */
public class CallStateReceiver extends BroadcastReceiver {

    static final String PREFS = "sanju_call_prefs";
    private static final String CHANNEL = "sanju_calls";
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    static volatile boolean ringing = false;
    static volatile boolean offhook = false;
    static volatile boolean incoming = false;
    static volatile boolean answeredByUs = false;   // Sanju auto-answered (AI session)
    static volatile boolean rejectedByUs = false;   // Sanju hung up while ringing
    static volatile String number = "";
    static volatile String name = "";
    static volatile long ringAt = 0;
    static volatile long answerAt = 0;
    static volatile CallAiSession ai = null;
    private static boolean announced = false;
    private static Runnable announceTask = null;
    private static Runnable autoAnswerTask = null;

    private static final Pattern HANGUP = Pattern.compile(
            "(কেটে\\s*দাও|কেটে\\s*দে|কেটে\\s*ফেল|কাটো|কল\\s*কাট|ফোন\\s*কাট|কল\\s*বন্ধ|হ্যাং\\s*আপ|রিজেক্ট"
                    + "|cut\\s*(the\\s*)?call|end\\s*(the\\s*)?call|hang\\s*up|disconnect|reject|decline)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern ANSWER = Pattern.compile(
            "((কল|ফোন)\\s*(টা|টি)?\\s*(ধর|রিসিভ)|ধরো|রিসিভ\\s*কর|answer|pick\\s*up|receive)",
            Pattern.CASE_INSENSITIVE);

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !TelephonyManager.ACTION_PHONE_STATE_CHANGED.equals(intent.getAction())) return;
        Context app = context.getApplicationContext();
        SharedPreferences sp = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!sp.getBoolean("enabled", false)) return;
        String st = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
        String num = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);
        if (st == null) return;
        if (TelephonyManager.EXTRA_STATE_RINGING.equals(st)) onRinging(app, sp, num);
        else if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(st)) onOffhook(app, sp);
        else if (TelephonyManager.EXTRA_STATE_IDLE.equals(st)) onIdle(app, sp);
    }

    // ------------------------------------------------------------------ RINGING

    static synchronized void onRinging(final Context app, final SharedPreferences sp, String num) {
        String n = num == null ? "" : num;
        if (ringing) {
            // Android often sends a second RINGING broadcast that carries the number.
            if (number.isEmpty() && !n.isEmpty()) { number = n; name = lookupName(app, n); }
            return;
        }
        if (offhook) return; // call-waiting while already on a call: leave it alone
        resetState();
        ringing = true;
        incoming = true;
        ringAt = System.currentTimeMillis();
        number = n;
        name = lookupName(app, n);
        emit("callState", stateObj("ringing"));

        if (sp.getBoolean("announce", true)) {
            announceTask = new Runnable() {
                @Override public void run() {
                    if (ringing && !announced) {
                        announced = true;
                        CallSpeaker.speak(app, announcement(sp), sp.getString("lang", "bn-BD"), null);
                    }
                }
            };
            MAIN.postDelayed(announceTask, 1200); // give the number a moment to arrive
        }
        int sec = sp.getInt("autoAnswerSec", 0);
        if (sec > 0) scheduleAutoAnswer(app, sec);
    }

    static String announcement(SharedPreferences sp) {
        String owner = sp.getString("userName", "বস");
        if (owner == null || owner.trim().isEmpty()) owner = "বস";
        if (!name.isEmpty()) return owner + ", " + name + " আপনাকে কল করছেন।";
        if (!number.isEmpty()) return owner + ", " + spaceDigits(number) + " নম্বর থেকে কল আসছে। নম্বরটি আপনার কন্টাক্টে নেই।";
        return owner + ", একটি অজানা নম্বর থেকে কল আসছে।";
    }

    private static String spaceDigits(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (Character.isDigit(ch)) sb.append(ch).append(' ');
        }
        return sb.toString().trim();
    }

    private static void scheduleAutoAnswer(final Context app, int sec) {
        autoAnswerTask = new Runnable() {
            @Override public void run() { autoAnswerNow(app); }
        };
        MAIN.postDelayed(autoAnswerTask, sec * 1000L);
        // Backup in case the process is frozen while the phone is dozing.
        try {
            AlarmManager am = (AlarmManager) app.getSystemService(Context.ALARM_SERVICE);
            PendingIntent pi = autoAnswerIntent(app);
            long at = System.currentTimeMillis() + sec * 1000L + 1500L;
            if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            } else {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            }
        } catch (Exception ignored) {}
    }

    private static PendingIntent autoAnswerIntent(Context app) {
        Intent i = new Intent(app, AutoAnswerReceiver.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        return PendingIntent.getBroadcast(app, 7711, i, flags);
    }

    static synchronized void autoAnswerNow(Context app) {
        if (!ringing || offhook || answeredByUs) return;
        answeredByUs = true;
        if (!acceptCall(app)) answeredByUs = false;
    }

    private static void cancelPending(Context app) {
        if (announceTask != null) MAIN.removeCallbacks(announceTask);
        if (autoAnswerTask != null) MAIN.removeCallbacks(autoAnswerTask);
        announceTask = null;
        autoAnswerTask = null;
        try {
            AlarmManager am = (AlarmManager) app.getSystemService(Context.ALARM_SERVICE);
            am.cancel(autoAnswerIntent(app));
        } catch (Exception ignored) {}
    }

    // ------------------------------------------------------------------ OFFHOOK

    static synchronized void onOffhook(final Context app, final SharedPreferences sp) {
        cancelPending(app);
        if (ringing) {
            ringing = false;
            offhook = true;
            answerAt = System.currentTimeMillis();
            CallSpeaker.stop(); // stop announcing once the call is picked up
            emit("callState", stateObj("offhook"));
            if (answeredByUs) {
                ai = new CallAiSession(app, sp);
                CallAiSession s = ai;
                if (offhook && s != null) s.start();
            }
        } else if (!offhook) {
            offhook = true; // outgoing call — we only track it so a later IDLE resets state
            incoming = false;
        }
    }

    // ------------------------------------------------------------------ IDLE

    static synchronized void onIdle(final Context app, final SharedPreferences sp) {
        cancelPending(app);
        if (!ringing && !offhook) return;
        final boolean wasIncoming = incoming;
        final boolean answered = answerAt > 0;
        final boolean byUs = answeredByUs;
        final boolean rejected = rejectedByUs;
        final long started = ringAt;
        final long durationSec = answered ? Math.max(0, (System.currentTimeMillis() - answerAt) / 1000) : 0;
        final String num = number;
        final String nm = name;
        final CallAiSession session = ai;
        ai = null;
        if (session != null) session.stop();
        CallSpeaker.stop();
        resetState();
        if (!wasIncoming) return; // outgoing calls are not summarised

        final String outcome = answered ? "answered" : (rejected ? "rejected" : "missed");
        final String handledBy = byUs ? "sanju" : (answered ? "user" : (rejected ? "sanju-reject" : "none"));
        new Thread(new Runnable() {
            @Override public void run() {
                finalizeRecord(app, sp, num, nm, outcome, handledBy, started, durationSec, session);
            }
        }).start();
    }

    private static void finalizeRecord(final Context app, SharedPreferences sp, String num, String nm,
                                       String outcome, String handledBy, long started, long durationSec,
                                       CallAiSession session) {
        final String who = !nm.isEmpty() ? nm : (!num.isEmpty() ? num : "অজানা নম্বর");
        String summary = null;
        boolean aiTalked = session != null && session.hasCallerSpeech();
        JSONArray tr = new JSONArray();
        try {
            if (session != null) {
                synchronized (session.transcript) {
                    for (String[] t : session.transcript) {
                        JSONObject o = new JSONObject();
                        o.put("who", t[0]);
                        o.put("text", t[1]);
                        tr.put(o);
                    }
                }
            }
        } catch (Exception ignored) {}

        if (aiTalked) {
            try {
                String key = sp.getString("apiKey", "");
                if (key != null && !key.isEmpty()) {
                    JSONArray m = new JSONArray();
                    m.put(new JSONObject().put("role", "system").put("content",
                            "নিচের ফোনকলের ট্রান্সক্রিপ্ট থেকে ২-৩ লাইনের সংক্ষিপ্ত বাংলা সারাংশ দাও: কে কল করেছেন, কী চান, এবং কোনো করণীয় বা জরুরি বিষয় থাকলে তা। "
                                    + "যা ট্রান্সক্রিপ্টে নেই তা বানাবে না।"));
                    m.put(new JSONObject().put("role", "user").put("content", "কলার: " + who + "\n" + session.transcriptText()));
                    summary = GroqClient.chat(key, sp.getString("model", "openai/gpt-oss-20b"), m, 700);
                }
            } catch (Exception ignored) {}
        }
        if (summary == null || summary.trim().isEmpty()) {
            if ("missed".equals(outcome)) summary = who + " কল করেছিলেন — মিসড কল।";
            else if ("rejected".equals(outcome)) summary = who + " এর কল সাঞ্জু কেটে দিয়েছে।";
            else if ("sanju".equals(handledBy)) summary = who + " কল করেছিলেন; সাঞ্জু কল ধরেছিল" + (aiTalked ? "।" : " কিন্তু কলারের কথা শোনা যায়নি।");
            else summary = who + " এর সাথে " + (durationSec / 60) + " মিনিট " + (durationSec % 60) + " সেকেন্ড কথা হয়েছে।";
        }
        summary = summary.trim();

        try {
            JSObject rec = new JSObject();
            rec.put("id", "c" + started);
            rec.put("number", num);
            rec.put("name", nm);
            rec.put("outcome", outcome);
            rec.put("handledBy", handledBy);
            rec.put("startedAt", started);
            rec.put("durationSec", durationSec);
            rec.put("summary", summary);
            rec.put("transcript", tr);
            addLog(sp, rec);
            notifyEnded(app, who, summary);
            emit("callEnded", rec);
        } catch (Exception ignored) {}

        // Speak the summary only for calls Sanju handled itself (the user wasn't on the line).
        if (aiTalked) {
            final String speech = "কল শেষ। " + summary;
            final String lang = sp.getString("lang", "bn-BD");
            MAIN.post(new Runnable() {
                @Override public void run() { CallSpeaker.speak(app, speech, lang, null); }
            });
        }
    }

    // ------------------------------------------------------------------ actions

    static boolean acceptCall(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return false;
        try {
            if (ctx.checkSelfPermission(Manifest.permission.ANSWER_PHONE_CALLS) != PackageManager.PERMISSION_GRANTED) return false;
            TelecomManager tm = (TelecomManager) ctx.getSystemService(Context.TELECOM_SERVICE);
            if (tm == null) return false;
            tm.acceptRingingCall();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    static boolean endCall(Context ctx) {
        if (Build.VERSION.SDK_INT < 28) return false;
        try {
            if (ctx.checkSelfPermission(Manifest.permission.ANSWER_PHONE_CALLS) != PackageManager.PERMISSION_GRANTED) return false;
            TelecomManager tm = (TelecomManager) ctx.getSystemService(Context.TELECOM_SERVICE);
            return tm != null && tm.endCall();
        } catch (Exception e) {
            return false;
        }
    }

    /** User pressed "reject" in the app / said "call কেটে দাও". */
    static synchronized boolean hangupByUser(Context ctx) {
        if (!ringing && !offhook) return false;
        if (ringing) rejectedByUs = true;
        boolean ok = endCall(ctx);
        if (!ok) rejectedByUs = false;
        return ok;
    }

    /** User asked Sanju to pick up so that the USER can talk (no AI session). */
    static synchronized boolean answerForUser(Context ctx) {
        if (!ringing) return false;
        answeredByUs = false;
        return acceptCall(ctx);
    }

    /**
     * Called by WakeWordService before it launches the UI for a spoken command.
     * Only active while a call is ringing/in progress. Returns true if the command was consumed.
     */
    static boolean handleVoiceCommand(Context ctx, String cmd) {
        try {
            if (cmd == null || (!ringing && !offhook)) return false;
            Context app = ctx.getApplicationContext();
            SharedPreferences sp = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            if (!sp.getBoolean("enabled", false)) return false;
            String lang = sp.getString("lang", "bn-BD");
            if (HANGUP.matcher(cmd).find()) {
                boolean ok = hangupByUser(app);
                if (!ok) CallSpeaker.speak(app, "কল কাটতে পারলাম না। অ্যাপে কল-অ্যাসিস্ট্যান্টের পারমিশন দিন।", lang, null);
                return true;
            }
            if (ringing && ANSWER.matcher(cmd).find()) {
                boolean ok = answerForUser(app);
                if (!ok) CallSpeaker.speak(app, "কল ধরতে পারলাম না। অ্যাপে কল-অ্যাসিস্ট্যান্টের পারমিশন দিন।", lang, null);
                return true;
            }
        } catch (Exception ignored) {}
        return false;
    }

    /** Test helper: speaks the announcement for a fake caller without touching any real call. */
    static String simulate(Context app, String num, String nm) {
        SharedPreferences sp = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String oldN = number, oldName = name;
        number = num == null ? "" : num;
        name = nm == null ? "" : nm;
        if (name.isEmpty() && !number.isEmpty()) name = lookupName(app, number);
        String text = announcement(sp);
        number = oldN;
        name = oldName;
        CallSpeaker.speak(app, text, sp.getString("lang", "bn-BD"), null);
        return text;
    }

    // ------------------------------------------------------------------ helpers

    private static void resetState() {
        ringing = false;
        offhook = false;
        incoming = false;
        answeredByUs = false;
        rejectedByUs = false;
        announced = false;
        number = "";
        name = "";
        ringAt = 0;
        answerAt = 0;
    }

    static JSObject stateObj(String state) {
        JSObject o = new JSObject();
        o.put("state", state);
        o.put("number", number);
        o.put("name", name);
        o.put("at", System.currentTimeMillis());
        o.put("answeredByUs", answeredByUs);
        return o;
    }

    static void emit(String event, JSObject data) {
        try { CallAssistantPlugin.emit(event, data); } catch (Throwable ignored) {}
    }

    static String lookupName(Context c, String num) {
        if (num == null || num.isEmpty()) return "";
        if (c.checkSelfPermission(Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) return "";
        Cursor cur = null;
        try {
            Uri u = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(num));
            cur = c.getContentResolver().query(u, new String[]{ContactsContract.PhoneLookup.DISPLAY_NAME}, null, null, null);
            if (cur != null && cur.moveToFirst()) {
                String s = cur.getString(0);
                return s == null ? "" : s;
            }
        } catch (Exception ignored) {
        } finally {
            if (cur != null) cur.close();
        }
        return "";
    }

    // ------------------------------------------------------------------ call log (SharedPreferences)

    static synchronized void addLog(SharedPreferences sp, JSObject rec) {
        try {
            JSONArray old = new JSONArray(sp.getString("calllog", "[]"));
            JSONArray fresh = new JSONArray();
            fresh.put(rec);
            for (int i = 0; i < old.length() && fresh.length() < 60; i++) fresh.put(old.get(i));
            sp.edit().putString("calllog", fresh.toString()).apply();
        } catch (Exception ignored) {}
    }

    private static void notifyEnded(Context app, String who, String summary) {
        try {
            NotificationManager nm = (NotificationManager) app.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            if (Build.VERSION.SDK_INT >= 26) {
                nm.createNotificationChannel(new NotificationChannel(CHANNEL, "SANJU Calls", NotificationManager.IMPORTANCE_DEFAULT));
            }
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(app, CHANNEL) : new Notification.Builder(app);
            b.setSmallIcon(android.R.drawable.sym_action_call)
                    .setContentTitle("SANJU — " + who)
                    .setContentText(summary)
                    .setStyle(new Notification.BigTextStyle().bigText(summary))
                    .setAutoCancel(true);
            Intent launch = app.getPackageManager().getLaunchIntentForPackage(app.getPackageName());
            if (launch != null) {
                int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
                b.setContentIntent(PendingIntent.getActivity(app, 7712, launch, flags));
            }
            nm.notify((int) (System.currentTimeMillis() % 100000), b.build());
        } catch (Exception ignored) {}
    }
}

/** Fires when the auto-answer delay elapses (backup path for the in-process timer). */
class AutoAnswerReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        CallStateReceiver.autoAnswerNow(context.getApplicationContext());
    }
}
