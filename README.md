
> SANJU AI 3.1 — Neural Core UI refresh
# SANJU — Android App (GitHub দিয়ে APK বিল্ড)

এই ফোল্ডারে একটা সম্পূর্ণ, বিল্ড-রেডি Capacitor প্রজেক্ট আছে। GitHub-এ পুশ করলেই
GitHub Actions নিজে থেকে `.apk` বানিয়ে দেবে — তোমার ফোনে Android Studio বা Buildozer
কিছুই লাগবে না।

## ফোল্ডার গঠন
```
sanju-app/
├── www/                  ← UI (HTML/CSS/JS) — এখানেই ডিজাইন এডিট করবে
│   ├── index.html
│   ├── style.css
│   └── app.js
├── native-patches/        ← ফোন কন্ট্রোল (কল/SMS/apps) দেওয়া নেটিভ Android কোড
├── capacitor.config.json
├── package.json
└── .github/workflows/build-apk.yml   ← GitHub Actions বিল্ড স্ক্রিপ্ট
```

## ধাপ ১: GitHub রিপো বানাও
GitHub.com থেকে একটা নতুন **public বা private repository** বানাও, যেমন `sanju-app`।

## ধাপ ২: Termux থেকে পুশ করো
```bash
cd sanju-app
git init
git add .
git commit -m "Sanju app first version"
git branch -M main
git remote add origin https://github.com/<তোমার-ইউজারনেম>/sanju-app.git
git push -u origin main
```
(GitHub-এ পাসওয়ার্ডের বদলে Personal Access Token লাগবে — Settings → Developer settings → Personal access tokens থেকে বানিয়ে নাও।)

## ধাপ ৩: বিল্ড হওয়া দেখো
পুশ করার পর GitHub রিপোর **Actions** ট্যাবে যাও। "Build Sanju APK" workflow
নিজে থেকেই চলা শুরু করবে (৩-৫ মিনিট লাগে)।

## ধাপ ৪: APK ডাউনলোড করো
Workflow শেষ হলে সেই রানের পেজে নিচে **Artifacts** সেকশনে `sanju-debug-apk`
নামে একটা zip পাবে — ডাউনলোড করে ফোনে আনজিপ করলে `app-debug.apk` পাবে। এটাই
ইনস্টল করবে (Settings → Install unknown apps → অনুমতি দিতে হবে)।

## অ্যাপ প্রথমবার চালু করলে
প্রথমবার খুলে ⚙️ সেটিংস বাটনে গিয়ে তোমার **Groq API key** বসাও (একই key যেটা
Termux স্ক্রিপ্টে ব্যবহার করছ)। এরপর থেকে চ্যাট বক্স বা মাইক বাটনে জিজ্ঞেস করলে
সরাসরি অ্যাপ থেকেই Groq-কে কল হবে, Termux চালু রাখার দরকার নেই।

## যা জানা দরকার (সীমাবদ্ধতা)
- **কথা বলা (TTS)**: Android WebView-তে ভালোভাবেই কাজ করে — Sanju উত্তর মুখে বলবে।
- **মাইক দিয়ে কথা শোনা**: এখন Android-এর নিজস্ব SpeechRecognizer ব্যবহার করে (নেটিভ প্লাগিন,
  `native-patches/VoiceInputPlugin.java`) — আগের ব্রাউজার-ভিত্তিক পদ্ধতি বাদ দেওয়া হয়েছে যেটা
  WebView-তে কাজ করত না। মাইক বাটনে চাপ দিলে পারমিশন চাইবে, তারপর একবার বলে থামলেই
  (press-to-talk) সেটা টেক্সটে রূপান্তরিত হয়ে Sanju-কে পাঠানো হয়।

## ফোন কন্ট্রোল (কল, SMS, apps খোলা)
এখন সরাসরি এই অ্যাপ থেকেই কল করা, SMS পাঠানো আর অন্য অ্যাপ খোলা যায় — Termux বা আলাদা
কোনো Accessibility সার্ভিস ছাড়াই। হোমস্ক্রিনে **ফোন কন্ট্রোল** বাটনে একবার ট্যাপ করলে
Android পারমিশন (কল আর SMS) চাইবে, সেটা "Allow" দিলেই যথেষ্ট। এরপর চ্যাট বক্সে বা
মাইকে এভাবে বলা/লেখা যাবে:
- `01712345678 নম্বরে কল করো`
- `01712345678 নম্বরে sms করো আসছি`
- `youtube খোলো`

এই তিনটা প্যাটার্ন মিললে অ্যাপ সরাসরি ফোনকে কমান্ড দেয়, Groq-কে জিজ্ঞেস করে না। এর বাইরের
যেকোনো কথা স্বাভাবিকভাবেই Sanju-কে (Groq) জিজ্ঞেস করা হয়।

**সতর্কতা**: `sendSms` পারমিশন পেলে অ্যাপ কোনো কনফার্মেশন ছাড়াই সরাসরি SMS
পাঠিয়ে দেয় — নম্বর ভুল করে বললে ভুল নম্বরেই মেসেজ চলে যাবে, তাই এই ফিচারটা নিজের
বিশ্বস্ত ফোনেই রাখা ভালো।

## নতুন যোগ হলো: Tony Stark-ish ফিচারগুলো
- **অ্যালার্ম**: `"সকাল ৭টায় অ্যালার্ম দাও"`, `"রাত ১০টায় অ্যালার্ম সেট করো"` — ফোনের
  Clock অ্যাপে সরাসরি অ্যালার্ম বসে যাবে।
- **ফ্ল্যাশলাইট**: `"ফ্ল্যাশলাইট জ্বালাও"` / `"ফ্ল্যাশ বন্ধ করো"` — ক্যামেরা টর্চ চালু/বন্ধ করে।
- **কথোপকথন মনে রাখা**: চ্যাট আর কথোপকথনের context এখন ফোনেই (localStorage) সেভ থাকে,
  অ্যাপ বন্ধ করে আবার খুললেও আগের কথাগুলো এবং শেষ ২৪টা এক্সচেঞ্জের প্রসঙ্গ মনে থাকবে।
- **স্ক্যান HUD**: নিচের **স্ক্যান** ট্যাবে চাপলে একটা Iron-Man-স্টাইল রাডার এনিমেশন
  খুলে ব্যাটারি, নেটওয়ার্ক, ইনস্টল করা অ্যাপের সংখ্যা আর স্টোরেজ দেখিয়ে "diagnostic complete" বলবে।

## ডিজাইন বদলাতে চাইলে
`www/style.css`-এর উপরে `:root` ভেরিয়েবলগুলো (রং) বদলালেই পুরো থিম বদলে যাবে।
নাম "SANJU" থেকে অন্য কিছু করতে চাইলে `index.html`-এ `.brand` আর `.wordmark`
লেখা দুটো জায়গা বদলাও।

## সাঞ্জুর কণ্ঠস্বর (Gemini TTS — বিনামূল্যে, কার্ড লাগে না)
এটাই সবচেয়ে সহজ পথ — Google-এর নতুন Gemini TTS মডেল ব্যবহার করে, বিনামূল্যে, কোনো
কার্ড ছাড়াই:

1. https://aistudio.google.com/apikey -এ যাও (যেকোনো Google/Gmail অ্যাকাউন্ট দিয়ে
   লগইন করলেই হবে, নতুন করে সাইনআপের ঝামেলা নেই)
2. **"Create API key"** চাপো — সাথে সাথে একটা key পেয়ে যাবে (`AI...` দিয়ে শুরু হয়)
3. অ্যাপে সেটিংসে গিয়ে **Gemini TTS API Key** ফিল্ডে সেটা বসিয়ে সেভ করো

ব্যস, এতটুকুই — কোনো Region লাগে না, কার্ড লাগে না। এটা বসানো থাকলে সাঞ্জু এই
ভয়েসেই কথা বলবে।

## নতুন কমান্ড ও ইন্টারঅ্যাকশন
- **অর্বে ট্যাপ** — সাঞ্জু কথা বলার সময় ট্যাপ করলে থামবে, না বললে মাইক চালু হবে
- **"থামো" / "চুপ করো"** — চলতে থাকা ভয়েস সাথে সাথে বন্ধ
- **"চ্যাট মুছে দাও"** — চ্যাট ও আগের কথোপকথনের সারাংশ পরিষ্কার
- **"৫ মিনিটের টাইমার দাও"** — অ্যাপ খোলা থাকা অবস্থায় টাইমার (অ্যাপ বন্ধ করে দিলে বাজবে না)
- **"ইউটিউবে ... চালাও"** — YouTube key থাকলে সরাসরি প্রথম ভিডিও

---

## 🤖 Multi-Agent AI System (v2 নতুন)

নিচের ৪টি স্বয়ংক্রিয় AI পাইপলাইন যোগ হয়েছে। **নিচের নেভিগেশন বারে "এজেন্ট" ট্যাপ করো।**

### ১. Content Creation & Publishing (✍️)
| Agent | কাজ |
|-------|-----|
| Planner | Topic বিশ্লেষণ → structured outline |
| Researcher | Facts, stats, examples সংগ্রহ |
| Writer | সম্পূর্ণ draft লেখা |
| Editor | ভুল সংশোধন, quality check |
| Publisher | LinkedIn/Twitter/Facebook versions |

### ২. Code Review & Deployment (⚙️)
| Agent | কাজ |
|-------|-----|
| Analyzer | Code structure বোঝা |
| Bug Finder | Bugs & logic errors চিহ্নিত |
| Security | Vulnerabilities স্ক্যান |
| Performance | Optimization পরামর্শ |
| Deployer | Deployment checklist & verdict |

### ৩. Research & Report Generation (🔬)
| Agent | কাজ |
|-------|-----|
| Query Parser | মূল প্রশ্ন → sub-questions |
| Deep Researcher | প্রতিটি প্রশ্নের উত্তর |
| Fact Checker | তথ্য যাচাই |
| Synthesizer | Key insights বের করা |
| Report Writer | Professional report তৈরি |

### ৪. Customer Support Automation (🎧)
| Agent | কাজ |
|-------|-----|
| Triage | Category, priority, sentiment |
| Knowledge Base | সমাধান খোঁজা |
| Response Crafter | Empathetic message লেখা |
| QA Agent | Quality & tone check |
| Escalation | Follow-up plan & learning |

### Error Handling
- প্রতিটি agent ব্যর্থ হলে **স্বয়ংক্রিয়ভাবে retry** করে
- Retry-তেও ব্যর্থ হলে সেই agent **এড়িয়ে** বাকি চলতে থাকে
- পুনরুদ্ধার হলে ⚠️ চিহ্নে দেখায়

### Self-Improvement
- প্রতিটি রানে 👍/👎 দিলে system শেখে
- পরের রানে আগের সফল প্যাটার্ন ব্যবহার করে
- Learning data: `localStorage → sanju_agent_learning`

### Voice Commands
- "এজেন্ট কন্টেন্ট চালাও" → Content pipeline খোলে
- "এজেন্ট কোড চালাও" → Code Review খোলে
- "এজেন্ট গবেষণা চালাও" → Research pipeline খোলে
- "এজেন্ট সাপোর্ট চালাও" → Customer Support খোলে


## SANJU PLUS — Multi-Agent expansion

এই build-এ Master Orchestrator, Phone/Device, Research/Fact Check, Vision/Media, Files/Knowledge, Automation, Security/Privacy, Data Analyst, Language/Localization এবং System Diagnostics agent systems যোগ করা হয়েছে। Agent output বাস্তব device execution-এর দাবি করবে না যদি native tool সত্যিই execute না করে।

## Build

GitHub Actions `package-lock.json` যাচাই করে `npm ci`, Capacitor Android project generation, native patches এবং debug APK build করে artifact upload করে।

## SANJU Cognitive Core 4.1
Adds resumable task state, risk-aware execution, dependency registry, action journal, recovery/rollback helpers, resource-aware execution mode and preference memory. Call Assistant is optimized with TTS prewarm and zero-delay post-answer greeting.
