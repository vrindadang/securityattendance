import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { INITIAL_SEWADARS } from '../constants';

// Helper to normalize names for merging comparison and map specific spelling variations
export function normalizeName(name: string): string {
  if (!name) return "";
  let n = name.toUpperCase().trim();
  
  // Strip common prefixes/suffixes and spaces
  n = n.replace(/^DR\.?\s*/g, '');
  n = n.replace(/^MR\.?\s*/g, '');
  n = n.replace(/^MRS\.?\s*/g, '');
  n = n.replace(/^MS\.?\s*/g, '');
  n = n.replace(/\s+JI$/g, '');
  n = n.replace(/\bJI\b/g, '');
  
  // Remove all non-alphabetical characters to merge dots/spaces/brackets/braces
  n = n.replace(/[^A-Z]/g, '');

  // Custom mapping rules to align different spellings with actual database entries
  if (n === "RAJKOHLI") return "RAJKHOLI";
  if (n === "RAJNISH") return "RAJNEESH";
  if (n === "YOGESHMADAAN") return "YOGESHMADAN";
  if (n === "MEVARAM") return "MEWARAM";
  if (n === "HCBAJAJ" || n === "HARICHANDBAJAJ") return "HARICHANDBAJAJ";
  if (n === "RAVISHASTRI" || n === "RVSHASTRI" || n === "DRRAVISHASTRI" || n === "DRRVSHASTRI") {
    return "RVSHASTRI";
  }
  if (n === "DAVENDERKUMAR" || n === "DEVENDERKUMAR") return "DEVENDERKUMAR";
  if (n === "MAHENDERPUNIYANISONU" || n === "MAHENDERPUNIANISONU" || n === "MAHENDERPUNIANI") return "MAHENDERPUNIANI";
  if (n === "PAWAN" || n === "PAWANSHARMA") return "PAWANSHARMA";
  if (n === "PUNIT" || n === "PUNEET" || n === "PUNEETKUMAR") return "PUNEETKUMAR";

  return n;
}

// Helper to calculate minutes between in_time and out_time
function calculateMinutes(inTime?: string, outTime?: string): number {
  if (!inTime || !outTime) return 0;
  try {
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;
    let diff = (outH * 60 + outM) - (inH * 60 + inM);
    if (diff < 0) diff += 24 * 60;
    return diff;
  } catch { return 0; }
}

function normalizeDateStr(dateVal: any): string {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    if (dateVal.includes('-')) {
      const parts = dateVal.split('-');
      if (parts[0].length === 4) return dateVal; // YYYY-MM-DD
      return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
    }
    return dateVal;
  }
  if (dateVal.toDate) {
    try {
      return dateVal.toDate().toISOString().split('T')[0];
    } catch {
      return '';
    }
  }
  if (dateVal.seconds) {
    return new Date(dateVal.seconds * 1000).toISOString().split('T')[0];
  }
  return '';
}

export interface VolunteerStat {
  name: string;
  normalizedName: string;
  gender: 'Gents' | 'Ladies';
  group: string;
  totalHours: number;
  dutyDaysCount: number;
  totalSubmissions: number;
  datesAttended: Set<string>;
  locations: Set<string>;
}

export interface GroupStat {
  groupName: string;
  gender: string;
  rosterCount: number;
  rosterNames: Set<string>;
  uniqueActiveCount: number;
  uniqueActiveNames: Set<string>;
  uniqueActiveList: VolunteerStat[];
  totalSubmissions: number;
  totalHours: number;
  datesCount: number;
}

export const generateTillDatePerformanceReport = async (
  genderFilter: 'Gents' | 'Ladies' | 'Combined',
  setProgress: (msg: string) => void
) => {
  try {
    setProgress("Fetching complete till-date attendance records from Firestore...");

    // Fetch all attendance records till date
    const attSnap = await getDocs(collection(db, 'attendance'));
    const rawAttendance = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    setProgress(`Retrieved ${rawAttendance.length} attendance records. Synchronizing volunteer rosters...`);

    // Fetch custom sewadars
    const customSnapshot = await getDocs(collection(db, 'custom_sewadars'));
    const customSewadars = customSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as any);

    const mergedRoster = [...INITIAL_SEWADARS];
    customSewadars.forEach(cs => {
      if (!mergedRoster.some(r => r.id === String(cs.id))) {
        mergedRoster.push({
          id: String(cs.id),
          name: cs.name,
          gender: cs.gender,
          group: cs.group,
          isCustom: true
        } as any);
      }
    });

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Determine target groups based on gender filter
    let targetLogicalGroups: string[] = [];
    if (genderFilter === 'Gents') {
      targetLogicalGroups = daysOfWeek.map(d => `${d} Gents`);
    } else if (genderFilter === 'Ladies') {
      targetLogicalGroups = daysOfWeek.map(d => `${d} Ladies`);
    } else {
      daysOfWeek.forEach(d => {
        targetLogicalGroups.push(`${d} Gents`);
        targetLogicalGroups.push(`${d} Ladies`);
      });
    }

    // Build lookups
    const idLookup = new Map<string, any>();
    const nameLookup = new Map<string, any>();

    mergedRoster.forEach(s => {
      idLookup.set(String(s.id), s);
      const norm = normalizeName(s.name);
      if (!nameLookup.has(norm)) {
        nameLookup.set(norm, s);
      }
    });

    // Group roster initialization
    const rosterByGroup: Record<string, Set<string>> = {};
    const rosterNamesOriginalByGroup: Record<string, Map<string, string>> = {};
    targetLogicalGroups.forEach(g => {
      rosterByGroup[g] = new Set<string>();
      rosterNamesOriginalByGroup[g] = new Map<string, string>();
    });

    mergedRoster.forEach(s => {
      const gName = s.gender === 'Ladies' ? `${s.group} Ladies` : `${s.group} Gents`;
      if (targetLogicalGroups.includes(gName)) {
        const norm = normalizeName(s.name);
        if (norm) {
          rosterByGroup[gName].add(norm);
          rosterNamesOriginalByGroup[gName].set(norm, s.name);
        }
      }
    });

    // Stats collections
    const individualStats: Record<string, VolunteerStat> = {};
    const submissionsByGroup: Record<string, number> = {};
    const hoursByGroup: Record<string, number> = {};
    const datesByGroup: Record<string, Set<string>> = {};
    const uniqueMarkedByGroup: Record<string, Set<string>> = {};

    targetLogicalGroups.forEach(g => {
      submissionsByGroup[g] = 0;
      hoursByGroup[g] = 0;
      datesByGroup[g] = new Set<string>();
      uniqueMarkedByGroup[g] = new Set<string>();
    });

    setProgress("Compiling volunteer hours, duty days, and submission counts...");

    rawAttendance.forEach(r => {
      const name = r.name || r.sewadarName || '';
      const sId = r.sewadarId || r.sewadar_id || '';
      const rawGroup = r.group || '';
      const gender = r.gender || (rawGroup.includes('Ladies') ? 'Ladies' : 'Gents');

      if (!name) return;
      const normName = normalizeName(name);

      let matchedSewadar = sId ? idLookup.get(String(sId)) : null;
      if (!matchedSewadar) matchedSewadar = nameLookup.get(normName);

      let resolvedGender: 'Gents' | 'Ladies' = (gender === 'Ladies' || (matchedSewadar && matchedSewadar.gender === 'Ladies')) ? 'Ladies' : 'Gents';
      
      // Filter out if not matching requested genderFilter
      if (genderFilter !== 'Combined' && resolvedGender !== genderFilter) {
        return;
      }

      let mappedGroup = '';
      if (matchedSewadar) {
        mappedGroup = `${matchedSewadar.group} ${matchedSewadar.gender}`;
      } else {
        const cleanDay = rawGroup.replace(' Gents', '').replace(' Ladies', '').replace('Ladies-', '').trim();
        mappedGroup = `${cleanDay} ${resolvedGender}`;
      }

      if (!targetLogicalGroups.includes(mappedGroup)) return;

      const dateStr = normalizeDateStr(r.date);
      const loc = r.workshopLocation || r.workshop_location || 'Kirpal Bagh';
      const minWorked = calculateMinutes(r.inTime || r.in_time, r.outTime || r.out_time);
      const hoursWorked = Number((minWorked / 60).toFixed(2));

      submissionsByGroup[mappedGroup]++;
      hoursByGroup[mappedGroup] += hoursWorked;
      if (dateStr) datesByGroup[mappedGroup].add(dateStr);
      uniqueMarkedByGroup[mappedGroup].add(normName);

      if (!individualStats[normName]) {
        individualStats[normName] = {
          name: matchedSewadar ? matchedSewadar.name : name,
          normalizedName: normName,
          gender: resolvedGender,
          group: mappedGroup,
          totalHours: 0,
          dutyDaysCount: 0,
          totalSubmissions: 0,
          datesAttended: new Set<string>(),
          locations: new Set<string>()
        };
      }

      individualStats[normName].totalSubmissions++;
      individualStats[normName].totalHours += hoursWorked;
      if (dateStr) individualStats[normName].datesAttended.add(dateStr);
      if (loc) individualStats[normName].locations.add(loc);
    });

    // Update duty days count per volunteer
    Object.values(individualStats).forEach(v => {
      v.dutyDaysCount = v.datesAttended.size || v.totalSubmissions;
    });

    // Global / Cohort Totals
    let totalCohortRoster = 0;
    let totalCohortUniqueActive = 0;
    let totalCohortSubmissions = 0;
    let totalCohortHours = 0;

    targetLogicalGroups.forEach(g => {
      totalCohortRoster += rosterByGroup[g].size;
      totalCohortUniqueActive += uniqueMarkedByGroup[g].size;
      totalCohortSubmissions += submissionsByGroup[g];
      totalCohortHours += hoursByGroup[g];
    });

    setProgress("Structuring analytics tables and report pages...");

    // 1. TOP INDIVIDUALS BY HOURS & DUTY DAYS
    const allIndividuals = Object.values(individualStats);
    const sortedByHours = [...allIndividuals].sort((a, b) => b.totalHours - a.totalHours || b.dutyDaysCount - a.dutyDaysCount);
    const sortedByDutyDays = [...allIndividuals].sort((a, b) => b.dutyDaysCount - a.dutyDaysCount || b.totalHours - a.totalHours);

    const topHoursLeader = sortedByHours[0] || { name: '-', group: '-', totalHours: 0, dutyDaysCount: 0 };
    const topDutyDaysLeader = sortedByDutyDays[0] || { name: '-', group: '-', totalHours: 0, dutyDaysCount: 0 };

    // 2. GROUP STATISTICS LIST
    const groupStatsList: GroupStat[] = targetLogicalGroups.map(g => {
      const activeVolunteersInGroup = allIndividuals
        .filter(v => v.group === g)
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        groupName: g,
        gender: g.includes('Ladies') ? 'Ladies' : 'Gents',
        rosterCount: rosterByGroup[g].size,
        rosterNames: rosterByGroup[g],
        uniqueActiveCount: uniqueMarkedByGroup[g].size,
        uniqueActiveNames: uniqueMarkedByGroup[g],
        uniqueActiveList: activeVolunteersInGroup,
        totalSubmissions: submissionsByGroup[g],
        totalHours: hoursByGroup[g],
        datesCount: datesByGroup[g].size
      };
    });

    // 3. RANKINGS
    const rankedByUniqueActive = [...groupStatsList].sort((a, b) => b.uniqueActiveCount - a.uniqueActiveCount);
    const rankedBySubmissions = [...groupStatsList].sort((a, b) => b.totalSubmissions - a.totalSubmissions);
    
    // 4. RATIO BASED ON ALL GROUPS (TOTALITY RATIO & GROUP RATIO)
    const rankedByTotalityActiveRatio = [...groupStatsList].sort((a, b) => {
      const shareA = totalCohortUniqueActive > 0 ? (a.uniqueActiveCount / totalCohortUniqueActive) : 0;
      const shareB = totalCohortUniqueActive > 0 ? (b.uniqueActiveCount / totalCohortUniqueActive) : 0;
      return shareB - shareA;
    });

    const doc = new jsPDF('p', 'mm', 'a4');
    let currentY = 15;

    const startNewPage = (title: string, subtitle?: string) => {
      doc.addPage();
      currentY = 20;

      // Top mini branding bar
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(40, 50, 110);
      doc.text(`SKRM SECURITY ${genderFilter.toUpperCase()} CUMULATIVE AUDIT`, 14, currentY);
      
      const todayDateFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(`TILL DATE: ${todayDateFormatted.toUpperCase()}`, 196, currentY, { align: 'right' });

      doc.setDrawColor(210, 215, 230);
      doc.setLineWidth(0.2);
      doc.line(14, currentY + 2.5, 196, currentY + 2.5);

      currentY += 12;
      
      if (title) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12.5);
        doc.setTextColor(30, 40, 80);
        doc.text(title, 14, currentY);
        currentY += 5;
      }
      if (subtitle) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(subtitle, 14, currentY);
        currentY += 4;
      }
    };

    // ==========================================
    // PAGE 1: TITLE & EXECUTIVE KPI OVERVIEW
    // ==========================================
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(110, 110, 110);
    doc.text("With the blessings of H.H. Sant Rajinder Singh Ji Maharaj", 14, currentY);

    currentY += 11;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(40, 50, 110);
    const titleText = genderFilter === 'Combined' 
      ? `SKRM Security Cumulative Performance Report`
      : `SKRM Security ${genderFilter} Cumulative Report`;
    doc.text(titleText, 14, currentY);
    
    currentY += 6.5;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`Official Till-Date Operational Audit & Group Comparative Analysis (As of ${todayStr})`, 14, currentY);
    
    currentY += 4;
    doc.setDrawColor(40, 50, 110);
    doc.setLineWidth(0.8);
    doc.line(14, currentY, 196, currentY);
    doc.setLineWidth(0.2);

    currentY += 9;

    // Highlight Champions Banner
    doc.setFillColor(245, 247, 255);
    doc.roundedRect(14, currentY, 182, 32, 3, 3, 'F');
    doc.setDrawColor(190, 205, 245);
    doc.roundedRect(14, currentY, 182, 32, 3, 3, 'D');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(40, 50, 110);
    doc.text("TOP INDIVIDUAL RECOGNITION CHAMPIONS (TILL DATE)", 20, currentY + 7);

    // Left leader: Hours
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 40, 80);
    doc.text("Most Service Hours Leader:", 20, currentY + 15);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(`${topHoursLeader.name}`, 20, currentY + 21);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(46, 117, 89);
    doc.text(`${Math.round(topHoursLeader.totalHours)} Hours (${topHoursLeader.dutyDaysCount} Duty Days) • ${topHoursLeader.group}`, 20, currentY + 27);

    // Right leader: Duty Days
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 40, 80);
    doc.text("Most Duty Days / Shifts Leader:", 110, currentY + 15);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(`${topDutyDaysLeader.name}`, 110, currentY + 21);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(46, 117, 89);
    doc.text(`${topDutyDaysLeader.dutyDaysCount} Duty Days (${Math.round(topDutyDaysLeader.totalHours)} Hours) • ${topDutyDaysLeader.group}`, 110, currentY + 27);

    currentY += 38;

    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 40, 80);
    doc.text("Executive Performance Dashboard (Cumulative Totality)", 14, currentY);
    currentY += 4;

    const overallActiveRate = totalCohortRoster > 0 ? (totalCohortUniqueActive / totalCohortRoster) * 100 : 0;
    const avgHrsPerActive = totalCohortUniqueActive > 0 ? (totalCohortHours / totalCohortUniqueActive) : 0;

    autoTable(doc, {
      startY: currentY,
      head: [['Key Executive Metric', 'Cumulative Value', 'Strategic Interpretation']],
      body: [
        ['Total Registered Baseline Roster', totalCohortRoster.toString(), 'All enrolled volunteers across groups'],
        ['Total Unique Volunteers with Marked Duties', totalCohortUniqueActive.toString(), 'Active sewadars with check-ins till date'],
        ['Aggregate Attendance Records Submitted', totalCohortSubmissions.toString(), 'Total operational duty entries recorded'],
        ['Aggregate Service Hours Provided', `${Math.round(totalCohortHours)} hrs`, 'Cumulative volunteered seva duration'],
        ['Overall Roster Participation Index', `${overallActiveRate.toFixed(1)}%`, overallActiveRate >= 60 ? 'Strong Baseline Mobilization' : 'Roster Update Recommended'],
        ['Average Volunteered Seva per Active Sewadar', `${avgHrsPerActive.toFixed(1)} hrs`, 'High engagement & dedication']
      ],
      headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      styles: { fontSize: 8, cellPadding: 2.2, valign: 'middle' },
      theme: 'grid'
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 40, 80);
    doc.text("Operational Audit Objectives & Scope:", 14, currentY);
    currentY += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const leadTxt = `This comprehensive audit covers all verified duty records logged in the SKRM Security management database from inception till date. It provides full transparency on: (1) Individual leaders with the highest accumulated service hours and highest number of duty days; (2) Group rankings by unique active volunteers with de-duplicated member rosters; (3) Group rankings by total attendance submissions volume; and (4) Group active duty participation ratios evaluated both on an internal basis and relative to the entire cohort totality.`;
    const splitLead = doc.splitTextToSize(leadTxt, 182);
    doc.text(splitLead, 14, currentY);

    // ==========================================
    // PAGE 2: SECTION 1 - INDIVIDUAL SERVICE LEADERS (HOURS & DAYS)
    // ==========================================
    startNewPage(
      "Section 1: Individual Service Leaders (Accumulated Hours & Duty Days)",
      "Top dedicated volunteers ranked by total volunteered hours and total distinct duty days attended till date"
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(45, 55, 120);
    doc.text("1.1 Top 15 Volunteers with Most Service Hours (Till Date)", 14, currentY);
    currentY += 3;

    const top15Hours = sortedByHours.slice(0, 15);
    const topHoursBody = top15Hours.map((v, idx) => [
      (idx + 1).toString(),
      v.name,
      v.group,
      `${Math.round(v.totalHours)} hrs`,
      v.dutyDaysCount.toString(),
      v.totalSubmissions.toString(),
      v.dutyDaysCount > 0 ? (v.totalHours / v.dutyDaysCount).toFixed(1) + ' hrs' : '-'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Rank', 'Volunteer Name', 'Group', 'Total Hours', 'Duty Days', 'Shifts', 'Avg Hrs/Day']],
      body: topHoursBody,
      headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      styles: { fontSize: 7, cellPadding: 1.8, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 50, fontStyle: 'bold' },
        2: { cellWidth: 40 },
        3: { cellWidth: 24, halign: 'center', fontStyle: 'bold', textColor: [46, 117, 89] },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 16, halign: 'center' },
        6: { cellWidth: 20, halign: 'center' }
      },
      theme: 'grid'
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(45, 55, 120);
    doc.text("1.2 Top 15 Volunteers with Most Duty Days / Shifts (Till Date)", 14, currentY);
    currentY += 3;

    const top15Days = sortedByDutyDays.slice(0, 15);
    const topDaysBody = top15Days.map((v, idx) => [
      (idx + 1).toString(),
      v.name,
      v.group,
      v.dutyDaysCount.toString(),
      `${Math.round(v.totalHours)} hrs`,
      v.totalSubmissions.toString(),
      v.dutyDaysCount > 0 ? (v.totalHours / v.dutyDaysCount).toFixed(1) + ' hrs' : '-'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Rank', 'Volunteer Name', 'Group', 'Duty Days', 'Total Hours', 'Shifts', 'Avg Hrs/Day']],
      body: topDaysBody,
      headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      styles: { fontSize: 7, cellPadding: 1.8, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 50, fontStyle: 'bold' },
        2: { cellWidth: 40 },
        3: { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: [46, 117, 89] },
        4: { cellWidth: 24, halign: 'center' },
        5: { cellWidth: 16, halign: 'center' },
        6: { cellWidth: 20, halign: 'center' }
      },
      theme: 'grid'
    });

    // ==========================================
    // PAGE 3: SECTION 2 - UNIQUE VOLUNTEER ATTENDANCE STANDINGS
    // ==========================================
    startNewPage(
      "Section 2: Group Unique Active Volunteers Standings",
      "Comparative rankings of groups based on total unique volunteers who have performed duty till date"
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(45, 55, 120);
    doc.text("2.1 Group Standings Ranked by Unique Active Volunteers", 14, currentY);
    currentY += 3.5;

    const uniqueTblBody = rankedByUniqueActive.map((g, idx) => {
      const shareOfCohort = totalCohortUniqueActive > 0 ? (g.uniqueActiveCount / totalCohortUniqueActive) * 100 : 0;
      const internalTurnout = g.rosterCount > 0 ? (g.uniqueActiveCount / g.rosterCount) * 100 : 0;
      
      let status = 'Standard Coverage';
      if (idx === 0) status = 'Most Unique Volunteers';
      else if (idx <= 2) status = 'High Mobilization';
      else if (idx >= rankedByUniqueActive.length - 2) status = 'Engagement Focus Needed';

      return [
        `Rank ${idx + 1}`,
        g.groupName,
        g.uniqueActiveCount.toString(),
        g.rosterCount.toString(),
        `${internalTurnout.toFixed(1)}%`,
        `${shareOfCohort.toFixed(1)}%`,
        status
      ];
    });

    // Add total row
    uniqueTblBody.push([
      'TOTAL',
      'Entire Cohort',
      totalCohortUniqueActive.toString(),
      totalCohortRoster.toString(),
      `${totalCohortRoster > 0 ? ((totalCohortUniqueActive / totalCohortRoster) * 100).toFixed(1) : '0'}%`,
      '100.0%',
      '-'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Rank', 'Group Name', 'Unique Active Sewadars', 'Enrolled Baseline Roster', 'Internal Turnout %', 'Share of All Active %', 'Performance Assessment']],
      body: uniqueTblBody,
      headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      styles: { fontSize: 7, cellPadding: 2, valign: 'middle' },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.row.section === 'body') {
          if (data.row.index === rankedByUniqueActive.length) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [230, 235, 255];
          } else if (data.row.index === 0 && data.column.index === 0) {
            data.cell.styles.textColor = [46, 117, 89];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 40, 80);
    doc.text("Operational Analysis & Observations:", 14, currentY);
    currentY += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const topUniqueGroup = rankedByUniqueActive[0];
    const obUnique1 = `• Leading Cohort: ${topUniqueGroup ? topUniqueGroup.groupName : 'N/A'} has mobilized the highest number of distinct volunteers (${topUniqueGroup ? topUniqueGroup.uniqueActiveCount : 0} unique sewadars), representing ${topUniqueGroup && totalCohortUniqueActive > 0 ? ((topUniqueGroup.uniqueActiveCount / totalCohortUniqueActive) * 100).toFixed(1) : 0}% of all active volunteers across the entire organization.`;
    const obUnique2 = `• De-duplication Protocol: All names have undergone normalization and ID matching. Duplicate spellings, initials, and honourific prefixes (e.g. 'Ji', 'Dr.', 'Mr.') have been consolidated to provide true unique individual counts.`;
    doc.text(doc.splitTextToSize(obUnique1, 182), 14, currentY); currentY += 10;
    doc.text(doc.splitTextToSize(obUnique2, 182), 14, currentY);

    // ==========================================
    // PAGE 4: SECTION 3 - ATTENDANCE SUBMISSIONS VOLUME
    // ==========================================
    startNewPage(
      "Section 3: Attendance Submissions Volume (Highest to Lowest)",
      "Rankings of groups based on total check-in entries and duty records submitted into the system till date"
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(45, 55, 120);
    doc.text("3.1 Group Standings Ranked by Attendance Submissions Logged", 14, currentY);
    currentY += 3.5;

    const subTblBody = rankedBySubmissions.map((g, idx) => {
      const shareOfSubmissions = totalCohortSubmissions > 0 ? (g.totalSubmissions / totalCohortSubmissions) * 100 : 0;
      const shareOfHours = totalCohortHours > 0 ? (g.totalHours / totalCohortHours) * 100 : 0;
      const avgSubPerActive = g.uniqueActiveCount > 0 ? (g.totalSubmissions / g.uniqueActiveCount).toFixed(1) : '-';

      return [
        `Rank ${idx + 1}`,
        g.groupName,
        g.totalSubmissions.toString(),
        `${Math.round(g.totalHours)} hrs`,
        `${shareOfSubmissions.toFixed(1)}%`,
        `${shareOfHours.toFixed(1)}%`,
        avgSubPerActive,
        g.datesCount.toString()
      ];
    });

    // Add total row
    subTblBody.push([
      'TOTAL',
      'Entire Cohort',
      totalCohortSubmissions.toString(),
      `${Math.round(totalCohortHours)} hrs`,
      '100.0%',
      '100.0%',
      totalCohortUniqueActive > 0 ? (totalCohortSubmissions / totalCohortUniqueActive).toFixed(1) : '-',
      '-'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Rank', 'Group Name', 'Total Submissions', 'Total Hours', 'Submissions Share %', 'Hours Share %', 'Avg Shifts/Active', 'Unique Dates']],
      body: subTblBody,
      headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      styles: { fontSize: 7, cellPadding: 2, valign: 'middle' },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.row.section === 'body') {
          if (data.row.index === rankedBySubmissions.length) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [230, 235, 255];
          } else if (data.row.index === 0 && data.column.index === 0) {
            data.cell.styles.textColor = [46, 117, 89];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 40, 80);
    doc.text("Operational Key Takeaways:", 14, currentY);
    currentY += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const topSubGroup = rankedBySubmissions[0];
    const obSub1 = `• Submissions Leader: ${topSubGroup ? topSubGroup.groupName : 'N/A'} has logged the most attendance check-ins (${topSubGroup ? topSubGroup.totalSubmissions : 0} records), contributing ${topSubGroup && totalCohortSubmissions > 0 ? ((topSubGroup.totalSubmissions / totalCohortSubmissions) * 100).toFixed(1) : 0}% of all organizational shifts.`;
    const obSub2 = `• Shift Frequency: Groups with high average shifts per active volunteer demonstrate consistent repeat duty attendance across weekends and special mission events.`;
    doc.text(doc.splitTextToSize(obSub1, 182), 14, currentY); currentY += 10;
    doc.text(doc.splitTextToSize(obSub2, 182), 14, currentY);

    // ==========================================
    // PAGE 5: SECTION 4 - RATIO ANALYSIS (GROUP-INTERNAL VS. ALL-GROUPS TOTALITY BASIS)
    // ==========================================
    startNewPage(
      "Section 4: Volunteers / Duty Volunteers Ratio Analysis",
      "Rigorous mathematical evaluation of volunteer ratios comparing internal group turnout against total cohort workforce share"
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(45, 55, 120);
    doc.text("4.1 Mathematical Formulation of Ratio Calculations", 14, currentY);
    currentY += 3.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(50, 50, 50);
    const formulaExplanation = `To ensure fair comparison across groups of different baseline sizes, two distinct ratios are evaluated:
1. Group-Internal Turnout Rate % = (Unique Active Volunteers in Group / Enrolled Baseline Roster of Group) * 100
2. Share of Total Active Workforce (All-Groups Basis) % = (Unique Active Volunteers in Group / Total Active Volunteers Across All Groups) * 100
3. Workforce Mobilization Efficiency Index = (Share of All Active Volunteers) / (Share of Total Enrolled Roster). An index > 1.0 indicates the group overperforms relative to its roster proportion.`;
    const splitForm = doc.splitTextToSize(formulaExplanation, 182);
    doc.text(splitForm, 14, currentY);
    currentY += splitForm.length * 3.8 + 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(45, 55, 120);
    doc.text("4.2 Comprehensive Ratio Comparison Matrix (Group vs. All Groups Basis)", 14, currentY);
    currentY += 3.5;

    const ratioTblBody = rankedByTotalityActiveRatio.map((g, idx) => {
      const internalRate = g.rosterCount > 0 ? (g.uniqueActiveCount / g.rosterCount) * 100 : 0;
      const shareOfTotalActive = totalCohortUniqueActive > 0 ? (g.uniqueActiveCount / totalCohortUniqueActive) * 100 : 0;
      const shareOfTotalRoster = totalCohortRoster > 0 ? (g.rosterCount / totalCohortRoster) * 100 : 0;
      const efficiencyIndex = shareOfTotalRoster > 0 ? (shareOfTotalActive / shareOfTotalRoster) : 1.0;

      let assessment = 'Balanced Mobilization';
      if (efficiencyIndex >= 1.2) assessment = 'High Efficiency Leader';
      else if (efficiencyIndex < 0.8) assessment = 'Capacity Untapped';

      return [
        `Rank ${idx + 1}`,
        g.groupName,
        g.uniqueActiveCount.toString(),
        g.rosterCount.toString(),
        `${internalRate.toFixed(1)}%`,
        `${shareOfTotalActive.toFixed(1)}%`,
        `${shareOfTotalRoster.toFixed(1)}%`,
        efficiencyIndex.toFixed(2),
        assessment
      ];
    });

    // Add total row
    ratioTblBody.push([
      'TOTAL',
      'Entire Cohort',
      totalCohortUniqueActive.toString(),
      totalCohortRoster.toString(),
      `${totalCohortRoster > 0 ? ((totalCohortUniqueActive / totalCohortRoster) * 100).toFixed(1) : '0'}%`,
      '100.0%',
      '100.0%',
      '1.00',
      '-'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [[
        'Rank',
        'Group Name',
        'Active [A]',
        'Roster [B]',
        'Internal Turnout [A/B]',
        'All-Groups Active %',
        'All-Groups Roster %',
        'Efficiency Index',
        'Strategic Rating'
      ]],
      body: ratioTblBody,
      headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      styles: { fontSize: 6.8, cellPadding: 1.8, valign: 'middle' },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.row.section === 'body') {
          if (data.row.index === rankedByTotalityActiveRatio.length) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [230, 235, 255];
          } else if (data.row.index === 0 && data.column.index === 0) {
            data.cell.styles.textColor = [46, 117, 89];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // ==========================================
    // PAGE 6 & ONWARDS: GROUP-WISE UNIQUE VOLUNTEERS DIRECTORY (DE-DUPLICATED)
    // ==========================================
    startNewPage(
      "Section 5: Group-Wise Unique Volunteers Directory (De-duplicated)",
      "Complete de-duplicated roster of active volunteers with their individual duty days and accumulated hours"
    );

    targetLogicalGroups.forEach((gName, gIdx) => {
      const gStat = groupStatsList.find(g => g.groupName === gName);
      if (!gStat) return;

      if (currentY + 40 > 275) {
        startNewPage(
          `Section 5: Group-Wise Directory (Continued) - ${gName}`,
          `List of verified unique volunteers who marked duty for ${gName}`
        );
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(40, 50, 110);
      doc.text(`5.${gIdx + 1} ${gName} — Unique Volunteers List (${gStat.uniqueActiveList.length} Active Sewadars | ${Math.round(gStat.totalHours)} Total Hours)`, 14, currentY);
      currentY += 3;

      const groupVolRows = gStat.uniqueActiveList.map((v, vIdx) => [
        (vIdx + 1).toString(),
        v.name,
        v.dutyDaysCount.toString(),
        v.totalSubmissions.toString(),
        `${Math.round(v.totalHours)} hrs`,
        v.dutyDaysCount > 0 ? (v.totalHours / v.dutyDaysCount).toFixed(1) + ' hrs' : '-'
      ]);

      if (groupVolRows.length === 0) {
        groupVolRows.push(['-', 'No duty records marked for this group till date', '-', '-', '-', '-']);
      }

      autoTable(doc, {
        startY: currentY,
        head: [['#', 'Volunteer Name (De-duplicated)', 'Duty Days', 'Shifts', 'Total Hours', 'Avg Hrs/Day']],
        body: groupVolRows,
        headStyles: { fillColor: [55, 65, 125], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [247, 248, 252] },
        styles: { fontSize: 6.5, cellPadding: 1.5, valign: 'middle' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 65, fontStyle: 'bold' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
          5: { cellWidth: 30, halign: 'center' }
        },
        theme: 'grid'
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    });

    // Footer decoration across all pages
    const totalPgCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPgCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 140);
      doc.text(`Page ${i} of ${totalPgCount}`, 196, 287, { align: 'right' });
      doc.text("CONFIDENTIAL | S K R M   S E C U R I T Y   C U M U L A T I V E   P E R F O R M A N C E   A U D I T", 14, 287);
    }

    setProgress("Finalizing PDF download...");
    const fileName = genderFilter === 'Combined'
      ? `SKRM_Security_Combined_Cumulative_Report_Till_Date.pdf`
      : `SKRM_Security_${genderFilter}_Cumulative_Report_Till_Date.pdf`;

    doc.save(fileName);
    setProgress("");

  } catch (err) {
    console.error("Till-date report generation failed:", err);
    setProgress("");
    throw err;
  }
};
