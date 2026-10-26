export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'REVOKED';

export interface LocationPoint {
  lat: number;
  lng: number;
  accuracy: number;
  capturedAt: number;
  formattedAddress?: string;
  city?: string;
  country?: string;
}

export interface RequestHistoryItem {
  action: string;
  timestamp: number;
  details?: string;
}

export interface LocationRequestData {
  id: string;
  token: string;
  requesterName: string;
  purpose: string;
  createdAt: number;
  expiresAt: number;
  durationMinutes: number;
  status: RequestStatus;
  isMockMode: boolean;
  locationPoint: LocationPoint | null;
  revokedAt: number | null;
  historyLog: RequestHistoryItem[];
}

export type SupportedLanguage = 'ar' | 'fr' | 'en';
