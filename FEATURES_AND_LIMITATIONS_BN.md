# SANJU JARVIS features and device requirements

This project includes the existing React/Capacitor interface, voice commander, local-first storage, notification center, voice analysis UI and native patch sources.

## Feature integration notes
- Voice input/output: use the existing VoiceCommander and native VoiceInputPlugin/TtsPlugin. Android microphone and speech service permissions are required.
- Hey Sanju always-on wake word: not guaranteed by a web page or normal background activity. Requires a foreground microphone service, persistent notification, battery-optimization handling, and explicit user permission. Do not silently record.
- Flashlight, volume, brightness: route through PhoneControlPlugin; availability depends on Android version, device hardware, runtime permission, and system restrictions. Brightness changes may require user-granted write-settings permission.
- Reminders/alarms/notifications: use Android AlarmManager/notifications with notification permission on Android 13+ and exact-alarm permission where required. Ask the user before scheduling or creating alarms.
- Camera/image understanding: request camera/photo permission and send images to the configured vision model only after user action. Explain network/data use. API keys embedded in client apps are extractable; use a backend proxy for public distribution.
- Offline commands: implement deterministic local intents (time, opening in-app panels, basic settings) without a network. Generative AI and remote image analysis require internet unless a local model is installed.

## Build
Use the repository's GitHub Actions workflow or follow README. Verify on a physical Android device; emulator success does not guarantee OEM-specific flashlight, speech, alarm, or background behavior.

## সর্বশেষ উন্নতি (2026-09-28)
- দ্রুত ডিফল্ট Groq মডেল `openai/gpt-oss-20b`; পুরোনো 120b সেটিং থাকলে প্রথম রানেই নতুন ডিফল্টে মাইগ্রেট হয়। Settings-এ ব্যবহারকারী নিজের মডেল বদলাতে পারবেন।
- উত্তর সংক্ষিপ্ত রাখার prompt guidance এবং generation token limit 640 করা হয়েছে।
- চ্যাট history context সর্বশেষ 10 exchanges-এ সীমিত করা হয়েছে।
- নেটওয়ার্ক retry delay 900ms থেকে 300ms এবং TTS transient retry সর্বোচ্চ একবারে নামানো হয়েছে।
- প্রতি speech turn-এ TTS engine lock: Gemini voice দিয়ে শুরু হলে একই turn-এর মাঝখানে native robotic voice-এ fallback করবে না; failed chunk skip হবে, যাতে কণ্ঠ পাল্টে না যায়। Gemini key/connection শুরুতেই না থাকলে native TTS পুরো turn-এর জন্য ব্যবহৃত হবে।
- ব্যবহারকারীর কথায় sad/happy/angry/funny mood signal শনাক্ত করে mood card ও system prompt-এ tone update করা হয়।
- বাস্তব latency ও voice quality ফোনে install করে যাচাই করতে হবে; API/network এবং ফোনের TTS provider-এর ওপর ফল নির্ভরশীল।


## নতুন voice ও Agent update
- Speech synthesis এখন ইনস্টল করা বাংলা/ইংরেজি voice list থেকে feminine-name hint অনুযায়ী voice বেছে localStorage-এ voiceURI সংরক্ষণ করে। ফোনে বাংলা female voice না থাকলে Android TTS-এর উপলভ্য voice-ই ব্যবহার হবে; voice pack/engine-এর ওপর ফল নির্ভরশীল।
- Agent Mode-এ YouTube, WhatsApp, Chrome, Gmail, Maps-এর package-targeted Android intent চেষ্টা করে; Camera/Settings-এর intent-ও আছে। এটি Android/WebView/OS policy অনুযায়ী কাজ করতে পারে বা নাও পারে।
- Research/Vision/Mood Agent quick prompts UI-তে যোগ হয়েছে; Research ও vision reasoning/action পুরোপুরি সংযুক্ত নয়, আর camera launch permission/device support-নির্ভর।
