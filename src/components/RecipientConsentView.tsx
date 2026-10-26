import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  AlertTriangle,
  Lock,
  Trash2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { LocationPoint, LocationRequestData, SupportedLanguage } from '../types';
import { translations } from '../i18n/translations';
import { getRequest, submitConsent, revokeRequest } from '../services/api';
import { reverseGeocode } from '../services/geocoding';
import { MapView } from './MapView';

interface RecipientConsentViewProps {
  token: string;
  lang: SupportedLanguage;
  onGoToRequesterView: () => void;
}

export const RecipientConsentView: React.FC<RecipientConsentViewProps> = ({
  token,
  lang,
  onGoToRequesterView,
}) => {
  const t = translations[lang];

  const [data, setData] = useState<LocationRequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Fetch request data
  useEffect(() => {
    let isMounted = true;
    const fetchReq = async () => {
      try {
        const res = await getRequest(token);
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Request not found or expired');
          setLoading(false);
        }
      }
    };
    fetchReq();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Countdown timer
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

  // Handle Decline (Zero location query!)
  const handleDecline = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await submitConsent(token, 'DECLINE');
      setData((prev) => (prev ? { ...prev, status: 'REJECTED' } : null));
    } catch (err: any) {
      setError(err.message || 'Failed to submit decline decision');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Accept
  const handleAccept = async () => {
    setSubmitting(true);
    setError(null);

    // If Mock Mode is enabled, generate realistic coordinates
    if (data?.isMockMode) {
      setTimeout(async () => {
        // Sample realistic city coordinates: Paris or Casablanca
        const mockLocation: LocationPoint = {
          lat: 48.8566 + (Math.random() - 0.5) * 0.01,
          lng: 2.3522 + (Math.random() - 0.5) * 0.01,
          accuracy: 15,
          capturedAt: Date.now(),
        };

        try {
          await submitConsent(token, 'ACCEPT', mockLocation);
          setData((prev) =>
            prev ? { ...prev, status: 'ACCEPTED', locationPoint: mockLocation } : null
          );
        } catch (err: any) {
          setError(err.message || 'Error saving mock location');
        } finally {
          setSubmitting(false);
        }
      }, 700);
      return;
    }

    // Live Geolocation API mode (Only after explicit button click!)
    if (!navigator.geolocation) {
      setError(
        lang === 'ar'
          ? 'المتصفح لا يدعم واجهة تحديد الموقع Geolocation.'
          : 'La géolocalisation n’est pas supportée par votre navigateur.'
      );
      setSubmitting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);

        // Fetch real reverse geocoded address
        let addrInfo: any = {};
        try {
          addrInfo = await reverseGeocode(lat, lng, lang);
        } catch (e) {
          console.warn('Geocoding error:', e);
        }

        const liveLocation: LocationPoint = {
          lat,
          lng,
          accuracy,
          capturedAt: pos.timestamp || Date.now(),
          formattedAddress: addrInfo.formattedAddress,
          city: addrInfo.city,
          country: addrInfo.country,
        };

        try {
          await submitConsent(token, 'ACCEPT', liveLocation);
          setData((prev) =>
            prev ? { ...prev, status: 'ACCEPTED', locationPoint: liveLocation } : null
          );
        } catch (err: any) {
          setError(err.message || 'Failed to submit location');
        } finally {
          setSubmitting(false);
        }
      },
      (geoErr) => {
        setSubmitting(false);
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setError(
            lang === 'ar'
              ? 'تم رفض إذن الوصول إلى الموقع في المتصفح. يمكنك المحاولة مرة أخرى أو الرفض.'
              : 'Permission de géolocalisation refusée par le navigateur.'
          );
        } else {
          setError(geoErr.message || 'Error obtaining geolocation');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Recipient can also revoke and delete data anytime
  const handleRevoke = async () => {
    if (!window.confirm(t.revokeConfirm)) return;
    try {
      await revokeRequest(token);
      setData((prev) => (prev ? { ...prev, status: 'REVOKED', locationPoint: null } : null));
    } catch (err) {
      console.error('Revocation failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 animate-pulse">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Loading request...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-md mx-auto p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">
          {lang === 'ar' ? 'الطلب غير متاح' : 'Demande indisponible'}
        </h3>
        <p className="text-xs text-slate-400">{error}</p>
        <button
          onClick={onGoToRequesterView}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
        >
          {t.navCreate}
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="card-glass p-6 sm:p-8 rounded-3xl border border-slate-700/60 shadow-2xl bg-slate-900/90">
        {/* Top Header Card */}
        <div className="text-center pb-6 border-b border-slate-800">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-3 shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">
            {t.consentPromptTitle}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            {t.consentSubtitle}
          </p>
        </div>

        {/* Identity & Purpose Details */}
        <div className="my-6 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/70 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.identityLabel}</span>
            </span>
            <span className="font-bold text-white text-sm">{data.requesterName}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              <span>{t.purposeLabel}</span>
            </span>
            <span className="font-medium text-slate-200">{data.purpose}</span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-700/50">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.expiresIn}</span>
            </span>
            <span className="font-mono text-emerald-400 font-bold">{timeLeft || '--:--'}</span>
          </div>

          {data.isMockMode && (
            <div className="pt-2 border-t border-slate-700/50 flex items-center gap-1.5 text-[11px] text-amber-400">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{t.mockModeTitle} (بيانات افتراضية للتجربة)</span>
            </div>
          )}
        </div>

        {/* Error Notice */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Active PENDING State: Show Consent & Decline buttons with equal visual weight */}
        {data.status === 'PENDING' && (
          <div className="space-y-6">
            {/* Privacy Guarantee Box */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 space-y-2">
              <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.privacyNote}</span>
              </h4>
              <ul className="text-[11px] text-emerald-200/80 space-y-1 list-disc list-inside">
                <li>{t.privacyBullet1}</li>
                <li>{t.privacyBullet2}</li>
                <li>{t.privacyBullet3}</li>
              </ul>
            </div>

            {/* Zero Dark Pattern: Equal Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Accept Button */}
              <button
                type="button"
                onClick={handleAccept}
                disabled={submitting}
                className="py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? t.gettingPosition : t.btnAccept}</span>
              </button>

              {/* Decline Button (Equal prominence!) */}
              <button
                type="button"
                onClick={handleDecline}
                disabled={submitting}
                className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-rose-950/50 hover:border-rose-700/60 text-slate-200 hover:text-rose-300 border border-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>{t.btnDecline}</span>
              </button>
            </div>
          </div>
        )}

        {/* ACCEPTED State */}
        {data.status === 'ACCEPTED' && data.locationPoint && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-700/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <span>{t.acceptSuccess}</span>
            </div>

            <MapView
              location={data.locationPoint}
              isMock={data.isMockMode}
              requesterName={data.requesterName}
              lang={lang}
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                {t.accuracy} ±{data.locationPoint.accuracy} {t.meters}
              </span>
              <button
                onClick={handleRevoke}
                className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.btnRevoke}</span>
              </button>
            </div>
          </div>
        )}

        {/* REJECTED State */}
        {data.status === 'REJECTED' && (
          <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 text-center space-y-3 animate-fade-in">
            <XCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">{t.statusRejected}</h4>
            <p className="text-xs text-slate-400">{t.declineSuccess}</p>
          </div>
        )}

        {/* REVOKED State */}
        {data.status === 'REVOKED' && (
          <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 text-center space-y-3 animate-fade-in">
            <Trash2 className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">{t.statusRevoked}</h4>
            <p className="text-xs text-slate-400">
              {lang === 'ar'
                ? 'تم حذف الإحداثيات نهائياً ولا توجد أي بيانات موقع مخزنة.'
                : 'Toutes les coordonnées ont été effacées définitivement.'}
            </p>
          </div>
        )}

        {/* EXPIRED State */}
        {data.status === 'EXPIRED' && (
          <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-700/40 text-center space-y-3 animate-fade-in">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <h4 className="text-sm font-bold text-amber-300">{t.statusExpired}</h4>
          </div>
        )}

        {/* Switch back to create view link */}
        <div className="mt-8 pt-4 border-t border-slate-800 text-center">
          <button
            onClick={onGoToRequesterView}
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            ← {lang === 'ar' ? 'الذهاب إلى لوحة إنشاء طلب جديد' : 'Aller au tableau de bord créateur'}
          </button>
        </div>
      </div>
    </div>
  );
};
