import React from 'react';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, Lock, EyeOff, Radio } from 'lucide-react';
import type { SupportedLanguage } from '../types';
import { translations } from '../i18n/translations';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: SupportedLanguage;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;
  const t = translations[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 rtl:left-auto rtl:right-5 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{t.whyEthicalTitle}</h3>
            <p className="text-xs text-slate-400">{t.ethicalComparisonTitle}</p>
          </div>
        </div>

        {/* Comparison Cards */}
        <div className="space-y-4 mb-6">
          {/* Deceptive commercial portals */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{t.scamRowTitle}</span>
            </div>
            <p className="text-xs text-rose-200/80 leading-relaxed">
              {t.scamRowDesc}
            </p>
          </div>

          {/* TrustLocate model */}
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-700/40 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{t.ourRowTitle}</span>
            </div>
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              {t.ourRowDesc}
            </p>
          </div>
        </div>

        {/* Principles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 text-center">
            <Radio className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
            <h4 className="text-xs font-bold text-white mb-1">
              {lang === 'ar' ? 'نقطة واحدة فقط' : lang === 'fr' ? 'Point Unique' : 'Single Point'}
            </h4>
            <p className="text-[11px] text-slate-400">
              {lang === 'ar' ? 'لا يوجد تتبع مستمر' : lang === 'fr' ? 'Pas de suivi continu' : 'No continuous tracking'}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 text-center">
            <EyeOff className="w-5 h-5 text-teal-400 mx-auto mb-1.5" />
            <h4 className="text-xs font-bold text-white mb-1">
              {lang === 'ar' ? 'حذف فوري' : lang === 'fr' ? 'Suppression Directe' : 'Instant Purge'}
            </h4>
            <p className="text-[11px] text-slate-400">
              {lang === 'ar' ? 'مسح الإحداثيات بضغطة زر' : lang === 'fr' ? 'Effacement immédiat' : '1-click coordinate wipe'}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 text-center">
            <Lock className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
            <h4 className="text-xs font-bold text-white mb-1">
              {lang === 'ar' ? 'صلاحية محدودة' : lang === 'fr' ? 'Expiration Auto' : 'Auto-Expiration'}
            </h4>
            <p className="text-[11px] text-slate-400">
              {lang === 'ar' ? 'انتهاء تلقائي للرابط' : lang === 'fr' ? 'Lien à durée limitée' : 'Token auto-expires'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm rounded-xl transition-all"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
};
