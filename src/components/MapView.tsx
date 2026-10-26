/// <reference types="@types/google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, Navigation, MapPin } from 'lucide-react';
import type { LocationPoint } from '../types';

interface MapViewProps {
  location: LocationPoint;
  isMock: boolean;
  requesterName?: string;
  lang: 'ar' | 'fr' | 'en';
}

export const MapView: React.FC<MapViewProps> = ({ location, isMock, lang }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapEngine, setMapEngine] = useState<'google' | 'leaflet'>('google');
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  const { lat, lng, accuracy, formattedAddress } = location;

  // External Navigation Links
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

  // Try loading Google Maps JavaScript API (Latest functional API)
  useEffect(() => {
    let isMounted = true;
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

    if (apiKey) {
      try {
        setOptions({
          key: apiKey,
          v: 'weekly',
        });

        Promise.all([importLibrary('maps'), importLibrary('marker')])
          .then(() => {
            if (isMounted) {
              setGoogleMapsLoaded(true);
              setMapEngine('google');
            }
          })
          .catch((err: any) => {
            console.warn('Google Maps loader failed, falling back to OSM Leaflet:', err);
            if (isMounted) {
              setMapEngine('leaflet');
            }
          });
      } catch (e) {
        console.warn('Google Maps configuration error, falling back:', e);
        if (isMounted) {
          setMapEngine('leaflet');
        }
      }
    } else {
      setMapEngine('leaflet');
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize or update Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapEngine === 'google' && googleMapsLoaded && (window as any).google?.maps) {
      // --- LATEST GOOGLE MAPS IMPLEMENTATION ---
      const google = (window as any).google;
      const mapOptions: google.maps.MapOptions = {
        center: { lat, lng },
        zoom: 16,
        mapTypeId: 'roadmap',
        mapId: 'DEMO_MAP_ID', // Required for AdvancedMarkerElement
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: true,
        mapTypeControl: false,
      };

      const gMap = new google.maps.Map(mapContainerRef.current, mapOptions);

      // Accuracy Circle
      new google.maps.Circle({
        strokeColor: '#10b981',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#10b981',
        fillOpacity: 0.15,
        map: gMap,
        center: { lat, lng },
        radius: accuracy || 25,
      });

      // Latest AdvancedMarkerElement
      if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
        const pinElement = document.createElement('div');
        pinElement.innerHTML = `
          <div style="
            position: relative;
            width: 38px;
            height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              position: absolute;
              width: 38px;
              height: 38px;
              background: rgba(16, 185, 129, 0.3);
              border-radius: 50%;
              animation: pulse-ring 2s infinite ease-out;
            "></div>
            <div style="
              width: 24px;
              height: 24px;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              border: 3px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 4px 14px rgba(0,0,0,0.4);
            "></div>
          </div>
        `;

        const advancedMarker = new google.maps.marker.AdvancedMarkerElement({
          map: gMap,
          position: { lat, lng },
          title: formattedAddress || 'Shared Location',
          content: pinElement,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 6px; font-family: inherit; font-size: 13px; text-align: ${lang === 'ar' ? 'right' : 'left'};">
              <strong style="color: #059669;">${lang === 'ar' ? 'الموقع الفعلي للمستلم' : 'Position réelle'}</strong><br/>
              <span style="color: #334155; font-size: 12px;">${formattedAddress || ''}</span><br/>
              <small style="color: #64748b;">${lat.toFixed(6)}, ${lng.toFixed(6)} (±${accuracy}m)</small>
            </div>
          `,
        });

        advancedMarker.addListener('click', () => {
          infoWindow.open({ anchor: advancedMarker, map: gMap });
        });
      }
    } else if (mapEngine === 'leaflet') {
      // --- LEAFLET HIGH-PERFORMANCE FALLBACK ---
      mapContainerRef.current.innerHTML = '';
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const customPinIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="
            position: relative;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              position: absolute;
              width: 36px;
              height: 36px;
              background: rgba(16, 185, 129, 0.25);
              border-radius: 50%;
              animation: pulse-ring 2s infinite ease-out;
            "></div>
            <div style="
              width: 22px;
              height: 22px;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              border: 3px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            "></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([lat, lng], { icon: customPinIcon }).addTo(map);
      marker
        .bindPopup(`
          <div style="font-family: inherit; font-size: 13px; text-align: ${lang === 'ar' ? 'right' : 'left'};">
            <strong style="color: #059669;">${lang === 'ar' ? 'الموقع الفعلي الحقيقي' : 'Position Réelle'}</strong><br/>
            <span style="color: #cbd5e1; font-size: 12px;">${formattedAddress || ''}</span><br/>
            <small style="color: #94a3b8;">Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</small>
          </div>
        `)
        .openPopup();

      L.circle([lat, lng], {
        radius: accuracy || 25,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.15,
        weight: 1.5,
      }).addTo(map);

      setTimeout(() => map.invalidateSize(), 200);
    }
  }, [lat, lng, accuracy, formattedAddress, mapEngine, googleMapsLoaded, lang]);

  return (
    <div className="space-y-3">
      {/* Real Address Card */}
      {formattedAddress && (
        <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-start gap-2.5 text-xs text-slate-200">
          <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-semibold text-emerald-300">
              {lang === 'ar' ? 'العنوان الجغرافي الفعلي:' : 'Adresse physique réelle :'}
            </span>
            <p className="mt-0.5 text-slate-300 leading-relaxed font-sans">{formattedAddress}</p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-700/70 shadow-2xl bg-slate-900">
        <div
          ref={mapContainerRef}
          style={{ height: '400px', width: '100%', zIndex: 1 }}
          className="leaflet-touch"
        />

        {/* Top Floating Controls */}
        <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3 z-10 flex flex-wrap gap-2">
          {/* Real vs Mock Badge */}
          <span
            className={`px-3 py-1.5 text-xs font-bold rounded-xl shadow-lg backdrop-blur-md flex items-center gap-1.5 ${
              isMock
                ? 'bg-amber-500/90 text-white'
                : 'bg-emerald-600/90 text-white border border-emerald-400/30'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
            <span>
              {isMock
                ? lang === 'ar'
                  ? 'إحداثيات تجريبية'
                  : 'Mode Démo'
                : lang === 'ar'
                ? 'GPS حقيقي مباشر'
                : 'GPS Réel En Ligne'}
            </span>
          </span>

          {/* Engine indicator */}
          <span className="px-2.5 py-1.5 text-[11px] font-medium bg-slate-900/90 border border-slate-700 text-slate-300 rounded-xl shadow-md">
            {mapEngine === 'google' ? 'Google Maps v3 (Advanced)' : 'OpenStreetMap Live'}
          </span>
        </div>

        {/* Bottom Floating Navigation Links */}
        <div className="absolute bottom-3 right-3 rtl:right-auto rtl:left-3 z-10 flex items-center gap-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/95 hover:bg-slate-800 text-white border border-slate-700 text-xs font-semibold rounded-xl shadow-xl transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lang === 'ar' ? 'Google Maps' : 'Ouvrir Google Maps'}</span>
          </a>

          <a
            href={wazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/95 hover:bg-slate-800 text-white border border-slate-700 text-xs font-semibold rounded-xl shadow-xl transition-all"
          >
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>Waze</span>
          </a>
        </div>
      </div>
    </div>
  );
};
