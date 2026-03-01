
import React, { useState, useEffect, useCallback } from 'react';
import { ViewState, AttendanceRecord, Sewadar, Volunteer, Gender, GentsGroup, Issue, VehicleRecord, SewadarDetails, Requirement, GroupPhoto } from './types';
import { INITIAL_SEWADARS, LOCATIONS_LIST } from './constants';
import AttendanceManager from './components/AttendanceManager';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import VolunteerDetails from './components/VolunteerDetails';
import RequirementsView from './components/RequirementsView';
import { db } from './firebase';
import { collection, query, where, getDocs, orderBy, setDoc, doc, updateDoc, deleteDoc, limit, addDoc, writeBatch, Timestamp } from 'firebase/firestore';

const STORAGE_KEY_VOLUNTEER = 'skrm_active_volunteer';
const STORAGE_KEY_SESSION_ID = 'skrm_selected_session_id';

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

const App: React.FC = () => {
  const [activeVolunteer, setActiveVolunteer] = useState<Volunteer | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_VOLUNTEER);
    return saved ? JSON.parse(saved) : null;
  });

  const [activeView, setActiveView] = useState<ViewState>('Attendance');
  
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [groupPhotos, setGroupPhotos] = useState<GroupPhoto[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [flaggedVehicles, setFlaggedVehicles] = useState<FlaggedVehicle[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [dashboardSelectedSession, setDashboardSelectedSession] = useState<DutySession | null>(null);

  const [activeSession, setActiveSession] = useState<DutySession | null>(null);
  const [activeAttendance, setActiveAttendance] = useState<AttendanceRecord[]>([]);
  const [activeIssues, setActiveIssues] = useState<Issue[]>([]);
  const [activeGroupPhotos, setActiveGroupPhotos] = useState<GroupPhoto[]>([]);
  const [activeVehicles, setActiveVehicles] = useState<VehicleRecord[]>([]);

  const [customSewadars, setCustomSewadars] = useState<Sewadar[]>([]);
  const [sewadarDetailsMap, setSewadarDetailsMap] = useState<Record<string, SewadarDetails>>({});
  const [loading, setLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [allSessions, setAllSessions] = useState<DutySession[]>([]);

  const getLocalDate = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const [configForm, setConfigForm] = useState({
    locations: [] as string[],
    startDate: getLocalDate(),
    startTime: '07:00',
    endDate: getTomorrowDate(),
    endTime: '07:00'
  });

  useEffect(() => {
    if (showSettingsModal && activeVolunteer) {
      if (activeVolunteer.assignedGroup === 'Ladies') {
        setConfigForm(prev => ({
          ...prev,
          locations: [...LOCATIONS_LIST],
          startDate: getLocalDate(),
          startTime: '07:00',
          endDate: getTomorrowDate(),
          endTime: '07:00'
        }));
      } else {
        setConfigForm(prev => ({
          ...prev,
          locations: [],
          startDate: getLocalDate(),
          startTime: '07:00',
          endDate: getTomorrowDate(),
          endTime: '07:00'
        }));
      }
    }
  }, [showSettingsModal, activeVolunteer]);

  const fetchSessions = useCallback(async (isInitial = false) => {
    if (!activeVolunteer) return;
    
    try {
      const q = query(
        collection(db, 'daily_settings'),
        ...(activeVolunteer.role !== 'Super Admin' && activeVolunteer.assignedGroup 
          ? [where('group', '==', activeVolunteer.assignedGroup)] 
          : [])
      );
      
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs
        .map(doc => {
          const d = doc.data();
          // Normalize date to string if it's a Timestamp
          let dateStr = d.date;
          if (dateStr && typeof dateStr !== 'string' && (dateStr as any).toDate) {
            dateStr = (dateStr as any).toDate().toISOString().split('T')[0];
          }
          return { ...d, id: doc.id, date: String(dateStr || '') };
        })
        .sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()) as any[];
      
      if (data && data.length > 0) {
        const mappedSessions = data.map(s => ({ ...s, id: String(s.id) }));
        
        // Deduplicate sessions by date + group. Prioritize completed ones.
        const uniqueSessionsMap: Record<string, DutySession> = {};
        mappedSessions.forEach(s => {
          const key = `${s.date}-${s.group}`;
          // If we don't have this date/group yet, OR if existing one is active and new one is completed
          if (!uniqueSessionsMap[key] || (!uniqueSessionsMap[key].completed && s.completed)) {
            uniqueSessionsMap[key] = s;
          }
        });
        const deduplicatedSessions = Object.values(uniqueSessionsMap).sort((a, b) => 
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );

        setAllSessions(deduplicatedSessions);
        
        const activeOrFuture = deduplicatedSessions.find(s => !s.completed);
        setActiveSession(activeOrFuture || null);

        if (isInitial) {
          const savedSessionId = localStorage.getItem(STORAGE_KEY_SESSION_ID);
          const savedSession = deduplicatedSessions.find(s => s.id === savedSessionId);
          
          if (savedSession) {
            setDashboardSelectedSession(savedSession);
          } else if (activeOrFuture) {
            setDashboardSelectedSession(activeOrFuture);
            localStorage.setItem(STORAGE_KEY_SESSION_ID, activeOrFuture.id);
          } else {
            setDashboardSelectedSession(null);
            if (activeVolunteer.role !== 'Super Admin') setShowSettingsModal(true);
          }
        }
      } else {
        setAllSessions([]);
        setActiveSession(null);
        setDashboardSelectedSession(null);
        if (isInitial && activeVolunteer.role !== 'Super Admin') setShowSettingsModal(true);
      }
    } catch (err) {
      console.error("Fetch Sessions Error:", err);
    }
  }, [activeVolunteer]);

  const fetchSewadarDetails = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'sewadar_details'));
      const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      if (data) {
        const map: Record<string, SewadarDetails> = {};
        data.forEach((d: any) => {
          map[d.sewadar_id] = {
            sewadar_id: d.sewadar_id,
            address: d.address || '',
            dob: d.dob || '',
            phone: d.phone || ''
          };
        });
        setSewadarDetailsMap(map);
      }
    } catch (err) {
      console.error("Fetch Details Error:", err);
    }
  }, []);

  const fetchRequirements = useCallback(async () => {
    try {
      const q = query(collection(db, 'requirements'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id }))
        .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0)) as Requirement[];
      if (data) setRequirements(data);
    } catch (err) {
      console.error("Fetch Requirements Error:", err);
    }
  }, []);

  const calculateFlaggedVehicles = useCallback((historicalVehicles: any[], currentDate: string) => {
    const plateGroups: Record<string, { dates: Set<string>, model: string }> = {};
    
    historicalVehicles.forEach(v => {
      if (!plateGroups[v.plate_number]) {
        plateGroups[v.plate_number] = { dates: new Set(), model: v.model || '' };
      }
      plateGroups[v.plate_number].dates.add(v.date);
    });

    const flagged: FlaggedVehicle[] = [];
    Object.entries(plateGroups).forEach(([plate, data]) => {
      const uniqueDates = Array.from(data.dates).sort();
      if (uniqueDates.length >= 3) {
        const lastSeen = uniqueDates[uniqueDates.length - 1];
        const current = new Date(currentDate);
        const last = new Date(lastSeen);
        const diffDays = Math.ceil(Math.abs(current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 4) {
          flagged.push({
            plateNumber: plate,
            daysSpotted: uniqueDates.length,
            lastSeenDate: lastSeen,
            model: data.model
          });
        }
      }
    });

    setFlaggedVehicles(flagged);
  }, []);

  const fetchData = useCallback(async (session: DutySession | null, target: 'active' | 'dashboard') => {
    if (!activeVolunteer || !session) {
      if (target === 'active') {
        setActiveAttendance([]);
        setActiveIssues([]);
        setActiveGroupPhotos([]);
        setActiveVehicles([]);
        setFlaggedVehicles([]);
      } else {
        setAttendance([]);
        setIssues([]);
        setGroupPhotos([]);
        setVehicles([]);
      }
      return;
    }
    
    if (target === 'dashboard') setLoading(true);
    
    try {
      let dateStr = session.date as any;
      if (dateStr && typeof dateStr !== 'string' && dateStr.toDate) {
        dateStr = dateStr.toDate().toISOString().split('T')[0];
      }
      const [y, m, d] = String(dateStr || '').split('-').map(Number);
      if (isNaN(y) || isNaN(m) || isNaN(d)) throw new Error("Invalid session date format");
      
      const startOfDay = Timestamp.fromDate(new Date(y, m - 1, d, 0, 0, 0));
      const endOfDay = Timestamp.fromDate(new Date(y, m - 1, d, 23, 59, 59));

      const attQ = query(collection(db, 'attendance'), where('date', '>=', startOfDay), where('date', '<=', endOfDay));
      const attSnapshot = await getDocs(attQ);
      const allAttData = attSnapshot.docs.map(doc => {
        const d = doc.data();
        let dateStr = d.date;
        if (dateStr && typeof dateStr !== 'string' && (dateStr as any).toDate) {
          dateStr = (dateStr as any).toDate().toISOString().split('T')[0];
        }
        return { ...d, id: doc.id, date: String(dateStr || '') };
      });
      const attData = allAttData.filter((a: any) => a.group === session.group);

      const mappedAtt = attData ? attData.map((a: any) => ({
        ...a,
        id: String(a.id),
        sewadarId: a.sewadar_id,
        volunteerId: a.volunteer_id,
        inTime: a.in_time,
        outTime: a.out_time,
        sewaPoint: a.sewa_points,
        workshopLocation: a.workshop_location,
        isProperUniform: a.is_proper_uniform 
      })) : [];

      const issuesQ = query(collection(db, 'issues'), where('date', '>=', startOfDay), where('date', '<=', endOfDay));
      const issuesSnapshot = await getDocs(issuesQ);
      const allIssuesData = issuesSnapshot.docs.map(doc => {
        const d = doc.data();
        let dateStr = d.date;
        if (dateStr && typeof dateStr !== 'string' && (dateStr as any).toDate) {
          dateStr = (dateStr as any).toDate().toISOString().split('T')[0];
        }
        return { ...d, id: doc.id, date: String(dateStr || '') };
      });
      const issuesData = allIssuesData.filter((i: any) => i.group === session.group);

      const mappedIssues = issuesData ? issuesData.map((i: any) => ({
        id: String(i.id),
        description: i.description,
        photo: i.photo,
        timestamp: i.timestamp,
        volunteerId: i.volunteer_id,
        volunteerName: i.volunteer_name
      })) : [];

      const photoQ = query(collection(db, 'group_photos'), where('date', '>=', startOfDay), where('date', '<=', endOfDay));
      const photoSnapshot = await getDocs(photoQ);
      const allPhotoData = photoSnapshot.docs.map(doc => {
        const d = doc.data();
        let dateStr = d.date;
        if (dateStr && typeof dateStr !== 'string' && (dateStr as any).toDate) {
          dateStr = (dateStr as any).toDate().toISOString().split('T')[0];
        }
        return { ...d, id: doc.id, date: String(dateStr || '') };
      });
      const photoData = allPhotoData.filter((p: any) => p.group === session.group);

      const mappedPhotos = photoData ? photoData.map((p: any) => ({
        id: String(p.id),
        photo: p.photo,
        timestamp: p.timestamp,
        volunteerId: p.volunteer_id,
        volunteerName: p.volunteer_name
      })) : [];

      const vQ = query(collection(db, 'vehicles'), where('date', '>=', startOfDay), where('date', '<=', endOfDay));
      const vSnapshot = await getDocs(vQ);
      const allVData = vSnapshot.docs.map(doc => {
        const d = doc.data();
        let dateStr = d.date;
        if (dateStr && typeof dateStr !== 'string' && (dateStr as any).toDate) {
          dateStr = (dateStr as any).toDate().toISOString().split('T')[0];
        }
        return { ...d, id: doc.id, date: String(dateStr || '') };
      });
      const vData = allVData.filter((v: any) => v.group === session.group);

      const mappedVehicles = vData ? vData.map((v: any) => ({
        id: String(v.id),
        type: v.type,
        plateNumber: v.plate_number,
        model: v.model,
        remarks: v.remarks,
        timestamp: v.timestamp,
        volunteerId: v.volunteer_id,
        volunteerName: v.volunteer_name
      })) : [];

      const histVQ = query(collection(db, 'vehicles'), limit(200));
      const histVSnapshot = await getDocs(histVQ);
      const historicalVData = histVSnapshot.docs
        .map(doc => {
          const d = doc.data();
          let dateStr = d.date;
          if (dateStr && typeof dateStr !== 'string' && (dateStr as any).toDate) {
            dateStr = (dateStr as any).toDate().toISOString().split('T')[0];
          }
          return { ...d, id: doc.id, date: String(dateStr || '') };
        })
        .sort((a: any, b: any) => {
          const dateA = String(a.date || '');
          const dateB = String(b.date || '');
          return dateB.localeCompare(dateA);
        });

      if (historicalVData) {
        calculateFlaggedVehicles(historicalVData, String(dateStr || ''));
      }

      if (target === 'active') {
        setActiveAttendance(mappedAtt);
        setActiveIssues(mappedIssues);
        setActiveGroupPhotos(mappedPhotos);
        setActiveVehicles(mappedVehicles);
      } else {
        setAttendance(mappedAtt);
        setIssues(mappedIssues);
        setGroupPhotos(mappedPhotos);
        setVehicles(mappedVehicles);
      }

      const customSnapshot = await getDocs(collection(db, 'custom_sewadars'));
      const customData = customSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      if (customData) {
        setCustomSewadars(customData.map((s: any) => ({
          id: String(s.id),
          name: s.name,
          gender: s.gender as Gender,
          group: s.group as GentsGroup | 'Ladies',
          isCustom: true
        })));
      }

    } catch (err) {
      console.error("Fetch Data Error:", err);
    } finally {
      if (target === 'dashboard') setLoading(false);
    }
  }, [activeVolunteer, calculateFlaggedVehicles]);

  useEffect(() => {
    if (activeVolunteer) {
      fetchSessions(true);
      fetchSewadarDetails();
      fetchRequirements();
    }
  }, [activeVolunteer, fetchSessions, fetchSewadarDetails, fetchRequirements]);

  useEffect(() => {
    fetchData(activeSession, 'active');
  }, [activeSession?.id, fetchData]);

  useEffect(() => {
    fetchData(dashboardSelectedSession, 'dashboard');
  }, [dashboardSelectedSession?.id, fetchData]);

  const generateNumericId = () => {
    return Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  };

  const saveAttendance = async (sewadarId: string, details: Partial<AttendanceRecord>, recordId?: string, isDelete: boolean = false) => {
    if (!activeSession || activeSession.completed) return;
    const sessionDate = activeSession.date;
    const sessionGroup = activeSession.group;

    if (isDelete && recordId) {
      try {
        await deleteDoc(doc(db, 'attendance', recordId));
        setActiveAttendance(prev => prev.filter(a => a.id !== recordId));
        if (dashboardSelectedSession?.id === activeSession.id) {
           setAttendance(prev => prev.filter(a => a.id !== recordId));
        }
      } catch (error) {
        console.error('Failed to delete attendance:', error);
      }
      return;
    }

    const sewadar = [...INITIAL_SEWADARS, ...customSewadars].find(s => s.id === sewadarId);
    if (!sewadar) return;

    const isExisting = !!recordId;
    const finalRecordId = recordId || generateNumericId();

    const [y, m, d] = sessionDate.split('-').map(Number);
    const dateTimestamp = Timestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0));

    const dbPayload = {
      id: finalRecordId,
      sewadar_id: sewadarId, 
      name: sewadar.name, 
      group: sessionGroup, 
      gender: sewadar.gender,
      date: dateTimestamp, 
      timestamp: Date.now(), 
      volunteer_id: activeVolunteer?.id || '',
      in_time: details.inTime || '', 
      out_time: details.outTime || '', 
      sewa_points: details.sewaPoint || '',
      workshop_location: details.workshopLocation || '', 
      is_proper_uniform: details.isProperUniform ?? true
    };

    const newRecord: AttendanceRecord = {
      id: finalRecordId,
      sewadarId: sewadarId, 
      name: sewadar.name, 
      group: sessionGroup as GentsGroup | 'Ladies',
      gender: sewadar.gender as Gender, 
      date: sessionDate, 
      timestamp: dbPayload.timestamp,
      volunteerId: activeVolunteer?.id || '', 
      inTime: details.inTime || '', 
      outTime: details.outTime || '',
      sewaPoint: details.sewaPoint || '', 
      workshopLocation: details.workshopLocation || '', 
      isProperUniform: details.isProperUniform ?? true
    };

    try {
      await setDoc(doc(db, 'attendance', finalRecordId), dbPayload);
      
      setActiveAttendance(prev => {
        const filtered = prev.filter(a => a.id !== finalRecordId);
        return [...filtered, newRecord];
      });
      if (dashboardSelectedSession?.id === activeSession.id) {
        setAttendance(prev => {
          const filtered = prev.filter(a => a.id !== finalRecordId);
          return [...filtered, newRecord];
        });
      }
    } catch (error) {
      console.error('Failed to save attendance:', error);
    }
  };

  const handleSaveSewadarDetails = async (details: SewadarDetails) => {
    try {
      await setDoc(doc(db, 'sewadar_details', details.sewadar_id), {
        sewadar_id: details.sewadar_id,
        address: details.address,
        dob: details.dob,
        phone: details.phone
      }, { merge: true });
      setSewadarDetailsMap(prev => ({ ...prev, [details.sewadar_id]: details }));
    } catch (err) {
      console.error("Save Details Error:", err);
      throw err;
    }
  };

  const handleSaveRequirement = async (description: string) => {
    if (!activeVolunteer) return;
    const newReq: Requirement = {
      id: generateNumericId(),
      group_name: activeVolunteer.assignedGroup || 'Global',
      description,
      timestamp: Date.now(),
      volunteer_id: activeVolunteer.id,
      volunteer_name: activeVolunteer.name,
      status: 'Pending'
    };
    try {
      await setDoc(doc(db, 'requirements', newReq.id), newReq);
      setRequirements(prev => [newReq, ...prev]);
    } catch (err) {
      console.error("Save Requirement Error:", err);
    }
  };

  const handleUpdateRequirementStatus = async (id: string, status: Requirement['status'], adminComment?: string) => {
    try {
      const updateData: any = { status };
      if (adminComment !== undefined) {
        updateData.adminComment = adminComment;
      }
      await updateDoc(doc(db, 'requirements', id), updateData);
      setRequirements(prev => prev.map(r => r.id === id ? { ...r, status, adminComment: adminComment ?? r.adminComment } : r));
    } catch (err) {
      console.error("Update Requirement Status Error:", err);
    }
  };

  const handleReportIssue = async (description: string, photo?: string) => {
    if (!activeVolunteer || !activeSession || activeSession.completed) return;
    const newIssue: Issue = {
      id: generateNumericId(), 
      description, 
      photo,
      timestamp: Date.now(),
      volunteerId: activeVolunteer.id, 
      volunteerName: activeVolunteer.name
    };
    setActiveIssues(prev => [...prev, newIssue]);
    if (dashboardSelectedSession?.id === activeSession.id) {
      setIssues(prev => [...prev, newIssue]);
    }
    const [y, m, d] = activeSession.date.split('-').map(Number);
    const dateTimestamp = Timestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0));

    await setDoc(doc(db, 'issues', newIssue.id), {
      id: newIssue.id, date: dateTimestamp, group: activeSession.group,
      description: newIssue.description, photo: newIssue.photo, timestamp: newIssue.timestamp,
      volunteer_id: newIssue.volunteerId, volunteer_name: newIssue.volunteerName
    });
  };

  const handleSaveGroupPhoto = async (photo: string) => {
    if (!activeVolunteer || !activeSession || activeSession.completed) return;
    const newPhoto: GroupPhoto = {
      id: generateNumericId(),
      photo,
      timestamp: Date.now(),
      volunteerId: activeVolunteer.id,
      volunteerName: activeVolunteer.name
    };
    setActiveGroupPhotos(prev => [...prev, newPhoto]);
    if (dashboardSelectedSession?.id === activeSession.id) {
      setGroupPhotos(prev => [...prev, newPhoto]);
    }
    const [y, m, d] = activeSession.date.split('-').map(Number);
    const dateTimestamp = Timestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0));

    await setDoc(doc(db, 'group_photos', newPhoto.id), {
      id: newPhoto.id, date: dateTimestamp, group: activeSession.group,
      photo: newPhoto.photo, timestamp: newPhoto.timestamp,
      volunteer_id: newPhoto.volunteerId, volunteer_name: newPhoto.volunteerName
    });
  };

  const handleSaveVehicle = async (v: Omit<VehicleRecord, 'id' | 'timestamp' | 'volunteerId' | 'volunteerName'>) => {
    if (!activeVolunteer || !activeSession || activeSession.completed) return;
    
    const cleanPlate = v.plateNumber.toUpperCase().trim();
    const newV: VehicleRecord = {
      ...v,
      plateNumber: cleanPlate,
      id: generateNumericId(),
      timestamp: Date.now(),
      volunteerId: activeVolunteer.id,
      volunteerName: activeVolunteer.name
    };

    const [y, m, d] = activeSession.date.split('-').map(Number);
    const dateTimestamp = Timestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0));

    try {
      setActiveVehicles(prev => [...prev, newV]);
      if (dashboardSelectedSession?.id === activeSession.id) {
        setVehicles(prev => [...prev, newV]);
      }

      await setDoc(doc(db, 'vehicles', newV.id), {
        id: newV.id, 
        date: dateTimestamp, 
        group: activeSession.group,
        type: v.type, 
        plate_number: cleanPlate, 
        model: v.model,
        remarks: v.remarks, 
        timestamp: newV.timestamp,
        volunteer_id: newV.volunteerId, 
        volunteer_name: newV.volunteerName
      });
    } catch (err: any) {
      console.error("Failed to save vehicle log:", err);
      setActiveVehicles(prev => prev.filter(item => item.id !== newV.id));
      if (dashboardSelectedSession?.id === activeSession.id) {
        setVehicles(prev => prev.filter(item => item.id !== newV.id));
      }
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (configForm.locations.length === 0) {
      alert("Please select at least one location.");
      return;
    }
    setIsSavingSettings(true);
    try {
      const groupName = activeVolunteer?.assignedGroup || 'Global';
      
      const parseDateParts = (dateStr: string) => {
        const parts = dateStr.split(/[-/]/).map(Number);
        if (parts[0] > 1000) return { y: parts[0], m: parts[1], d: parts[2] };
        return { d: parts[0], m: parts[1], y: parts[2] };
      };

      const { y, m, d } = parseDateParts(configForm.startDate);
      if (isNaN(y) || isNaN(m) || isNaN(d)) throw new Error("Invalid start date format");

      const startOfDay = Timestamp.fromDate(new Date(y, m - 1, d, 0, 0, 0));
      const endOfDay = Timestamp.fromDate(new Date(y, m - 1, d, 23, 59, 59));
      
      const getISO = (dateStr: string, timeStr: string) => {
        const { y: year, m: month, d: day } = parseDateParts(dateStr);
        const [hh, mm] = timeStr.split(':').map(Number);
        const dt = new Date(year, month - 1, day, hh, mm);
        if (isNaN(dt.getTime())) throw new Error("Invalid date or time value");
        return dt.toISOString();
      };

      const q = query(
        collection(db, 'daily_settings'),
        where('date', '>=', startOfDay),
        where('date', '<=', endOfDay)
      );
      const querySnapshot = await getDocs(q);
      const allExisting = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      const existing = allExisting.filter((s: any) => s.group === groupName && s.completed === false);

      if (existing && existing.length > 0) {
        const payload = {
          location: configForm.locations.join(', '),
          start_time: getISO(configForm.startDate, configForm.startTime),
          end_time: getISO(configForm.endDate, configForm.endTime),
        };
        await updateDoc(doc(db, 'daily_settings', existing[0].id), payload);
        const mappedSession = { ...existing[0], ...payload, id: String(existing[0].id), date: configForm.startDate } as DutySession;
        setAllSessions(prev => [mappedSession, ...prev.filter(s => s.id !== mappedSession.id)]);
        setActiveSession(mappedSession);
        setDashboardSelectedSession(mappedSession);
        localStorage.setItem(STORAGE_KEY_SESSION_ID, mappedSession.id);
        setSaveSuccess(true);
        setTimeout(() => { setShowSettingsModal(false); setSaveSuccess(false); setActiveView('Attendance'); }, 600);
      } else {
        const id = generateNumericId();
        const payload = {
          id,
          date: Timestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0)), 
          group: groupName,
          location: configForm.locations.join(', '),
          start_time: getISO(configForm.startDate, configForm.startTime),
          end_time: getISO(configForm.endDate, configForm.endTime),
          completed: false
        };
        await setDoc(doc(db, 'daily_settings', id), payload);
        const mappedSession = { ...payload, id: String(id), date: configForm.startDate } as DutySession;
        setAllSessions(prev => [mappedSession, ...prev]);
        setActiveSession(mappedSession);
        setDashboardSelectedSession(mappedSession);
        localStorage.setItem(STORAGE_KEY_SESSION_ID, mappedSession.id);
        setSaveSuccess(true);
        setTimeout(() => { setShowSettingsModal(false); setSaveSuccess(false); setActiveView('Attendance'); }, 600);
      }
    } catch (err) { 
      console.error("Config error details:", err);
      alert("Config error: " + (err instanceof Error ? err.message : "Unknown error")); 
    } finally { setIsSavingSettings(false); }
  };

  const handleCompleteSession = async (sessionId: string) => {
    try {
      await updateDoc(doc(db, 'daily_settings', sessionId), { completed: true });
      setAllSessions(prev => prev.map(s => s.id === sessionId ? { ...s, completed: true } : s));
      if (activeSession?.id === sessionId) setActiveSession(null);
      if (dashboardSelectedSession?.id === sessionId) {
         setDashboardSelectedSession(prev => prev ? { ...prev, completed: true } : null);
      }
      setActiveView('Attendance');
    } catch (err) { alert("Error finalizing duty."); }
  };

  const handleSessionChange = (id: string) => {
    const session = allSessions.find(s => s.id === id) || null;
    setDashboardSelectedSession(session);
    if (session) {
      localStorage.setItem(STORAGE_KEY_SESSION_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION_ID);
    }
  };

  const handleResetAllData = useCallback(async () => {
    if (!window.confirm("☢️ NUCLEAR RESET WARNING: This will permanently delete ALL data. Are you sure?")) {
      return;
    }

    setLoading(true);
    try {
      const collectionsToClear = ['attendance', 'issues', 'group_photos', 'vehicles', 'daily_settings', 'requirements'];
      
      for (const colName of collectionsToClear) {
        const qSnapshot = await getDocs(collection(db, colName));
        const batch = writeBatch(db);
        qSnapshot.docs.forEach((d) => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }

      setActiveAttendance([]);
      setActiveIssues([]);
      setActiveGroupPhotos([]);
      setActiveVehicles([]);
      setFlaggedVehicles([]);
      setAttendance([]);
      setIssues([]);
      setGroupPhotos([]);
      setVehicles([]);
      setRequirements([]);
      setAllSessions([]);
      setActiveSession(null);
      setDashboardSelectedSession(null);
      localStorage.removeItem(STORAGE_KEY_SESSION_ID);
      
      alert("Database wiped successfully.");
      setShowSettingsModal(true);
      setActiveView('Attendance');
    } catch (error) {
      console.error("Reset Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!activeVolunteer) return <Login onLogin={v => { 
    try {
      setActiveVolunteer(v); 
      localStorage.setItem(STORAGE_KEY_VOLUNTEER, JSON.stringify(v)); 
    } catch (e) {
      console.error("Storage error:", e);
      // Still set state even if storage fails
      setActiveVolunteer(v);
    }
  }} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh] relative">
            <button onClick={() => setShowSettingsModal(false)} className="absolute top-6 right-6 w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="text-center">
              <h2 className="text-2xl font-black text-slate-900">New Duty Session</h2>
            </div>
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duty Locations</label>
                <div className="grid grid-cols-1 gap-2">
                  {LOCATIONS_LIST.map(loc => (
                    <button type="button" key={loc} onClick={() => setConfigForm(p => ({ ...p, locations: p.locations.includes(loc) ? p.locations.filter(l => l !== loc) : [...p.locations, loc] }))} className={`py-3.5 px-6 rounded-2xl font-black text-xs uppercase border-2 transition-all ${configForm.locations.includes(loc) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{loc}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duty Start</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" className="px-4 py-3.5 bg-slate-50 border-2 rounded-2xl font-black text-sm" value={configForm.startDate} onChange={e => setConfigForm(p => ({...p, startDate: e.target.value}))} />
                    <input type="time" className="px-4 py-3.5 bg-slate-50 border-2 rounded-2xl font-black text-sm" value={configForm.startTime} onChange={e => setConfigForm(p => ({...p, startTime: e.target.value}))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duty End</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" className="px-4 py-3.5 bg-slate-50 border-2 rounded-2xl font-black text-sm" value={configForm.endDate} onChange={e => setConfigForm(p => ({...p, endDate: e.target.value}))} />
                    <input type="time" className="px-4 py-3.5 bg-slate-50 border-2 rounded-2xl font-black text-sm" value={configForm.endTime} onChange={e => setConfigForm(p => ({...p, endTime: e.target.value}))} />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={isSavingSettings || saveSuccess} className="w-full py-5 rounded-[2rem] font-black uppercase tracking-widest bg-indigo-600 text-white shadow-xl">{isSavingSettings ? 'Starting...' : (saveSuccess ? 'Session Started ✓' : 'Start Duty')}</button>
            </form>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Security Sewa</h1>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black text-slate-900">{activeVolunteer.name}</p>
            <p className="text-[8px] font-bold text-indigo-500 uppercase">{activeVolunteer.role}</p>
          </div>
          <button onClick={() => { localStorage.removeItem(STORAGE_KEY_VOLUNTEER); localStorage.removeItem(STORAGE_KEY_SESSION_ID); setActiveVolunteer(null); }} className="p-2.5 bg-slate-50 rounded-xl hover:text-red-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-6 pb-24 no-scrollbar">
        {activeView === 'Attendance' ? (
          <AttendanceManager 
            sewadars={[...INITIAL_SEWADARS, ...customSewadars]} 
            attendance={activeAttendance} 
            onSaveAttendance={saveAttendance} 
            onSaveVehicle={handleSaveVehicle}
            vehicles={activeVehicles}
            flaggedVehicles={flaggedVehicles}
            onAddSewadar={async (n, g, grp) => {
              const newSewadar = { id: generateNumericId(), name: n, gender: g, group: grp };
              try {
                await setDoc(doc(db, 'custom_sewadars', newSewadar.id), { id: newSewadar.id, name: newSewadar.name, gender: newSewadar.gender, group: newSewadar.group });
                setCustomSewadars(prev => [...prev, { ...newSewadar, isCustom: true }]);
              } catch (error) { console.error('Failed to add sewadar:', error); }
            }} 
            activeVolunteer={activeVolunteer} 
            workshopLocation={activeSession?.location || null} 
            sessionDate={activeSession?.date || ''} 
            dutyStartTime={activeSession?.start_time || ''} 
            dutyEndTime={activeSession?.end_time || ''} 
            isCompleted={activeSession?.completed} 
            onChangeLocation={() => setShowSettingsModal(true)} 
          />
        ) : activeView === 'VolunteerDetails' ? (
          <VolunteerDetails
            sewadars={[...INITIAL_SEWADARS, ...customSewadars]}
            details={sewadarDetailsMap}
            activeVolunteer={activeVolunteer}
            onSaveDetails={handleSaveSewadarDetails}
          />
        ) : activeView === 'Requirements' ? (
          <RequirementsView
            requirements={requirements}
            activeVolunteer={activeVolunteer}
            onAddRequirement={handleSaveRequirement}
            onUpdateRequirementStatus={handleUpdateRequirementStatus}
          />
        ) : (
          <Dashboard 
            attendance={attendance} 
            issues={issues} 
            groupPhotos={groupPhotos}
            vehicles={vehicles} 
            requirements={requirements}
            activeVolunteer={activeVolunteer} 
            allSessions={allSessions} 
            selectedSessionId={dashboardSelectedSession?.id || null} 
            isSessionCompleted={!!dashboardSelectedSession?.completed} 
            onSessionChange={handleSessionChange} 
            onReportIssue={handleReportIssue} 
            onSaveGroupPhoto={handleSaveGroupPhoto}
            onSaveVehicle={handleSaveVehicle} 
            onAddRequirement={handleSaveRequirement}
            onUpdateRequirementStatus={handleUpdateRequirementStatus}
            isLoading={loading} 
            dutyStartTime={dashboardSelectedSession?.start_time || ''} 
            dutyEndTime={dashboardSelectedSession?.end_time || ''} 
            onOpenSettings={() => setShowSettingsModal(true)} 
            onCompleteSession={handleCompleteSession} 
            onResetAllData={handleResetAllData} 
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t flex justify-around items-center p-3 pb-6">
        <button onClick={() => setActiveView('Attendance')} className={`flex-1 flex flex-col items-center gap-1 ${activeView === 'Attendance' ? 'text-indigo-600' : 'text-slate-400'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg><span className="text-[8px] font-black uppercase">Mark Sewa</span></button>
        <button onClick={() => setActiveView('VolunteerDetails')} className={`flex-1 flex flex-col items-center gap-1 ${activeView === 'VolunteerDetails' ? 'text-indigo-600' : 'text-slate-400'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg><span className="text-[8px] font-black uppercase">Details</span></button>
        <button onClick={() => setActiveView('Requirements')} className={`flex-1 flex flex-col items-center gap-1 ${activeView === 'Requirements' ? 'text-indigo-600' : 'text-slate-400'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg><span className="text-[8px] font-black uppercase">Requirements</span></button>
        <button onClick={() => setActiveView('Dashboard')} className={`flex-1 flex flex-col items-center gap-1 ${activeView === 'Dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 00-2 2h2a2 2 0 002-2" /></svg><span className="text-[8px] font-black uppercase">Reports</span></button>
      </nav>
    </div>
  );
};

export default App;
