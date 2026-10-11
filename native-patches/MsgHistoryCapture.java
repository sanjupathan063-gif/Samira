package com.sanju.assistant;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Parcelable;
import android.service.notification.StatusBarNotification;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;

/**
 * Called by SanjuNotificationListenerService for every posted notification.
 * Saves messages from the apps the user picked, but ONLY after the user switched
 * "keep message history" on (off by default).
 */
final class MsgHistoryCapture {
    static final String PREFS = "sanju_msghist";
    static final String KEY_ENABLED = "enabled";
    static final String KEY_APPS = "apps";
    static final String KEY_SKIP_CODES = "skip_codes";

    static final String[][] CATALOG = {
        { "com.facebook.orca", "Messenger" },
        { "com.facebook.mlite", "Messenger Lite" },
        { "com.instagram.android", "Instagram" },
        { "com.facebook.katana", "Facebook" },
        { "com.whatsapp", "WhatsApp" },
        { "com.whatsapp.w4b", "WhatsApp Business" },
        { "org.telegram.messenger", "Telegram" },
        { "com.google.android.apps.messaging", "Google Messages" },
        { "com.samsung.android.messaging", "Samsung Messages" }
    };
    static final Set<String> DEFAULT_APPS = new HashSet<String>(Arrays.asList(
        "com.facebook.orca", "com.facebook.mlite", "com.instagram.android", "com.facebook.katana"));

    // "X unsent a message", "This message was deleted", ... (English + Bengali)
    private static final Pattern DELETED = Pattern.compile("(?i)(unsent (a|this) message|removed (a|this) message|deleted (a|this) message|this message (was|has been) (deleted|removed)|message (was )?(deleted|removed|unsent)|(\u09AE\u09C7\u09B8\u09C7\u099C|\u09AC\u09BE\u09B0\u09CD\u09A4\u09BE).{0,25}(\u09AE\u09C1\u099B\u09C7|\u09A1\u09BF\u09B2\u09BF\u099F|\u0986\u09A8\u09B8\u09C7\u09A8\u09CD\u09A1|\u09B8\u09B0\u09BF\u09AF\u09BC\u09C7)|\u0986\u09A8\u09B8\u09C7\u09A8\u09CD\u09A1)");
    // one-time codes / passwords are never stored (when the user keeps "skip codes" on)
    private static final Pattern CODE = Pattern.compile("(?i)(\\b\\d{4,8}\\b.*(otp|code|verification|\u0995\u09CB\u09A1|pin|password)|(otp|code|verification|\u0995\u09CB\u09A1|pin|password).*\\b\\d{4,8}\\b)");

    private static final ExecutorService EX = Executors.newSingleThreadExecutor();

    private MsgHistoryCapture() { }

    static Set<String> apps(SharedPreferences sp) {
        Set<String> s = sp.getStringSet(KEY_APPS, null);
        return s == null ? DEFAULT_APPS : new HashSet<String>(s);
    }

    static void onPosted(final Context ctx, final StatusBarNotification sbn) {
        try {
            if (ctx == null || sbn == null) return;
            SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            if (!sp.getBoolean(KEY_ENABLED, false)) return;
            final String pkg = sbn.getPackageName();
            if (pkg == null || pkg.equals(ctx.getPackageName())) return;
            if (!apps(sp).contains(pkg)) return;
            final Notification n = sbn.getNotification();
            if (n == null || n.extras == null) return;
            if ((n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
            if ((n.flags & Notification.FLAG_ONGOING_EVENT) != 0) return;
            final boolean skipCodes = sp.getBoolean(KEY_SKIP_CODES, true);
            final Bundle ex = n.extras;
            final long fallbackTs = n.when > 0 ? n.when : sbn.getPostTime();
            final boolean msgCategory = Notification.CATEGORY_MESSAGE.equals(n.category);
            final Parcelable[] msgs = ex.getParcelableArray(Notification.EXTRA_MESSAGES);
            final String title = str(ex.getCharSequence(Notification.EXTRA_TITLE));
            final String convoTitle = str(ex.getCharSequence("android.conversationTitle"));
            final String convo = convoTitle.isEmpty() ? title : convoTitle;
            final String bigText = str(ex.getCharSequence(Notification.EXTRA_BIG_TEXT));
            final String text = bigText.isEmpty() ? str(ex.getCharSequence(Notification.EXTRA_TEXT)) : bigText;

            EX.execute(new Runnable() {
                @Override
                public void run() {
                    try {
                        MsgHistoryDb db = MsgHistoryDb.get(ctx);
                        boolean any = false;
                        if (msgs != null) {
                            for (Parcelable p : msgs) {
                                if (!(p instanceof Bundle)) continue;
                                Bundle b = (Bundle) p;
                                String t = str(b.getCharSequence("text"));
                                if (t.isEmpty()) continue;
                                long ts = b.getLong("time", 0L);
                                if (ts <= 0) ts = fallbackTs;
                                String sender = str(b.getCharSequence("sender"));
                                if (sender.isEmpty()) sender = title;
                                handle(db, pkg, convo, sender, t, ts, true, skipCodes);
                                any = true;
                            }
                        }
                        if (!any && !text.isEmpty()) {
                            handle(db, pkg, convo, title, text, fallbackTs, msgCategory, skipCodes);
                        }
                    } catch (Throwable ignored) { }
                }
            });
        } catch (Throwable ignored) { }
    }

    private static void handle(MsgHistoryDb db, String pkg, String convo, String sender, String body,
                               long ts, boolean isMsg, boolean skipCodes) {
        if (DELETED.matcher(body).find()) {
            // the app is telling us the sender removed a message: flag the newest saved one of this chat
            db.markUnsent(pkg, convo);
            return;
        }
        if (skipCodes && CODE.matcher(body).find()) return;
        db.insert(pkg, convo, sender, body.length() > 4000 ? body.substring(0, 4000) : body, ts, isMsg);
    }

    private static String str(CharSequence c) {
        return c == null ? "" : c.toString().trim();
    }
}
