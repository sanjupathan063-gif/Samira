# SANJU 3.0 — Neural Core / Master Agent

## Architecture
SANJU now uses one visible **Master Agent**. It routes a user request to local/native tools first and only sends tasks to the AI model when reasoning is needed.

### Fast local/native tools
- Phone call and contact call
- SMS
- YouTube search/open
- App launch
- Alarm / timer / reminder
- Flashlight / volume / Wi‑Fi / Bluetooth / brightness panels
- Media controls
- Notes and local memory
- Weather via Open‑Meteo + device geolocation when available
- Web search via Google
- Home Assistant REST control when URL/token/entity IDs are configured

### AI tools
- Normal chat / planning
- Image/vision analysis when the configured Groq model supports image input
- Screenshot/image attachment analysis
- Research via live web search pages when an external search API is not configured

### Wake word
A native Android foreground microphone service listens for a configurable phrase such as **Hey Sanju** / **Hey Jarvis**. It stores a pending command and opens/wakes SANJU when detected.

Important Android limitation: force-stopped apps, OEM battery savers, microphone privacy toggles, and some Android power-management policies can stop background microphone services. The service is designed for normal background operation and uses `START_STICKY` plus a low-importance foreground notification.

### Proactive notifications
Reminders use Android `AlarmManager.setExactAndAllowWhileIdle` through `SanjuScheduler`, so a reminder can fire even when the WebView is no longer open.

### Voice
Native Android TTS supports three local styles:
- cinematic
- robotic
- human

The exact voice quality depends on the TTS engine/voice installed on the phone.

## Security note
API keys are still user-managed. The app does not provide a server-side secret vault. Existing encrypted-backup utilities use AES-GCM/PBKDF2 for exported data. Do not describe client-side API-key storage as end-to-end encryption.

## Smart Home
Home Assistant integration requires:
1. Home Assistant URL
2. Long-Lived Access Token
3. Entity IDs for light/fan/AC

The app sends a real Home Assistant REST service request with the configured entity ID.
