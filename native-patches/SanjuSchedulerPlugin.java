package com.sanju.assistant;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name="SanjuScheduler")
public class SanjuSchedulerPlugin extends Plugin {
    @PluginMethod
    public void schedule(PluginCall call) {
        Long delay = call.getLong("delayMs"); String message = call.getString("message", "SANJU Reminder");
        if(delay==null || delay<0){ call.reject("delayMs is required"); return; }
        try{
            long at=System.currentTimeMillis()+delay;
            Intent i=new Intent(getContext(),ReminderReceiver.class); i.putExtra("message",message); i.putExtra("id",(int)(System.currentTimeMillis()%100000));
            int id=i.getIntExtra("id",1);
            PendingIntent pi=PendingIntent.getBroadcast(getContext(),id,i,PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT>=23?PendingIntent.FLAG_IMMUTABLE:0));
            AlarmManager am=(AlarmManager)getContext().getSystemService(Context.ALARM_SERVICE);
            if(Build.VERSION.SDK_INT>=23) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi); else am.setExact(AlarmManager.RTC_WAKEUP,at,pi);
            JSObject r=new JSObject();r.put("scheduledAt",at);r.put("id",id);call.resolve(r);
        }catch(Exception e){call.reject("Schedule failed: "+e.getMessage());}
    }
}

class ReminderReceiver extends BroadcastReceiver {
    private static final String CHANNEL="sanju_reminders";
    @Override public void onReceive(Context context, Intent intent){
        String msg=intent.getStringExtra("message"); if(msg==null)msg="SANJU Reminder";
        NotificationManager nm=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
        if(Build.VERSION.SDK_INT>=26){NotificationChannel ch=new NotificationChannel(CHANNEL,"SANJU Reminders",NotificationManager.IMPORTANCE_HIGH);nm.createNotificationChannel(ch);}
        Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(context,CHANNEL):new Notification.Builder(context);
        b.setSmallIcon(android.R.drawable.ic_popup_reminder).setContentTitle("SANJU").setContentText(msg).setAutoCancel(true).setPriority(Notification.PRIORITY_HIGH);
        nm.notify((int)(System.currentTimeMillis()%100000),b.build());
    }
}
