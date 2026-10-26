import React from 'react';
import { ShieldCheck, Globe, Info } from 'lucide-react';
import type { SupportedLanguage } from '../types';
import { translations } from '../i18n/translations';

interface HeaderProps {
  lang: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onOpenPrivacyModal: () => void;
  activeRole: 'requester' | 'recipient';
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onLanguageChange,
  onOpenPrivacyModal,
  activeRole,
}) => {
  const t = translations[lang];

  return (
    <header className="header-glass sticky top-0 z-40 border-b border-slate-700/60 backdrop-blur-xl bg-slate-900/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-bold">
            <ShieldCheck className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1">
                Trust<span className="text-emerald-400">Locate</span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Ethical & Open
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {activeRole === 'requester' ? t.requesterBadge : t.recipientBadge}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Transparency info modal trigger */}
          <button
            onClick={onOpenPrivacyModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition-all"
            title={t.navAbout}
          >
            <Info className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">{t.navAbout}</span>
          </button>

          {/* Language Switcher */}
          <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-lg p-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
            <button
              onClick={() => onLanguageChange('ar')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                lang === 'ar'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              العربية
            </button>
            <button
              onClick={() => onLanguageChange('fr')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                lang === 'fr'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              FR
            </button>
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                lang === 'en'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
