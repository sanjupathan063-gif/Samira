import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  PhoneCall,
  Lock,
  Calendar,
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { voiceAssistant } from '../services/voiceAssistant';
import { VoiceAnalysisData, Language } from '../types';

interface VoiceCommanderProps {
  isListening: boolean;
  onToggleMic: (continuous?: boolean) => void;
  language: Language;
  onExecuteCall: (target: string) => void;
  onOpenVault: () => void;
  onOpenAnalysis: (data: VoiceAnalysisData) => void;
  lastAnalysis: VoiceAnalysisData | null;
  isOnline: boolean;
}

export const VoiceCommander: React.FC<VoiceCommanderProps> = ({
  isListening,
  onToggleMic,
  language,
  onExecuteCall,
  onOpenVault,
  onOpenAnalysis,
  lastAnalysis,
  isOnline,
}) => {
  const isBn = language === 'bn';
  const [continuousMic, setContinuousMic] = useState<boolean>(true);
  const [visualizerBars, setVisualizerBars] = useState<number[]>([15, 25, 40, 60, 30, 70, 45, 20]);
  const animationFrameRef = useRef<number | null>(null);

  // Animate audio waveform bars when listening
  useEffect(() => {
    if (!isListening) {
      setVisualizerBars([10, 15, 12, 18, 14, 20, 15, 10]);
      return;
    }

    const updateBars = () => {
      const data = voiceAssistant.getAudioFrequencyData();
      if (data && data.length > 0) {
        // Sample 8 distinct frequency bins
        const sampled: number[] = [];
        const step = Math.max(1, Math.floor(data.length / 8));
        for (let i = 0; i < 8; i++) {
          const val = data[i * step] || 10;
          sampled.push(Math.max(12, Math.min(95, Math.round((val / 255) * 100))));
        }
        setVisualizerBars(sampled);
      } else {
        // Dynamic simulated wave if direct buffer is buffering
        setVisualizerBars(prev =>
          prev.map(() => Math.floor(Math.random() * 65) + 20)
        );
      }
      animationFrameRef.current = requestAnimationFrame(updateBars);
    };

    animationFrameRef.current = requestAnimationFrame(updateBars);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isListening]);

  // Voice shortcut suggestions
  const suggestions = isBn
    ? [
        { label: 'মা-কে কল করো', cmd: 'মা কে কল করো', icon: PhoneCall, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
        { label: 'জরুরী ৯৯৯ কল', cmd: 'জরুরী ৯৯৯ কল করো', icon: PhoneCall, color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
        { label: 'ভল্ট সিক্রেট পাসওয়ার্ড', cmd: 'ভল্ট লক ও এনক্রিপ্ট করো', icon: Lock, color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' },
        { label: 'রিমাইন্ডার সেট করো', cmd: 'কাল সকাল ৯টায় মিটিং এর নোটিফিকেশন দাও', icon: Calendar, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
      ]
    : [
        { label: 'Call Mom', cmd: 'Call Mom now', icon: PhoneCall, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
        { label: 'Call Emergency 999', cmd: 'Call 999 emergency services', icon: PhoneCall, color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
        { label: 'Lock Secure Vault', cmd: 'Lock vault and encrypt secret note', icon: Lock, color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' },
        { label: 'Set Reminder', cmd: 'Remind me of meeting tomorrow at 9 AM', icon: Calendar, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
      ];

  const handleSimulateCommand = (cmd: string) => {
    // Process text command directly
    voiceAssistant.processVoiceCommand(cmd, isOnline, language).then((analysis) => {
      voiceAssistant.speak(analysis.speechResponse, language);
      if (analysis.intent === 'CALL') {
        const target = analysis.detectedEntities[0] || 'মা (Mom)';
        onExecuteCall(target);
      } else if (analysis.intent === 'ENCRYPT_VAULT') {
        onOpenVault();
      }
    });
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800 p-5 sm:p-8 shadow-2xl backdrop-blur-xl">
      {/* Background radial glow */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner: Mode & Mic state */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {isBn ? 'ইনস্ট্যান্ট ভয়েস ইন্টারফেস' : 'Instant Voice Interface'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>AES-256</span>
          </div>
        </div>

        {/* Continuous listening toggle */}
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 transition">
          <input
            type="checkbox"
            checked={continuousMic}
            onChange={(e) => setContinuousMic(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer"
          />
          <span>{isBn ? 'ব্যাকগ্রাউন্ডে সক্রিয় মাইক' : 'Background Mic Listening'}</span>
        </label>
      </div>

      {/* Center Voice Orb & Waveform */}
      <div className="flex flex-col items-center justify-center my-4 sm:my-6">
        <div className="relative flex items-center justify-center">
          {/* Animated concentric ripples when active */}
          {isListening && (
            <>
              <div className="absolute w-44 h-44 rounded-full bg-indigo-500/15 animate-ping duration-1000" />
              <div className="absolute w-36 h-36 rounded-full bg-cyan-500/20 animate-pulse duration-700" />
            </>
          )}

          {/* Core Interactive Mic Button */}
          <button
            onClick={() => onToggleMic(continuousMic)}
            className={`relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl ${
              isListening
                ? 'bg-gradient-to-tr from-rose-500 via-indigo-600 to-cyan-400 text-white shadow-rose-500/40 scale-105 ring-4 ring-rose-400/40'
                : 'bg-gradient-to-tr from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-indigo-600/40 hover:scale-105 ring-2 ring-indigo-500/30'
            }`}
            title={isBn ? 'কথা বলতে ট্যাপ করুন' : 'Tap to speak'}
          >
            {isListening ? (
              <>
                <Mic className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1">
                  {isBn ? 'শুনছি...' : 'Listening'}
                </span>
              </>
            ) : (
              <>
                <MicOff className="w-8 h-8 sm:w-10 sm:h-10 text-slate-200" />
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1">
                  {isBn ? 'কথা বলুন' : 'Speak'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Real-time Frequency Waveform Visualizer */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 h-12 mt-6">
          {visualizerBars.map((height, idx) => (
            <div
              key={idx}
              className={`w-1.5 sm:w-2 rounded-full transition-all duration-75 ${
                isListening
                  ? 'bg-gradient-to-t from-indigo-500 to-cyan-400'
                  : 'bg-slate-800'
              }`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>

        <p className="text-xs sm:text-sm font-medium text-slate-400 mt-2 text-center">
          {isListening
            ? (isBn ? 'স্পষ্ট করে বলুন: "মাকে কল করো" অথবা "জরুরী ৯৯৯ কল"' : 'Say clearly: "Call Mom", "Call 999", or "Save note"')
            : (isBn ? 'কথা বলতে মাঝের মাইক বাটনে চাপ দিন' : 'Tap the microphone button to give voice command')}
        </p>
      </div>

      {/* Spoken Transcript & Immediate AI Response Card */}
      {lastAnalysis && (
        <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-inner">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {isBn ? 'আপনার ভয়েস ইনপুট:' : 'Spoken Voice:'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {lastAnalysis.intent}
                </span>
              </div>
              <p className="text-base sm:text-lg font-semibold text-white tracking-wide">
                &ldquo;{lastAnalysis.transcript}&rdquo;
              </p>
            </div>

            {/* AI voice response replay */}
            <button
              onClick={() => voiceAssistant.speak(lastAnalysis.speechResponse, language)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition"
              title={isBn ? 'আবার শুনুন' : 'Replay Voice Response'}
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* AI Response Text */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-cyan-200/90 leading-relaxed font-medium">
                {lastAnalysis.speechResponse}
              </p>

              {/* Action shortcut if CALL or VAULT detected */}
              <div className="flex items-center gap-2 mt-3">
                {lastAnalysis.intent === 'CALL' && (
                  <button
                    onClick={() => {
                      const target = lastAnalysis.detectedEntities[0] || 'মা (Mom)';
                      onExecuteCall(target);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/30 transition"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>{isBn ? 'এখনই কল করুন' : 'Initiate Call'}</span>
                  </button>
                )}

                {lastAnalysis.intent === 'ENCRYPT_VAULT' && (
                  <button
                    onClick={onOpenVault}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isBn ? 'সিকিউর ভল্ট খুলুন' : 'Open Vault'}</span>
                  </button>
                )}

                {/* View AI sentiment breakdown */}
                <button
                  onClick={() => onOpenAnalysis(lastAnalysis)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 transition ml-auto"
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isBn ? 'এআই অ্যানালাইসিস' : 'Voice Insights'}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Voice Command Chips */}
      <div className="mt-6 pt-5 border-t border-slate-800/80">
        <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
          {isBn ? 'দ্রুত ভয়েস সাজেশন (ক্লিক বা মুখে বলুন):' : 'Quick Voice Shortcuts (Tap or Speak):'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          {suggestions.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSimulateCommand(item.cmd)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-medium transition hover:scale-102 ${item.color}`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
