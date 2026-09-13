/**
 * Utility functions for time formatting across attendance reports.
 * Formats 24-hour time strings (e.g., '15:30', '07:00') into 12-hour AM/PM format (e.g., '03:30 PM', '07:00 AM').
 */
export const formatTimeToAMPM = (timeStr?: string): string => {
  if (!timeStr) return '-';
  const trimmed = timeStr.trim();
  if (!trimmed || trimmed === '-' || trimmed === '—') return '-';

  // If already formatted with AM/PM (e.g. "03:30 PM" or "7:00 AM")
  if (/am|pm/i.test(trimmed)) {
    return trimmed;
  }

  // Check for HH:MM or H:MM or HH:MM:SS format
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    if (isNaN(hours)) return trimmed;

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;

    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    return `${formattedHours}:${minutes} ${ampm}`;
  }

  // If it is an ISO timestamp or date-time string
  if (trimmed.includes('T') || (trimmed.includes('-') && trimmed.length > 10)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  }

  return trimmed;
};

export interface Parsed12HourTime {
  hour: number;      // 1 to 12
  minute: number;    // 0 to 59
  period: 'AM' | 'PM';
}

export const parseTimeTo12Hour = (timeStr?: string): Parsed12HourTime | null => {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();
  if (!trimmed || trimmed === '-' || trimmed === '—') return null;

  // 12-hour format: "1:55 PM", "01:55 AM"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const minute = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase() as 'AM' | 'PM';
    if (hour < 1) hour = 12;
    if (hour > 12) hour = ((hour - 1) % 12) + 1;
    return { hour, minute: isNaN(minute) ? 0 : minute, period };
  }

  // 24-hour format: "13:55", "07:30"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const totalHours = parseInt(match24[1], 10);
    const minute = parseInt(match24[2], 10);
    if (isNaN(totalHours) || isNaN(minute)) return null;

    const period: 'AM' | 'PM' = totalHours >= 12 ? 'PM' : 'AM';
    let hour = totalHours % 12;
    if (hour === 0) hour = 12;
    return { hour, minute, period };
  }

  // Timestamp format: ISO
  if (trimmed.includes('T') || (trimmed.includes('-') && trimmed.length > 10)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const totalHours = d.getHours();
      const period: 'AM' | 'PM' = totalHours >= 12 ? 'PM' : 'AM';
      let hour = totalHours % 12;
      if (hour === 0) hour = 12;
      return { hour, minute: d.getMinutes(), period };
    }
  }

  return null;
};

export const formatTo24Hour = (hour: number, minute: number, period: 'AM' | 'PM'): string => {
  let h = hour % 12;
  if (period === 'PM') {
    h += 12;
  }
  const paddedH = String(h).padStart(2, '0');
  const paddedM = String(minute).padStart(2, '0');
  return `${paddedH}:${paddedM}`;
};

export const formatTo12HourDisplay = (timeStr?: string, fallback = '--:-- --'): string => {
  const parsed = parseTimeTo12Hour(timeStr);
  if (!parsed) return fallback;
  const paddedM = String(parsed.minute).padStart(2, '0');
  return `${parsed.hour}:${paddedM} ${parsed.period}`;
};

export const parseTimeToMinutes = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const trimmed = timeStr.trim();
  if (!trimmed || trimmed === '-' || trimmed === '—') return 0;

  // 12-hour format: e.g. "1:55 PM", "09:30 AM"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (h === 12) h = 0;
    if (period === 'PM') h += 12;
    return h * 60 + (isNaN(m) ? 0 : m);
  }

  // 24-hour format: e.g. "13:55", "07:30"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    if (!isNaN(h) && !isNaN(m)) {
      return h * 60 + m;
    }
  }

  return 0;
};

export const getPeriod = (timeStr?: string): 'AM' | 'PM' => {
  if (!timeStr) {
    return new Date().getHours() >= 12 ? 'PM' : 'AM';
  }
  const trimmed = timeStr.trim();
  const match12 = trimmed.match(/(AM|PM)/i);
  if (match12) return match12[1].toUpperCase() as 'AM' | 'PM';

  const parts = trimmed.split(':');
  const h = parseInt(parts[0], 10);
  if (!isNaN(h)) {
    return h >= 12 ? 'PM' : 'AM';
  }
  return 'AM';
};

export const setTimePeriod = (timeStr: string | undefined, targetPeriod: 'AM' | 'PM'): string => {
  let h = 12;
  let m = 0;
  if (timeStr && timeStr.includes(':')) {
    const parts = timeStr.trim().split(':');
    h = parseInt(parts[0], 10) || 0;
    m = parseInt(parts[1], 10) || 0;
  } else {
    const now = new Date();
    h = now.getHours();
    m = now.getMinutes();
  }

  const isCurrentlyPM = h >= 12;
  if (targetPeriod === 'AM' && isCurrentlyPM) {
    h = h - 12;
  } else if (targetPeriod === 'PM' && !isCurrentlyPM) {
    h = h + 12;
  }

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

