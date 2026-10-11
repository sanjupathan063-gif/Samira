package com.sanju.assistant;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.DatabaseUtils;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;

/**
 * Permanent, local-only store for messages that reached this phone as notifications.
 * Lives in the app's private storage; nothing here is sent anywhere.
 */
final class MsgHistoryDb extends SQLiteOpenHelper {
    private static final String DB_NAME = "sanju_msg_history.db";
    private static final int DB_VERSION = 1;
    static final int MAX_ROWS = 20000;
    private static MsgHistoryDb instance;

    static synchronized MsgHistoryDb get(Context c) {
        if (instance == null) instance = new MsgHistoryDb(c.getApplicationContext());
        return instance;
    }

    private MsgHistoryDb(Context c) {
        super(c, DB_NAME, null, DB_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE msgs (id INTEGER PRIMARY KEY AUTOINCREMENT, k TEXT NOT NULL UNIQUE, "
                + "pkg TEXT NOT NULL, convo TEXT, sender TEXT, body TEXT NOT NULL, ts INTEGER NOT NULL, "
                + "is_msg INTEGER NOT NULL DEFAULT 0, unsent INTEGER NOT NULL DEFAULT 0, seen_at INTEGER NOT NULL)");
        db.execSQL("CREATE INDEX idx_msgs_ts ON msgs(ts)");
        db.execSQL("CREATE INDEX idx_msgs_pkg ON msgs(pkg)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) { }

    /** Returns true when a new row was stored (false = duplicate of something already saved). */
    synchronized boolean insert(String pkg, String convo, String sender, String body, long ts, boolean isMsg) {
        String key = pkg + "|" + convo + "|" + sender + "|" + ts + "|" + body.hashCode() + "|" + body.length();
        ContentValues cv = new ContentValues();
        cv.put("k", key);
        cv.put("pkg", pkg);
        cv.put("convo", convo);
        cv.put("sender", sender);
        cv.put("body", body);
        cv.put("ts", ts);
        cv.put("is_msg", isMsg ? 1 : 0);
        cv.put("seen_at", System.currentTimeMillis());
        long id = getWritableDatabase().insertWithOnConflict("msgs", null, cv, SQLiteDatabase.CONFLICT_IGNORE);
        if (id > 0) trim();
        return id > 0;
    }

    /** Flags the newest saved message of this chat (seen within 24h) as probably unsent/deleted. */
    synchronized boolean markUnsent(String pkg, String convo) {
        long since = System.currentTimeMillis() - 24L * 3600L * 1000L;
        SQLiteDatabase db = getWritableDatabase();
        Cursor c = db.rawQuery("SELECT id FROM msgs WHERE pkg=? AND convo=? AND unsent=0 AND seen_at>? ORDER BY ts DESC LIMIT 1",
                new String[] { pkg, convo, String.valueOf(since) });
        try {
            if (c.moveToFirst()) {
                long id = c.getLong(0);
                db.execSQL("UPDATE msgs SET unsent=1 WHERE id=?", new Object[] { Long.valueOf(id) });
                return true;
            }
        } finally {
            c.close();
        }
        return false;
    }

    synchronized long count() {
        return DatabaseUtils.queryNumEntries(getReadableDatabase(), "msgs");
    }

    private void trim() {
        long n = count();
        if (n > MAX_ROWS) {
            long drop = n - MAX_ROWS + 1000;
            getWritableDatabase().execSQL("DELETE FROM msgs WHERE id IN (SELECT id FROM msgs ORDER BY ts ASC LIMIT " + drop + ")");
        }
    }

    synchronized JSONArray list(int limit, int offset, String pkg, String q, boolean unsentOnly, boolean msgOnly) {
        limit = Math.max(1, Math.min(limit, 500));
        offset = Math.max(0, offset);
        StringBuilder sql = new StringBuilder("SELECT id,pkg,convo,sender,body,ts,is_msg,unsent FROM msgs WHERE 1=1");
        ArrayList<String> args = new ArrayList<String>();
        if (pkg != null && !pkg.isEmpty()) {
            sql.append(" AND pkg=?");
            args.add(pkg);
        }
        if (unsentOnly) sql.append(" AND unsent=1");
        if (msgOnly) sql.append(" AND is_msg=1");
        if (q != null && !q.trim().isEmpty()) {
            String like = "%" + q.trim().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            sql.append(" AND (body LIKE ? ESCAPE '\\' OR convo LIKE ? ESCAPE '\\' OR sender LIKE ? ESCAPE '\\')");
            args.add(like);
            args.add(like);
            args.add(like);
        }
        sql.append(" ORDER BY ts DESC LIMIT ").append(limit).append(" OFFSET ").append(offset);
        JSONArray out = new JSONArray();
        Cursor c = getReadableDatabase().rawQuery(sql.toString(), args.toArray(new String[0]));
        try {
            while (c.moveToNext()) {
                try {
                    JSONObject o = new JSONObject();
                    o.put("id", c.getLong(0));
                    o.put("pkg", c.getString(1));
                    o.put("convo", c.getString(2) == null ? "" : c.getString(2));
                    o.put("sender", c.getString(3) == null ? "" : c.getString(3));
                    o.put("body", c.getString(4));
                    o.put("ts", c.getLong(5));
                    o.put("isMsg", c.getInt(6) == 1);
                    o.put("unsent", c.getInt(7) == 1);
                    out.put(o);
                } catch (Exception ignored) { }
            }
        } finally {
            c.close();
        }
        return out;
    }

    synchronized void delete(long id) {
        getWritableDatabase().execSQL("DELETE FROM msgs WHERE id=?", new Object[] { Long.valueOf(id) });
    }

    synchronized void clear() {
        getWritableDatabase().execSQL("DELETE FROM msgs");
    }
}
