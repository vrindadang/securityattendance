import React, { useState, useEffect, useMemo } from 'react';
import { Sewadar, AttendanceRecord, DutyGroup, Gender, WorkshopPoint } from '../types';
import { GENTS_GROUPS, LADIES_GROUPS } from '../constants';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import {
  getWorkshopTestMode,
  setWorkshopTestMode,
  isTestModeDisabledByDate,
  checkAndAutoResetTestData,
  getStoredTestAttendance,
  saveStoredTestAttendance,
  getStoredTestPoints,
  saveStoredTestPoints,
  clearStoredTestData
} from '../workshopTestUtils';

interface WorkshopAttendanceViewProps {
  allSewadars: Sewadar[];
  activeVolunteer: { id: string; name: string; role: string };
  normalizeName: (name: string) => string;
  onNavigateToStandings?: () => void;
  onNavigateToReport?: () => void;
}

const WORKSHOP_DATE = '2026-08-30';

// Strict validator to ensure ONLY 30 August 2026 records are used in Workshop
export const isWorkshopDate = (dateVal: any): boolean => {
  if (!dateVal) return false;
  
  // 1. Firestore Timestamp
  if (typeof dateVal === 'object' && typeof dateVal.toDate === 'function') {
    try {
      const d = dateVal.toDate();
      const iso = d.toISOString().split('T')[0];
      if (iso === WORKSHOP_DATE) return true;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      if (`${y}-${m}-${day}` === WORKSHOP_DATE) return true;
      const uY = d.getUTCFullYear();
      const uM = String(d.getUTCMonth() + 1).padStart(2, '0');
      const uD = String(d.getUTCDate()).padStart(2, '0');
      if (`${uY}-${uM}-${uD}` === WORKSHOP_DATE) return true;
    } catch {
      // ignore
    }
  }

  // 2. Numeric timestamp
  if (typeof dateVal === 'number') {
    try {
      const d = new Date(dateVal > 1e11 ? dateVal : dateVal * 1000);
      const iso = d.toISOString().split('T')[0];
      if (iso === WORKSHOP_DATE) return true;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      if (`${y}-${m}-${day}` === WORKSHOP_DATE) return true;
    } catch {
      // ignore
    }
  }

  // 3. String date
  if (typeof dateVal === 'string') {
    const clean = dateVal.split('T')[0].trim();
    if (clean === WORKSHOP_DATE) return true;
    const parts = clean.split(/[-/]/).map(Number);
    if (parts.length === 3) {
      let y, m, dNum;
      if (parts[0] > 1000) {
        [y, m, dNum] = parts;
      } else {
        [dNum, m, y] = parts;
      }
      const formatted = `${y}-${String(m).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      if (formatted === WORKSHOP_DATE) return true;
    }
  }

  return false;
};

// Helper to determine team from gender + group
export const getWorkshopTeam = (gender: Gender, group: string): string => {
  const cleanGroup = group.trim().replace(/^ladies-/i, '').trim();
  if (gender === 'Ladies') {
    return `Ladies ${cleanGroup}`;
  }
  return cleanGroup;
};

export const WorkshopAttendanceView: React.FC<WorkshopAttendanceViewProps> = ({
  allSewadars,
  activeVolunteer,
  normalizeName,
  onNavigateToStandings,
  onNavigateToReport
}) => {
  const [selectedGender, setSelectedGender] = useState<Gender>('Gents');
  const [selectedGroup, setSelectedGroup] = useState<DutyGroup>('Monday');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Test Mode State
  const isDateLocked = isTestModeDisabledByDate();
  const [isTestMode, setIsTestMode] = useState<boolean>(() => getWorkshopTestMode());

  const [workshopAttendance, setWorkshopAttendance] = useState<AttendanceRecord[]>([]);
  const [workshopPoints, setWorkshopPoints] = useState<WorkshopPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Auto reset test data if 29 August or later
  useEffect(() => {
    checkAndAutoResetTestData();
  }, []);

  // Fetch 30 Aug attendance and points records with real-time live synchronization
  useEffect(() => {
    if (isTestMode) {
      setLoading(true);
      const testAtt = getStoredTestAttendance();
      const testPts = getStoredTestPoints();
      setWorkshopAttendance(testAtt);
      setWorkshopPoints(testPts);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [y, m, d] = WORKSHOP_DATE.split('-').map(Number);
    // Buffer Timestamp range to cover timezone variations while strictly validating date below
    const startOfDay = Timestamp.fromDate(new Date(y, m - 1, d - 1, 18, 0, 0));
    const endOfDay = Timestamp.fromDate(new Date(y, m - 1, d + 1, 6, 0, 0));

    // 1. Live attendance listener - strictly 30 Aug 2026
    const qAtt = query(
      collection(db, 'attendance'),
      where('date', '>=', startOfDay),
      where('date', '<=', endOfDay)
    );

    const unsubAtt = onSnapshot(
      qAtt,
      (snapshotAtt) => {
        const records: AttendanceRecord[] = [];
        snapshotAtt.docs.forEach(docSnap => {
          const data = docSnap.data();
          // STRICT DATE CHECK: Only include records from 30 August 2026
          if (!isWorkshopDate(data.date)) {
            return;
          }

          let dStr = data.date;
          if (dStr && typeof dStr !== 'string' && (dStr as any).toDate) {
            dStr = (dStr as any).toDate().toISOString().split('T')[0];
          }
          
          const rawGroup = (data.group || '').toString();
          const isLadies = data.gender === 'Ladies' || rawGroup.toLowerCase().includes('ladies');
          const gender: Gender = isLadies ? 'Ladies' : 'Gents';

          records.push({
            id: docSnap.id,
            sewadarId: data.sewadar_id || data.sewadarId || '',
            name: data.name || data.sewadarName || '',
            group: data.group,
            gender: gender,
            date: WORKSHOP_DATE,
            timestamp: data.timestamp || Date.now(),
            volunteerId: data.volunteer_id || data.volunteerId || '',
            inTime: data.in_time || data.inTime || '',
            outTime: data.out_time || data.outTime || '',
            sewaPoint: data.sewa_points || data.sewaPoint || 'Workshop',
            workshopLocation: data.workshop_location || data.workshopLocation || 'Workshop',
            isProperUniform: data.is_proper_uniform ?? data.isProperUniform ?? true
          });
        });
        setWorkshopAttendance(records);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to subscribe to live workshop attendance:', err);
        setLoading(false);
      }
    );

    // 2. Live points listener - strictly 30 Aug 2026
    const qPoints = query(
      collection(db, 'workshop_points'),
      where('date', '==', WORKSHOP_DATE)
    );

    const unsubPoints = onSnapshot(
      qPoints,
      (snapshotPoints) => {
        const pointsList: WorkshopPoint[] = snapshotPoints.docs.map(docSnap => {
          const data = docSnap.data();
          const rawGroup = (data.group || '').toString();
          const isLadies = data.gender === 'Ladies' || rawGroup.toLowerCase().includes('ladies');
          const gender: Gender = isLadies ? 'Ladies' : 'Gents';

          return {
            id: docSnap.id,
            sewadarId: data.sewadarId || data.sewadar_id || '',
            sewadarName: data.sewadarName || data.name || '',
            gender: gender,
            group: data.group,
            team: data.team || getWorkshopTeam(gender, data.group || ''),
            points: Number(data.points) || 0,
            reason: data.reason || 'Attendance',
            checkInTime: data.checkInTime || data.in_time || '',
            timestamp: data.timestamp || Date.now(),
            date: WORKSHOP_DATE,
            awardedBy: data.awardedBy || data.volunteer_id || ''
          };
        });
        setWorkshopPoints(pointsList);
      },
      (err) => {
        console.error('Failed to subscribe to live workshop points:', err);
      }
    );

    return () => {
      unsubAtt();
      unsubPoints();
    };
  }, [isTestMode]);

  const handleToggleTestMode = (newMode: boolean) => {
    if (isDateLocked) return;
    setIsTestMode(newMode);
    setWorkshopTestMode(newMode);
  };

  const handleClearTestData = () => {
    if (!window.confirm('Reset all test sandbox attendance and quiz points? This will not affect the real database.')) return;
    clearStoredTestData();
    setWorkshopAttendance([]);
    setWorkshopPoints([]);
  };

  const groupsList = useMemo(() => {
    return selectedGender === 'Gents' ? GENTS_GROUPS : LADIES_GROUPS;
  }, [selectedGender]);

  // Ensure selected group is valid when switching gender
  useEffect(() => {
    if (!groupsList.includes(selectedGroup)) {
      setSelectedGroup(groupsList[0] || 'Monday');
    }
  }, [selectedGender, groupsList, selectedGroup]);

  // Filter sewadars belonging to this gender and group
  const groupSewadars = useMemo(() => {
    const list = allSewadars.filter(s => {
      const matchGender = s.gender === selectedGender;
      let matchGroup = false;

      if (selectedGender === 'Ladies') {
        const normGroup = s.group.toLowerCase().replace('ladies-', '').trim();
        const normSelected = selectedGroup.toLowerCase().replace('ladies-', '').trim();
        matchGroup = normGroup === normSelected;
      } else {
        matchGroup = s.group === selectedGroup;
      }

      return matchGender && matchGroup;
    });

    // Deduplicate by name if duplicates exist
    const uniqueMap = new Map<string, Sewadar>();
    for (const s of list) {
      const key = normalizeName(s.name);
      const existing = uniqueMap.get(key);
      if (!existing || (!existing.isRestored && s.isRestored)) {
        uniqueMap.set(key, s);
      }
    }

    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allSewadars, selectedGender, selectedGroup, normalizeName]);

  // Filtered by search
  const filteredSewadars = useMemo(() => {
    if (!searchTerm.trim()) return groupSewadars;
    const term = searchTerm.toLowerCase();
    return groupSewadars.filter(s => s.name.toLowerCase().includes(term));
  }, [groupSewadars, searchTerm]);

  // Attendance lookup for quick status
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const rec of workshopAttendance) {
      if (rec.sewadarId) {
        map.set(rec.sewadarId, rec);
      }
      if (rec.name) {
        const normName = normalizeName(rec.name);
        const rawGroup = (rec.group || '').toLowerCase().replace(/^ladies-/i, '').trim();
        const gender = rec.gender || (rec.group?.toLowerCase().includes('ladies') ? 'Ladies' : 'Gents');

        map.set(`${gender}_${rawGroup}_${normName}`, rec);
        map.set(`${gender}_${normName}`, rec);
        map.set(normName, rec);
      }
    }
    return map;
  }, [workshopAttendance, normalizeName]);

  // Points breakdown per sewadar
  const sewadarPointsBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; attPoints: number; quizCount: number; quizPoints: number; records: WorkshopPoint[] }>();

    for (const pt of workshopPoints) {
      const keys: string[] = [];
      if (pt.sewadarId) keys.push(pt.sewadarId);
      if (pt.sewadarName) {
        const normName = normalizeName(pt.sewadarName);
        const rawGroup = (pt.group || '').toLowerCase().replace(/^ladies-/i, '').trim();
        const gender = pt.gender || (pt.group?.toLowerCase().includes('ladies') ? 'Ladies' : 'Gents');
        keys.push(`${gender}_${rawGroup}_${normName}`);
        keys.push(`${gender}_${normName}`);
        keys.push(normName);
      }

      for (const key of keys) {
        const existing = map.get(key) || { total: 0, attPoints: 0, quizCount: 0, quizPoints: 0, records: [] };
        existing.total += pt.points;
        if (pt.reason === 'Quiz') {
          existing.quizCount += 1;
          existing.quizPoints += pt.points;
        } else {
          existing.attPoints += pt.points;
        }
        existing.records.push(pt);
        map.set(key, existing);
      }
    }

    // Also sync attendance points from group logins for 30 Aug 2026 if not already in workshop_points
    for (const rec of workshopAttendance) {
      const keys: string[] = [];
      if (rec.sewadarId) keys.push(rec.sewadarId);
      if (rec.name) {
        const normName = normalizeName(rec.name);
        const rawGroup = (rec.group || '').toLowerCase().replace(/^ladies-/i, '').trim();
        const gender = rec.gender || (rec.group?.toLowerCase().includes('ladies') ? 'Ladies' : 'Gents');
        keys.push(`${gender}_${rawGroup}_${normName}`);
        keys.push(`${gender}_${normName}`);
        keys.push(normName);
      }

      const primaryKey = keys[0];
      const existing = primaryKey ? map.get(primaryKey) : undefined;
      const hasAttPoint = existing?.records.some(r => r.reason.startsWith('Attendance'));

      if (!hasAttPoint) {
        const time = rec.inTime || '';
        const [h, m] = time.split(':').map(Number);
        const isEarly = !isNaN(h) ? (h < 9 || (h === 9 && m < 30)) : true;
        const pts = isEarly ? 100 : 50;
        const fakePt: WorkshopPoint = {
          id: `synced_${rec.id}`,
          sewadarId: rec.sewadarId,
          sewadarName: rec.name,
          gender: rec.gender,
          group: rec.group,
          team: getWorkshopTeam(rec.gender, rec.group),
          points: pts,
          reason: isEarly ? 'Attendance – Early' : 'Attendance – Late',
          checkInTime: rec.inTime,
          timestamp: rec.timestamp,
          date: WORKSHOP_DATE,
          awardedBy: rec.volunteerId
        };

        for (const key of keys) {
          const item = map.get(key) || { total: 0, attPoints: 0, quizCount: 0, quizPoints: 0, records: [] };
          item.total += pts;
          item.attPoints += pts;
          item.records.push(fakePt);
          map.set(key, item);
        }
      }
    }

    return map;
  }, [workshopPoints, workshopAttendance, normalizeName]);

  // Team totals summary
  const currentTeamName = useMemo(() => {
    return getWorkshopTeam(selectedGender, selectedGroup);
  }, [selectedGender, selectedGroup]);

  const currentTeamPointsTotal = useMemo(() => {
    let total = 0;
    for (const s of groupSewadars) {
      const cleanGroup = s.group.toLowerCase().replace(/^ladies-/i, '').trim();
      const normName = normalizeName(s.name);
      const breakdown = sewadarPointsBreakdown.get(s.id) ||
                        sewadarPointsBreakdown.get(`${s.gender}_${cleanGroup}_${normName}`) ||
                        sewadarPointsBreakdown.get(`${s.gender}_${normName}`) ||
                        sewadarPointsBreakdown.get(normName);
      if (breakdown) {
        total += breakdown.total;
      }
    }
    return total;
  }, [groupSewadars, sewadarPointsBreakdown, normalizeName]);

  // Count how many from current group are marked present
  const markedPresentCount = useMemo(() => {
    let count = 0;
    for (const s of groupSewadars) {
      const cleanGroup = s.group.toLowerCase().replace(/^ladies-/i, '').trim();
      const normName = normalizeName(s.name);
      const rec = attendanceMap.get(s.id) || 
                  attendanceMap.get(`${s.gender}_${cleanGroup}_${normName}`) ||
                  attendanceMap.get(`${s.gender}_${normName}`);
      if (rec) count++;
    }
    return count;
  }, [groupSewadars, attendanceMap, normalizeName]);

  // Total unique marked across all groups for Workshop (deduplicated and synced with every group)
  const { totalWorkshopMarkedGents, totalWorkshopMarkedLadies, totalWorkshopMarked } = useMemo(() => {
    const markedGentsIds = new Set<string>();
    const markedLadiesIds = new Set<string>();

    // 1. Iterate over all registered sewadars
    for (const s of allSewadars) {
      const cleanGroup = s.group.toLowerCase().replace(/^ladies-/i, '').trim();
      const normName = normalizeName(s.name);
      const rec = attendanceMap.get(s.id) || 
                  attendanceMap.get(`${s.gender}_${cleanGroup}_${normName}`) ||
                  attendanceMap.get(`${s.gender}_${normName}`);
      
      if (rec) {
        if (s.gender === 'Ladies') {
          markedLadiesIds.add(s.id);
        } else {
          markedGentsIds.add(s.id);
        }
      }
    }

    // 2. Include any attendance records that might not be in allSewadars static list
    for (const rec of workshopAttendance) {
      const isLadies = rec.gender === 'Ladies' || (rec.group && rec.group.toLowerCase().includes('ladies'));
      const normName = normalizeName(rec.name || '');
      const key = rec.sewadarId || `${isLadies ? 'Ladies' : 'Gents'}_${normName || rec.id}`;
      
      if (isLadies) {
        if (!markedLadiesIds.has(rec.sewadarId || '')) {
          markedLadiesIds.add(key);
        }
      } else {
        if (!markedGentsIds.has(rec.sewadarId || '')) {
          markedGentsIds.add(key);
        }
      }
    }

    const gents = markedGentsIds.size;
    const ladies = markedLadiesIds.size;
    return {
      totalWorkshopMarkedGents: gents,
      totalWorkshopMarkedLadies: ladies,
      totalWorkshopMarked: gents + ladies
    };
  }, [allSewadars, attendanceMap, workshopAttendance, normalizeName]);

  // Handle Mark Present + Auto Award Attendance Points
  const handleMarkPresent = async (s: Sewadar) => {
    const cleanGroup = s.group.toLowerCase().replace(/^ladies-/i, '').trim();
    const normName = normalizeName(s.name);
    const existing = attendanceMap.get(s.id) || 
                     attendanceMap.get(`${s.gender}_${cleanGroup}_${normName}`) ||
                     attendanceMap.get(`${s.gender}_${normName}`) ||
                     attendanceMap.get(normName);
    if (existing) {
      return; // Already marked
    }

    setActionLoadingId(`att_${s.id}`);
    const finalRecordId = Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const pointsRecordId = `wp_att_${finalRecordId}`;
    
    // 1. Get exact current local time (HH:mm)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const hours = String(currentHour).padStart(2, '0');
    const minutes = String(currentMinute).padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;

    // 2. Early vs Late Rule: Before 9:30 AM = 100 pts, 9:30 AM or later = 50 pts
    const isEarly = currentHour < 9 || (currentHour === 9 && currentMinute < 30);
    const awardedPoints = isEarly ? 100 : 50;
    const reasonText = isEarly ? 'Attendance – Early' : 'Attendance – Late';

    // 3. Compute Team Name
    const teamName = getWorkshopTeam(s.gender, s.group);

    const localAttendanceRecord: AttendanceRecord = {
      id: finalRecordId,
      sewadarId: s.id,
      name: s.name,
      group: s.group as DutyGroup,
      gender: s.gender as Gender,
      date: WORKSHOP_DATE,
      timestamp: Date.now(),
      volunteerId: activeVolunteer.id,
      inTime: currentTimeStr,
      outTime: '',
      sewaPoint: 'Workshop',
      workshopLocation: 'Workshop',
      isProperUniform: true
    };

    const localPointsRecord: WorkshopPoint = {
      id: pointsRecordId,
      sewadarId: s.id,
      sewadarName: s.name,
      gender: s.gender,
      group: s.group,
      team: teamName,
      points: awardedPoints,
      reason: reasonText,
      checkInTime: currentTimeStr,
      timestamp: Date.now(),
      date: WORKSHOP_DATE,
      awardedBy: activeVolunteer.id
    };

    // If Test Mode: Save only in sandbox storage, zero DB calls
    if (isTestMode) {
      const updatedAtt = [...workshopAttendance, localAttendanceRecord];
      const updatedPts = [...workshopPoints, localPointsRecord];
      setWorkshopAttendance(updatedAtt);
      setWorkshopPoints(updatedPts);
      saveStoredTestAttendance(updatedAtt);
      saveStoredTestPoints(updatedPts);
      setActionLoadingId(null);
      return;
    }

    // Live Mode: Write directly to Firestore
    const [y, m, d] = WORKSHOP_DATE.split('-').map(Number);
    const dateTimestamp = Timestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0));

    const dbPayload = {
      id: finalRecordId,
      sewadar_id: s.id,
      name: s.name,
      group: s.group,
      gender: s.gender,
      date: dateTimestamp,
      timestamp: Date.now(),
      volunteer_id: activeVolunteer.id,
      in_time: currentTimeStr,
      out_time: '',
      sewa_points: 'Workshop',
      workshop_location: 'Workshop',
      is_proper_uniform: true
    };

    const pointsPayload = {
      ...localPointsRecord
    };

    try {
      await Promise.all([
        setDoc(doc(db, 'attendance', finalRecordId), dbPayload),
        setDoc(doc(db, 'workshop_points', pointsRecordId), pointsPayload)
      ]);

      setWorkshopAttendance(prev => [...prev, localAttendanceRecord]);
      setWorkshopPoints(prev => [...prev, localPointsRecord]);
    } catch (err) {
      console.error('Failed to mark live workshop attendance & points:', err);
      alert('Failed to save attendance and points. Please try again.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Award Quiz +50 Points
  const handleAwardQuiz = async (s: Sewadar) => {
    setActionLoadingId(`quiz_${s.id}`);
    const uniqueId = `wp_quiz_${Date.now()}_${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;

    const teamName = getWorkshopTeam(s.gender, s.group);

    const quizPointPayload: WorkshopPoint = {
      id: uniqueId,
      sewadarId: s.id,
      sewadarName: s.name,
      gender: s.gender,
      group: s.group,
      team: teamName,
      points: 50,
      reason: 'Quiz',
      checkInTime: currentTimeStr,
      timestamp: Date.now(),
      date: WORKSHOP_DATE,
      awardedBy: activeVolunteer.id
    };

    // If Test Mode: Save in sandbox storage only
    if (isTestMode) {
      const updatedPts = [...workshopPoints, quizPointPayload];
      setWorkshopPoints(updatedPts);
      saveStoredTestPoints(updatedPts);
      setActionLoadingId(null);
      return;
    }

    // Live Mode: Write to Firestore
    try {
      await setDoc(doc(db, 'workshop_points', uniqueId), quizPointPayload);
      setWorkshopPoints(prev => [...prev, quizPointPayload]);
    } catch (err) {
      console.error('Failed to award live quiz points:', err);
      alert('Failed to award quiz points. Please try again.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Unmark attendance
  const handleUnmarkAttendance = async (s: Sewadar, recordId: string) => {
    if (!window.confirm(`Unmark attendance and attendance points for ${s.name}? (Any quiz points earned will remain).`)) return;
    setActionLoadingId(`unmark_${s.id}`);

    const cleanGroup = s.group.toLowerCase().replace(/^ladies-/i, '').trim();
    const normName = normalizeName(s.name);
    const breakdown = sewadarPointsBreakdown.get(s.id) || 
                      sewadarPointsBreakdown.get(`${s.gender}_${cleanGroup}_${normName}`) ||
                      sewadarPointsBreakdown.get(`${s.gender}_${normName}`) ||
                      sewadarPointsBreakdown.get(normName);
    const attPointDoc = breakdown?.records.find(r => r.reason.startsWith('Attendance'));

    if (isTestMode) {
      const updatedAtt = workshopAttendance.filter(r => r.id !== recordId);
      const updatedPts = attPointDoc ? workshopPoints.filter(p => p.id !== attPointDoc.id) : workshopPoints;
      setWorkshopAttendance(updatedAtt);
      setWorkshopPoints(updatedPts);
      saveStoredTestAttendance(updatedAtt);
      saveStoredTestPoints(updatedPts);
      setActionLoadingId(null);
      return;
    }

    try {
      const deletions: Promise<any>[] = [deleteDoc(doc(db, 'attendance', recordId))];
      if (attPointDoc) {
        deletions.push(deleteDoc(doc(db, 'workshop_points', attPointDoc.id)));
      }

      await Promise.all(deletions);
      setWorkshopAttendance(prev => prev.filter(r => r.id !== recordId));
      if (attPointDoc) {
        setWorkshopPoints(prev => prev.filter(p => p.id !== attPointDoc.id));
      }
    } catch (err) {
      console.error('Failed to delete live attendance record:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Undo single quiz award
  const handleUndoQuiz = async (s: Sewadar, quizPointId: string) => {
    if (!window.confirm(`Undo one quiz +50 award for ${s.name}?`)) return;
    setActionLoadingId(`undo_quiz_${s.id}`);

    if (isTestMode) {
      const updatedPts = workshopPoints.filter(p => p.id !== quizPointId);
      setWorkshopPoints(updatedPts);
      saveStoredTestPoints(updatedPts);
      setActionLoadingId(null);
      return;
    }

    try {
      await deleteDoc(doc(db, 'workshop_points', quizPointId));
      setWorkshopPoints(prev => prev.filter(p => p.id !== quizPointId));
    } catch (err) {
      console.error('Failed to remove live quiz point:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-3xl mx-auto pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          {/* Top Controls Bar: Badge + Test/Live Toggle */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-100">
                One-Day Special Event
              </span>
              <span className="text-xs font-black text-amber-300 bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-500/30">
                30 August 2026
              </span>
            </div>

            {/* Test vs Live Mode Toggle */}
            {isDateLocked ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl text-emerald-300 text-xs font-black uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Mode (30 Aug)</span>
              </div>
            ) : (
              <div className="bg-black/30 p-1 rounded-2xl flex items-center border border-white/10 shadow-inner">
                <button
                  onClick={() => handleToggleTestMode(true)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                    isTestMode
                      ? 'bg-amber-400 text-amber-950 shadow-md scale-105'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <span>🧪</span>
                  <span>Test</span>
                </button>
                <button
                  onClick={() => handleToggleTestMode(false)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                    !isTestMode
                      ? 'bg-emerald-500 text-white shadow-md scale-105'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <span>🟢</span>
                  <span>Live</span>
                </button>
              </div>
            )}
          </div>

          {/* Test Mode Notification Strip */}
          {isTestMode && !isDateLocked && (
            <div className="flex items-center justify-between gap-2 px-4 py-2 bg-amber-500/20 border border-amber-400/30 rounded-2xl text-amber-200 text-xs font-bold">
              <div className="flex items-center gap-1.5 min-w-0">
                <span>⚠️</span>
                <span className="truncate">Test Mode: Dummy data only. Database is not affected.</span>
              </div>
              <button
                onClick={handleClearTestData}
                className="px-2.5 py-1 bg-amber-400 text-amber-950 rounded-lg text-[10px] font-black uppercase tracking-wider flex-shrink-0 hover:bg-amber-300 active:scale-95 transition-all shadow-sm"
              >
                Reset Test Data
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Workshop Attendance & Points</h1>
            <div className="flex items-center gap-2">
              {onNavigateToReport && (
                <button
                  onClick={onNavigateToReport}
                  className="px-3.5 py-2 bg-indigo-500/40 hover:bg-indigo-500/60 text-white border border-indigo-300/40 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <span>📊</span>
                  <span>Points Report</span>
                </button>
              )}
              {onNavigateToStandings && (
                <button
                  onClick={onNavigateToStandings}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/30 transition-all active:scale-95"
                >
                  <span>🏆</span>
                  <span>Team Standings</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-indigo-200 font-medium">
            Early Attendance: <span className="font-black text-emerald-300">100 pts</span> (&lt;9:30 AM) • Late: <span className="font-black text-amber-300">50 pts</span> • Oral Quiz: <span className="font-black text-purple-300">+50 pts</span>
          </p>

          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
              <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest">Group Present</p>
              <p className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {markedPresentCount} <span className="text-xs text-indigo-300 font-bold">/ {groupSewadars.length}</span>
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
              <p className="text-[9px] font-black text-amber-300 uppercase tracking-widest truncate">Team Points ({currentTeamName})</p>
              <p className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">{currentTeamPointsTotal} <span className="text-[10px] text-amber-200 font-normal">pts</span></p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
              <p className="text-[9px] font-black text-emerald-300 uppercase tracking-widest">Total Workshop Present</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">{totalWorkshopMarked}</p>
            </div>
          </div>

          {/* Gents / Ladies Present Breakdown */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
              <p className="text-[9px] font-black text-sky-300 uppercase tracking-widest">Total Gents Present</p>
              <p className="text-xl sm:text-2xl font-black text-sky-400 mt-0.5">{totalWorkshopMarkedGents}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
              <p className="text-[9px] font-black text-pink-300 uppercase tracking-widest">Total Ladies Present</p>
              <p className="text-xl sm:text-2xl font-black text-pink-400 mt-0.5">{totalWorkshopMarkedLadies}</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Gender Toggle */}
      <div className="bg-slate-200/60 p-1.5 rounded-[2.2rem] flex items-center shadow-inner gap-1">
        <button
          onClick={() => setSelectedGender('Gents')}
          className={`flex-1 py-3.5 px-6 rounded-[1.8rem] font-black text-xs uppercase tracking-wider transition-all duration-200 ${
            selectedGender === 'Gents'
              ? 'bg-white text-indigo-900 shadow-md scale-[1.01]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Gents ({allSewadars.filter(s => s.gender === 'Gents').length})
        </button>
        <button
          onClick={() => setSelectedGender('Ladies')}
          className={`flex-1 py-3.5 px-6 rounded-[1.8rem] font-black text-xs uppercase tracking-wider transition-all duration-200 ${
            selectedGender === 'Ladies'
              ? 'bg-white text-indigo-900 shadow-md scale-[1.01]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Ladies ({allSewadars.filter(s => s.gender === 'Ladies').length})
        </button>
      </div>

      {/* Day Group Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
        {groupsList.map(group => {
          const isSelected = selectedGroup === group;
          return (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all flex-shrink-0 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {group}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder={`Search ${selectedGender} ${selectedGroup} Sewadars...`}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none shadow-sm font-black text-slate-800 focus:border-indigo-500 transition-all text-sm pl-12"
        />
        <svg
          className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 hover:text-slate-600 px-2 py-1 bg-slate-100 rounded-lg"
          >
            Clear
          </button>
        )}
      </div>

      {/* Sewadars List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-16 bg-white rounded-[2.5rem] border border-slate-100">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3">Loading records...</p>
          </div>
        ) : filteredSewadars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
            <p className="text-slate-400 font-black text-sm uppercase tracking-wider">No Sewadars Found</p>
            <p className="text-slate-300 text-xs mt-1 font-bold">
              {searchTerm ? 'Try changing your search term.' : `No sewadars listed under ${selectedGender} ${selectedGroup}.`}
            </p>
          </div>
        ) : (
          filteredSewadars.map((s, idx) => {
            const cleanGroup = s.group.toLowerCase().replace(/^ladies-/i, '').trim();
            const normName = normalizeName(s.name);
            const record = attendanceMap.get(s.id) || 
                           attendanceMap.get(`${s.gender}_${cleanGroup}_${normName}`) ||
                           attendanceMap.get(`${s.gender}_${normName}`) ||
                           attendanceMap.get(normName);
            const breakdown = sewadarPointsBreakdown.get(s.id) || 
                              sewadarPointsBreakdown.get(`${s.gender}_${cleanGroup}_${normName}`) ||
                              sewadarPointsBreakdown.get(`${s.gender}_${normName}`) ||
                              sewadarPointsBreakdown.get(normName);
            const isMarked = !!record;
            
            const isAttLoading = actionLoadingId === `att_${s.id}` || actionLoadingId === `unmark_${s.id}`;
            const isQuizLoading = actionLoadingId === `quiz_${s.id}` || actionLoadingId === `undo_quiz_${s.id}`;

            const individualTotalPoints = breakdown ? breakdown.total : 0;
            const quizPoints = breakdown ? breakdown.quizPoints : 0;
            const quizCount = breakdown ? breakdown.quizCount : 0;
            const attPoints = breakdown ? breakdown.attPoints : 0;
            const quizRecords = breakdown ? breakdown.records.filter(r => r.reason === 'Quiz') : [];

            return (
              <div
                key={s.id}
                className={`p-4 sm:p-5 rounded-[2rem] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isMarked
                    ? 'bg-emerald-50/40 border-emerald-200/80 shadow-sm'
                    : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
                }`}
              >
                {/* Left: Info, Check-in status & Points breakdown */}
                <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                  <span className={`text-xs font-black w-6 text-center flex-shrink-0 mt-1 ${isMarked ? 'text-emerald-500 font-black' : 'text-slate-300'}`}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-sm sm:text-base text-slate-900 truncate">
                        {s.name}
                      </p>
                      <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        {s.group} {s.shift ? `(${s.shift})` : ''}
                      </span>
                    </div>

                    {/* Status & Point Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {isMarked ? (
                        <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          In: {record.inTime || 'Present'} {attPoints > 0 ? `(+${attPoints} pts)` : ''}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg">
                          Not Checked In
                        </span>
                      )}

                      {quizCount > 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-200/60 rounded-lg flex items-center gap-1">
                          Quiz: {quizCount}x (+{quizPoints} pts)
                          {quizRecords.length > 0 && (
                            <button
                              onClick={() => handleUndoQuiz(s, quizRecords[quizRecords.length - 1].id)}
                              title="Undo last quiz award (-50 pts)"
                              className="ml-1 text-purple-600 hover:text-red-600 font-black"
                            >
                              ✕
                            </button>
                          )}
                        </span>
                      )}

                      {/* Total Individual Points Indicator */}
                      <span className="text-[10px] font-black px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300/80 rounded-lg shadow-2xs">
                        Individual Total: {individualTotalPoints} pts
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons: Mark Present + Award Quiz +50 */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Award Quiz +50 Button (allowed multiple times) */}
                  <button
                    onClick={() => handleAwardQuiz(s)}
                    disabled={isQuizLoading}
                    title="Award +50 points for correct quiz answer"
                    className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-sm shadow-purple-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {isQuizLoading ? '...' : 'Quiz +50'}
                  </button>

                  {/* Mark Attendance Button */}
                  {isMarked ? (
                    <button
                      onClick={() => handleUnmarkAttendance(s, record.id)}
                      disabled={isAttLoading}
                      title="Click to unmark attendance"
                      className="px-3.5 py-2.5 bg-emerald-600 hover:bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm group disabled:opacity-50"
                    >
                      <span className="group-hover:hidden flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Present
                      </span>
                      <span className="hidden group-hover:inline">Unmark</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMarkPresent(s)}
                      disabled={isAttLoading}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-100 transition-all disabled:opacity-50"
                    >
                      {isAttLoading ? 'Saving...' : 'Mark Present'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default WorkshopAttendanceView;
