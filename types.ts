
export type Gender = 'Gents' | 'Ladies';

export type DutyGroup = string;

export interface Volunteer {
  id: string;
  name: string;
  role: string;
  password: string;
  assignedGroup?: DutyGroup;
}

export interface Sewadar {
  id: string;
  name: string;
  gender: Gender;
  group: DutyGroup;
  isCustom?: boolean;
}

export interface SewadarDetails {
  sewadar_id: string;
  address: string;
  dob: string;
  phone: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: string; 
  sewadarId: string;
  name: string;
  group: DutyGroup;
  gender: Gender;
  date: string; 
  timestamp: number;
  volunteerId: string;
  inTime?: string;
  outTime?: string;
  sewaPoint?: string;
  workshopLocation?: string;
  // Added isProperUniform to fix type errors in App.tsx
  isProperUniform?: boolean;
}

export interface VehicleRecord {
  id: string;
  type: '2-wheeler' | '4-wheeler';
  plateNumber: string;
  model: string;
  remarks: string;
  timestamp: number;
  volunteerId: string;
  volunteerName: string;
}

export interface Requirement {
  id: string;
  group_name: string;
  description: string;
  timestamp: number;
  volunteer_id: string;
  volunteer_name: string;
  status: 'Pending' | 'Closed' | 'Not Required';
  adminComment?: string;
}

export interface Issue {
  id: string;
  description: string;
  photo?: string; 
  timestamp: number;
  volunteerId: string;
  volunteerName: string;
}

export interface GroupPhoto {
  id: string;
  photo: string;
  timestamp: number;
  volunteerId: string;
  volunteerName: string;
}

// Added ScoreRecord interface to fix missing import errors
export interface ScoreRecord {
  id: string;
  sewadarId: string;
  game: string;
  points: number;
  timestamp: number;
  volunteerId: string;
  isDeleted?: boolean;
}

export interface DutySession {
  id: string;
  location: string;
  start_time: string;
  end_time: string;
  group: string;
  date: string;
  completed?: boolean;
}

export interface FlaggedVehicle {
  plateNumber: string;
  daysSpotted: number;
  lastSeenDate: string;
  model: string;
}

export type ViewState = 'Attendance' | 'Dashboard' | 'Login' | 'VolunteerDetails' | 'Requirements';
