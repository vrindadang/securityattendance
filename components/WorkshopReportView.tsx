import React, { useState, useEffect, useMemo } from 'react';
import { Sewadar, WorkshopPoint, Gender, AttendanceRecord, DutyGroup } from '../types';
import { GENTS_GROUPS, LADIES_GROUPS } from '../constants';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  getWorkshopTestMode,
  setWorkshopTestMode,
  isTestModeDisabledByDate,
  checkAndAutoResetTestData,
  getStoredTestAttendance,
  getStoredTestPoints,
  clearStoredTestData
} from '../workshopTestUtils';
import { getWorkshopTeam, isWorkshopDate } from './WorkshopAttendanceView';

interface WorkshopReportViewProps {
  allSewadars: Sewadar[];
  activeVolunteer: { id: string; name: string; role: string };
  normalizeName: (name: string) => string;
  onNavigateToAttendance: () => void;
  onNavigateToStandings: () => void;
}

interface SewadarPointsDetail {
  sewadarId: string;
  name: string;
  gender: Gender;
  group: string;
  team: string;
  shift?: string;
  isPresent: boolean;
  inTime: string;
  attendancePoints: number;
  attendanceLabel: string;
  quizCount: number;
  quizPoints: number;
  totalPoints: number;
}

interface GroupSummary {
  groupName: string;
  teamName: string;
  gender: Gender;
  totalMembers: number;
  presentCount: number;
  absentCount: number;
  attendancePercent: number;
  earlyCount: number;
  lateCount: number;
  totalPoints: number;
  totalParticipants: number;
  totalAttPoints: number;
  totalQuizPoints: number;
  members: SewadarPointsDetail[];
}

const WORKSHOP_DATE = '2026-08-30';
const WORKSHOP_SECURITY_DAYS: DutyGroup[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export const WorkshopReportView: React.FC<WorkshopReportViewProps> = ({
  allSewadars,
  activeVolunteer,
  normalizeName,
  onNavigateToAttendance,
  onNavigateToStandings
}) => {
  const isDateLocked = isTestModeDisabledByDate();
  const [isTestMode, setIsTestMode] = useState<boolean>(() => getWorkshopTestMode());
  const [workshopAttendance, setWorkshopAttendance] = useState<AttendanceRecord[]>([]);
  const [workshopPoints, setWorkshopPoints] = useState<WorkshopPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState<string | null>(null);

  const [reportTab, setReportTab] = useState<'all' | 'gents_att' | 'ladies_att' | 'points'>('all');
  const [attSearchQuery, setAttSearchQuery] = useState('');

  useEffect(() => {
    checkAndAutoResetTestData();
  }, []);

  // Fetch points & attendance data
  const fetchData = async (testModeActive: boolean) => {
    if (testModeActive) {
      setLoading(true);
      const testAtt = getStoredTestAttendance();
      const testPts = getStoredTestPoints();
      setWorkshopAttendance(testAtt);
      setWorkshopPoints(testPts);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [y, m, d] = WORKSHOP_DATE.split('-').map(Number);
      const startOfDay = Timestamp.fromDate(new Date(y, m - 1, d - 1, 18, 0, 0));
      const endOfDay = Timestamp.fromDate(new Date(y, m - 1, d + 1, 6, 0, 0));

      // 1. Attendance query: by timestamp range
      const qAtt1 = query(
        collection(db, 'attendance'),
        where('date', '>=', startOfDay),
        where('date', '<=', endOfDay)
      );
      // 2. Attendance query: by string date "2026-08-30"
      const qAtt2 = query(
        collection(db, 'attendance'),
        where('date', '==', WORKSHOP_DATE)
      );
      // 3. Attendance query: by string date "30-08-2026"
      const qAtt3 = query(
        collection(db, 'attendance'),
        where('date', '==', '30-08-2026')
      );

      const [snapAtt1, snapAtt2, snapAtt3] = await Promise.all([
        getDocs(qAtt1).catch(() => ({ docs: [] })),
        getDocs(qAtt2).catch(() => ({ docs: [] })),
        getDocs(qAtt3).catch(() => ({ docs: [] }))
      ]);

      const attDocMap = new Map<string, any>();
      [...snapAtt1.docs, ...snapAtt2.docs, ...snapAtt3.docs].forEach(d => {
        attDocMap.set(d.id, d);
      });

      const records: AttendanceRecord[] = [];
      attDocMap.forEach((docSnap) => {
        const data = docSnap.data();
        if (!isWorkshopDate(data.date)) return;

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

      // Points strictly for 30 Aug 2026
      const qPts1 = query(
        collection(db, 'workshop_points'),
        where('date', '==', WORKSHOP_DATE)
      );
      const qPts2 = query(
        collection(db, 'workshop_points'),
        where('date', '==', '30-08-2026')
      );
      const [snapPts1, snapPts2] = await Promise.all([
        getDocs(qPts1).catch(() => ({ docs: [] })),
        getDocs(qPts2).catch(() => ({ docs: [] }))
      ]);

      const ptsDocMap = new Map<string, any>();
      [...snapPts1.docs, ...snapPts2.docs].forEach(d => {
        ptsDocMap.set(d.id, d);
      });

      const ptsList: WorkshopPoint[] = [];
      ptsDocMap.forEach((docSnap) => {
        const data = docSnap.data();
        const rawGroup = (data.group || '').toString();
        const isLadies = data.gender === 'Ladies' || rawGroup.toLowerCase().includes('ladies');
        const gender: Gender = isLadies ? 'Ladies' : 'Gents';

        ptsList.push({
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
        });
      });
      setWorkshopPoints(ptsList);
    } catch (err) {
      console.error('Failed to load workshop report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(isTestMode);
  }, [isTestMode]);

  const handleToggleTestMode = (newMode: boolean) => {
    if (isDateLocked) return;
    setIsTestMode(newMode);
    setWorkshopTestMode(newMode);
  };

  const handleClearTestData = () => {
    if (!window.confirm('Reset all test sandbox data? Real database will not be touched.')) return;
    clearStoredTestData();
    setWorkshopAttendance([]);
    setWorkshopPoints([]);
  };

  // Compile detailed sewadar map & group aggregates
  const { gentsGroupSummaries, ladiesGroupSummaries, top3GentsGroups, top3LadiesGroups } = useMemo(() => {
    // Map of sewadarId -> points and attendance info
    const sewadarMap = new Map<string, SewadarPointsDetail>();

    // 1. Process all sewadars in allSewadars list
    allSewadars.forEach(s => {
      const teamName = getWorkshopTeam(s.gender, s.group);
      const key = s.id;
      sewadarMap.set(key, {
        sewadarId: s.id,
        name: s.name,
        gender: s.gender,
        group: s.group,
        team: teamName,
        shift: s.shift,
        isPresent: false,
        inTime: '',
        attendancePoints: 0,
        attendanceLabel: '0 pts (Absent)',
        quizCount: 0,
        quizPoints: 0,
        totalPoints: 0
      });
    });

    // 2. Attach workshop points
    workshopPoints.forEach(p => {
      let target: SewadarPointsDetail | undefined;
      if (p.sewadarId && sewadarMap.has(p.sewadarId)) {
        target = sewadarMap.get(p.sewadarId);
      } else {
        const pNorm = normalizeName(p.sewadarName || '');
        for (const val of sewadarMap.values()) {
          if (
            val.gender === p.gender &&
            normalizeName(val.name) === pNorm
          ) {
            target = val;
            break;
          }
        }
      }

      // If sewadar not found in initial allSewadars, create dynamic record so NO ONE is lost!
      if (!target) {
        const dynId = p.sewadarId || `pt_${p.id}`;
        target = {
          sewadarId: dynId,
          name: p.sewadarName || 'Unknown Sewadar',
          gender: p.gender,
          group: p.group || 'Back Office',
          team: p.team || getWorkshopTeam(p.gender, p.group || 'Back Office'),
          shift: undefined,
          isPresent: false,
          inTime: p.checkInTime || '',
          attendancePoints: 0,
          attendanceLabel: '0 pts',
          quizCount: 0,
          quizPoints: 0,
          totalPoints: 0
        };
        sewadarMap.set(dynId, target);
      }

      target.totalPoints += p.points;
      const isQuizType = p.reason === 'Quiz' || p.reason.toLowerCase().includes('quiz') || p.reason.toLowerCase().includes('bonus') || (!p.reason.toLowerCase().includes('attendance') && !p.reason.toLowerCase().includes('att'));
      if (isQuizType) {
        target.quizCount += 1;
        target.quizPoints += p.points;
      } else {
        target.isPresent = true;
        target.attendancePoints += p.points;
        target.attendanceLabel = p.points === 100 ? '100 pts (Early)' : p.points === 50 ? '50 pts (Late)' : `${p.points} pts`;
        if (p.checkInTime && !target.inTime) {
          target.inTime = p.checkInTime;
        }
      }
    });

    // 3. Attach attendance from group logins on 30 Aug 2026 if not already awarded in workshopPoints
    workshopAttendance.forEach(rec => {
      let target: SewadarPointsDetail | undefined;
      if (rec.sewadarId && sewadarMap.has(rec.sewadarId)) {
        target = sewadarMap.get(rec.sewadarId);
      } else {
        const recNorm = normalizeName(rec.name || '');
        for (const val of sewadarMap.values()) {
          if (
            val.gender === rec.gender &&
            normalizeName(val.name) === recNorm
          ) {
            target = val;
            break;
          }
        }
      }

      // If sewadar not found in initial allSewadars, create dynamic record so NO ONE is lost!
      if (!target) {
        const dynId = rec.sewadarId || `att_${rec.id}`;
        target = {
          sewadarId: dynId,
          name: rec.name || 'Unknown Sewadar',
          gender: rec.gender,
          group: rec.group || 'Back Office',
          team: getWorkshopTeam(rec.gender, rec.group || 'Back Office'),
          shift: undefined,
          isPresent: true,
          inTime: rec.inTime || '',
          attendancePoints: 0,
          attendanceLabel: '0 pts',
          quizCount: 0,
          quizPoints: 0,
          totalPoints: 0
        };
        sewadarMap.set(dynId, target);
      }

      target.isPresent = true;
      if (rec.inTime && !target.inTime) {
        target.inTime = rec.inTime;
      }
      if (target.attendancePoints === 0) {
        const time = rec.inTime || '';
        const [h, m] = time.split(':').map(Number);
        const isEarly = !isNaN(h) ? (h < 9 || (h === 9 && m < 30)) : true;
        const pts = isEarly ? 100 : 50;
        target.attendancePoints = pts;
        target.attendanceLabel = pts === 100 ? '100 pts (Early)' : `${pts} pts (Late)`;
        target.totalPoints += pts;
      }
    });

    // Helper to build group summaries including all security days and back office teams
    const buildGroupSummary = (defaultGroupList: DutyGroup[], gender: Gender): GroupSummary[] => {
      // Find all groups present in sewadarMap for this gender
      const allDiscoveredGroups = new Set<string>();
      defaultGroupList.forEach(g => allDiscoveredGroups.add(g));
      
      for (const m of sewadarMap.values()) {
        if (m.gender === gender && m.group) {
          const clean = m.group.replace(/^ladies-/i, '').replace(/^gents-/i, '').trim();
          if (clean) allDiscoveredGroups.add(clean);
        }
      }

      const orderedGroups: string[] = [];
      // 1. 7 Security Days in order
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      days.forEach(d => {
        if (allDiscoveredGroups.has(d)) {
          orderedGroups.push(d);
          allDiscoveredGroups.delete(d);
        }
      });
      // 2. Back office and department teams in standard order
      const defaultBackOffice = ['HR Department', 'Lost and Found', 'PR Department', 'Langar Department', 'CCTV Vision Team', 'CCTV Maintenance'];
      defaultBackOffice.forEach(bo => {
        if (allDiscoveredGroups.has(bo)) {
          orderedGroups.push(bo);
          allDiscoveredGroups.delete(bo);
        }
      });
      // 3. Any other custom groups
      Array.from(allDiscoveredGroups).sort().forEach(g => orderedGroups.push(g));

      const summaries = orderedGroups.map(grpName => {
        const teamName = getWorkshopTeam(gender, grpName);
        const cleanG = grpName.toLowerCase().replace(/^ladies-/i, '').replace(/^gents-/i, '').trim();

        const members = Array.from(sewadarMap.values())
          .filter(m => {
            if (m.gender !== gender) return false;
            const cleanM = (m.group || '').toLowerCase().replace(/^ladies-/i, '').replace(/^gents-/i, '').trim();
            return cleanM === cleanG;
          })
          .sort((a, b) => {
            if (a.isPresent !== b.isPresent) return a.isPresent ? -1 : 1;
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            if (b.attendancePoints !== a.attendancePoints) return b.attendancePoints - a.attendancePoints;
            return a.name.localeCompare(b.name);
          });

        const totalMembers = members.length;
        const presentCount = members.filter(m => m.isPresent || m.attendancePoints > 0).length;
        const absentCount = Math.max(0, totalMembers - presentCount);
        const attendancePercent = totalMembers > 0 ? Math.round((presentCount / totalMembers) * 100) : (presentCount > 0 ? 100 : 0);
        const earlyCount = members.filter(m => m.attendancePoints === 100).length;
        const lateCount = members.filter(m => m.attendancePoints === 50).length;
        const activeParticipants = members.filter(m => m.totalPoints > 0).length;
        const totalPoints = members.reduce((sum, m) => sum + m.totalPoints, 0);
        const totalAttPoints = members.reduce((sum, m) => sum + m.attendancePoints, 0);
        const totalQuizPoints = members.reduce((sum, m) => sum + m.quizPoints, 0);

        return {
          groupName: grpName,
          teamName,
          gender,
          totalMembers,
          presentCount,
          absentCount,
          attendancePercent,
          earlyCount,
          lateCount,
          totalPoints,
          totalParticipants: activeParticipants,
          totalAttPoints,
          totalQuizPoints,
          members
        };
      });

      // Filter out back office / department groups only if they have 0 members AND 0 present so UI is not cluttered,
      // but always keep all groups with members or present attendees.
      return summaries.filter(s => {
        if (days.includes(s.groupName)) return true;
        return s.totalMembers > 0 || s.presentCount > 0;
      });
    };

    const gentsSummaries = buildGroupSummary(GENTS_GROUPS, 'Gents');
    const ladiesSummaries = buildGroupSummary(LADIES_GROUPS, 'Ladies');

    const top3Gents = [...gentsSummaries].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 3);
    const top3Ladies = [...ladiesSummaries].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 3);

    return {
      gentsGroupSummaries: gentsSummaries,
      ladiesGroupSummaries: ladiesSummaries,
      top3GentsGroups: top3Gents,
      top3LadiesGroups: top3Ladies
    };
  }, [allSewadars, workshopPoints, workshopAttendance, normalizeName]);

  // Total summary figures
  const totalWorkshopPoints = useMemo(() => {
    return workshopPoints.reduce((sum, p) => sum + p.points, 0);
  }, [workshopPoints]);

  const totalGentsPoints = useMemo(() => {
    return gentsGroupSummaries.reduce((sum, g) => sum + g.totalPoints, 0);
  }, [gentsGroupSummaries]);

  const totalLadiesPoints = useMemo(() => {
    return ladiesGroupSummaries.reduce((sum, g) => sum + g.totalPoints, 0);
  }, [ladiesGroupSummaries]);

  // Overall Attendance Totals for Gents and Ladies
  const gentsAttStats = useMemo(() => {
    const totalMembers = gentsGroupSummaries.reduce((sum, g) => sum + g.totalMembers, 0);
    const presentCount = gentsGroupSummaries.reduce((sum, g) => sum + g.presentCount, 0);
    const absentCount = totalMembers - presentCount;
    const attendancePercent = totalMembers > 0 ? Math.round((presentCount / totalMembers) * 100) : 0;
    const earlyCount = gentsGroupSummaries.reduce((sum, g) => sum + g.earlyCount, 0);
    const lateCount = gentsGroupSummaries.reduce((sum, g) => sum + g.lateCount, 0);
    const totalAttPoints = gentsGroupSummaries.reduce((sum, g) => sum + g.totalAttPoints, 0);
    return { totalMembers, presentCount, absentCount, attendancePercent, earlyCount, lateCount, totalAttPoints };
  }, [gentsGroupSummaries]);

  const ladiesAttStats = useMemo(() => {
    const totalMembers = ladiesGroupSummaries.reduce((sum, g) => sum + g.totalMembers, 0);
    const presentCount = ladiesGroupSummaries.reduce((sum, g) => sum + g.presentCount, 0);
    const absentCount = totalMembers - presentCount;
    const attendancePercent = totalMembers > 0 ? Math.round((presentCount / totalMembers) * 100) : 0;
    const earlyCount = ladiesGroupSummaries.reduce((sum, g) => sum + g.earlyCount, 0);
    const lateCount = ladiesGroupSummaries.reduce((sum, g) => sum + g.lateCount, 0);
    const totalAttPoints = ladiesGroupSummaries.reduce((sum, g) => sum + g.totalAttPoints, 0);
    return { totalMembers, presentCount, absentCount, attendancePercent, earlyCount, lateCount, totalAttPoints };
  }, [ladiesGroupSummaries]);

  // PDF Generator matching the existing Weekly Report style
  const generatePDF = (mode: 'complete' | 'gents' | 'ladies' | 'gents_attendance' | 'ladies_attendance') => {
    setExportingPDF(mode);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      let currentY = 15;

      const ensureSpace = (h: number) => {
        if (currentY + h > 275) {
          doc.addPage();
          currentY = 20;
          return true;
        }
        return false;
      };

      // -------------------------------------------------------------
      // ATTENDANCE PDF MODE (GENTS ATTENDANCE or LADIES ATTENDANCE)
      // -------------------------------------------------------------
      if (mode === 'gents_attendance' || mode === 'ladies_attendance') {
        const gender: Gender = mode === 'gents_attendance' ? 'Gents' : 'Ladies';
        const groups = gender === 'Gents' ? gentsGroupSummaries : ladiesGroupSummaries;
        const stats = gender === 'Gents' ? gentsAttStats : ladiesAttStats;
        const brandColor: [number, number, number] = gender === 'Gents' ? [14, 116, 144] : [190, 24, 93]; // Cyan/Teal vs Pink/Rose

        // 1. Header Intro
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `With the blessings of H.H. Sant Rajinder Singh Ji Maharaj, SKRM Security Sewa Presents`,
          14,
          currentY
        );

        // 2. Title
        currentY += 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
        doc.text(`Workshop Attendance Report – ${gender} Groups`, 14, currentY);

        // 3. Subtitle
        currentY += 7;
        doc.setFontSize(10.5);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text(`Special One-Day Workshop (Date: 30 August 2026) • Scope: 7 ${gender} Security Groups Attendance`, 14, currentY);

        // Horizontal Divider
        currentY += 4;
        doc.setDrawColor(220, 220, 220);
        doc.line(14, currentY, 196, currentY);

        // 4. Consolidated Overview Table
        currentY += 8;
        ensureSpace(40);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`1. Consolidated ${gender} Attendance Overview`, 14, currentY);

        const overviewRows: any[] = [
          ['Event Date', '30 August 2026'],
          [`Total Registered ${gender} Sewadars (Roster)`, `${stats.totalMembers} Sewadars`],
          [`Total ${gender} Present in Workshop`, `${stats.presentCount} Sewadars (${stats.attendancePercent}%)`],
          [`Total ${gender} Absent / Unmarked`, `${stats.absentCount} Sewadars`],
          ['Early Arrivals (<9:30 AM, 100 pts)', `${stats.earlyCount} Sewadars`],
          ['Late Arrivals (≥9:30 AM, 50 pts)', `${stats.lateCount} Sewadars`],
          ['Total Attendance Points Earned', `${stats.totalAttPoints.toLocaleString()} pts`],
          ['Report Generated By', `${activeVolunteer.name} (${activeVolunteer.role})`],
          ['Data Mode', isTestMode ? 'Test Sandbox Practice Data' : 'Live Official Ground Truth']
        ];

        autoTable(doc, {
          startY: currentY + 3,
          head: [['Attendance Metric', 'Value']],
          body: overviewRows,
          theme: 'striped',
          headStyles: { fillColor: brandColor, textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8.5, cellPadding: 2.2 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;

        // 5. Group-by-Group Attendance Summary
        ensureSpace(50);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`2. Group-wise ${gender} Attendance Summary`, 14, currentY);

        const groupSummaryRows: any[] = groups.map((g, idx) => [
          `#${idx + 1} ${g.teamName}`,
          g.totalMembers,
          g.presentCount,
          g.absentCount,
          `${g.attendancePercent}%`,
          g.earlyCount,
          g.lateCount,
          `${g.totalAttPoints} pts`
        ]);

        // Add Total Summary Row
        groupSummaryRows.push([
          `TOTAL (${gender})`,
          stats.totalMembers,
          stats.presentCount,
          stats.absentCount,
          `${stats.attendancePercent}%`,
          stats.earlyCount,
          stats.lateCount,
          `${stats.totalAttPoints} pts`
        ]);

        autoTable(doc, {
          startY: currentY + 3,
          head: [['Group / Team', 'Roster Strength', 'Present', 'Absent', 'Attendance %', 'Early (<9:30)', 'Late (≥9:30)', 'Att. Points']],
          body: groupSummaryRows,
          theme: 'grid',
          headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: 'bold' },
          didParseCell: (data) => {
            if (data.row.index === groupSummaryRows.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [240, 243, 246];
            }
          },
          styles: { fontSize: 8, cellPadding: 2 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;

        // 6. Detailed Group Attendance Rosters
        doc.addPage();
        currentY = 20;

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
        doc.text(`3. Detailed Group Attendance Rosters & Check-in Times`, 14, currentY);

        groups.forEach((g) => {
          ensureSpace(40);
          currentY += 4;
          doc.setFontSize(10.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
          doc.text(
            `${g.teamName} — Present: ${g.presentCount}/${g.totalMembers} (${g.attendancePercent}%) • Early: ${g.earlyCount} • Late: ${g.lateCount} • Att. Points: ${g.totalAttPoints} pts`,
            14,
            currentY
          );

          const presentMembers = g.members.filter(m => m.isPresent || m.attendancePoints > 0);

          if (presentMembers.length === 0) {
            autoTable(doc, {
              startY: currentY + 3,
              head: [['S.No', 'Sewadar Name', 'Shift', 'In Time', 'Arrival / Points']],
              body: [['—', 'No sewadars marked present in this group', '—', '—', '—']],
              theme: 'grid',
              headStyles: {
                fillColor: brandColor,
                textColor: 255,
                fontStyle: 'bold'
              },
              styles: { fontSize: 8, cellPadding: 2 }
            });
          } else {
            const memberRows = presentMembers.map((m, idx) => [
              `#${idx + 1}`,
              m.name,
              m.shift || '-',
              m.inTime || '—',
              m.attendancePoints === 100
                ? 'Early (100 pts)'
                : m.attendancePoints === 50
                ? 'Late (50 pts)'
                : `${m.attendancePoints} pts`
            ]);

            autoTable(doc, {
              startY: currentY + 3,
              head: [['S.No', 'Sewadar Name', 'Shift', 'In Time', 'Arrival / Points']],
              body: memberRows,
              theme: 'grid',
              headStyles: {
                fillColor: brandColor,
                textColor: 255,
                fontStyle: 'bold'
              },
              styles: { fontSize: 8, cellPadding: 2 }
            });
          }
          currentY = (doc as any).lastAutoTable.finalY + 6;
        });

        // Footer
        const totalPages = doc.internal.pages.length - 1;
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Page ${i} of ${totalPages} • SKRM Security Sewa Workshop Attendance (${gender}) • Date: 30 Aug 2026`,
            14,
            287
          );
        }

        // Save PDF
        const filename = `Workshop_Attendance_Report_${gender.toUpperCase()}_30Aug2026.pdf`;
        doc.save(filename);
        return;
      }

      // 1. Header Intro
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const genderScope = mode === 'gents' ? 'Gents Security Groups' : mode === 'ladies' ? 'Ladies Security Groups' : 'All Security Groups';
      doc.text(
        `With the blessings of H.H. Sant Rajinder Singh Ji Maharaj, SKRM Security Sewa Presents`,
        14,
        currentY
      );

      // 2. Title
      currentY += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(50, 60, 120); // Matching primary brand indigo
      const titleText = mode === 'gents' ? 'Workshop Points Summary – Gents' : mode === 'ladies' ? 'Workshop Points Summary – Ladies' : 'Workshop Points & Standings Summary';
      doc.text(titleText, 14, currentY);

      // 3. Subtitle
      currentY += 7;
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text(`Special One-Day Workshop (Date: 30 August 2026) • Scope: ${genderScope}`, 14, currentY);

      // Horizontal Divider
      currentY += 4;
      doc.setDrawColor(220, 220, 220);
      doc.line(14, currentY, 196, currentY);

      // 4. Overall Workshop Metrics
      currentY += 8;
      ensureSpace(40);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('1. Consolidated Workshop Overview', 14, currentY);

      const overviewRows: any[] = [
        ['Event Date', '30 August 2026'],
        ['Total Workshop Points', totalWorkshopPoints.toLocaleString() + ' pts'],
        ['Gents Groups Total', totalGentsPoints.toLocaleString() + ' pts'],
        ['Ladies Groups Total', totalLadiesPoints.toLocaleString() + ' pts'],
        ['Report Generated By', activeVolunteer.name + ` (${activeVolunteer.role})`],
        ['Data Mode', isTestMode ? 'Test Sandbox Practice Data' : 'Live Official Ground Truth']
      ];

      autoTable(doc, {
        startY: currentY + 3,
        head: [['Metric', 'Value']],
        body: overviewRows,
        theme: 'striped',
        headStyles: { fillColor: [50, 60, 120], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2.5 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 8;

      // 5. Top 3 Groups (Gents and/or Ladies)
      if (mode === 'complete' || mode === 'gents') {
        ensureSpace(45);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('2. Top 3 Gents Groups Standings', 14, currentY);

        const gentsTopRows = top3GentsGroups.map((g, idx) => [
          `#${idx + 1}`,
          g.groupName,
          g.totalParticipants,
          g.totalAttPoints + ' pts',
          g.totalQuizPoints + ' pts',
          g.totalPoints + ' pts'
        ]);

        autoTable(doc, {
          startY: currentY + 3,
          head: [['Rank', 'Gents Group', 'Active Participants', 'Attendance Pts', 'Quiz Pts', 'Total Points']],
          body: gentsTopRows,
          theme: 'grid',
          headStyles: { fillColor: [40, 116, 166], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 2.5 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;
      }

      if (mode === 'complete' || mode === 'ladies') {
        ensureSpace(45);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(mode === 'complete' ? '3. Top 3 Ladies Groups Standings' : '2. Top 3 Ladies Groups Standings', 14, currentY);

        const ladiesTopRows = top3LadiesGroups.map((g, idx) => [
          `#${idx + 1}`,
          g.teamName,
          g.totalParticipants,
          g.totalAttPoints + ' pts',
          g.totalQuizPoints + ' pts',
          g.totalPoints + ' pts'
        ]);

        autoTable(doc, {
          startY: currentY + 3,
          head: [['Rank', 'Ladies Group', 'Active Participants', 'Attendance Pts', 'Quiz Pts', 'Total Points']],
          body: ladiesTopRows,
          theme: 'grid',
          headStyles: { fillColor: [136, 78, 160], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 2.5 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;
      }

      // 6. Top 3 Volunteers in Each Group
      const includeGroups = mode === 'gents' 
        ? gentsGroupSummaries 
        : mode === 'ladies' 
        ? ladiesGroupSummaries 
        : [...gentsGroupSummaries, ...ladiesGroupSummaries];

      ensureSpace(50);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      const sectionNum = mode === 'complete' ? '4' : '3';
      doc.text(`${sectionNum}. Top 3 Volunteers in Each Group`, 14, currentY);

      const topVolunteersRows: any[] = [];
      includeGroups.forEach(g => {
        const top3 = g.members.filter(m => m.totalPoints > 0).slice(0, 3);
        if (top3.length === 0) {
          topVolunteersRows.push([g.teamName, 'None', '-', '-', '-', '0 pts']);
        } else {
          top3.forEach((m, idx) => {
            topVolunteersRows.push([
              g.teamName,
              `#${idx + 1} ${m.name}`,
              m.shift || '-',
              m.attendancePoints > 0 ? `${m.attendancePoints} pts` : '0 pts',
              m.quizPoints > 0 ? `${m.quizPoints} pts (${m.quizCount}x)` : '0 pts',
              `${m.totalPoints} pts`
            ]);
          });
        }
      });

      autoTable(doc, {
        startY: currentY + 3,
        head: [['Group / Team', 'Top Volunteer', 'Shift', 'Attendance', 'Quiz', 'Total Points']],
        body: topVolunteersRows,
        theme: 'striped',
        headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;

      // 7. Full Detailed Group Tables
      doc.addPage();
      currentY = 20;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 60, 120);
      const sectionNumDetailed = mode === 'complete' ? '5' : '4';
      doc.text(`${sectionNumDetailed}. Detailed Group Rosters & Points Breakdown`, 14, currentY);

      includeGroups.forEach((g) => {
        ensureSpace(40);
        currentY += 4;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(g.gender === 'Gents' ? 40 : 136, g.gender === 'Gents' ? 116 : 78, g.gender === 'Gents' ? 166 : 160);
        doc.text(`${g.teamName} (Total Points: ${g.totalPoints} pts • Active Participants: ${g.totalParticipants}/${g.members.length})`, 14, currentY);

        const groupRows = g.members.map((m, idx) => [
          `#${idx + 1}`,
          m.name,
          m.shift || '-',
          m.attendanceLabel,
          m.quizPoints > 0 ? `${m.quizPoints} pts (${m.quizCount}x)` : '0 pts',
          `${m.totalPoints} pts`
        ]);

        autoTable(doc, {
          startY: currentY + 3,
          head: [['Rank', 'Sewadar Name', 'Shift', 'Attendance Check-in', 'Oral Quiz Awards', 'Total Points']],
          body: groupRows,
          theme: 'grid',
          headStyles: {
            fillColor: g.gender === 'Gents' ? [40, 116, 166] : [136, 78, 160],
            textColor: 255,
            fontStyle: 'bold'
          },
          styles: { fontSize: 8, cellPadding: 2 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 6;
      });

      // Footer
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${totalPages} • SKRM Security Sewa Workshop Report • Date: 30 Aug 2026`,
          14,
          287
        );
      }

      // Save PDF
      const filename = `Workshop_Points_Report_${mode.toUpperCase()}_30Aug2026.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('Failed to generate PDF report.');
    } finally {
      setExportingPDF(null);
    }
  };

  return (
    <div className="space-y-8 font-sans max-w-4xl mx-auto pb-20 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          {/* Top Controls: Badge + Date + Toggle */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1 bg-white/20 text-indigo-100 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">
                Official Report
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

          {/* Test Mode Strip */}
          {isTestMode && !isDateLocked && (
            <div className="flex items-center justify-between gap-2 px-4 py-2 bg-amber-500/20 border border-amber-400/30 rounded-2xl text-amber-200 text-xs font-bold">
              <div className="flex items-center gap-1.5 min-w-0">
                <span>⚠️</span>
                <span className="truncate">Test Mode Active: Generating report from sandbox data.</span>
              </div>
              <button
                onClick={handleClearTestData}
                className="px-2.5 py-1 bg-amber-400 text-amber-950 rounded-lg text-[10px] font-black uppercase tracking-wider flex-shrink-0 hover:bg-amber-300 active:scale-95 transition-all shadow-sm"
              >
                Reset Test Data
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                <span>📊</span> Workshop Points Summary Report
              </h1>
              <p className="text-xs text-indigo-200 font-medium mt-1">
                Complete points calculation, group standings, and detailed individual sewadar rosters.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onNavigateToStandings}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all"
              >
                <span>🏆</span> Standings
              </button>
              <button
                onClick={onNavigateToAttendance}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all"
              >
                <span>📝</span> Mark Sewa
              </button>
            </div>
          </div>

          {/* 5 PDF Download Buttons */}
          <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2.5">
            <button
              onClick={() => generatePDF('complete')}
              disabled={loading || !!exportingPDF}
              className="flex-1 min-w-[180px] px-3.5 py-3 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {exportingPDF === 'complete' ? 'Generating...' : '1. Complete Points Report'}
            </button>

            <button
              onClick={() => generatePDF('gents')}
              disabled={loading || !!exportingPDF}
              className="flex-1 min-w-[150px] px-3.5 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {exportingPDF === 'gents' ? 'Generating...' : '2. Gents Points'}
            </button>

            <button
              onClick={() => generatePDF('ladies')}
              disabled={loading || !!exportingPDF}
              className="flex-1 min-w-[150px] px-3.5 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {exportingPDF === 'ladies' ? 'Generating...' : '3. Ladies Points'}
            </button>

            <button
              onClick={() => generatePDF('gents_attendance')}
              disabled={loading || !!exportingPDF}
              className="flex-1 min-w-[170px] px-3.5 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {exportingPDF === 'gents_attendance' ? 'Generating...' : '4. Gents Attendance'}
            </button>

            <button
              onClick={() => generatePDF('ladies_attendance')}
              disabled={loading || !!exportingPDF}
              className="flex-1 min-w-[170px] px-3.5 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {exportingPDF === 'ladies_attendance' ? 'Generating...' : '5. Ladies Attendance'}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Filter Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto shadow-xs">
        <button
          onClick={() => setReportTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
            reportTab === 'all'
              ? 'bg-white text-indigo-950 shadow-sm border border-slate-200/60'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📑</span> All Reports
        </button>

        <button
          onClick={() => setReportTab('gents_att')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
            reportTab === 'gents_att'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🛡️</span> Gents Attendance ({gentsAttStats.presentCount}/{gentsAttStats.totalMembers})
        </button>

        <button
          onClick={() => setReportTab('ladies_att')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
            reportTab === 'ladies_att'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🌸</span> Ladies Attendance ({ladiesAttStats.presentCount}/{ladiesAttStats.totalMembers})
        </button>

        <button
          onClick={() => setReportTab('points')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
            reportTab === 'points'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>⚡</span> Points & Quiz Standings
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3">Compiling report data...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ========================================================= */}
          {/* GENTS WORKSHOP ATTENDANCE SECTION */}
          {/* ========================================================= */}
          {(reportTab === 'all' || reportTab === 'gents_att') && (
            <div className="space-y-6 pt-2">
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-teal-200 pb-3 flex-wrap gap-2">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <span>🛡️</span> Gents Security Groups – Workshop Attendance
                  </h2>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">
                    Breakdown of marked attendance per group for 30 August 2026
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-teal-800 bg-teal-100 px-3 py-1 rounded-xl">
                    {gentsGroupSummaries.length} Gents Groups & Teams
                  </span>
                  <button
                    onClick={() => generatePDF('gents_attendance')}
                    disabled={!!exportingPDF}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs"
                  >
                    <span>📥</span> PDF
                  </button>
                </div>
              </div>

              {/* KPI Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-xs">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Roster</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{gentsAttStats.totalMembers}</p>
                  <p className="text-[10px] font-bold text-slate-400">{gentsGroupSummaries.length} Groups Total</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 shadow-xs">
                  <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Present Today</p>
                  <p className="text-lg font-black text-emerald-800 mt-0.5">{gentsAttStats.presentCount}</p>
                  <p className="text-[10px] font-bold text-emerald-600">{gentsAttStats.attendancePercent}% turnout</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Absent / Unmarked</p>
                  <p className="text-lg font-black text-slate-700 mt-0.5">{gentsAttStats.absentCount}</p>
                  <p className="text-[10px] font-bold text-slate-400">{100 - gentsAttStats.attendancePercent}% of roster</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200 shadow-xs">
                  <p className="text-[10px] font-black uppercase text-sky-700 tracking-wider">Early (&lt;9:30 AM)</p>
                  <p className="text-lg font-black text-sky-800 mt-0.5">{gentsAttStats.earlyCount}</p>
                  <p className="text-[10px] font-bold text-sky-600">100 pts each</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-xs">
                  <p className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Late (≥9:30 AM)</p>
                  <p className="text-lg font-black text-amber-800 mt-0.5">{gentsAttStats.lateCount}</p>
                  <p className="text-[10px] font-bold text-amber-600">50 pts each</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200 shadow-xs">
                  <p className="text-[10px] font-black uppercase text-teal-700 tracking-wider">Att. Points</p>
                  <p className="text-lg font-black text-teal-800 mt-0.5">{gentsAttStats.totalAttPoints} pts</p>
                  <p className="text-[10px] font-bold text-teal-600">Gents Aggregate</p>
                </div>
              </div>

              {/* Group Attendance Matrix Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {gentsGroupSummaries.map((g) => (
                  <div key={g.groupName} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900">{g.teamName}</span>
                      <span className="text-[10px] font-black text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100">
                        {g.attendancePercent}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-teal-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${g.attendancePercent}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span>Present: <b className="text-emerald-700 font-black">{g.presentCount}</b> / {g.totalMembers}</span>
                      <span>Points: <b className="text-indigo-600 font-black">{g.totalAttPoints}</b></span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Detailed Attendance Roster per Gents Group */}
              <div className="space-y-4">
                {gentsGroupSummaries.map((g) => {
                  const presentMembers = g.members.filter(m => m.isPresent || m.attendancePoints > 0);
                  const filteredMembers = presentMembers.filter(m => 
                    !attSearchQuery || 
                    m.name.toLowerCase().includes(attSearchQuery.toLowerCase()) ||
                    (m.shift && m.shift.toLowerCase().includes(attSearchQuery.toLowerCase()))
                  );

                  return (
                    <div key={g.groupName} className="bg-white rounded-[2rem] border border-slate-100 shadow-xs overflow-hidden">
                      {/* Group Attendance Header */}
                      <div className="p-4 sm:p-5 bg-teal-950/5 border-b border-teal-100 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-xs">
                            🛡️
                          </span>
                          <div>
                            <h3 className="text-sm sm:text-base font-black text-slate-900">
                              {g.teamName}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-bold">
                              Present: <span className="text-emerald-700 font-black">{g.presentCount}</span> of {g.totalMembers} ({g.attendancePercent}%) • Early: <span className="text-sky-700 font-black">{g.earlyCount}</span> • Late: <span className="text-amber-700 font-black">{g.lateCount}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-teal-700 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200">
                            {g.totalAttPoints} Att. Points
                          </span>
                        </div>
                      </div>

                      {/* Members Attendance Table */}
                      <div className="overflow-x-auto">
                        {filteredMembers.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400 font-bold italic">
                            {attSearchQuery ? 'No matching present sewadars found.' : 'No sewadars marked present in this group.'}
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                <th className="py-2.5 px-4 w-12 text-center">#</th>
                                <th className="py-2.5 px-4">Sewadar Name</th>
                                <th className="py-2.5 px-4">Shift</th>
                                <th className="py-2.5 px-4">In Time</th>
                                <th className="py-2.5 px-4 text-right">Points Earned</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredMembers.map((m, idx) => (
                                <tr
                                  key={m.sewadarId}
                                  className="hover:bg-slate-50/80 transition-colors bg-emerald-50/20"
                                >
                                  <td className="py-2.5 px-4 text-center font-black text-slate-400 text-[11px]">
                                    {idx + 1}
                                  </td>
                                  <td className="py-2.5 px-4 font-black text-slate-900">
                                    {m.name}
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-500 font-bold text-[11px]">
                                    {m.shift || '-'}
                                  </td>
                                  <td className="py-2.5 px-4 font-mono font-bold text-slate-600 text-[11px]">
                                    {m.inTime ? m.inTime : '—'}
                                  </td>
                                  <td className="py-2.5 px-4 text-right">
                                    <span
                                      className={`font-black text-xs px-2.5 py-0.5 rounded-lg inline-block ${
                                        m.attendancePoints === 100
                                          ? 'bg-sky-100 text-sky-900 border border-sky-200'
                                          : m.attendancePoints === 50
                                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                          : 'bg-emerald-100 text-emerald-900'
                                      }`}
                                    >
                                      {m.attendanceLabel}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* LADIES WORKSHOP ATTENDANCE SECTION */}
          {/* ========================================================= */}
          {(reportTab === 'all' || reportTab === 'ladies_att') && (
            <div className="space-y-6 pt-2">
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-rose-200 pb-3 flex-wrap gap-2">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <span>🌸</span> Ladies Security Groups – Workshop Attendance
                  </h2>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">
                    Breakdown of marked attendance per group for 30 August 2026
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-rose-800 bg-rose-100 px-3 py-1 rounded-xl">
                    {ladiesGroupSummaries.length} Ladies Groups & Teams
                  </span>
                  <button
                    onClick={() => generatePDF('ladies_attendance')}
                    disabled={!!exportingPDF}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs"
                  >
                    <span>📥</span> PDF
                  </button>
                </div>
              </div>

              {/* KPI Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-xs">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Roster</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{ladiesAttStats.totalMembers}</p>
                  <p className="text-[10px] font-bold text-slate-400">{ladiesGroupSummaries.length} Groups Total</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 shadow-xs">
                  <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Present Today</p>
                  <p className="text-lg font-black text-emerald-800 mt-0.5">{ladiesAttStats.presentCount}</p>
                  <p className="text-[10px] font-bold text-emerald-600">{ladiesAttStats.attendancePercent}% turnout</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Absent / Unmarked</p>
                  <p className="text-lg font-black text-slate-700 mt-0.5">{ladiesAttStats.absentCount}</p>
                  <p className="text-[10px] font-bold text-slate-400">{100 - ladiesAttStats.attendancePercent}% of roster</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200 shadow-xs">
                  <p className="text-[10px] font-black uppercase text-sky-700 tracking-wider">Early (&lt;9:30 AM)</p>
                  <p className="text-lg font-black text-sky-800 mt-0.5">{ladiesAttStats.earlyCount}</p>
                  <p className="text-[10px] font-bold text-sky-600">100 pts each</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-xs">
                  <p className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Late (≥9:30 AM)</p>
                  <p className="text-lg font-black text-amber-800 mt-0.5">{ladiesAttStats.lateCount}</p>
                  <p className="text-[10px] font-bold text-amber-600">50 pts each</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 shadow-xs">
                  <p className="text-[10px] font-black uppercase text-rose-700 tracking-wider">Att. Points</p>
                  <p className="text-lg font-black text-rose-800 mt-0.5">{ladiesAttStats.totalAttPoints} pts</p>
                  <p className="text-[10px] font-bold text-rose-600">Ladies Aggregate</p>
                </div>
              </div>

              {/* Group Attendance Matrix Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {ladiesGroupSummaries.map((g) => (
                  <div key={g.groupName} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900">{g.teamName}</span>
                      <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                        {g.attendancePercent}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-rose-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${g.attendancePercent}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span>Present: <b className="text-emerald-700 font-black">{g.presentCount}</b> / {g.totalMembers}</span>
                      <span>Points: <b className="text-purple-600 font-black">{g.totalAttPoints}</b></span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Detailed Attendance Roster per Ladies Group */}
              <div className="space-y-4">
                {ladiesGroupSummaries.map((g) => {
                  const presentMembers = g.members.filter(m => m.isPresent || m.attendancePoints > 0);
                  const filteredMembers = presentMembers.filter(m => 
                    !attSearchQuery || 
                    m.name.toLowerCase().includes(attSearchQuery.toLowerCase()) ||
                    (m.shift && m.shift.toLowerCase().includes(attSearchQuery.toLowerCase()))
                  );

                  return (
                    <div key={g.groupName} className="bg-white rounded-[2rem] border border-slate-100 shadow-xs overflow-hidden">
                      {/* Group Attendance Header */}
                      <div className="p-4 sm:p-5 bg-rose-950/5 border-b border-rose-100 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-xs">
                            🌸
                          </span>
                          <div>
                            <h3 className="text-sm sm:text-base font-black text-slate-900">
                              {g.teamName}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-bold">
                              Present: <span className="text-emerald-700 font-black">{g.presentCount}</span> of {g.totalMembers} ({g.attendancePercent}%) • Early: <span className="text-sky-700 font-black">{g.earlyCount}</span> • Late: <span className="text-amber-700 font-black">{g.lateCount}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-rose-700 bg-rose-50 px-3 py-1 rounded-xl border border-rose-200">
                            {g.totalAttPoints} Att. Points
                          </span>
                        </div>
                      </div>

                      {/* Members Attendance Table */}
                      <div className="overflow-x-auto">
                        {filteredMembers.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400 font-bold italic">
                            {attSearchQuery ? 'No matching present sewadars found.' : 'No sewadars marked present in this group.'}
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                <th className="py-2.5 px-4 w-12 text-center">#</th>
                                <th className="py-2.5 px-4">Sewadar Name</th>
                                <th className="py-2.5 px-4">Shift</th>
                                <th className="py-2.5 px-4">In Time</th>
                                <th className="py-2.5 px-4 text-right">Points Earned</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredMembers.map((m, idx) => (
                                <tr
                                  key={m.sewadarId}
                                  className="hover:bg-slate-50/80 transition-colors bg-emerald-50/20"
                                >
                                  <td className="py-2.5 px-4 text-center font-black text-slate-400 text-[11px]">
                                    {idx + 1}
                                  </td>
                                  <td className="py-2.5 px-4 font-black text-slate-900">
                                    {m.name}
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-500 font-bold text-[11px]">
                                    {m.shift || '-'}
                                  </td>
                                  <td className="py-2.5 px-4 font-mono font-bold text-slate-600 text-[11px]">
                                    {m.inTime ? m.inTime : '—'}
                                  </td>
                                  <td className="py-2.5 px-4 text-right">
                                    <span
                                      className={`font-black text-xs px-2.5 py-0.5 rounded-lg inline-block ${
                                        m.attendancePoints === 100
                                          ? 'bg-sky-100 text-sky-900 border border-sky-200'
                                          : m.attendancePoints === 50
                                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                          : 'bg-emerald-100 text-emerald-900'
                                      }`}
                                    >
                                      {m.attendanceLabel}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* POINTS & STANDINGS SECTION */}
          {/* ========================================================= */}
          {(reportTab === 'all' || reportTab === 'points') && (
            <div className="space-y-8 pt-4">
              {/* SECTION 1: TOP 3 GENTS & LADIES GROUPS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top 3 Gents Groups */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <span>🥇</span> Top 3 Gents Groups
                    </h2>
                    <span className="text-[10px] font-black uppercase text-sky-600 bg-sky-50 px-2.5 py-1 rounded-xl">
                      Gents Standings
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {top3GentsGroups.map((g, idx) => (
                      <div
                        key={g.groupName}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                          idx === 0
                            ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                            : 'bg-slate-50/70 border-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                              idx === 0 ? 'bg-amber-400 text-amber-950' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-black text-sm text-slate-900">{g.groupName}</p>
                            <p className="text-[10px] font-bold text-slate-400">
                              {g.totalParticipants} Active • Att: {g.totalAttPoints} • Quiz: {g.totalQuizPoints}
                            </p>
                          </div>
                        </div>
                        <span className="font-black text-base text-indigo-600 bg-white px-3 py-1 rounded-xl border border-slate-100">
                          {g.totalPoints} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top 3 Ladies Groups */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <span>🌸</span> Top 3 Ladies Groups
                    </h2>
                    <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-50 px-2.5 py-1 rounded-xl">
                      Ladies Standings
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {top3LadiesGroups.map((g, idx) => (
                      <div
                        key={g.teamName}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                          idx === 0
                            ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                            : 'bg-slate-50/70 border-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                              idx === 0 ? 'bg-amber-400 text-amber-950' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-black text-sm text-slate-900">{g.teamName}</p>
                            <p className="text-[10px] font-bold text-slate-400">
                              {g.totalParticipants} Active • Att: {g.totalAttPoints} • Quiz: {g.totalQuizPoints}
                            </p>
                          </div>
                        </div>
                        <span className="font-black text-base text-purple-600 bg-white px-3 py-1 rounded-xl border border-slate-100">
                          {g.totalPoints} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 2: TOP 3 VOLUNTEERS IN EACH GROUP */}
              <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <span>🎖️</span> Top 3 Volunteers in Each Group
                    </h2>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">Highest point earners across Gents and Ladies groups</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...gentsGroupSummaries, ...ladiesGroupSummaries].map((g) => {
                    const top3 = g.members.filter(m => m.totalPoints > 0).slice(0, 3);
                    return (
                      <div key={g.teamName} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                          <span className="text-xs font-black text-slate-900">{g.teamName}</span>
                          <span className="text-[10px] font-black text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-slate-100">
                            {g.totalPoints} pts total
                          </span>
                        </div>

                        {top3.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic py-1 text-center font-medium">No points awarded yet</p>
                        ) : (
                          <div className="space-y-1.5">
                            {top3.map((m, idx) => (
                              <div key={m.sewadarId} className="flex items-center justify-between gap-2 text-xs bg-white p-2 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`text-[10px] font-black w-4 text-center ${idx === 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                                    #{idx + 1}
                                  </span>
                                  <span className="font-black text-slate-800 truncate">{m.name}</span>
                                </div>
                                <span className="font-black text-indigo-600 flex-shrink-0">{m.totalPoints} pts</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: DETAILED TABLES PER GROUP (GENTS) */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <span>🛡️</span> Gents Groups Points Breakdown
                  </h2>
                  <span className="text-xs font-black text-sky-700 bg-sky-100 px-3 py-1 rounded-xl">
                    {gentsGroupSummaries.length} Gents Groups
                  </span>
                </div>

                {gentsGroupSummaries.map((g) => (
                  <div key={g.groupName} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    {/* Group Table Header */}
                    <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <span>⚡</span> {g.groupName} Gents
                        </h3>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">
                          Total Points: <span className="text-indigo-600 font-black">{g.totalPoints} pts</span> • Active Participants: <span className="text-emerald-600 font-black">{g.totalParticipants}</span> / {g.members.length}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500 bg-white px-3 py-1 rounded-xl border border-slate-200">
                          Attendance: {g.totalAttPoints} pts
                        </span>
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-xl border border-purple-200">
                          Quiz: {g.totalQuizPoints} pts
                        </span>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            <th className="py-3 px-4 w-12 text-center">Rank</th>
                            <th className="py-3 px-4">Sewadar Name</th>
                            <th className="py-3 px-4">Shift</th>
                            <th className="py-3 px-4">Attendance Check-in</th>
                            <th className="py-3 px-4">Oral Quiz Awards</th>
                            <th className="py-3 px-4 text-right">Total Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {g.members.map((m, idx) => {
                            const hasPoints = m.totalPoints > 0;
                            return (
                              <tr key={m.sewadarId} className={`hover:bg-slate-50/80 transition-colors ${hasPoints ? 'bg-indigo-50/20' : ''}`}>
                                <td className="py-3 px-4 text-center font-black text-slate-400">
                                  #{idx + 1}
                                </td>
                                <td className="py-3 px-4 font-black text-slate-900">
                                  {m.name}
                                </td>
                                <td className="py-3 px-4 text-slate-500 font-bold">
                                  {m.shift || '-'}
                                </td>
                                <td className="py-3 px-4">
                                  {m.attendancePoints > 0 ? (
                                    <span className="inline-flex items-center gap-1 font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                      {m.attendanceLabel}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-medium">0 pts</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {m.quizPoints > 0 ? (
                                    <span className="inline-flex items-center gap-1 font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200/60">
                                      {m.quizPoints} pts ({m.quizCount}x)
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-medium">0 pts</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className={`font-black text-sm px-2.5 py-1 rounded-xl ${hasPoints ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'text-slate-400'}`}>
                                    {m.totalPoints} pts
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              {/* SECTION 4: DETAILED TABLES PER GROUP (LADIES) */}
              <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <span>🌺</span> Ladies Groups Points Breakdown
                  </h2>
                  <span className="text-xs font-black text-purple-700 bg-purple-100 px-3 py-1 rounded-xl">
                    {ladiesGroupSummaries.length} Ladies Groups
                  </span>
                </div>

                {ladiesGroupSummaries.map((g) => (
                  <div key={g.teamName} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    {/* Group Table Header */}
                    <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <span>🌸</span> {g.teamName}
                        </h3>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">
                          Total Points: <span className="text-purple-600 font-black">{g.totalPoints} pts</span> • Active Participants: <span className="text-emerald-600 font-black">{g.totalParticipants}</span> / {g.members.length}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500 bg-white px-3 py-1 rounded-xl border border-slate-200">
                          Attendance: {g.totalAttPoints} pts
                        </span>
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-xl border border-purple-200">
                          Quiz: {g.totalQuizPoints} pts
                        </span>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            <th className="py-3 px-4 w-12 text-center">Rank</th>
                            <th className="py-3 px-4">Sewadar Name</th>
                            <th className="py-3 px-4">Shift</th>
                            <th className="py-3 px-4">Attendance Check-in</th>
                            <th className="py-3 px-4">Oral Quiz Awards</th>
                            <th className="py-3 px-4 text-right">Total Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {g.members.map((m, idx) => {
                            const hasPoints = m.totalPoints > 0;
                            return (
                              <tr key={m.sewadarId} className={`hover:bg-slate-50/80 transition-colors ${hasPoints ? 'bg-purple-50/20' : ''}`}>
                                <td className="py-3 px-4 text-center font-black text-slate-400">
                                  #{idx + 1}
                                </td>
                                <td className="py-3 px-4 font-black text-slate-900">
                                  {m.name}
                                </td>
                                <td className="py-3 px-4 text-slate-500 font-bold">
                                  {m.shift || '-'}
                                </td>
                                <td className="py-3 px-4">
                                  {m.attendancePoints > 0 ? (
                                    <span className="inline-flex items-center gap-1 font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                      {m.attendanceLabel}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-medium">0 pts</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {m.quizPoints > 0 ? (
                                    <span className="inline-flex items-center gap-1 font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200/60">
                                      {m.quizPoints} pts ({m.quizCount}x)
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-medium">0 pts</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className={`font-black text-sm px-2.5 py-1 rounded-xl ${hasPoints ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'text-slate-400'}`}>
                                    {m.totalPoints} pts
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default WorkshopReportView;
