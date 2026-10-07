‎import React, { useState, useEffect } from 'react';
‎import { FiMoreVertical, FiKey, FiCpu, FiTrash2, FiX } from 'react-icons/fi';
‎
‎export const Header: React.FC = () => {
‎  const [showMenu, setShowMenu] = useState(false);
‎  const [showSettings, setShowSettings] = useState(false);
‎  const [groqApiKey, setGroqApiKey] = useState('');
‎  const [openaiApiKey, setOpenaiApiKey] = useState('');
‎
‎  useEffect(() => {
‎    // আগের সেভ করা API Key লোড করা
‎    setGroqApiKey(localStorage.getItem('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') || '');
‎    setOpenaiApiKey(localStorage.getItem('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') || '');
‎  }, []);
‎
‎  const saveSettings = () => {
‎    localStorage.setItem('GROQ_API_KEY', groqApiKey);
‎    localStorage.setItem('OPENAI_API_KEY', openaiApiKey);
‎    setShowSettings(false);
‎    setShowMenu(false);
‎    alert('সেটিংস সফলভাবে সেভ হয়েছে!');
‎  };
‎
‎  const clearChatHistory = () => {
‎    localStorage.removeItem('chat_history');
‎    window.location.reload();
‎  };
‎
‎  return (
‎    <header className="flex justify-between items-center p-4 bg-slate-900 text-white relative border-b border-slate-800">
‎      <div className="flex items-center gap-2">
‎        <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></div>
‎        <h1 className="font-bold text-lg tracking-wider">SANJU 3.0</h1>
‎      </div>
‎
‎      {/* ৩-ডট বাটন */}
‎      <button 
‎        onClick={() => setShowMenu(!showMenu)} 
‎        className="p-2 hover:bg-slate-800 rounded-full transition-colors"
‎      >
‎        <FiMoreVertical size={22} />
‎      </button>
‎
‎      {/* ডাইনামিক ড্রপডাউন মেনু */}
‎      {showMenu && (
‎        <div className="absolute right-4 top-14 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 w-52 overflow-hidden">
‎          <button 
‎            onClick={() => setShowSettings(true)}
‎            className="flex items-center gap-3 w-full p-3 text-left hover:bg-slate-700 text-sm text-gray-200"
‎          >
‎            <FiKey className="text-cyan-400" /> API Keys ও সেটিংস
‎          </button>
‎          <button 
‎            onClick={clearChatHistory}
‎            className="flex items-center gap-3 w-full p-3 text-left hover:bg-slate-700 text-sm text-rose-400"
‎          >
‎            <FiTrash2 /> চ্যাট ক্লিয়ার করুন
‎          </button>
‎        </div>
‎      )}
‎
‎      {/* API Key ও সেটিং পপআপ মোডাল */}
‎      {showSettings && (
‎        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
‎          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
‎            <button 
‎              onClick={() => setShowSettings(false)}
‎              className="absolute right-4 top-4 text-gray-400 hover:text-white"
‎            >
‎              <FiX size={20} />
‎            </button>
‎
‎            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-cyan-400">
‎              <FiCpu /> অ্যাপ সেটিংস
‎            </h2>
‎
‎            <div className="space-y-4">
‎              <div>
‎                <label className="block text-xs font-semibold text-gray-400 mb-1">GROQ API KEY</label>
‎                <input 
‎                  type="password"
‎                  value={groqApiKey}
‎                  onChange={(e) => setGroqApiKey(e.target.value)}
‎                  placeholder="gsk_..."
‎                  className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400"
‎                />
‎              </div>
‎
‎              <div>
‎                <label className="block text-xs font-semibold text-gray-400 mb-1">OPENAI API KEY (Optional)</label>
‎                <input 
‎                  type="password"
‎                  value={openaiApiKey}
‎                  onChange={(e) => setOpenaiApiKey(e.target.value)}
‎                  placeholder="sk-..."
‎                  className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400"
‎                />
‎              </div>
‎
‎              <button 
‎                onClick={saveSettings}
‎                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-bold text-white shadow-lg hover:opacity-90 transition-opacity"
‎              >
‎                সেভ করুন
‎              </button>
‎            </div>
‎          </div>
‎        </div>
‎      )}
‎    </header>
‎  );
‎};
