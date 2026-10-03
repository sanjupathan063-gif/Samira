# SANJU AI 2.2 — Agent Mode

এই build-এ ১৩টি Agent System-এর ৫টি করে specialist agent আছে।

## গুরুত্বপূর্ণ পরিবর্তন
- API key না থাকলেও Local Agent Engine প্রতিটি agent-এর জন্য বাস্তবসম্মত structured result দেয়।
- Groq API থাকলে AI-enhanced result চেষ্টা করা হয়; API error/timeout হলে local fallback চলে।
- প্রতি AI request-এর timeout ৯ সেকেন্ড।
- Output summary এখন সব system-এর জন্য fallback result দেখায়; ফাঁকা output নয়।
- Phone/YouTube direct commands pipeline-এর বাইরে দ্রুত execute হতে পারে।
- YouTube command পুরো বাক্যকে app name হিসেবে খুঁজবে না; query আলাদা করে YouTube search খুলবে।

## উদাহরণ
- YouTube খোলো একটা gaming video চালাও
- 9876543210 নম্বরে কল করো
- Content Creation → “একটা ১৫ সেকেন্ডের animal short বানাও”
- Developer → “এই error-এর সম্ভাব্য কারণ বের করো”
- Research → “এই বিষয়টি কীভাবে যাচাই করব?”
- Vision → ছবি attach করে বিশ্লেষণ
