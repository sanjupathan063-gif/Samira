# SANJU v4.4.0 — আপডেট

## এই ZIP-এ যাচাই করে পাওয়া বর্তমান architecture
- Capacitor Android app, Vite/React source এবং prebuilt `www/` runtime
- Call Assistant, Wake Word, Accessibility, Notification Listener
- Cognitive Core, declarative Skill Manager, local task journal/memory
- GitHub Actions workflow দিয়ে debug APK build

## এই revision-এ নতুন/উন্নত
- Voice/text command: “নোটিফিকেশন পড়ো” / “নোটিফিকেশন পড়ো” / “read notifications”
  - Notification Access বন্ধ থাকলে Settings খুলতে চেষ্টা করে
  - সর্বশেষ ৮টি notification locally পড়ে শোনায়
  - OTP/verification-code জাতীয় notification-এর content গোপন রাখে
- “কাজ থামাও” দিয়ে local task state pause করা যায়
- “নিজের কাজ পর্যালোচনা” দিয়ে recent action journal-এর summary পাওয়া যায়
- “মনে রাখো: …” দিয়ে local preference/memory-তে note রাখা যায়
- Package/workflow/push commit version 4.4.0

## গুরুত্বপূর্ণ সীমা
- Task planner/recovery/skill evolution-এর কিছু অংশ architecture/foundation; সব external Android action স্বয়ংক্রিয়ভাবে সম্পন্ন হয় না।
- Skill creation declarative; AI-generated arbitrary JavaScript/native code execute করে না।
- Notification read করার জন্য Android Settings থেকে SANJU-র Notification Access manually enable করতে হবে।
- এই environment-এ পূর্ণ Android APK build যাচাই করা হয়নি; GitHub Actions build সফল কি না Actions tab-এ দেখতে হবে।
