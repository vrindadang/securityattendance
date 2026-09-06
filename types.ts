
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
  shift?: 'DAY' | 'NIGHT';
  isCustom?: boolean;
  isRemovedSaturday?: boolean;
  isRemovedTuesday?: boolean;
  isRestored?: boolean;
  routedByHrTable?: boolean;
  routedByZone?: boolean;
  originZone?: string;
  tag?: string;
  hrTableData?: {
    phoneNumber?: string | null;
    address?: string | null;
    qualification?: string | null;
    timing?: string | null;
    weeklyOff?: string | null;
    sewaDays?: string[];
    selectedOptions?: string[];
    interestedGroups?: string[];
    securityGentsGroups?: string[];
    securityLadiesGroups?: string[];
    handoverDayGroup?: string | null;
    handoverIncharge?: string | null;
    handoverDate?: string | null;
    createdAt?: number;
    updatedAt?: number;
  };
}

export interface SewadarDetails {
  sewadar_id: string;
  address: string;
  dob: string;
  phone: string;
  age?: number;
  district?: string;
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
  isProperUniform?: boolean;
  shift?: 'DAY' | 'NIGHT';
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
  updatedAt?: number;
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

export interface Notice {
  id: string;
  title: string;
  content: string;
  photo?: string;
  pdf?: string;
  timestamp: number;
  authorName: string;
}

export interface WeeklyReport {
  id: string;
  startDate: string;
  endDate: string;
  gender: Gender;
  totalSewadars: number;
  groupBreakdown: Record<string, number>;
  shiftTrends: Record<string, number>;
  highTrafficPoints: { point: string; count: number }[];
  coverageGaps: string[];
  averageShiftLength: number;
  thresholdStats: { above80: number; below50: number; others: number };
  incidentSummary: string;
  vehicleTrends: string;
  activeSewadars: { name: string; count: number; hours: number }[];
  verificationStatus: string;
  recommendations: string;
  timestamp: number;
}

export interface WorkshopPoint {
  id: string;
  sewadarId: string;
  sewadarName: string;
  gender: Gender;
  group: string;
  team: string; // 'Ladies' for all ladies, or 'Monday', 'Tuesday', etc. for gents
  points: number; // 100 for early, 50 for late
  reason: string; // 'Attendance – Early' or 'Attendance – Late'
  checkInTime: string; // 'HH:mm'
  timestamp: number;
  date: string; // '2026-08-30'
  awardedBy: string;
}

export type ViewState = 'Attendance' | 'Dashboard' | 'Login' | 'VolunteerDetails' | 'Requirements' | 'WeeklyReports' | 'WorkshopAttendance' | 'WorkshopLeaderboard' | 'WorkshopReport' | 'ZoneStructure' | 'AddSewadar';
