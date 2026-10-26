import React, { useState } from 'react';
import { Send, Shield, Clock, User, FileText, Sparkles, AlertCircle } from 'lucide-react';
import type { SupportedLanguage } from '../types';
import { translations } from '../i18n/translations';
import { createRequest } from '../services/api';

interface CreateRequestViewProps {
  lang: SupportedLanguage;
  onRequestCreated: (token: string) => void;
}

export const CreateRequestView: React.FC<CreateRequestViewProps> = ({ lang, onRequestCreated }) => {
  const t = translations[lang];

  const [requesterName, setRequesterName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [isMockMode, setIsMockMode] = useState(false); // Default to Real Data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createRequest({
        requesterName: requesterName.trim() || (lang === 'ar' ? 'طالب المشاركة' : 'Demandeur'),
        purpose: purpose.trim() || (lang === 'ar' ? 'تنسيق اللقاء' : 'Coordination de rendez-vous'),
        durationMinutes,
        isMockMode,
      });
      onRequestCreated(result.token);
    } catch (err: any) {
      setError(err.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="card-glass p-6 sm:p-8 rounded-3xl border border-slate-700/60 shadow-2xl bg-slate-900/90">
        {/* Title & Description */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4 shadow-inner">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">
            {t.createTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            {t.createDesc}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Requester Name Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.labelRequesterName}</span>
            </label>
            <input
              type="text"
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              placeholder={t.placeholderRequesterName}
              maxLength={60}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Purpose Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              <span>{t.labelPurpose}</span>
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder={t.placeholderPurpose}
              maxLength={120}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Duration Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.labelDuration}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { min: 5, label: t.duration5m },
                { min: 15, label: t.duration15m },
                { min: 30, label: t.duration30m },
                { min: 60, label: t.duration1h },
                { min: 120, label: t.duration2h },
              ].map((item) => (
                <button
                  type="button"
                  key={item.min}
                  onClick={() => setDurationMinutes(item.min)}
                  className={`py-2 px-3 text-xs rounded-xl border transition-all text-center font-medium ${
                    durationMinutes === item.min
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                      : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mock Mode Toggle */}
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-600/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-300 mb-1">
                    {t.mockModeTitle}
                  </h4>
                  <p className="text-[11px] text-amber-200/70 leading-relaxed">
                    {t.mockModeDesc}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={isMockMode}
                  onChange={(e) => setIsMockMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>{t.generating}</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{t.btnGenerate}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
