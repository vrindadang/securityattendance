
export type Gender = 'Gents' | 'Ladies';

export type GentsGroup = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface Volunteer {
  id: string;
  name: string;
  role: string;
  password: string;
  assignedGroup?: GentsGroup | 'Ladies';
}

export interface Sewadar {
  id: string;
  name: string;
  gender: Gender;
  group: GentsGroup | 'Ladies';
  isCustom?: boolean;
}

export interface AttendanceRecord {
  id: string; // Unique ID for each duty point record
  sewadarId: string;
  name: string;
  group: GentsGroup | 'Ladies';
  gender: Gender;
  date: string; // YYYY-MM-DD
  timestamp: number;
  volunteerId: string;
  inTime?: string;
  outTime?: string;
  sewaPoint?: string;
  workshopLocation?: string;
  isProperUniform?: boolean;
}

// Added missing ScoreRecord interface used for gamification features
export interface ScoreRecord {
  id: string;
  sewadarId: string;
  game: string;
  points: number;
  timestamp: number;
  volunteerId: string;
  isDeleted?: boolean;
}

export interface Issue {
  id: string;
  description: string;
  photo?: string; // Base64 string
  timestamp: number;
  volunteerId: string;
  volunteerName: string;
}

export type ViewState = 'Attendance' | 'Dashboard' | 'Login';
