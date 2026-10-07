#!/usr/bin/env python3
import re, shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
ANDROID_JAVA_DIR=ROOT/'android'/'app'/'src'/'main'/'java'/'com'/'sanju'/'assistant'
MANIFEST_PATH=ROOT/'android'/'app'/'src'/'main'/'AndroidManifest.xml'
PATCH_DIR=Path(__file__).resolve().parent

def copy_java_files():
    ANDROID_JAVA_DIR.mkdir(parents=True,exist_ok=True)
    for filename in ('PhoneControlPlugin.java','VoiceInputPlugin.java','TtsPlugin.java','WakeWordPlugin.java','WakeWordService.java','SanjuSchedulerPlugin.java','AccessibilityControlPlugin.java','SanjuAccessibilityService.java','CallAssistantPlugin.java','CallStateReceiver.java','CallAiSession.java','SanjuNotificationListenerService.java','NotificationAccessPlugin.java','MainActivity.java'):
        shutil.copyfile(PATCH_DIR/filename,ANDROID_JAVA_DIR/filename)

def copy_resources():
    dest=ROOT/'android'/'app'/'src'/'main'/'res'/'xml'
    dest.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(PATCH_DIR/'res'/'xml'/'sanju_accessibility_config.xml', dest/'sanju_accessibility_config.xml')
    vdest=ROOT/'android'/'app'/'src'/'main'/'res'/'values'
    vdest.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(PATCH_DIR/'res'/'values'/'sanju_strings.xml', vdest/'sanju_strings.xml')

def patch_manifest():
    text=MANIFEST_PATH.read_text(encoding='utf-8')
    permissions='''    <uses-permission android:name="android.permission.CALL_PHONE" />\n    <uses-permission android:name="android.permission.SEND_SMS" />\n    <uses-permission android:name="android.permission.READ_CONTACTS" />\n    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n    <uses-permission android:name="android.permission.CAMERA" />\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />\n    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />\n    <uses-permission android:name="android.permission.WAKE_LOCK" />\n    <uses-permission android:name="com.android.alarm.permission.SET_ALARM" />\n    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />\n    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n    <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />\n    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />\n    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />\n    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />\n'''
    if 'android.permission.SYSTEM_ALERT_WINDOW' not in text:
        text=re.sub(r'(<manifest[^>]*>\n)',r'\1'+permissions,text,count=1)
    call_perms=(
        '    <uses-permission android:name="android.permission.READ_PHONE_STATE" />\n'
        '    <uses-permission android:name="android.permission.READ_CALL_LOG" />\n'
        '    <uses-permission android:name="android.permission.ANSWER_PHONE_CALLS" />\n'
    )
    if 'android.permission.ANSWER_PHONE_CALLS' not in text:
        text=re.sub(r'(<manifest[^>]*>\n)',lambda m: m.group(1)+call_perms,text,count=1)
    queries='''    <queries>\n        <intent>\n            <action android:name="android.intent.action.MAIN" />\n            <category android:name="android.intent.category.LAUNCHER" />\n        </intent>\n    </queries>\n'''
    if '<queries>' not in text: text=re.sub(r'(<manifest[^>]*>\n)',r'\1'+queries,text,count=1)
    service='''        <service android:name=".WakeWordService" android:exported="false" android:foregroundServiceType="microphone" />\n'''
    accessibility='''        <service android:name=".SanjuAccessibilityService" android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE" android:exported="false">\n            <intent-filter>\n                <action android:name="android.accessibilityservice.AccessibilityService" />\n            </intent-filter>\n            <meta-data android:name="android.accessibilityservice" android:resource="@xml/sanju_accessibility_config" />\n        </service>\n'''
    receiver='''        <receiver android:name=".ReminderReceiver" android:exported="false" />\n'''
    additions=''
    call_receivers=(
        '        <receiver android:name=".CallStateReceiver" android:exported="true">\n'
        '            <intent-filter>\n'
        '                <action android:name="android.intent.action.PHONE_STATE" />\n'
        '            </intent-filter>\n'
        '        </receiver>\n'
        '        <receiver android:name=".AutoAnswerReceiver" android:exported="false" />\n'
    )
    if 'CallStateReceiver' not in text: additions+=call_receivers
    if 'WakeWordService' not in text: additions+=service
    if 'ReminderReceiver' not in text: additions+=receiver
    if 'SanjuAccessibilityService' not in text: additions+=accessibility
    notification_service = """        <service android:name=".SanjuNotificationListenerService" android:label="SANJU Notification Reader" android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE" android:exported="true">\n            <intent-filter><action android:name="android.service.notification.NotificationListenerService" /></intent-filter>\n        </service>\n"""
    if 'SanjuNotificationListenerService' not in text: additions+=notification_service
    if additions:
        text=re.sub(r'(</application>)',lambda m: additions+m.group(1),text,count=1)
    MANIFEST_PATH.write_text(text,encoding='utf-8')

if __name__=='__main__':
    copy_java_files(); copy_resources(); patch_manifest(); print('Native SANJU 3.0 patches applied')
