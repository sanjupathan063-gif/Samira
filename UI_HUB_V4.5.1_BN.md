# SANJU Command Hub v4.5.1 — UI Refresh

## কী বদলেছে
- হোম স্ক্রিনের জন্য পরিষ্কার, ছোট ও মোবাইল-ফ্রেন্ডলি spacing; মূল SANJU persona/core রাখা হয়েছে।
- থ্রি-লাইন মেনু থেকে প্রোফাইল, AI/ভয়েস সেটিংস, নোট, স্মৃতি, সিস্টেম চেক ও ফোন কন্ট্রোল খোলা যায়।
- প্রোফাইল ফটো যুক্ত করা হয়েছে। প্রথমবারের জন্য ব্যবহারকারীর দেওয়া ছবি bundled default; Settings থেকে গ্যালারি দিয়ে অন্য ছবি বেছে নেওয়া বা সরানো যায়।
- ছবি 512px-এর মধ্যে JPEG হিসেবে compress করে লোকাল সেটিংসে রাখা হয়, যাতে storage কম লাগে।
- নীয়ন cyan/violet, glass panel, স্পষ্ট মেনু লেবেল এবং reduced-motion preference রাখা হয়েছে।
- Build workflow-এর Android versionName 4.5.1 করা হয়েছে।

## যাচাই
- `node --check` দিয়ে `www/app.js` ও `www/sanju-extras-ui.js` syntax পরীক্ষা করা হয়েছে।
- ZIP integrity পরীক্ষা করা হবে; এই পরিবেশে npm dependency installation timeout হওয়ায় full APK build নিশ্চিত করা যায়নি।
