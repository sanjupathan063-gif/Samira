import React from 'react';
import {
  X,
  Activity,
  Heart,
  Zap,
  Gauge,
  Sparkles,
  Tag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Smile,
  ShieldAlert,
} from 'lucide-react';
import { VoiceAnalysisData, Language } from '../types';

interface VoiceAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: VoiceAnalysisData | null;
  history: VoiceAnalysisData[];
  language: Language;
}

export const VoiceAnalysisModal: React.FC<VoiceAnalysisModalProps> = ({
  isOpen,
  onClose,
  data,
  history,
  language,
}) => {
  const isBn = language === 'bn';
  if (!isOpen) return null;

  const current = data || history[0] || null;

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'urgent':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'excited':
      case 'happy':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'calm':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      default:
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isBn ? 'এআই ভয়েস ও মুড অ্যানালাইসিস' : 'AI Voice & Sentiment Analysis'}
              </h2>
              <p className="text-xs text-slate-400">
                {isBn ? 'ভয়েস ইনপুট থেকে ভাবাবেগ, তাৎক্ষণিকতা ও ইনটেন্ট বিশ্লেষণ' : 'Real-time tone, urgency, and semantic detection'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {!current ? (
            <p className="text-center text-xs text-slate-500 py-10">
              {isBn ? 'এখনো কোনো ভয়েস কমান্ড অ্যানালাইজ করা হয়নি' : 'No voice analysis available yet'}
            </p>
          ) : (
            <>
              {/* Spoken Transcript card */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isBn ? 'বিশ্লেষিত ভয়েস ইনপুট' : 'Analyzed Spoken Input'}
                </span>
                <p className="text-base sm:text-lg font-semibold text-white">
                  &ldquo;{current.transcript}&rdquo;
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-400">
                    {isBn ? 'শনাক্ত ভাষা:' : 'Detected Language:'}
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-300 uppercase px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                    {current.detectedLanguage}
                  </span>
                </div>
              </div>

              {/* Metrics Grid: Sentiment, Urgency, Confidence */}
              <div className="grid grid-cols-3 gap-3">
                {/* Sentiment */}
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                  <div className="flex items-center justify-center text-amber-400">
                    <Smile className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">
                    {isBn ? 'মুড / ভাব' : 'Sentiment'}
                  </p>
                  <span className={`inline-block text-xs font-bold uppercase px-2 py-0.5 rounded-full border ${getSentimentColor(current.sentiment)}`}>
                    {current.sentiment}
                  </span>
                </div>

                {/* Urgency */}
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                  <div className="flex items-center justify-center text-rose-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">
                    {isBn ? 'জরুরী মাত্রা' : 'Urgency'}
                  </p>
                  <p className="text-base font-extrabold text-white">
                    {current.urgencyScore} <span className="text-xs font-normal text-slate-500">/ 10</span>
                  </p>
                </div>

                {/* Confidence */}
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                  <div className="flex items-center justify-center text-cyan-400">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">
                    {isBn ? 'নির্ভুলতা' : 'Confidence'}
                  </p>
                  <p className="text-base font-extrabold text-cyan-300">
                    {Math.round(current.confidenceScore * 100)}%
                  </p>
                </div>
              </div>

              {/* Detected Entities & Actions */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isBn ? 'চিহ্নিত তথ্য ও ইনটেন্ট (Entities & Intent)' : 'Entities & Intent'}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    INTENT: {current.intent}
                  </span>
                  {current.detectedEntities.map((ent, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700"
                    >
                      {ent}
                    </span>
                  ))}
                </div>
              </div>

              {/* Analytical Summary */}
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>{isBn ? 'এআই সারাংশ' : 'AI Analytical Summary'}</span>
                </div>
                <p className="text-xs text-cyan-100/90 leading-relaxed font-medium">
                  {current.summary}
                </p>
              </div>

              {/* Voice History Log */}
              {history.length > 1 && (
                <div className="space-y-2 pt-3 border-t border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {isBn ? 'পূর্ববর্তী ভয়েস হিস্ট্রি' : 'Voice History Log'}
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {history.slice(1, 6).map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-200 truncate max-w-[200px]">
                          &ldquo;{item.transcript}&rdquo;
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getSentimentColor(item.sentiment)}`}>
                          {item.intent}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
