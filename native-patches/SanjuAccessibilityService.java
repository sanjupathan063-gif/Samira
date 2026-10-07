package com.sanju.assistant;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

public class SanjuAccessibilityService extends AccessibilityService {
    static SanjuAccessibilityService instance;

    @Override public void onServiceConnected() { instance = this; }
    @Override public void onAccessibilityEvent(AccessibilityEvent event) {}
    @Override public void onInterrupt() {}
    @Override public void onDestroy() { if (instance == this) instance = null; super.onDestroy(); }

    boolean performAction(String action) {
        switch (action) {
            case "home": return performGlobalAction(GLOBAL_ACTION_HOME);
            case "back": return performGlobalAction(GLOBAL_ACTION_BACK);
            case "recents": return performGlobalAction(GLOBAL_ACTION_RECENTS);
            case "notifications": return performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS);
            case "quick_settings": return performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS);
            case "power_dialog": return performGlobalAction(GLOBAL_ACTION_POWER_DIALOG);
            case "scroll_up": return scroll(false);
            case "scroll_down": return scroll(true);
            default: return false;
        }
    }

    private boolean scroll(boolean down) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return false;
        try { return root.performAction(down ? AccessibilityNodeInfo.ACTION_SCROLL_FORWARD : AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD); }
        finally { root.recycle(); }
    }
}
