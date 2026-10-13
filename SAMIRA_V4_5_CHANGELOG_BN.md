# Samira v4.5.0 — Command Hub refresh

## এই আপডেটে
- Command Hub-এ বাংলা/ইংরেজি text command input যোগ করা হয়েছে।
- Call, Secure Vault এবং Alerts-এর quick actions যোগ করা হয়েছে।
- Hub-এ আরও গভীর glass/neon styling, input focus state এবং ছোট স্ক্রিনের responsive styling যোগ করা হয়েছে।
- Local intent parser-এ YouTube media-search detection যোগ করা হয়েছে: target app এবং search phrase আলাদা রাখে।
- YouTube search command cloud response-এর আগে locally parse হয়, যাতে cloud fallback intent ভুল করে সাধারণ QUERY না বানায়।
- `hybridRouter.ts`-এর অনুপস্থিত `localEdgeAi.ts` ও `cloudAi.ts` modules যোগ করা হয়েছে।

## গুরুত্বপূর্ণ সীমাবদ্ধতা
- YouTube command search-results page খোলে; ভিডিও স্বয়ংক্রিয়ভাবে নির্বাচন/প্লে করা বা playback সফল হয়েছে কিনা যাচাই করার native Android integration এখনো যোগ হয়নি।
- Flashlight/system control-এর জন্য Android native capability/permission দরকার; এই আপডেট সেটি বাস্তবায়ন করে না।
- dependency installation/build এখানে সম্পূর্ণ হয়নি; তাই APK/build সফল হয়েছে বলে দাবি করা হচ্ছে না। Termux-এ `npm ci` ও `npm run build` চালিয়ে যাচাই করুন।
