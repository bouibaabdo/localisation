import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  Clock,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  Trash2,
  RefreshCw,
  MapPin,
  Radio,
} from 'lucide-react';
import type { LocationRequestData, SupportedLanguage } from '../types';
import { translations } from '../i18n/translations';
import { getRequest, revokeRequest } from '../services/api';
import { MapView } from './MapView';

interface RequestStatusViewProps {
  token: string;
  lang: SupportedLanguage;
  onReset: () => void;
  onOpenRecipientTab: (token: string) => void;
}

export const RequestStatusView: React.FC<RequestStatusViewProps> = ({
  token,
  lang,
  onReset,
  onOpenRecipientTab,
}) => {
  const t = translations[lang];

  const [data, setData] = useState<LocationRequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isRevoking, setIsRevoking] = useState(false);

  // Sharing URL
  const shareUrl = `${window.location.origin}/?token=${token}&role=recipient`;

  // Fetch status polling every 3 seconds while pending
  useEffect(() => {
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const res = await getRequest(token);
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching request:', err);
      }
    };

    fetchStatus();

    const interval = setInterval(() => {
      if (data?.status === 'PENDING' || loading) {
        fetchStatus();
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token, data?.status]);

  // Countdown timer calculation
  useEffect(() => {
    if (!data?.expiresAt) return;

    const updateTimer = () => {
      const remaining = data.expiresAt - Date.now();
      if (remaining <= 0) {
        setTimeLeft('00:00');
        if (data.status === 'PENDING') {
          setData((prev) => (prev ? { ...prev, status: 'EXPIRED' } : null));
        }
        return;
      }

      const minutes = Math.floor(remaining / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      setTimeLeft(
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [data?.expiresAt]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async () => {
    if (!window.confirm(t.revokeConfirm)) return;
    setIsRevoking(true);
    try {
      await revokeRequest(token);
      setData((prev) => (prev ? { ...prev, status: 'REVOKED', locationPoint: null } : null));
    } catch (err) {
      console.error('Revoke failed:', err);
    } finally {
      setIsRevoking(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="text-center py-16 animate-pulse">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Loading request details...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Top Status Card */}
      <div className="card-glass p-6 sm:p-8 rounded-3xl border border-slate-700/60 shadow-2xl bg-slate-900/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>{t.statusTitle}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {t.identityLabel} <strong className="text-slate-200">{data.requesterName}</strong> • {t.purposeLabel} <span className="text-slate-300">{data.purpose}</span>
            </p>
          </div>

          {/* Countdown & Status Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-emerald-400 font-bold">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{timeLeft || '--:--'}</span>
            </div>

            <span
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 ${
                data.status === 'PENDING'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : data.status === 'ACCEPTED'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : data.status === 'REJECTED'
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {data.status === 'PENDING' && <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />}
              {data.status === 'ACCEPTED' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              {data.status === 'REJECTED' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
              <span>
                {data.status === 'PENDING' && t.statusPending}
                {data.status === 'ACCEPTED' && t.statusAccepted}
                {data.status === 'REJECTED' && t.statusRejected}
                {data.status === 'EXPIRED' && t.statusExpired}
                {data.status === 'REVOKED' && t.statusRevoked}
              </span>
            </span>
          </div>
        </div>

        {/* Share Link Section */}
        {data.status === 'PENDING' && (
          <div className="mt-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">{t.linkReadyTitle}</h3>
              <p className="text-xs text-slate-400">{t.linkReadyDesc}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 px-4 py-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 truncate select-all">
                {shareUrl}
              </div>
              <button
                onClick={handleCopy}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? t.copied : t.copyLink}</span>
              </button>
            </div>

            {/* Quick Test Switcher */}
            <div className="pt-2">
              <button
                onClick={() => onOpenRecipientTab(token)}
                className="w-full py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{t.openRecipientView}</span>
              </button>
            </div>
          </div>
        )}

        {/* Location Rendered Section */}
        {data.status === 'ACCEPTED' && data.locationPoint && (
          <div className="mt-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>{t.mapTitle}</span>
              </h3>
              <span className="text-xs text-slate-400">
                {t.accuracy} <strong className="text-white">±{data.locationPoint.accuracy} {t.meters}</strong>
              </span>
            </div>

            {/* Interactive Leaflet Map */}
            <MapView
              location={data.locationPoint}
              isMock={data.isMockMode}
              requesterName={data.requesterName}
              lang={lang}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-400">
              <div>
                <span>{t.capturedAt} </span>
                <span className="text-slate-300 font-mono">
                  {new Date(data.locationPoint.capturedAt).toLocaleTimeString()}
                </span>
              </div>

              {/* Revoke button */}
              <button
                onClick={handleRevoke}
                disabled={isRevoking}
                className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.btnRevoke}</span>
              </button>
            </div>
          </div>
        )}

        {/* Rejected Notice */}
        {data.status === 'REJECTED' && (
          <div className="mt-6 p-4 rounded-2xl bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-3">
            <XCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <div>
              <p className="font-bold">{t.statusRejected}</p>
              <p className="text-[11px] text-rose-200/70 mt-0.5">
                {lang === 'ar'
                  ? 'المستلم مارس حقه في الخصوصية ورفض مشاركة موقعه. لم يتم تسجيل أي بيانات.'
                  : 'Le destinataire a exercé son droit de refus. Aucune donnée n’a été transmise.'}
              </p>
            </div>
          </div>
        )}

        {/* Revoked Notice */}
        {data.status === 'REVOKED' && (
          <div className="mt-6 p-4 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-300 text-xs flex items-center gap-3">
            <Trash2 className="w-5 h-5 flex-shrink-0 text-slate-400" />
            <div>
              <p className="font-bold text-white">{t.statusRevoked}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {lang === 'ar'
                  ? 'تم مسح الإحداثيات من الذاكرة وقاعدة البيانات نهائياً ولم تعد قابلة للاسترجاع.'
                  : 'Les coordonnées ont été effacées définitivement de la mémoire du serveur.'}
              </p>
            </div>
          </div>
        )}

        {/* Expired Notice */}
        {data.status === 'EXPIRED' && (
          <div className="mt-6 p-4 rounded-2xl bg-amber-950/20 border border-amber-700/40 text-amber-300 text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
            <div>
              <p className="font-bold">{t.statusExpired}</p>
              <p className="text-[11px] text-amber-200/70 mt-0.5">
                {lang === 'ar'
                  ? 'انقضت المدة المحددة للطلب وتم إغلاقه تلقائياً لمنع أي وصول لاحق.'
                  : 'La fenêtre de validité a expiré et le lien est désormais inactif.'}
              </p>
            </div>
          </div>
        )}

        {/* New Request Button */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end">
          <button
            onClick={onReset}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
          >
            {t.navCreate}
          </button>
        </div>
      </div>
    </div>
  );
};
