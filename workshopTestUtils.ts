import { AttendanceRecord, WorkshopPoint } from './types';

const STORAGE_KEY_TEST_MODE = 'security_sewa_workshop_test_mode';
const STORAGE_KEY_TEST_ATT = 'security_sewa_workshop_test_attendance';
const STORAGE_KEY_TEST_POINTS = 'security_sewa_workshop_test_points';
const STORAGE_KEY_TEST_CLEARED_DATE = 'security_sewa_workshop_test_cleared_date';

// Check if current date is 29 August or later
export const isTestModeDisabledByDate = (): boolean => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();

  // If year > 2026, or year is 2026 and month is 8 (Aug) and day >= 29 (or month > 8)
  if (year > 2026) return true;
  if (year === 2026) {
    if (month > 8) return true;
    if (month === 8 && day >= 29) return true;
  }
  return false;
};

// Check if test data needs to be auto-cleared on or after Aug 29
export const checkAndAutoResetTestData = () => {
  if (isTestModeDisabledByDate()) {
    try {
      localStorage.removeItem(STORAGE_KEY_TEST_MODE);
      localStorage.removeItem(STORAGE_KEY_TEST_ATT);
      localStorage.removeItem(STORAGE_KEY_TEST_POINTS);
      localStorage.setItem(STORAGE_KEY_TEST_CLEARED_DATE, new Date().toISOString());
    } catch (e) {
      console.error('Error auto-clearing test data:', e);
    }
  }
};

export const getWorkshopTestMode = (): boolean => {
  // If 29 August or later, test mode is permanently disabled (always false / Live mode only)
  if (isTestModeDisabledByDate()) {
    return false;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TEST_MODE);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch (e) {
    console.error('Error reading test mode:', e);
  }
  // Default to test mode before Aug 29
  return true;
};

export const setWorkshopTestMode = (isTest: boolean) => {
  if (isTestModeDisabledByDate()) return;
  try {
    localStorage.setItem(STORAGE_KEY_TEST_MODE, isTest ? 'true' : 'false');
  } catch (e) {
    console.error('Error setting test mode:', e);
  }
};

export const getStoredTestAttendance = (): AttendanceRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_TEST_ATT);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveStoredTestAttendance = (records: AttendanceRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_TEST_ATT, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving test attendance:', e);
  }
};

export const getStoredTestPoints = (): WorkshopPoint[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_TEST_POINTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveStoredTestPoints = (records: WorkshopPoint[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_TEST_POINTS, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving test points:', e);
  }
};

export const clearStoredTestData = () => {
  try {
    localStorage.removeItem(STORAGE_KEY_TEST_ATT);
    localStorage.removeItem(STORAGE_KEY_TEST_POINTS);
  } catch (e) {
    console.error('Error clearing test data:', e);
  }
};
