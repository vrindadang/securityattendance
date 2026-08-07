
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ViewState, AttendanceRecord, Sewadar, Volunteer, Gender, DutyGroup, Issue, VehicleRecord, SewadarDetails, Requirement, GroupPhoto, DutySession, FlaggedVehicle, Notice } from './types';
import { INITIAL_SEWADARS, LOCATIONS_LIST, INITIAL_SEWADAR_DETAILS } from './constants';
import AttendanceManager from './components/AttendanceManager';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import VolunteerDetails from './components/VolunteerDetails';
import RequirementsView from './components/RequirementsView';
import WeeklyReportsView from './components/WeeklyReportsView';
import ImportantInfoBanner from './components/ImportantInfoBanner';
import { db } from './firebase';
import { collection, query, where, getDocs, orderBy, setDoc, doc, updateDoc, deleteDoc, limit, addDoc, writeBatch, Timestamp, onSnapshot } from 'firebase/firestore';

const STORAGE_KEY_VOLUNTEER = 'skrm_active_volunteer';
const STORAGE_KEY_SESSION_ID = 'skrm_selected_session_id';
const STORAGE_KEY_LAST_REQ_VIEW = 'skrm_last_req_view';

const App: React.FC = () => {
  const [activeVolunteer, setActiveVolunteer] = useState<Volunteer | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_VOLUNTEER);
    return saved ? JSON.parse(saved) : null;
  });

  const [activeView, setActiveView] = useState<ViewState>('Attendance');
  const [lastRequirementsViewedAt, setLastRequirementsViewedAt] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LAST_REQ_VIEW);
    return saved ? parseInt(saved, 10) : 0;
  });
  
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
  const [deletedSewadarIds, setDeletedSewadarIds] = useState<Set<string>>(new Set());
  const [sewadarDetailsMap, setSewadarDetailsMap] = useState<Record<string, SewadarDetails>>(INITIAL_SEWADAR_DETAILS);
  const [loading, setLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [isLoginMainScreen, setIsLoginMainScreen] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [allSessions, setAllSessions] = useState<DutySession[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [securityNoticePhoto, setSecurityNoticePhoto] = useState<string>('https://ais-pre-2snntgklnesvtcldmdlnzp-89530588459.asia-southeast1.run.app/api/images/man.png');

  const visibleSewadars = useMemo(() => {
    if (!activeVolunteer) return [];
    
    // Deduplicate INITIAL_SEWADARS and customSewadars by ID, preferring custom ones
    const deduplicatedMap = new Map<string, Sewadar>();
    INITIAL_SEWADARS.forEach(s => deduplicatedMap.set(s.id, s));
    customSewadars.forEach(s => deduplicatedMap.set(s.id, { ...s, isCustom: true }));
    
    const all = Array.from(deduplicatedMap.values());
    const existingIds = new Set(all.map(s => s.id));
    
    // Synthesize missing sewadars from activeAttendance
    const synthesized: Sewadar[] = [];
    activeAttendance.forEach(a => {
      if (!existingIds.has(a.sewadarId)) {
        synthesized.push({
          id: a.sewadarId,
          name: a.name || 'Unknown',
          gender: a.gender || 'Gents',
          group: a.group || 'Global'
        });
        existingIds.add(a.sewadarId);
      }
    });
    
    const combined = [...all, ...synthesized];
    
    const isLadies = activeVolunteer.role.includes('Ladies');
    const assignedGroup = activeVolunteer.assignedGroup;
    const markedIds = new Set(activeAttendance.map(a => a.sewadarId));
    
    return combined.filter(s => {
      const isDeleted = deletedSewadarIds.has(s.id);
      const isMarked = markedIds.has(s.id);
      
      // If deleted, only show if marked in current session
      if (isDeleted && !isMarked) return false;
      
      if (activeVolunteer.role === 'Super Admin') return true;
      
      if (activeVolunteer.role === 'Back Office Admin') {
        const matchGroup = !assignedGroup || s.group === assignedGroup;
        return matchGroup || isMarked;
      }
      
      const matchGender = isLadies ? s.gender === 'Ladies' : s.gender === 'Gents';
      const matchGroup = !assignedGroup || s.group === assignedGroup;
      
      return (matchGender && matchGroup) || isMarked;
    });
  }, [activeVolunteer, customSewadars, deletedSewadarIds, activeAttendance]);

  const allSewadarsList = useMemo(() => {
    const deduplicatedMap = new Map<string, Sewadar>();
    INITIAL_SEWADARS.forEach(s => deduplicatedMap.set(s.id, s));
    customSewadars.forEach(s => deduplicatedMap.set(s.id, { ...s, isCustom: true }));
    const combined = Array.from(deduplicatedMap.values());
    return combined.filter(s => !deletedSewadarIds.has(s.id));
  }, [customSewadars, deletedSewadarIds]);

  const normalizeName = useCallback((name: string): string => {
    if (!name) return "";
    let n = name.toUpperCase().trim();
    
    // Strip common prefixes/suffixes and spaces
    n = n.replace(/^DR\.?\s*/g, '');
    n = n.replace(/^MR\.?\s*/g, '');
    n = n.replace(/\s+JI$/g, '');
    n = n.replace(/\bJI\b/g, '');
    
    // Remove all non-alphabetical characters to merge dots/spaces/brackets/braces
    n = n.replace(/[^A-Z]/g, '');

    // Custom mapping rules to align different spellings with actual database entries
    if (n === "RAJKOHLI") return "RAJKHOLI";                     // Map Raj Kohli to Raj Kholi
    if (n === "RAJNISH") return "RAJNEESH";                     // Map Rajnish to Rajneesh
    if (n === "YOGESHMADAAN") return "YOGESHMADAN";             // Map Yogesh Madaan to Yogesh Madan
    if (n === "MEVARAM") return "MEWARAM";                       // Map Meva Ram to Mewa Ram
    if (n === "HCBAJAJ" || n === "HARICHANDBAJAJ") return "HARICHANDBAJAJ"; // Map H.C. Bajaj to Hari Chand Bajaj
    if (n === "RAVISHASTRI" || n === "RVSHASTRI" || n === "DRRAVISHASTRI" || n === "DRRVSHASTRI") {
      return "RVSHASTRI"; // Standardize all Shastri variations to "RVSHASTRI"
    }
    if (n === "DAVENDERKUMAR" || n === "DEVENDERKUMAR") return "DEVENDERKUMAR"; // Map Davender to Devender
    if (n === "MAHENDERPUNIYANISONU" || n === "MAHENDERPUNIANISONU" || n === "MAHENDERPUNIANI") return "MAHENDERPUNIANI"; // Map Mahender Puniyani Sonu to Mahender Puniani
    if (n === "PAWAN" || n === "PAWANSHARMA") return "PAWANSHARMA"; // Map Pawan/Pawan Ji to Pawan Sharma (since he serves in Mon/Wed)
    if (n === "PUNIT" || n === "PUNEET" || n === "PUNEETKUMAR") return "PUNEETKUMAR"; // Map Punit/Puneet to Puneet Kumar

    return n;
  }, []);

  const enrichedDetailsMap = useMemo(() => {
    const map = { ...sewadarDetailsMap };
    
    // Build a mapping of normalized name to details
    const nameToDetailsMap = new Map<string, SewadarDetails>();
    
    Object.entries(sewadarDetailsMap).forEach(([id, detail]) => {
      const sewadar = visibleSewadars.find(s => s.id === id);
      if (sewadar) {
        const norm = normalizeName(sewadar.name);
        if (norm && !nameToDetailsMap.has(norm)) {
          nameToDetailsMap.set(norm, detail as SewadarDetails);
        }
      }
    });
    
    // Copy details dynamically for any other sewadars with the same normalized name
    visibleSewadars.forEach(s => {
      if (!map[s.id]) {
        const norm = normalizeName(s.name);
        const sharedDetail = nameToDetailsMap.get(norm);
        if (sharedDetail) {
          map[s.id] = {
            ...sharedDetail,
            sewadar_id: s.id
          };
        }
      }
    });
    
    return map;
  }, [sewadarDetailsMap, visibleSewadars, normalizeName]);

  const hasNewRequirements = useMemo(() => {
    if (!activeVolunteer) return false;
    return requirements.some(req => {
      const isNew = req.timestamp > lastRequirementsViewedAt;
      const isUpdated = req.updatedAt && req.updatedAt > lastRequirementsViewedAt;
      
      if (activeVolunteer.role === 'Super Admin') {
        // Admin sees dot for NEW requirements from others
        return isNew && req.volunteer_id !== activeVolunteer.id;
      } else {
        // Group Incharge sees dot for UPDATED requirements (usually by admin)
        // If updatedAt > timestamp, it means it was modified after creation
        return isUpdated && req.updatedAt! > req.timestamp;
      }
    });
  }, [requirements, lastRequirementsViewedAt, activeVolunteer]);

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

  const normalizeDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split(/[-/]/).map(Number);
    if (parts.length !== 3) return dateStr;
    let y, m, d;
    if (parts[0] > 1000) {
      [y, m, d] = parts;
    } else {
      [d, m, y] = parts;
    }
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const [configForm, setConfigForm] = useState({
    locations: [] as string[],
    startDate: getLocalDate(),
    startTime: '07:00',
    endDate: getTomorrowDate(),
    endTime: '07:00'
  });

  const isPermanentKirpalBagh = useMemo(() => {
    if (!activeVolunteer) return false;
    const targetGroup = activeVolunteer.role.includes('Ladies') 
      ? `Ladies-${activeVolunteer.assignedGroup}` 
      : (activeVolunteer.assignedGroup || 'Global');
    return [
      'HR Department',
      'PR Department',
      'Lost and Found',
      'Langar Department'
    ].includes(targetGroup);
  }, [activeVolunteer]);

  useEffect(() => {
    if (showSettingsModal && activeVolunteer) {
      const sessionToLoad = activeView === 'Dashboard' ? dashboardSelectedSession : activeSession;
      if (sessionToLoad) {
        const start = new Date(sessionToLoad.start_time);
        const end = new Date(sessionToLoad.end_time);
        
        const formatTime = (date: Date) => {
          return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        };

        const formatDate = (date: Date) => {
          const d = new Date(date);
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          return d.toISOString().split('T')[0];
        };

        setConfigForm({
          locations: isPermanentKirpalBagh ? ['Kirpal Bagh'] : (sessionToLoad.location ? sessionToLoad.location.split(', ').map(l => l.trim()).filter(l => LOCATIONS_LIST.includes(l)) : []),
          startDate: sessionToLoad.date || formatDate(start),
          startTime: formatTime(start),
          endDate: formatDate(end),
          endTime: formatTime(end)
        });
      } else {
        setConfigForm({
          locations: isPermanentKirpalBagh ? ['Kirpal Bagh'] : [],
          startDate: getLocalDate(),
          startTime: '07:00',
          endDate: getTomorrowDate(),
          endTime: '07:00'
        });
      }
    }
  }, [showSettingsModal, activeVolunteer, activeView, dashboardSelectedSession, activeSession, isPermanentKirpalBagh]);

  const fetchSessions = useCallback(async (isInitial = false) => {
    if (!activeVolunteer) return;
    
    try {
      const q = query(
        collection(db, 'daily_settings'),
        ...(activeVolunteer.role !== 'Super Admin' && activeVolunteer.assignedGroup 
          ? [where('group', 'in', activeVolunteer.role.includes('Ladies') 
              ? [`Ladies-${activeVolunteer.assignedGroup}`, 'Ladies'] 
              : [activeVolunteer.assignedGroup])] 
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
          return { ...d, id: doc.id, date: normalizeDate(String(dateStr || '')) };
        })
        .filter((s: any) => {
          if (!activeVolunteer || activeVolunteer.role === 'Super Admin') return true;
          if (!activeVolunteer.role.includes('Ladies')) return true;
          
          // For Ladies, we allow the specific day-prefixed group
          if (s.group === `Ladies-${activeVolunteer.assignedGroup}`) return true;
          
          // Or we allow the generic 'Ladies' group but ONLY if the date matches their assigned day
          if (s.group === 'Ladies' && s.date) {
            const date = new Date(s.date);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayOfWeek = days[date.getDay()];
            return dayOfWeek === activeVolunteer.assignedGroup;
          }
          return false;
        })
        .sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()) as any[];
      
      if (data && data.length > 0) {
        const mappedSessions = data.map((s: any) => ({
          ...s,
          id: String(s.id),
          location: s.location ? s.location.split(',').map((l: string) => l.trim()).filter((l: string) => LOCATIONS_LIST.includes(l)).join(', ') : ''
        }));
        
        // Deduplicate sessions by date + group.
        const uniqueSessionsMap: Record<string, DutySession> = {};
        mappedSessions.forEach((s: any) => {
          const key = `${s.date}-${s.group}`;
          if (!uniqueSessionsMap[key]) {
            uniqueSessionsMap[key] = s;
          }
        });
        const deduplicatedSessions = Object.values(uniqueSessionsMap).sort((a, b) => 
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );

        setAllSessions(deduplicatedSessions);
        
        // Set activeSession to the latest one by default
        setActiveSession(deduplicatedSessions[0] || null);

        if (isInitial) {
          const savedSessionId = localStorage.getItem(STORAGE_KEY_SESSION_ID);
          const savedSession = deduplicatedSessions.find(s => s.id === savedSessionId);
          
          if (savedSession) {
            setDashboardSelectedSession(savedSession);
          } else if (deduplicatedSessions[0]) {
            setDashboardSelectedSession(deduplicatedSessions[0]);
            localStorage.setItem(STORAGE_KEY_SESSION_ID, deduplicatedSessions[0].id);
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
      const map: Record<string, SewadarDetails> = { ...INITIAL_SEWADAR_DETAILS };
      if (data) {
        data.forEach((d: any) => {
          map[d.sewadar_id] = {
            sewadar_id: d.sewadar_id,
            address: d.address || '',
            dob: d.dob || '',
            phone: d.phone || ''
          };
        });
      }
      setSewadarDetailsMap(map);
    } catch (err) {
      console.error("Fetch Details Error:", err);
      setSewadarDetailsMap({ ...INITIAL_SEWADAR_DETAILS });
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

  useEffect(() => {
    const q = query(collection(db, 'notices'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Notice[];
      setNotices(data);
    }, (err) => {
      console.error("Notices Sync Error:", err);
    });
    return () => unsubscribe();
  }, []);

  const fetchSecurityPhoto = useCallback(async () => {
    try {
      const docSnap = await getDocs(query(collection(db, 'app_settings'), where('key', '==', 'security_notice_photo')));
      if (!docSnap.empty) {
        setSecurityNoticePhoto(docSnap.docs[0].data().value);
      }
    } catch (err) {
      console.error("Fetch Security Photo Error:", err);
    }
  }, []);

  const fetchDeletedSewadars = useCallback(async () => {
    try {
      const q = query(collection(db, 'deleted_sewadars'));
      const querySnapshot = await getDocs(q);
      setDeletedSewadarIds(new Set(querySnapshot.docs.map(d => d.id)));
    } catch (err) {
      console.error("Fetch Deleted Error:", err);
    }
  }, []);

  const handleUploadSecurityPhoto = async (photo: string) => {
    try {
      const q = query(collection(db, 'app_settings'), where('key', '==', 'security_notice_photo'));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        await addDoc(collection(db, 'app_settings'), { key: 'security_notice_photo', value: photo });
      } else {
        await updateDoc(doc(db, 'app_settings', querySnapshot.docs[0].id), { value: photo });
      }
      setSecurityNoticePhoto(photo);
    } catch (err) {
      console.error("Upload Security Photo Error:", err);
      alert("Failed to upload photo.");
    }
  };

  const handleAddNotice = async (title: string, content: string, photo?: string, pdf?: string) => {
    if (!activeVolunteer) return;
    try {
      const newNotice = {
        title,
        content,
        photo: photo || '',
        pdf: pdf || '',
        timestamp: Date.now(),
        authorName: activeVolunteer.name
      };
      await addDoc(collection(db, 'notices'), newNotice);
    } catch (err) {
      console.error("Add Notice Error:", err);
      alert("Failed to add notice.");
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!activeVolunteer || activeVolunteer.role !== 'Super Admin') return;
    if (!window.confirm("Delete this notice?")) return;
    try {
      await deleteDoc(doc(db, 'notices', id));
    } catch (err) {
      console.error("Delete Notice Error:", err);
    }
  };

  const handleUpdateNotice = async (id: string, title: string, content: string, photo?: string, pdf?: string) => {
    if (!activeVolunteer || activeVolunteer.role !== 'Super Admin') return;
    try {
      const noticeRef = doc(db, 'notices', id);
      await updateDoc(noticeRef, {
        title,
        content,
        photo: photo || '',
        pdf: pdf || '',
        timestamp: Date.now()
      });
    } catch (err) {
      console.error("Update Notice Error:", err);
      alert("Failed to update notice.");
    }
  };

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
      dateStr = normalizeDate(String(dateStr || ''));
      const [y, m, d] = dateStr.split('-').map(Number);
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
        return { ...d, id: doc.id, date: normalizeDate(String(dateStr || '')) };
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
        isProperUniform: a.is_proper_uniform,
        date: normalizeDate(a.date)
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
          group: s.group as DutyGroup,
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
    fetchSecurityPhoto();
  }, [fetchSecurityPhoto]);

  useEffect(() => {
    if (activeView === 'Requirements') {
      const now = Date.now();
      setLastRequirementsViewedAt(now);
      localStorage.setItem(STORAGE_KEY_LAST_REQ_VIEW, String(now));
    }
  }, [activeView]);

  useEffect(() => {
    if (activeVolunteer) {
      fetchSessions(true);
      fetchSewadarDetails();
      fetchRequirements();
      fetchDeletedSewadars();
    }
  }, [activeVolunteer, fetchSessions, fetchSewadarDetails, fetchRequirements, fetchDeletedSewadars]);

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
    if (!activeSession) return;
    const sessionDate = normalizeDate(activeSession.date);
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
      group: sessionGroup as DutyGroup,
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

  const handleSaveSewadarDetails = async (details: SewadarDetails, optionalName?: string) => {
    try {
      const targetSewadar = visibleSewadars.find(s => s.id === details.sewadar_id);
      const targetName = targetSewadar?.name || optionalName || '';
      const targetNorm = normalizeName(targetName);

      // We want to find ALL sewadars with the same normalized name
      const matchingSewadars = visibleSewadars.filter(s => {
        return targetNorm && normalizeName(s.name) === targetNorm;
      });

      const idsToUpdate = new Set<string>();
      idsToUpdate.add(details.sewadar_id);
      matchingSewadars.forEach(m => idsToUpdate.add(m.id));

      // Write details for ALL matching sewadars
      for (const id of idsToUpdate) {
        await setDoc(doc(db, 'sewadar_details', id), {
          sewadar_id: id,
          address: details.address,
          dob: details.dob,
          phone: details.phone
        }, { merge: true });
      }

      // Update the client state map for all matching IDs
      setSewadarDetailsMap(prev => {
        const next = { ...prev };
        idsToUpdate.forEach(id => {
          next[id] = {
            sewadar_id: id,
            address: details.address,
            dob: details.dob,
            phone: details.phone
          };
        });
        return next;
      });
    } catch (err) {
      console.error("Save Details Error:", err);
      throw err;
    }
  };

  const handleDeleteSewadar = async (id: string) => {
    if (!activeVolunteer || activeVolunteer.role !== 'Super Admin') return;
    if (!window.confirm("Are you sure you want to delete this member?")) return;
    try {
      await setDoc(doc(db, 'deleted_sewadars', id), { id, deletedAt: Date.now() });
      setDeletedSewadarIds(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    } catch (err) {
      console.error("Delete Sewadar Error:", err);
    }
  };

  const handleEditSewadar = async (id: string, newName: string) => {
    if (!activeVolunteer || activeVolunteer.role !== 'Super Admin') return;
    try {
      const sewadar = visibleSewadars.find(s => s.id === id);
      if (!sewadar) return;

      // Update custom_sewadars (this also acts as an override for INITIAL_SEWADARS)
      await setDoc(doc(db, 'custom_sewadars', id), {
        id,
        name: newName,
        gender: sewadar.gender,
        group: sewadar.group,
        shift: sewadar.shift || null
      }, { merge: true });

      // Update local state
      setCustomSewadars(prev => {
        const exists = prev.find(s => s.id === id);
        if (exists) {
          return prev.map(s => s.id === id ? { ...s, name: newName } : s);
        } else {
          return [...prev, { ...sewadar, name: newName, isCustom: true }];
        }
      });

      // Update attendance records in current active session to reflect name change
      const recordsToUpdate = activeAttendance.filter(a => a.sewadarId === id);
      for (const record of recordsToUpdate) {
        await updateDoc(doc(db, 'attendance', record.id), { name: newName });
      }
      
      // Update local active attendance
      setActiveAttendance(prev => prev.map(a => a.sewadarId === id ? { ...a, name: newName } : a));

    } catch (err) {
      console.error("Edit Sewadar Error:", err);
      alert("Failed to update name.");
    }
  };

  const handleSaveRequirement = async (description: string) => {
    if (!activeVolunteer) return;
    const now = Date.now();
    const newReq: Requirement = {
      id: generateNumericId(),
      group_name: activeVolunteer.role.includes('Ladies') ? `Ladies-${activeVolunteer.assignedGroup}` : (activeVolunteer.assignedGroup || 'Global'),
      description,
      timestamp: now,
      updatedAt: now,
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
      const now = Date.now();
      const updateData: any = { status, updatedAt: now };
      if (adminComment !== undefined) {
        updateData.adminComment = adminComment;
      }
      await updateDoc(doc(db, 'requirements', id), updateData);
      setRequirements(prev => prev.map(r => r.id === id ? { ...r, status, adminComment: adminComment ?? r.adminComment, updatedAt: now } : r));
    } catch (err) {
      console.error("Update Requirement Status Error:", err);
    }
  };

  const handleReportIssue = async (description: string, photo?: string) => {
    if (!activeVolunteer || !activeSession) return;
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
    if (!activeVolunteer || !activeSession) return;
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

  const handleSaveVehicle = async (v: Partial<VehicleRecord>, id?: string, isDelete?: boolean) => {
    if (!activeVolunteer || !activeSession) return;
    
    if (isDelete && id) {
      try {
        await deleteDoc(doc(db, 'vehicles', id));
        setActiveVehicles(prev => prev.filter(rec => rec.id !== id));
        if (dashboardSelectedSession?.id === activeSession.id) {
          setVehicles(prev => prev.filter(rec => rec.id !== id));
        }
      } catch (err) {
        console.error("Delete Vehicle Error:", err);
      }
      return;
    }

    if (id) {
      // Update existing
      try {
        const cleanPlate = v.plateNumber?.toUpperCase().trim();
        const updateData: any = {
          type: v.type,
          plate_number: cleanPlate,
          model: v.model,
          remarks: v.remarks
        };
        await updateDoc(doc(db, 'vehicles', id), updateData);
        
        const updateLocal = (prev: VehicleRecord[]) => prev.map(rec => rec.id === id ? { ...rec, ...v, plateNumber: cleanPlate || rec.plateNumber } : rec);
        setActiveVehicles(updateLocal);
        if (dashboardSelectedSession?.id === activeSession.id) {
          setVehicles(updateLocal);
        }
      } catch (err) {
        console.error("Update Vehicle Error:", err);
      }
      return;
    }

    // Create new
    const cleanPlate = v.plateNumber?.toUpperCase().trim() || '';
    const newV: VehicleRecord = {
      type: v.type as any,
      plateNumber: cleanPlate,
      model: v.model || '',
      remarks: v.remarks || '',
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
    const finalLocations = isPermanentKirpalBagh ? ['Kirpal Bagh'] : configForm.locations;
    if (finalLocations.length === 0) {
      alert("Please select at least one location.");
      return;
    }
    setIsSavingSettings(true);
    try {
      const groupName = activeVolunteer?.role.includes('Ladies') ? `Ladies-${activeVolunteer?.assignedGroup}` : (activeVolunteer?.assignedGroup || 'Global');
      
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
      const existing = allExisting.filter((s: any) => s.group === groupName);

      if (existing && existing.length > 0) {
        const payload = {
          location: finalLocations.join(', '),
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
          location: finalLocations.join(', '),
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
    // Finalization feature removed as per user request.
    // All sessions are now active and editable.
    alert("Finalization feature has been removed. All sessions are active.");
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm("Are you sure you want to delete this session? This will NOT delete attendance records associated with it, but the session configuration will be gone.")) return;
    try {
      await deleteDoc(doc(db, 'daily_settings', sessionId));
      setAllSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSession?.id === sessionId) setActiveSession(null);
      if (dashboardSelectedSession?.id === sessionId) {
        setDashboardSelectedSession(null);
        localStorage.removeItem(STORAGE_KEY_SESSION_ID);
      }
      alert("Session deleted successfully.");
    } catch (err) {
      alert("Error deleting session.");
    }
  };

  const handleSessionChange = (id: string) => {
    const session = allSessions.find(s => s.id === id) || null;
    setDashboardSelectedSession(session);
    setActiveSession(session);
    if (session) {
      localStorage.setItem(STORAGE_KEY_SESSION_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION_ID);
    }
    setActiveView('Attendance');
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

  const bannerVisible = !activeVolunteer || showSettingsModal || activeView === 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <div className="sticky top-0 z-50">
        {activeVolunteer && (
          <header className="bg-white/80 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between">
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Security Sewa</h1>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-slate-900">{activeVolunteer.name}</p>
                <p className="text-[8px] font-bold text-indigo-500 uppercase">{activeVolunteer.role}</p>
              </div>
              <button onClick={() => { localStorage.removeItem(STORAGE_KEY_VOLUNTEER); localStorage.removeItem(STORAGE_KEY_SESSION_ID); setActiveVolunteer(null); }} className="p-2.5 bg-slate-50 rounded-xl hover:text-red-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
            </div>
          </header>
        )}
      </div>

      {!activeVolunteer ? (
        <div className={`flex-1 flex flex-col transition-all ${bannerVisible && !isLoginMainScreen ? 'pb-24' : ''}`}>
          <Login 
            onLogin={v => { 
              try {
                setActiveVolunteer(v); 
                localStorage.setItem(STORAGE_KEY_VOLUNTEER, JSON.stringify(v)); 
              } catch (e) {
                console.error("Storage error:", e);
                setActiveVolunteer(v);
              }
            }} 
            onShowNotice={() => setShowNoticeModal(true)}
            onMainScreenChange={setIsLoginMainScreen}
            latestNotice={notices.length > 0 ? notices[0] : null}
          />
        </div>
      ) : (
        <>
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
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duty Location</label>
                      <div className="grid grid-cols-2 gap-2">
                        {LOCATIONS_LIST.filter(loc => !isPermanentKirpalBagh || loc === 'Kirpal Bagh').map(loc => {
                          const isSelected = isPermanentKirpalBagh 
                            ? loc === 'Kirpal Bagh' 
                            : configForm.locations.includes(loc);

                          return (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => {
                                if (isPermanentKirpalBagh) return;
                                setConfigForm(prev => {
                                  const exists = prev.locations.includes(loc);
                                  if (exists) {
                                    return { ...prev, locations: prev.locations.filter(l => l !== loc) };
                                  } else {
                                    return { ...prev, locations: [...prev.locations, loc] };
                                  }
                                });
                              }}
                              className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border-2 ${isPermanentKirpalBagh ? 'col-span-2 w-full text-center' : ''} ${
                                isSelected
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 font-bold'
                                  : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              {loc}
                            </button>
                          );
                        })}
                      </div>
                      {isPermanentKirpalBagh && (
                        <p className="text-[9px] font-bold text-indigo-500 mt-1 ml-1 uppercase tracking-wider">
                          * Location permanently locked to Kirpal Bagh for your department
                        </p>
                      )}
                    </div>
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

          <main className={`flex-1 overflow-y-auto px-6 pt-6 no-scrollbar transition-all ${bannerVisible ? 'pb-40' : 'pb-24'}`}>
        {activeView === 'Attendance' ? (
          <AttendanceManager 
            sewadars={visibleSewadars} 
            attendance={activeAttendance} 
            onSaveAttendance={saveAttendance} 
            onSaveVehicle={handleSaveVehicle}
            vehicles={activeVehicles}
            flaggedVehicles={flaggedVehicles}
            onAddSewadar={async (n, g, grp, shift, details) => {
              const newSewadar = { id: generateNumericId(), name: n, gender: g, group: grp, shift };
              try {
                await setDoc(doc(db, 'custom_sewadars', newSewadar.id), { 
                  id: newSewadar.id, 
                  name: newSewadar.name, 
                  gender: newSewadar.gender, 
                  group: newSewadar.group,
                  shift: newSewadar.shift || null
                });
                if (details) {
                  await handleSaveSewadarDetails({
                    sewadar_id: newSewadar.id,
                    dob: details.dob,
                    phone: details.phone,
                    address: details.address
                  }, newSewadar.name);
                }
                setCustomSewadars(prev => [...prev, { ...newSewadar, isCustom: true }]);
              } catch (error) { console.error('Failed to add sewadar:', error); }
            }} 
            activeVolunteer={activeVolunteer} 
            workshopLocation={activeSession?.location || null} 
            sessionDate={activeSession?.date || ''} 
            dutyStartTime={activeSession?.start_time || ''} 
            dutyEndTime={activeSession?.end_time || ''} 
            isCompleted={!!activeSession?.completed} 
            onChangeLocation={() => setShowSettingsModal(true)} 
            onDeleteSewadar={handleDeleteSewadar}
            onEditSewadar={handleEditSewadar}
            sessionGroup={activeSession?.group as DutyGroup || null}
          />
        ) : activeView === 'VolunteerDetails' ? (
          <VolunteerDetails
            sewadars={visibleSewadars}
            allSewadars={allSewadarsList}
            details={enrichedDetailsMap}
            activeVolunteer={activeVolunteer}
            onSaveDetails={handleSaveSewadarDetails}
            onDeleteSewadar={handleDeleteSewadar}
            onEditSewadar={handleEditSewadar}
          />
        ) : activeView === 'Requirements' ? (
          <RequirementsView
            requirements={requirements}
            activeVolunteer={activeVolunteer}
            onAddRequirement={handleSaveRequirement}
            onUpdateRequirementStatus={handleUpdateRequirementStatus}
          />
        ) : activeView === 'WeeklyReports' ? (
          <WeeklyReportsView activeVolunteer={activeVolunteer} />
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
            isSessionCompleted={false} 
            onSessionChange={handleSessionChange} 
            onReportIssue={handleReportIssue} 
            onSaveGroupPhoto={handleSaveGroupPhoto}
            onSaveVehicle={handleSaveVehicle} 
            onAddRequirement={handleSaveRequirement}
            onUpdateRequirementStatus={handleUpdateRequirementStatus}
            onUploadSecurityPhoto={handleUploadSecurityPhoto}
            isLoading={loading} 
            dutyStartTime={dashboardSelectedSession?.start_time || ''} 
            dutyEndTime={dashboardSelectedSession?.end_time || ''} 
            onOpenSettings={() => setShowSettingsModal(true)} 
            onCompleteSession={handleCompleteSession} 
            onResetAllData={handleResetAllData} 
            notices={notices}
            onAddNotice={handleAddNotice}
            onUpdateNotice={handleUpdateNotice}
            onDeleteNotice={handleDeleteNotice}
            onDeleteSession={handleDeleteSession}
          />
        )}
      </main>

      {activeVolunteer && (
        <nav className={`fixed left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t flex justify-around items-center p-3 pb-6 transition-all ${bannerVisible ? 'bottom-[64px]' : 'bottom-0'}`}>
          <button onClick={() => setActiveView('Attendance')} className={`flex-1 flex flex-col items-center gap-1 ${activeView === 'Attendance' ? 'text-indigo-600' : 'text-slate-400'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg><span className="text-[8px] font-black uppercase">Mark Sewa</span></button>
          <button onClick={() => setActiveView('VolunteerDetails')} className={`flex-1 flex flex-col items-center gap-1 ${activeView === 'VolunteerDetails' ? 'text-indigo-600' : 'text-slate-400'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg><span className="text-[8px] font-black uppercase">Details</span></button>
          <button onClick={() => setActiveView('Requirements')} className={`flex-1 flex flex-col items-center gap-1 ${activeView === 'Requirements' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <div className="relative">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              {hasNewRequirements && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
              )}
            </div>
            <span className="text-[8px] font-black uppercase">Requirements</span>
          </button>
          <button onClick={() => setActiveView('Dashboard')} className={`flex-1 flex flex-col items-center gap-1 ${activeView === 'Dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 00-2-2h2a2 2 0 002-2" /></svg><span className="text-[8px] font-black uppercase">Reports</span></button>
          {activeVolunteer.role === 'Super Admin' && (
            <button onClick={() => setActiveView('WeeklyReports')} className={`flex-1 flex flex-col items-center gap-1 ${activeView === 'WeeklyReports' ? 'text-indigo-600' : 'text-slate-400'}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="text-[8px] font-black uppercase">Weekly</span>
            </button>
          )}
        </nav>
      )}
        </>
      )}
      {bannerVisible && activeVolunteer && (
        <ImportantInfoBanner 
          photo={securityNoticePhoto} 
          externalShowModal={showNoticeModal} 
          onOpenExternal={() => setShowNoticeModal(true)}
          onCloseExternal={() => setShowNoticeModal(false)}
          notices={notices}
        />
      )}
      {bannerVisible && !activeVolunteer && (
        <ImportantInfoBanner 
          photo={securityNoticePhoto} 
          externalShowModal={showNoticeModal} 
          onOpenExternal={() => setShowNoticeModal(true)}
          onCloseExternal={() => setShowNoticeModal(false)}
          hideBottomBar={isLoginMainScreen}
          notices={notices}
        />
      )}
    </div>
  );
};

export default App;
