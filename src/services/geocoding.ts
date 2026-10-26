// Real reverse geocoding service to convert GPS coordinates to human-readable addresses

export async function reverseGeocode(
  lat: number,
  lng: number,
  lang: 'ar' | 'fr' | 'en' = 'ar'
): Promise<{ formattedAddress: string; city?: string; country?: string }> {
  try {
    const langCode = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en';
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${langCode}`,
      {
        headers: {
          'User-Agent': 'TrustLocate-EthicalApp/1.0',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.municipality || addr.state || '';
      const country = addr.country || '';
      return {
        formattedAddress: data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        city,
        country,
      };
    }
  } catch (err) {
    console.warn('Reverse geocoding service unavailable:', err);
  }

  // Fallback to coordinates
  return {
    formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
  };
}
