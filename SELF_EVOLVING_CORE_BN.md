# SANJU Self-Evolving Core

## What this adds
- Declarative dynamic skill registry stored locally.
- User command such as “add a new skill called Calculator” creates a safe skill record.
- Built-in self diagnostics for storage, speech recognition, TTS, network and Capacitor bridge.
- Skill version/source metadata and removable user skills.
- No automatic arbitrary native-code execution.

## Important architecture note
A dynamically created skill is data/configuration, not arbitrary JavaScript/Android code. This avoids silently executing generated native code. New native capabilities still require a reviewed app update.

## v3.4.0 — Self-Heal
- `www/sanju-core.js`: ত্রুটি লগ, নষ্ট ডেটা মেরামত, Wake Word স্বাস্থ্য পরীক্ষা (টুনটুন বেশি হলে slow mode, পারমিশন না থাকলে নিরাপদে বন্ধ)।
- প্রতি ৬০ সেকেন্ডে স্বয়ংক্রিয় পরীক্ষা (সেটিংসে "Self-Heal" চালু থাকলে)।
- AI বিশ্লেষণ শুধু কারণ ও নিরাপদ ধাপ বলে; কোনো কোড নিজে চালায় না।
- Native কোড বদলাতে হলে নতুন APK build লাগবে — অ্যাপ নিজে নিজের Java কোড বদলাতে পারে না।
