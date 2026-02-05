
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
  sewadarId: string;
  name: string;
  group: GentsGroup | 'Ladies';
  gender: Gender;
  date: string; // YYYY-MM-DD
  timestamp: number;
  volunteer_id?: string; // Backend compat
  volunteerId: string;
  inTime?: string;
  outTime?: string;
  sewaPoint?: string;
  workshopLocation?: string;
  isProperUniform?: boolean; // New property
}

// Added ScoreRecord interface used for tracking workshop activity points
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
