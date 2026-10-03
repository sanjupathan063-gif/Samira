import { VoiceAnalysisData, Language } from '../types';
import { playListenChime, playSuccessChime } from './audioFeedback';

// Web Speech API Types
type SpeechRecognitionType = any;

class VoiceAssistantService {
  private recognition: SpeechRecognitionType | null = null;
  private isListening = false;
  private continuousMode = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private onResultCallback: ((transcript: string, isFinal: boolean) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStateChangeCallback: ((listening: boolean) => void) | null = null;
  private preferredLanguage: Language = 'bn';

  constructor() {
    this.initSpeechRecognition();
  }

  private initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition is not supported on this browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.preferredLanguage === 'bn' ? 'bn-BD' : 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStateChangeCallback?.(true);
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeText = finalTranscript || interimTranscript;
      if (activeText.trim()) {
        this.onResultCallback?.(activeText.trim(), Boolean(finalTranscript));
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return;
      console.warn('Speech recognition error:', event.error);
      this.onErrorCallback?.(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onStateChangeCallback?.(false);
      // Restart if continuous background mode is enabled
      if (this.continuousMode) {
        setTimeout(() => {
          if (this.continuousMode && !this.isListening) {
            try {
              this.recognition?.start();
            } catch {
              // ignore duplicate start attempts
            }
          }
        }, 300);
      }
    };
  }

  public setLanguage(lang: Language) {
    this.preferredLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
    }
  }

  public async startListening(continuous = false): Promise<boolean> {
    this.continuousMode = continuous;

    try {
      // 1. Initialize audio visualizer analyzer stream
      await this.initAudioStream();

      // 2. Play acoustic chime for voice trigger
      playListenChime();

      // 3. Start speech recognition engine
      if (!this.recognition) {
        this.initSpeechRecognition();
      }

      if (this.recognition && !this.isListening) {
        try {
          this.recognition.start();
        } catch {
          // already started
        }
      }

      return true;
    } catch (err: any) {
      console.error('Failed to start listening:', err);
      this.onErrorCallback?.(err.message || 'মাইক্রোফোনের অনুমতি পাওয়া যায়নি');
      return false;
    }
  }

  public stopListening() {
    this.continuousMode = false;
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
    this.isListening = false;
    this.onStateChangeCallback?.(false);
  }

  public async initAudioStream(): Promise<void> {
    if (this.mediaStream && this.analyser) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.mediaStream = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      source.connect(this.analyser);
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
    } catch (err) {
      console.warn('Microphone stream access error:', err);
    }
  }

  public getAudioFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.dataArray) return null;
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  public getAudioVolume(): number {
    const data = this.getAudioFrequencyData();
    if (!data) return 0;
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return Math.min(100, Math.round(sum / data.length));
  }

  public onResult(callback: (transcript: string, isFinal: boolean) => void) {
    this.onResultCallback = callback;
  }

  public onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  public onStateChange(callback: (listening: boolean) => void) {
    this.onStateChangeCallback = callback;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Immediate Text-to-Speech response (বাংলা এবং English)
   */
  private selectedVoiceURI: string | null = localStorage.getItem('sanju_female_voice_uri_v1');
  private voiceList(): SpeechSynthesisVoice[] {
    return ('speechSynthesis' in window) ? window.speechSynthesis.getVoices() : [];
  }

  /** Select and persist a feminine-sounding installed voice when available. */
  public getFemaleVoiceName(lang: Language = 'bn'): string {
    const voices = this.voiceList();
    const saved = this.selectedVoiceURI && voices.find(v => v.voiceURI === this.selectedVoiceURI);
    if (saved) return saved.name;
    const langPrefix = lang === 'bn' ? 'bn' : 'en';
    const matching = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
    const femaleHints = /female|woman|zira|samantha|aria|jenny|sara|susan|google.*(বাংলা|bangla|bengali)|heera|priya|aditi|neerja/i;
    const chosen = matching.find(v => femaleHints.test(v.name)) || matching.find(v => !/male|david|mark|daniel/i.test(v.name)) || matching[0];
    if (chosen) {
      this.selectedVoiceURI = chosen.voiceURI;
      try { localStorage.setItem('sanju_female_voice_uri_v1', chosen.voiceURI); } catch {}
      return chosen.name;
    }
    return lang === 'bn' ? 'System Bengali voice (female if installed)' : 'System English voice (female if installed)';
  }

  public speak(text: string, lang: Language = 'bn'): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window) || !text.trim()) { resolve(); return; }
      const synth = window.speechSynthesis;
      synth.cancel();
      const speakNow = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = this.voiceList();
        const saved = this.selectedVoiceURI && voices.find(v => v.voiceURI === this.selectedVoiceURI);
        const langPrefix = lang === 'bn' ? 'bn' : 'en';
        const matching = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
        const femaleHints = /female|woman|zira|samantha|aria|jenny|sara|susan|heera|priya|aditi|neerja/i;
        const chosen = saved || matching.find(v => femaleHints.test(v.name)) || matching.find(v => !/male|david|mark|daniel/i.test(v.name)) || matching[0];
        if (chosen) {
          utterance.voice = chosen;
          utterance.lang = chosen.lang;
          this.selectedVoiceURI = chosen.voiceURI;
          try { localStorage.setItem('sanju_female_voice_uri_v1', chosen.voiceURI); } catch {}
        } else {
          utterance.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
        }
        utterance.rate = 0.96;
        utterance.pitch = 1.12;
        utterance.volume = 1;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        synth.speak(utterance);
      };
      if (synth.getVoices().length) speakNow();
      else {
        const onVoices = () => { synth.removeEventListener?.('voiceschanged', onVoices); speakNow(); };
        synth.addEventListener?.('voiceschanged', onVoices);
        setTimeout(() => { synth.removeEventListener?.('voiceschanged', onVoices); speakNow(); }, 900);
      }
    });
  }

  /**
   * Analyze voice input with AI (Gemini backend) or Offline Heuristic Engine
   */
  public async processVoiceCommand(
    transcript: string,
    isOnline: boolean,
    lang: Language = 'bn'
  ): Promise<VoiceAnalysisData> {
    // 1. If online, attempt AI Gemini deep analysis from server
    if (isOnline) {
      try {
        const response = await fetch('/api/voice/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript,
            language: lang,
            context: { timestamp: new Date().toISOString() }
          }),
        });

        if (response.ok) {
          const result = await response.json();
          playSuccessChime();
          return {
            transcript,
            detectedLanguage: result.detectedLanguage || lang,
            intent: result.intent || 'QUERY',
            speechResponse: result.speechResponse || `অনুরোধ গৃহীত হয়েছে: ${transcript}`,
            sentiment: result.voiceAnalysis?.sentiment || 'calm',
            urgencyScore: result.voiceAnalysis?.urgencyScore || 4,
            confidenceScore: result.voiceAnalysis?.confidenceScore || 0.95,
            detectedEntities: result.voiceAnalysis?.detectedEntities || [],
            summary: result.voiceAnalysis?.summary || `Voice action processed: ${transcript}`,
            timestamp: new Date().toISOString(),
          };
        }
      } catch (err) {
        console.warn('Backend AI analysis unavailable, falling back to local offline parser:', err);
      }
    }

    // 2. High-speed local offline heuristic analysis
    return this.parseLocally(transcript, lang);
  }

  /**
   * Fast offline regex/NLP parser for instant execution without network
   */
  public parseLocally(transcript: string, lang: Language): VoiceAnalysisData {
    const text = transcript.trim();
    const lower = text.toLowerCase();

    let intent: VoiceAnalysisData['intent'] = 'QUERY';
    let speechResponse = '';
    let sentiment: VoiceAnalysisData['sentiment'] = 'calm';
    let urgencyScore = 3;
    const detectedEntities: string[] = [];

    // Check for urgent tones / distress keywords
    if (lower.includes('জরুরী') || lower.includes('বিপদ') || lower.includes('urgent') || lower.includes('emergency') || lower.includes('help')) {
      urgencyScore = 9;
      sentiment = 'urgent';
    } else if (lower.includes('তাড়াতাড়ি') || lower.includes('quick') || lower.includes('fast') || lower.includes('hurry')) {
      urgencyScore = 7;
      sentiment = 'excited';
    }

    // Call intent
    if (lower.includes('call') || lower.includes('কল') || lower.includes('ফোন') || lower.includes('phone') || lower.includes('dial')) {
      intent = 'CALL';
      // Identify target: mom, dad, emergency, or person name
      let target = 'মা (Mom)';
      if (lower.includes('বাবা') || lower.includes('father') || lower.includes('dad')) {
        target = 'বাবা (Father)';
      } else if (lower.includes('emergency') || lower.includes('জরুরী') || lower.includes('৯৯৯') || lower.includes('999')) {
        target = 'Emergency (জরুরী সেবা)';
      } else if (lower.includes('রহিম') || lower.includes('rahim')) {
        target = 'রহিম (Rahim Tech)';
      } else if (lower.includes('অফিস') || lower.includes('office')) {
        target = 'অফিস টিম (Office)';
      } else if (lower.includes('ডাক্তার') || lower.includes('doctor') || lower.includes('সুমনা')) {
        target = 'ডাঃ সুমনা (Dr. Sumona)';
      } else {
        // extract whatever follows 'call' or 'কল'
        const parts = text.split(/(?:call|কল\s+করো|ফোন\s+দাও|কল)/i);
        if (parts[1]?.trim()) {
          target = parts[1].trim();
        }
      }
      detectedEntities.push(target);
      speechResponse = lang === 'bn'
        ? `${target} কে কল করা হচ্ছে...`
        : `Calling ${target}...`;
    }
    // Note intent
    else if (lower.includes('নোট') || lower.includes('note') || lower.includes('লিখ') || lower.includes('save') || lower.includes('সংরক্ষণ')) {
      intent = 'CREATE_NOTE';
      speechResponse = lang === 'bn'
        ? `নোটটি এনক্রিপ্ট করে সিকিউর ভল্টে সেভ করা হলো।`
        : `Encrypted note safely saved into your secure vault.`;
      detectedEntities.push(text);
    }
    // Vault / Encryption intent
    else if (lower.includes('vault') || lower.includes('ভল্ট') || lower.includes('পাসওয়ার্ড') || lower.includes('লক') || lower.includes('সিক্রেট')) {
      intent = 'ENCRYPT_VAULT';
      speechResponse = lang === 'bn'
        ? `সিকিউর ভল্ট লক এবং AES-256 বিট এনক্রিপ্ট করা রয়েছে।`
        : `Secure vault locked and encrypted with AES-256 GCM.`;
    }
    // Reminder / Notification intent
    else if (lower.includes('মনে করিয়ে') || lower.includes('remind') || lower.includes('নোটিফিকেশন') || lower.includes('alert') || lower.includes('সতর্ক')) {
      intent = 'CREATE_REMINDER';
      speechResponse = lang === 'bn'
        ? `রিমাইন্ডার ও রিয়েল-টাইম নোটিফিকেশন যুক্ত করা হয়েছে।`
        : `Real-time reminder alert scheduled successfully.`;
      detectedEntities.push(text);
    }
    // General query / Assistant greeting
    else {
      intent = 'QUERY';
      if (lower.includes('কেমন আছো') || lower.includes('how are you')) {
        speechResponse = lang === 'bn'
          ? 'আমি চমৎকার আছি! আপনাকে সাহায্য করার জন্য আমি সর্বদা প্রস্তুত।'
          : 'I am doing great! Ready to assist you with calling, vault, or notes.';
      } else if (lower.includes('তুমি কে') || lower.includes('who are you') || lower.includes('নাম')) {
        speechResponse = lang === 'bn'
          ? 'আমি সঞ্জু এআই ভয়েস অ্যান্ড সিকিউর অ্যাসিস্ট্যান্ট। আমি ভয়েস কমান্ড, ফোন কল, অফলাইন সিঙ্ক এবং সুরক্ষিত এনক্রিপশন নিয়ে কাজ করি।'
          : 'I am Sanju AI Voice & Secure Assistant, your smart companion for hands-free calling, AES vault, and offline data sync.';
      } else {
        speechResponse = lang === 'bn'
          ? `আপনার কমান্ড "${text}" গ্রহণ করা হয়েছে।`
          : `Command received: "${text}". Processing completed.`;
      }
    }

    playSuccessChime();

    return {
      transcript: text,
      detectedLanguage: lang,
      intent,
      speechResponse,
      sentiment,
      urgencyScore,
      confidenceScore: 0.91,
      detectedEntities,
      summary: `Offline local parsing: ${text.slice(0, 50)}`,
      timestamp: new Date().toISOString(),
    };
  }
}

export const voiceAssistant = new VoiceAssistantService();
