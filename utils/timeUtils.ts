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
