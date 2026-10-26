import { useState, useEffect } from 'react';
import type { SupportedLanguage } from './types';
import { translations } from './i18n/translations';
import { Header } from './components/Header';
import { CreateRequestView } from './components/CreateRequestView';
import { RequestStatusView } from './components/RequestStatusView';
import { RecipientConsentView } from './components/RecipientConsentView';
import { PrivacyModal } from './components/PrivacyModal';
import { ShieldCheck, HeartHandshake, EyeOff, Radio } from 'lucide-react';

export function App() {
  const [lang, setLang] = useState<SupportedLanguage>('ar');
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<'requester' | 'recipient'>('requester');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // Sync RTL direction and html lang tag
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Check URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    const roleParam = params.get('role');
    const langParam = params.get('lang') as SupportedLanguage;

    if (langParam && ['ar', 'fr', 'en'].includes(langParam)) {
      setLang(langParam);
    }

    if (tokenParam) {
      setActiveToken(tokenParam);
      if (roleParam === 'recipient') {
        setActiveRole('recipient');
      } else {
        setActiveRole('requester');
      }
    }
  }, []);

  const handleRequestCreated = (token: string) => {
    setActiveToken(token);
    setActiveRole('requester');
    // Update URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.set('token', token);
    url.searchParams.set('role', 'requester');
    window.history.pushState({}, '', url.toString());
  };

  const handleOpenRecipientTab = (token: string) => {
    setActiveRole('recipient');
    const url = new URL(window.location.href);
    url.searchParams.set('token', token);
    url.searchParams.set('role', 'recipient');
    window.history.pushState({}, '', url.toString());
  };

  const handleGoToRequesterView = () => {
    setActiveRole('requester');
    const url = new URL(window.location.href);
    if (activeToken) {
      url.searchParams.set('token', activeToken);
      url.searchParams.set('role', 'requester');
    } else {
      url.searchParams.delete('token');
      url.searchParams.delete('role');
    }
    window.history.pushState({}, '', url.toString());
  };

  const handleReset = () => {
    setActiveToken(null);
    setActiveRole('requester');
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    url.searchParams.delete('role');
    window.history.pushState({}, '', url.toString());
  };

  const t = translations[lang];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navigation */}
      <Header
        lang={lang}
        onLanguageChange={setLang}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
        activeRole={activeRole}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Role Switcher Pill if token exists */}
        {activeToken && (
          <div className="flex justify-center mb-6">
            <div className="inline-flex p-1 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <button
                onClick={handleGoToRequesterView}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeRole === 'requester'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.requesterBadge}
              </button>
              <button
                onClick={() => handleOpenRecipientTab(activeToken)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeRole === 'recipient'
                    ? 'bg-teal-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.recipientBadge}
              </button>
            </div>
          </div>
        )}

        {/* View Router */}
        {!activeToken ? (
          <CreateRequestView lang={lang} onRequestCreated={handleRequestCreated} />
        ) : activeRole === 'recipient' ? (
          <RecipientConsentView
            token={activeToken}
            lang={lang}
            onGoToRequesterView={handleReset}
          />
        ) : (
          <RequestStatusView
            token={activeToken}
            lang={lang}
            onReset={handleReset}
            onOpenRecipientTab={handleOpenRecipientTab}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-300">TrustLocate</span>
            <span>• {t.appSubtitle}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              {lang === 'ar' ? 'نقطة واحدة' : 'Point Unique'}
            </span>
            <span className="flex items-center gap-1">
              <HeartHandshake className="w-3.5 h-3.5 text-teal-400" />
              {lang === 'ar' ? 'موافقة صريحة' : 'Consentement Mutuel'}
            </span>
            <span className="flex items-center gap-1">
              <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
              {lang === 'ar' ? 'صفر تتبع خفي' : 'Zéro Pistage'}
            </span>
          </div>
        </div>
      </footer>

      {/* Ethics & Privacy Modal */}
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}

export default App;
