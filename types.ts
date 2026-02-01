
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
}

export interface AttendanceRecord {
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
}

// Fix: Added missing ScoreRecord interface which is required by PointsManager and ParticipantView
export interface ScoreRecord {
  id: string;
  sewadarId: string;
  game: string;
  points: number;
  timestamp: number;
  volunteerId: string;
  isDeleted?: boolean;
}

export type ViewState = 'Attendance' | 'Dashboard' | 'Login';
