import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LocationPoint } from '../types';

interface MapViewProps {
  location: LocationPoint;
  isMock: boolean;
  requesterName?: string;
  lang: 'ar' | 'fr' | 'en';
}

export const MapView: React.FC<MapViewProps> = ({ location, isMock, requesterName, lang }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const { lat, lng, accuracy } = location;

    // Custom modern pin SVG
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

    if (!mapInstanceRef.current) {
      // Initialize map instance
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
        attributionControl: true,
      });

      // Use OpenStreetMap CartoDB Positron / OSM tiles for beautiful, clean look
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([lat, lng], 15);
    }

    const map = mapInstanceRef.current;

    // Update or add marker
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], { icon: customPinIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; text-align: ${lang === 'ar' ? 'right' : 'left'};">
          <strong style="color: #059669;">${lang === 'ar' ? 'الموقع المشترك' : lang === 'fr' ? 'Position partagée' : 'Shared Location'}</strong><br/>
          <span>${requesterName ? (lang === 'ar' ? `لصالح: ${requesterName}` : `Pour: ${requesterName}`) : ''}</span><br/>
          <small style="color: #6b7280;">Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}</small>
        </div>
      `).openPopup();
      markerRef.current = marker;
    }

    // Update or add accuracy radius circle
    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng]);
      circleRef.current.setRadius(accuracy || 30);
    } else {
      const circle = L.circle([lat, lng], {
        radius: accuracy || 30,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.15,
        weight: 1.5,
      }).addTo(map);
      circleRef.current = circle;
    }

    // Invalidate size after rendering to avoid gray tiles
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      // cleanup on unmount
    };
  }, [location, lang, requesterName]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 shadow-xl bg-slate-900">
      <div
        ref={mapContainerRef}
        style={{ height: '360px', width: '100%', zIndex: 1 }}
        className="leaflet-touch"
      />
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full shadow backdrop-blur-md ${
          isMock ? 'bg-amber-500/80 text-white' : 'bg-emerald-600/80 text-white'
        }`}>
          {isMock ? (lang === 'ar' ? 'بيانات افتراضية (Mock)' : 'Simulé (Mock)') : (lang === 'ar' ? 'GPS حقيقي' : 'GPS Réel')}
        </span>
      </div>
    </div>
  );
};
