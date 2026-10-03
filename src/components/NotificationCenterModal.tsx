import React, { useState } from 'react';
import {
  X,
  Bell,
  CheckCheck,
  Trash2,
  Plus,
  Shield,
  PhoneCall,
  Calendar,
  Sparkles,
  AlertCircle,
  Volume2,
} from 'lucide-react';
import { NotificationItem, Language } from '../types';
import { playNotificationAlert } from '../services/audioFeedback';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onAddNotification: (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>) => void;
  language: Language;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearAll,
  onAddNotification,
  language,
}) => {
  const isBn = language === 'bn';
  const [filter, setFilter] = useState<'all' | 'unread' | 'reminder' | 'security'>('all');
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  if (!isOpen) return null;

  const handleRequestNativePermission = async () => {
    if (typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      if (perm === 'granted') {
        new Notification('Sanju Assistant', {
          body: isBn ? 'রিয়েল-টাইম নোটিফিকেশন সক্রিয় হয়েছে!' : 'Real-time notifications enabled!',
          icon: '/favicon.ico',
        });
        playNotificationAlert();
      }
    }
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTitle.trim()) return;

    onAddNotification({
      title: reminderTitle.trim(),
      message: reminderMessage.trim() || (isBn ? 'নির্ধারিত রিমাইন্ডার অ্যালার্ট' : 'Scheduled reminder alert'),
      type: 'reminder',
      priority: 'high',
    });

    playNotificationAlert();
    setReminderTitle('');
    setReminderMessage('');
    setShowAddReminder(false);
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'reminder') return n.type === 'reminder';
    if (filter === 'security') return n.type === 'security';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isBn ? 'রিয়েল-টাইম নোটিফিকেশন সেন্টার' : 'Real-time Notifications'}
              </h2>
              <p className="text-xs text-slate-400">
                {isBn ? 'ইনস্ট্যান্ট অ্যালার্ট ও রিমাইন্ডার' : 'Instant alerts and scheduled reminders'}
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

        {/* Browser Permission Banner if not granted */}
        {browserPermission !== 'granted' && (
          <div className="px-4 py-2.5 bg-indigo-950/40 border-b border-indigo-900/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-indigo-200">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                {isBn ? 'ব্রাউজার পুশ নোটিফিকেশন চালু করবেন?' : 'Enable desktop push notifications?'}
              </span>
            </div>
            <button
              onClick={handleRequestNativePermission}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shrink-0"
            >
              {isBn ? 'অনুমতি দিন' : 'Allow'}
            </button>
          </div>
        )}

        {/* Filter Pills & Actions */}
        <div className="flex items-center justify-between p-3 border-b border-slate-800/80 bg-slate-950/30 gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {(['all', 'unread', 'reminder', 'security'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 rounded-lg capitalize font-medium transition ${
                  filter === tab
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'all' && (isBn ? 'সকল' : 'All')}
                {tab === 'unread' && (isBn ? 'অপঠিত' : 'Unread')}
                {tab === 'reminder' && (isBn ? 'রিমাইন্ডার' : 'Reminders')}
                {tab === 'security' && (isBn ? 'সিকিউরিটি' : 'Security')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowAddReminder(!showAddReminder)}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
              title={isBn ? 'নতুন রিমাইন্ডার যোগ করুন' : 'Add Reminder'}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onMarkAllAsRead}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={isBn ? 'সবগুলো পড়া হয়েছে' : 'Mark all read'}
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClearAll}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
              title={isBn ? 'সব মুছুন' : 'Clear all'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Form to Add Quick Reminder */}
        {showAddReminder && (
          <form
            onSubmit={handleCreateReminder}
            className="p-4 bg-slate-950 border-b border-indigo-500/30 space-y-2.5"
          >
            <h4 className="text-xs font-bold text-amber-300">
              {isBn ? 'নতুন রিয়েল-টাইম রিমাইন্ডার সেট করুন' : 'Set Real-time Reminder Alert'}
            </h4>
            <input
              type="text"
              placeholder={isBn ? 'রিমাইন্ডার শিরোনাম (যেমন: মিটিং কাল সকাল ১০টা)' : 'Reminder title'}
              value={reminderTitle}
              onChange={(e) => setReminderTitle(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              placeholder={isBn ? 'বিস্তারিত বার্তা (ঐচ্ছিক)' : 'Details (optional)'}
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddReminder(false)}
                className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:bg-slate-800"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-1 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
              >
                {isBn ? 'অ্যালার্ট চালু করুন' : 'Schedule Alert'}
              </button>
            </div>
          </form>
        )}

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-10">
              {isBn ? 'কোনো নোটিফিকেশন পাওয়া যায়নি' : 'No notifications'}
            </p>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition ${
                  item.isRead
                    ? 'bg-slate-950/40 border-slate-800/60'
                    : 'bg-slate-950/90 border-slate-700/80 ring-1 ring-indigo-500/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-slate-300 mt-0.5 shrink-0">
                    {item.type === 'call' && <PhoneCall className="w-4 h-4 text-emerald-400" />}
                    {item.type === 'security' && <Shield className="w-4 h-4 text-indigo-400" />}
                    {item.type === 'reminder' && <Calendar className="w-4 h-4 text-amber-400" />}
                    {item.type === 'system' && <AlertCircle className="w-4 h-4 text-cyan-400" />}
                    {item.type === 'sync' && <Sparkles className="w-4 h-4 text-purple-400" />}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs sm:text-sm font-semibold text-white">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
