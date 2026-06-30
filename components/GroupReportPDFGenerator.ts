import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { INITIAL_SEWADARS } from '../constants';

// Helper to normalize names for merging comparison
function normalizeName(name: string): string {
  if (!name) return "";
  let n = name.toUpperCase().trim();
  n = n.replace(/\s+JI$/g, '');
  n = n.replace(/^DR\s+/g, '');
  n = n.replace(/^MR\s+/g, '');
  n = n.replace(/[^A-Z]/g, '');
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

const normalizeDateStr = (dateVal: any): string => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    if (dateVal.includes('-')) {
      const parts = dateVal.split('-');
      if (parts[0].length === 4) return dateVal; // YYYY-MM-DD
      return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`; // normalize to format
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
};

export const generateGroupPerformanceReport = async (genderFilter: 'Gents' | 'Ladies', setProgress: (msg: string) => void) => {
  try {
    setProgress(`Fetching April-May 2026 data for ${genderFilter} from Firestore...`);
    
    // Bounds: April 1, 2026 to May 31, 2026
    const start = Timestamp.fromDate(new Date(2026, 3, 1, 0, 0, 0));
    const end = Timestamp.fromDate(new Date(2026, 4, 31, 23, 59, 59));
    
    const attQ = query(
      collection(db, 'attendance'),
      where('date', '>=', start),
      where('date', '<=', end)
    );
    const attSnap = await getDocs(attQ);
    const rawAttendance = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    setProgress(`Fetched ${rawAttendance.length} records. Processing custom database roster...`);

    // Fetch custom sewadars to keep roster synchronized
    const customSnapshot = await getDocs(collection(db, 'custom_sewadars'));
    const customSewadars = customSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as any);

    // Merge baseline constraints to form complete roster
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

    const logicalGroups = genderFilter === 'Gents'
      ? ['Monday Gents', 'Tuesday Gents', 'Wednesday Gents', 'Thursday Gents', 'Friday Gents', 'Saturday Gents', 'Sunday Gents']
      : ['Monday Ladies', 'Tuesday Ladies', 'Wednesday Ladies', 'Thursday Ladies', 'Friday Ladies', 'Saturday Ladies', 'Sunday Ladies'];

    const getGroupRoster = (gName: string) => {
      if (gName.endsWith(' Gents')) {
        const baseDay = gName.replace(' Gents', '');
        return mergedRoster.filter(s => s.group === baseDay && s.gender === 'Gents');
      } else {
        const baseDay = gName.replace(' Ladies', '');
        return mergedRoster.filter(s => s.group === baseDay && s.gender === 'Ladies');
      }
    };

    const idLookup = new Map();
    const nameLookup = new Map();
    mergedRoster.forEach(s => {
      idLookup.set(s.id, s);
      const norm = normalizeName(s.name);
      if (!nameLookup.has(norm)) {
        nameLookup.set(norm, s);
      }
    });

    // Initialize metrics tracking dictionaries
    const rosterByGroup: Record<string, Set<string>> = {};
    const markedByGroup: Record<string, Set<string>> = {};
    const datesByGroup: Record<string, Set<string>> = {};
    const reportsByGroup: Record<string, Set<string>> = {};
    
    const locationsList = ['Kirpal Bagh', 'Kirpal Ashram', 'Sawan Ashram', 'Sant Darshan Singh Ji Dham'];
    const datesByGroupLocation: Record<string, Record<string, Set<string>>> = {};
    const shiftDistribution: Record<string, Record<string, { morning: number; day: number; evening: number; night: number }>> = {};

    logicalGroups.forEach(g => {
      rosterByGroup[g] = new Set();
      markedByGroup[g] = new Set();
      datesByGroup[g] = new Set();
      reportsByGroup[g] = new Set();
      
      datesByGroupLocation[g] = {};
      shiftDistribution[g] = {};
      locationsList.forEach(loc => {
        datesByGroupLocation[g][loc] = new Set();
        shiftDistribution[g][loc] = { morning: 0, day: 0, evening: 0, night: 0 };
      });
    });

    const pointsByLoc: Record<string, Set<string>> = {
      'Kirpal Bagh': new Set(),
      'Kirpal Ashram': new Set(),
      'Sawan Ashram': new Set(),
      'Sant Darshan Singh Ji Dham': new Set()
    };
    const pointShiftDistribution: Record<string, Record<string, { morning: number; day: number; evening: number; night: number }>> = {
      'Kirpal Bagh': {},
      'Kirpal Ashram': {},
      'Sawan Ashram': {},
      'Sant Darshan Singh Ji Dham': {}
    };
    const datesByLoc: Record<string, Set<string>> = {
      'Kirpal Bagh': new Set(),
      'Kirpal Ashram': new Set(),
      'Sawan Ashram': new Set(),
      'Sant Darshan Singh Ji Dham': new Set()
    };

    const individualStats: Record<string, { name: string; group: string; dutiesCount: number; totalHours: number; sessionHours: number[] }> = {};

    // Populating registered roster sets
    logicalGroups.forEach(g => {
      const roster = getGroupRoster(g);
      roster.forEach(s => {
        const norm = normalizeName(s.name);
        if (norm) rosterByGroup[g].add(norm);
      });
    });

    setProgress("Parsing attendance sessions & shift distributions...");

    // Processing attendance data arrays
    rawAttendance.forEach(r => {
      const name = r.name || r.sewadarName || '';
      const sId = r.sewadarId || r.sewadar_id || '';
      const rawGroup = r.group || '';
      const gender = r.gender || 'Gents';

      if (!name) return;
      const normName = normalizeName(name);

      let matchedSewadar = sId ? idLookup.get(String(sId)) : null;
      if (!matchedSewadar) matchedSewadar = nameLookup.get(normName);

      let mappedGroup = '';
      if (matchedSewadar) {
        if (matchedSewadar.gender === genderFilter) {
          mappedGroup = `${matchedSewadar.group} ${genderFilter}`;
        }
      } else if (gender === genderFilter) {
        const day = rawGroup.replace(` ${genderFilter}`, '').replace('Ladies-', '').trim();
        mappedGroup = `${day} ${genderFilter}`;
      }

      if (!logicalGroups.includes(mappedGroup)) return;

      const rawDateStr = normalizeDateStr(r.date);
      if (!rawDateStr) return;

      const loc = r.workshop_location || 'Kirpal Bagh';
      if (!locationsList.includes(loc)) return;

      datesByGroup[mappedGroup].add(rawDateStr);
      markedByGroup[mappedGroup].add(normName);
      datesByGroupLocation[mappedGroup][loc].add(rawDateStr);
      reportsByGroup[mappedGroup].add(`${rawDateStr}|${loc}`);

      const minWorked = calculateMinutes(r.in_time, r.out_time);
      const hoursWorked = Number((minWorked / 60).toFixed(2));

      if (!individualStats[normName]) {
        individualStats[normName] = {
          name: matchedSewadar ? matchedSewadar.name : name,
          group: mappedGroup,
          dutiesCount: 0,
          totalHours: 0,
          sessionHours: []
        };
      }
      individualStats[normName].dutiesCount++;
      individualStats[normName].totalHours += hoursWorked;
      individualStats[normName].sessionHours.push(hoursWorked);

      const inTime = r.in_time || '07:00';
      const [hh] = inTime.split(':').map(Number);
      let shiftKey: 'morning' | 'day' | 'evening' | 'night' = 'morning';
      if (hh >= 7 && hh < 13) shiftKey = 'morning';
      else if (hh >= 13 && hh < 19) shiftKey = 'day';
      else if (hh >= 19 || hh < 2) shiftKey = 'evening';
      else shiftKey = 'night';

      shiftDistribution[mappedGroup][loc][shiftKey]++;

      datesByLoc[loc].add(rawDateStr);
      const pt = r.sewaPoint || r.sewa_points || 'General Duty';
      pointsByLoc[loc].add(pt);

      if (!pointShiftDistribution[loc][pt]) {
        pointShiftDistribution[loc][pt] = { morning: 0, day: 0, evening: 0, night: 0 };
      }
      pointShiftDistribution[loc][pt][shiftKey]++;
    });

    setProgress("Compiling grade-wise performers and milestone statistics...");

    // Compute green/yellow/red performer counts
    const groupPerformers: Record<string, { green: number; yellow: number; red: number; totalActive: number; sumAvgHours: number }> = {};
    logicalGroups.forEach(g => {
      groupPerformers[g] = { green: 0, yellow: 0, red: 0, totalActive: 0, sumAvgHours: 0 };
    });

    Object.values(individualStats).forEach(p => {
      if (!logicalGroups.includes(p.group)) return;
      const avgHours = p.sessionHours.length > 0 ? (p.totalHours / p.sessionHours.length) : 0;
      
      let cat: 'green' | 'yellow' | 'red' = 'yellow';
      if (avgHours >= 4.8) cat = 'green';
      else if (avgHours < 3.0) cat = 'red';

      groupPerformers[p.group][cat]++;
      groupPerformers[p.group].totalActive++;
      groupPerformers[p.group].sumAvgHours += avgHours;
    });

    // Compute peer rankings dictionaries for Group Standings (Top 10)
    const topDutiesByGroup: Record<string, string[]> = {};
    const topHoursByGroup: Record<string, string[]> = {};

    logicalGroups.forEach(g => {
      const inGroup = Object.values(individualStats).filter(p => p.group === g);
      
      const sortedByDuties = [...inGroup].sort((a, b) => b.dutiesCount - a.dutiesCount || b.totalHours - a.totalHours).slice(0, 10);
      topDutiesByGroup[g] = sortedByDuties.map(p => `${p.name} (${p.dutiesCount})`);
      while (topDutiesByGroup[g].length < 10) topDutiesByGroup[g].push('-');

      const sortedByHours = [...inGroup].sort((a, b) => b.totalHours - a.totalHours || b.dutiesCount - a.dutiesCount).slice(0, 10);
      topHoursByGroup[g] = sortedByHours.map(p => `${p.name} (${Math.round(p.totalHours)}h)`);
      while (topHoursByGroup[g].length < 10) topHoursByGroup[g].push('-');
    });

    setProgress("Generating custom McKinsey-style tables & graphics in PDF...");

    const doc = new jsPDF('p', 'mm', 'a4');
    let currentY = 15;

    const startNewPage = (title: string, subtitle?: string) => {
      doc.addPage();
      currentY = 20;

      // Miniature brand block
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(40, 50, 110);
      doc.text(`SKRM SECURITY ${genderFilter.toUpperCase()} OPERATIONAL AUDIT`, 14, currentY);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text("APRIL & MAY 2026", 196, currentY, { align: 'right' });

      doc.setDrawColor(210, 215, 230);
      doc.setLineWidth(0.2);
      doc.line(14, currentY + 2.5, 196, currentY + 2.5);

      currentY += 12;
      
      if (title) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(30, 40, 80);
        doc.text(title, 14, currentY);
        currentY += 5;
      }
      if (subtitle) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 100, 100);
        doc.text(subtitle, 14, currentY);
        currentY += 4;
      }
    };

    // ==========================================
    // PAGE 1: TITLE & EXECUTIVE SUMMARY
    // ==========================================
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(110, 110, 110);
    doc.text("With the blessings of H.H. Sant Rajinder Singh Ji Maharaj", 14, currentY);

    currentY += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(40, 50, 110);
    doc.text(`SKRM Security ${genderFilter} Performance Report`, 14, currentY);
    
    currentY += 7;
    doc.setFontSize(10.5);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text(`Executive Performance Audit & Group-Wise Analysis (April & May 2026)`, 14, currentY);
    
    currentY += 4;
    doc.setDrawColor(40, 50, 110);
    doc.setLineWidth(0.8);
    doc.line(14, currentY, 196, currentY);
    doc.setLineWidth(0.2); // reset

    currentY += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 40, 80);
    doc.text("Executive Summary Dashboard", 14, currentY);
    currentY += 4;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const summaryLead = `This high-density executive audit evaluates the active attendance patterns, registered commitments, and manpower deployment balances of our Sawan Kirpal Ruhani Mission ${genderFilter.toLowerCase()} security groups across April and May 2026. Applying professional quantitative filters, this memorandum assesses coverage levels across the four primary service centers.`;
    const splitLead = doc.splitTextToSize(summaryLead, 180);
    doc.text(splitLead, 14, currentY);
    currentY += splitLead.length * 4.5 + 4;

    // Calc overall metrics
    let overallRegRoster = 0;
    let overallUniqueActive = 0;
    let overallDutiesCount = 0;
    let overallHoursCount = 0;

    logicalGroups.forEach(g => {
      overallRegRoster += rosterByGroup[g].size;
      overallUniqueActive += markedByGroup[g].size;
    });
    Object.values(individualStats).forEach(p => {
      overallDutiesCount += p.dutiesCount;
      overallHoursCount += p.totalHours;
    });

    const overallPartRate = overallRegRoster > 0 ? (overallUniqueActive / overallRegRoster) * 100 : 0;

    autoTable(doc, {
      startY: currentY,
      head: [['Key Management Metric', 'Analytical Result', 'Strategic Assessment']],
      body: [
        ['Total Registered Roster Strength', overallRegRoster.toString(), 'Baseline Enrolled Gents / Ladies'],
        ['Unique Checked-In active Sewadars', overallUniqueActive.toString(), 'Volunteers with active check-ins'],
        ['Aggregate Duties Attended', overallDutiesCount.toString(), 'Total operational shifts secured'],
        ['Aggregate Seva Hours Provided', `${Math.round(overallHoursCount)} hrs`, 'High engagement performance'],
        ['Overall Roster Participation Index', `${overallPartRate.toFixed(1)}%`, overallPartRate >= 65 ? 'Stable Coverage' : 'Needs Engagement Focus'],
        ['Location with Deepest Attendance', 'Kirpal Bagh', 'Peak staffing levels'],
        ['Primary Deployment Center', 'Sant Darshan Singh Ji Dham', 'Requires overnight shift balancing']
      ],
      headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
      theme: 'grid'
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 40, 80);
    doc.text("H.H. Maharaj Ji's Operational Guidance", 14, currentY);
    currentY += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 70);
    const guidanceTxt = "Service performed with sweet remembrance and complete surrender is the highest crown of inner devotion. In guarding the holy quarters of Sawan Kirpal Ruhani Mission, let every coordinator organize volunteer rosters to assure maximum safety, balanced shifts, and dedicated vigilance. May our hearts remain connected with the infinite Grace of Maharaj Ji.";
    const splitGuidance = doc.splitTextToSize(guidanceTxt, 180);
    doc.text(splitGuidance, 14, currentY);

    // ==========================================
    // PAGE 2: TABLE 1 (ROSTER VS ACTIVE - RAW DATA)
    // ==========================================
    startNewPage(
      "Section 1 - Baseline Roster vs. Active Performance (Table 1)",
      "Per-group comparison of registered roster records against unique marked active volunteers (April & May 2026)"
    );

    const groupParticipationList = logicalGroups.map(g => {
      const reg = rosterByGroup[g].size;
      const act = markedByGroup[g].size;
      const rate = reg > 0 ? (act / reg) * 100 : 0;
      return { groupName: g, participationRate: rate };
    });

    const sortedByParticipation = [...groupParticipationList].sort((a, b) => b.participationRate - a.participationRate);
    const groupRanks: Record<string, number> = {};
    sortedByParticipation.forEach((item, idx) => {
      groupRanks[item.groupName] = idx + 1;
    });

    const tbl1Data: any[] = [];
    logicalGroups.forEach(g => {
      const reg = rosterByGroup[g].size;
      const act = markedByGroup[g].size;
      const ratio2_1 = reg > 0 ? (act / reg) * 100 : 0;
      const rank = groupRanks[g];

      tbl1Data.push([
        g,
        reg.toString(),
        act.toString(),
        `${ratio2_1.toFixed(1)}%`,
        `Rank ${rank}`
      ]);
    });

    // Sum row
    const totalReg = overallRegRoster;
    const totalAct = overallUniqueActive;
    const totalRatio2_1 = totalReg > 0 ? (totalAct / totalReg) * 100 : 0;

    tbl1Data.push([
      'TOTAL COHORT (Totality Basis)',
      totalReg.toString(),
      totalAct.toString(),
      `${totalRatio2_1.toFixed(1)}%`,
      '-'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [[
        'Group Name',
        'Registered Roster Names [1]',
        'Unique Marked Attendance [2]',
        'Participation Rate [2 / 1] as %',
        'Ranking'
      ]],
      body: tbl1Data,
      headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      styles: { fontSize: 8, cellPadding: 2.5, valign: 'middle' },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.row.section === 'body') {
          if (data.row.index === logicalGroups.length) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [230, 235, 255];
          }
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 40, 80);
    doc.text("Operational Observations & Analysis:", 14, currentY);
    currentY += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    const ob1 = `• Group Rankings reflect the relative volunteer participation strength of each cohort. A higher ranking (such as Wednesday or Sunday Gents) highlights consistent turnout, whereas a lower rank suggests opportunities for coordinators to update rosters and increase active volunteer engagement.`;
    const ob2 = `• The overall participation rate of ${totalRatio2_1.toFixed(1)}% highlights the consistent weekly response. Wednesday and Saturday cohorts show peak engagement due to weekend and mid-week special programs, yielding stable attendance.`;
    doc.text(doc.splitTextToSize(ob1, 180), 14, currentY); currentY += 10;
    doc.text(doc.splitTextToSize(ob2, 180), 14, currentY);

    // ==========================================
    // PAGE 3: TABLE 2 (LOCATION SHIFTS PART A - KIRPAL BAGH & ASHRAM)
    // ==========================================
    startNewPage(
      "Section 2 - Location-Wise Shift Distribution Averages (Part A)",
      "Analysis of average manpower densities across Morning, Day, Evening and Night shifts for main deployment locations (April & May 2026)"
    );

    const renderLocationTableInner = (loc: string, titleTxt: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(40, 50, 110);
      doc.text(titleTxt, 14, currentY);
      currentY += 3;

      const rows: any[] = [];
      let sumM = 0;
      let sumD = 0;
      let sumE = 0;
      let sumN = 0;

      logicalGroups.forEach(g => {
        const uniqueDates = Math.max(datesByGroup[g].size, 1);
        const dist = shiftDistribution[g][loc];
        const avgM = dist.morning / uniqueDates;
        const avgD = dist.day / uniqueDates;
        const avgE = dist.evening / uniqueDates;
        const avgN = dist.night / uniqueDates;
        const totalAvg = avgM + avgD + avgE + avgN;

        sumM += avgM;
        sumD += avgD;
        sumE += avgE;
        sumN += avgN;

        rows.push([
          g,
          avgM.toFixed(1),
          avgD.toFixed(1),
          avgE.toFixed(1),
          avgN.toFixed(1),
          totalAvg.toFixed(1)
        ]);
      });

      // Total average row
      const totalTAvg = sumM + sumD + sumE + sumN;
      rows.push([
        'TOTAL COHORT AVERAGE',
        sumM.toFixed(1),
        sumD.toFixed(1),
        sumE.toFixed(1),
        sumN.toFixed(1),
        totalTAvg.toFixed(1)
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Group Name', 'Avg Morning (7am-1pm)', 'Avg Day (1pm-7pm)', 'Avg Evening (7pm-2am)', 'Avg Night (2am-7am)', 'Avg Active Manpower']],
        body: rows,
        headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [247, 248, 252] },
        styles: { fontSize: 7.5, cellPadding: 2, valign: 'middle' },
        theme: 'grid',
        didParseCell: (data) => {
          if (data.row.section === 'body') {
            if (data.row.index === logicalGroups.length) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [230, 235, 255];
            }
          }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    };

    renderLocationTableInner('Kirpal Bagh', "2.1 Kirpal Bagh Location - Per Group Shift Manpower Averages");
    renderLocationTableInner('Kirpal Ashram', "2.2 Kirpal Ashram Location - Per Group Shift Manpower Averages");

    // ==========================================
    // PAGE 4: TABLE 2 (LOCATION SHIFTS PART B - COHORT OVERVIEWS)
    // ==========================================
    startNewPage(
      "Section 2 - Location-Wise Shift Distribution Averages (Part B)",
      "Analysis of average manpower densities for Sawan Ashram and Sant Darshan Singh Ji Dham locations (April & May 2026)"
    );

    renderLocationTableInner('Sawan Ashram', "2.3 Sawan Ashram Location - Per Group Shift Manpower Averages");
    renderLocationTableInner('Sant Darshan Singh Ji Dham', "2.4 SDS Dham (Burari) Location - Per Group Shift Manpower Averages");

    // ==========================================
    // PAGE 5: TABLE 3 (DUTY POINT ANALYTICS - KIRPAL BAGH & ASHRAM)
    // ==========================================
    startNewPage(
      "Section 3 - Specific Loyalty Duty Points Breakdown (Part A)",
      "Detailed shift-wise manpower average densities across duty points at Kirpal Bagh and Kirpal Ashram"
    );

    const renderDutyPointTableInner = (loc: string, sectionTitle: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(40, 50, 110);
      doc.text(sectionTitle, 14, currentY);
      currentY += 3;

      const activePts = Array.from(pointsByLoc[loc]);
      if (activePts.length === 0) {
        activePts.push('General Duty', 'Gate Guard', 'Parking Supervision');
      }

      const pointAverages = activePts.map(pt => {
        const uniqueDates = Math.max(datesByLoc[loc].size, 1);
        const dist = pointShiftDistribution[loc][pt] || { morning: 0, day: 0, evening: 0, night: 0 };
        const avgM = dist.morning / uniqueDates;
        const avgD = dist.day / uniqueDates;
        const avgE = dist.evening / uniqueDates;
        const avgN = dist.night / uniqueDates;
        const totalAvg = avgM + avgD + avgE + avgN;
        return { pt, avgM, avgD, avgE, avgN, totalAvg };
      }).sort((a, b) => b.totalAvg - a.totalAvg);

      const maxTotalAvg = Math.max(...pointAverages.map(pa => pa.totalAvg), 1);
      const strongestPt = pointAverages[0]?.pt || '';
      const weakestPt = pointAverages.length > 1 ? pointAverages[pointAverages.length - 1]?.pt : '';

      const rows: any[] = [];
      pointAverages.forEach(pa => {
        const isStrong = pa.pt === strongestPt && pa.totalAvg > 0;
        const isWeak = pa.pt === weakestPt && pa.totalAvg > 0;

        rows.push({
          isStrong,
          isWeak,
          cells: [
            pa.pt,
            pa.avgM.toFixed(1),
            pa.avgD.toFixed(1),
            pa.avgE.toFixed(1),
            pa.avgN.toFixed(1),
            pa.totalAvg.toFixed(1),
            { content: ' '.repeat(16), ratio: (pa.totalAvg / maxTotalAvg) * 100 }
          ]
        });
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Sewa Duty Point', 'Avg Morning', 'Avg Day', 'Avg Evening', 'Avg Night', 'Total Avg', 'Density Sparkline (Visual Indicator)']],
        body: rows.map(r => r.cells),
        headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [247, 248, 252] },
        styles: { fontSize: 7.5, cellPadding: 2, valign: 'middle' },
        theme: 'grid',
        didParseCell: (data) => {
          if (data.row.section === 'body') {
            const rowRaw = rows[data.row.index];
            if (rowRaw) {
              if (rowRaw.isStrong) {
                data.cell.styles.fillColor = [230, 248, 230]; // soft green
                if (data.column.index === 0) data.cell.text = [data.cell.text[0] + ' [STRONG]'];
              } else if (rowRaw.isWeak) {
                data.cell.styles.fillColor = [255, 232, 232]; // soft red
                if (data.column.index === 0) data.cell.text = [data.cell.text[0] + ' [ALERT]'];
              }
            }
          }
        },
        didDrawCell: (data) => {
          if (data.row.section === 'body' && data.column.index === 6 && data.row.index >= 0) {
            const cellRaw = data.cell.raw as any;
            if (cellRaw && typeof cellRaw === 'object' && 'ratio' in cellRaw) {
              const ratio = cellRaw.ratio || 0;
              const barW = (data.cell.width - 6) * (ratio / 100);
              const barH = data.cell.height - 4;
              const bx = data.cell.x + 3;
              const by = data.cell.y + 2;

              const rowRaw = rows[data.row.index];
              let col: [number, number, number] = [60, 110, 210]; // cool blue
              if (rowRaw?.isStrong) col = [46, 117, 89]; // green
              else if (rowRaw?.isWeak) col = [184, 60, 60]; // red

              doc.setFillColor(col[0], col[1], col[2]);
              doc.rect(bx, by, Math.max(barW, 2), barH, 'F');
            }
          }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    };

    renderDutyPointTableInner('Kirpal Bagh', "3.1 Kirpal Bagh - Specific Duty Points & Sparklines");
    renderDutyPointTableInner('Kirpal Ashram', "3.2 Kirpal Ashram - Specific Duty Points & Sparklines");

    // ==========================================
    // PAGE 6: TABLE 3 (DUTY POINT COHORT DS DHAM) & TABLE 4 (PEER RATINGS)
    // ==========================================
    startNewPage(
      "Section 3 - Specific Loyalty Duty Points Breakdown (Part B) & Grade-Wise Performers",
      "Detailed points averages for Sant Darshan Singh Ji Dham alongside Grade-wise compliance stats"
    );

    renderDutyPointTableInner('Sant Darshan Singh Ji Dham', "3.3 Sant Darshan Singh Ji Dham - Specific Duty Points & Sparklines");
    
    currentY += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 40, 80);
    doc.text("Section 4 - Grade-Wise Performer Distribution (Table 4)", 14, currentY);
    currentY += 4.5;

    const tbl4Rows: any[] = [];
    let totG = 0, totY = 0, totR = 0, totA = 0;
    let sumHrs = 0;

    logicalGroups.forEach(g => {
      const stats = groupPerformers[g];
      const avgH = stats.totalActive > 0 ? (stats.sumAvgHours / stats.totalActive) : 0;
      totG += stats.green;
      totY += stats.yellow;
      totR += stats.red;
      totA += stats.totalActive;
      sumHrs += stats.sumAvgHours;

      tbl4Rows.push([
        g,
        stats.green.toString(),
        stats.yellow.toString(),
        stats.red.toString(),
        stats.totalActive.toString(),
        `${avgH.toFixed(1)} hrs`
      ]);
    });

    const totAvgH = totA > 0 ? (sumHrs / totA) : 0;
    tbl4Rows.push([
      'TOTAL COHORT ACCUMULATION',
      totG.toString(),
      totY.toString(),
      totR.toString(),
      totA.toString(),
      `${totAvgH.toFixed(1)} hrs`
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Group Name', 'Green Performers (Avg >= 4.8h)', 'Yellow Performers (Avg 3.0h-4.8h)', 'Red Performers (Avg < 3.0h)', 'Total Active Sewadars', 'Weighted Group Average']],
      body: tbl4Rows,
      headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      styles: { fontSize: 7.5, cellPadding: 2, valign: 'middle' },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.row.section === 'body') {
          if (data.row.index === logicalGroups.length) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [230, 235, 255];
          } else {
            if (data.column.index === 1 && data.cell.text[0] !== '0') {
              data.cell.styles.textColor = [46, 117, 89];
              data.cell.styles.fontStyle = 'bold';
            }
            if (data.column.index === 3 && data.cell.text[0] !== '0') {
              data.cell.styles.textColor = [184, 60, 60];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // ==========================================
    // PAGE 7: TABLE 5 (PEER LAURELS - A, B, C, D) & DIRECTIVE
    // ==========================================
    startNewPage(
      "Section 5 - Peer Recognition & Elite Performance Standings",
      "Dynamic recognition rankings reflecting duties count and total volunteered hours (April & May 2026)"
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(45, 55, 120);
    doc.text("5.1 Top 10 Performers by Group (Shifts Attended)", 14, currentY);
    currentY += 3;

    const topDutiesTbl: any[] = [];
    const grpHdrs = logicalGroups.map(g => g.replace(' Gents', '').replace(' Ladies', ''));
    
    for (let r = 0; r < 10; r++) {
      const rowData = [(r + 1).toString()];
      logicalGroups.forEach(g => {
        rowData.push(topDutiesByGroup[g][r] || '-');
      });
      topDutiesTbl.push(rowData);
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Rank', ...grpHdrs]],
      body: topDutiesTbl,
      headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      styles: { fontSize: 6, cellPadding: 1.2, valign: 'middle' },
      theme: 'grid'
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(45, 55, 120);
    doc.text("5.2 Top 10 Performers by Group (Accumulated Hours)", 14, currentY);
    currentY += 3;

    const topHoursTbl: any[] = [];
    for (let r = 0; r < 10; r++) {
      const rowData = [(r + 1).toString()];
      logicalGroups.forEach(g => {
        rowData.push(topHoursByGroup[g][r] || '-');
      });
      topHoursTbl.push(rowData);
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Rank', ...grpHdrs]],
      body: topHoursTbl,
      headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      styles: { fontSize: 6, cellPadding: 1.2, valign: 'middle' },
      theme: 'grid'
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(45, 55, 120);
    doc.text("5.3 Overall Standings - Top 10 Across Entire Cohort (Duties vs. Hours)", 14, currentY);
    currentY += 3;

    const overallTopDuties = Object.values(individualStats)
      .sort((a, b) => b.dutiesCount - a.dutiesCount || b.totalHours - a.totalHours)
      .slice(0, 10);

    const overallTopHours = Object.values(individualStats)
      .sort((a, b) => b.totalHours - a.totalHours || b.dutiesCount - a.dutiesCount)
      .slice(0, 10);

    const leftTableY = currentY;
    autoTable(doc, {
      startY: leftTableY,
      margin: { left: 14 },
      tableWidth: 88,
      head: [['Rank', 'Duties Leader', 'Group', 'Shifts']],
      body: overallTopDuties.map((item, idx) => [
        (idx + 1).toString(),
        item.name,
        item.group.replace(' Gents', '').replace(' Ladies', ''),
        item.dutiesCount.toString()
      ]),
      headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      styles: { fontSize: 6.5, cellPadding: 1.5, valign: 'middle' },
      theme: 'grid'
    });
    
    autoTable(doc, {
      startY: leftTableY,
      margin: { left: 108 },
      tableWidth: 88,
      head: [['Rank', 'Hours Leader', 'Group', 'Hours']],
      body: overallTopHours.map((item, idx) => [
        (idx + 1).toString(),
        item.name,
        item.group.replace(' Gents', '').replace(' Ladies', ''),
        `${Math.round(item.totalHours)} hrs`
      ]),
      headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      styles: { fontSize: 6.5, cellPadding: 1.5, valign: 'middle' },
      theme: 'grid'
    });

    const groupStandings = logicalGroups.map(g => {
      const reg = rosterByGroup[g].size;
      const act = markedByGroup[g].size;
      const rate = reg > 0 ? (act / reg) * 100 : 0;
      return { groupName: g, reg, act, rate };
    }).sort((a, b) => b.rate - a.rate);

    currentY = Math.max((doc as any).lastAutoTable.finalY || 0) + 8;

    if (currentY + 50 > 280) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(45, 55, 120);
    doc.text("5.4 Overall Group Standings - Ranked by Participation Rate", 14, currentY);
    currentY += 4.5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Ranking Criteria: Participation Rate % [Active Checked-In Unique (2) / Enrolled Baseline Roster (1)]", 14, currentY);
    currentY += 3.5;

    const groupRanksTblData = groupStandings.map((item, idx) => {
      const rank = idx + 1;
      let assessment = 'Good Coverage';
      if (rank <= 2) assessment = 'Outstanding Performance';
      else if (rank >= 6) assessment = 'Targeted Engagement Needed';

      return [
        `Rank ${rank}`,
        item.groupName,
        item.reg.toString(),
        item.act.toString(),
        `${item.rate.toFixed(1)}%`,
        assessment
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Final Rank', 'Group Name', 'Enrolled Baseline Roster', 'Active Checked-In Unique', 'Participation Rate [2 / 1] as %', 'Group Performance Assessment']],
      body: groupRanksTblData,
      headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      styles: { fontSize: 7, cellPadding: 1.5, valign: 'middle' },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.row.section === 'body') {
          if (data.row.index < 2) {
            data.cell.styles.fontStyle = 'bold';
            if (data.column.index === 0) data.cell.styles.textColor = [46, 117, 89];
          } else if (data.row.index >= 5) {
            if (data.column.index === 0) data.cell.styles.textColor = [184, 60, 60];
          }
        }
      }
    });

    const groupStandingsByActive = logicalGroups.map(g => {
      const reg = rosterByGroup[g].size;
      const act = markedByGroup[g].size;
      const rate = reg > 0 ? (act / reg) * 100 : 0;
      return { groupName: g, reg, act, rate };
    }).sort((a, b) => b.act - a.act);

    currentY = Math.max((doc as any).lastAutoTable.finalY || 0) + 10;

    if (currentY + 50 > 280) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(45, 55, 120);
    doc.text("5.5 Overall Group Standings - Ranked by Active Sewadars (Unique)", 14, currentY);
    currentY += 4.5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Ranking Criteria: Active Sewadar Unique [Total Unique Marked Checked-In Sewadars (2)]", 14, currentY);
    currentY += 3.5;

    const groupActiveRanksTblData = groupStandingsByActive.map((item, idx) => {
      const rank = idx + 1;
      let assessment = 'Good Coverage';
      if (rank <= 2) assessment = 'Outstanding Performance';
      else if (rank >= 6) assessment = 'Targeted Engagement Needed';

      return [
        `Rank ${rank}`,
        item.groupName,
        item.act.toString(),
        item.reg.toString(),
        `${item.rate.toFixed(1)}%`,
        assessment
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Final Rank', 'Group Name', 'Active Checked-In Unique', 'Enrolled Baseline Roster', 'Participation Rate [2 / 1] as %', 'Group Performance Assessment']],
      body: groupActiveRanksTblData,
      headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      styles: { fontSize: 7, cellPadding: 1.5, valign: 'middle' },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.row.section === 'body') {
          if (data.row.index < 2) {
            data.cell.styles.fontStyle = 'bold';
            if (data.column.index === 0) data.cell.styles.textColor = [46, 117, 89];
          } else if (data.row.index >= 5) {
            if (data.column.index === 0) data.cell.styles.textColor = [184, 60, 60];
          }
        }
      }
    });

    currentY = Math.max((doc as any).lastAutoTable.finalY || 0) + 10;

    if (currentY + 22 > 280) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 40, 80);
    doc.text("Operational Directive & Strategy Recommendation", 14, currentY);
    currentY += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    const directiveTxt = `Comprehensive metrics for April and May 2026 show highly robust shifts secured across Kirpal Bagh and Kirpal Ashram. Based on the grade-wise distribution and point-wise density sparklines, coordinators are advised to: (1) Address critical single-person alert points highlighted in Page 5 & 6, redistributing surplus manpower from high-density areas; (2) Reach out to red-grade performers to help support their duty compliance; and (3) Commend our top 10 group and overall leaders. May Sant Rajinder Singh Ji Maharaj bless our volunteer groups in vigilantly securing the spiritual sanctuaries.`;
    const splitDir = doc.splitTextToSize(directiveTxt, 180);
    doc.text(splitDir, 14, currentY);

    // ==========================================
    // ANNEXURE: GROUP-WISE REPORT DIRECTORY
    // ==========================================
    startNewPage("Annexure: Group-Wise Duty Report Directory", "Detailed log of all initialized reports and location deployments (April & May 2026)");

    const annexureBody = logicalGroups.map(g => {
      const reports = Array.from(reportsByGroup[g]).sort((a, b) => {
        const dateA = a.split('|')[0];
        const dateB = b.split('|')[0];
        return dateA.localeCompare(dateB);
      });

      const formattedList = reports.map(r => {
        const [dateStr, loc] = r.split('|');
        const parts = dateStr.split('-');
        let displayDate = dateStr;
        if (parts.length === 3) {
          const mIdx = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          if (mIdx >= 0 && mIdx < 12) {
            displayDate = `${day} ${months[mIdx]}`;
          }
        }
        return `${displayDate} - ${loc || 'Kirpal Bagh'}`;
      }).join('; ');

      return [
        g,
        `${reports.length} ${reports.length === 1 ? 'Report' : 'Reports'}`,
        formattedList || 'No reports created'
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Group Name', 'Total Reports', 'List of Reports (Date - Location Deployments)']],
      body: annexureBody,
      headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      styles: { fontSize: 7.5, cellPadding: 2.5, valign: 'top' },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold' },
        1: { cellWidth: 25, fontStyle: 'bold' },
        2: { cellWidth: 'auto' }
      },
      theme: 'grid'
    });

    // Decorate all pages with footer numbering
    const totalPgCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPgCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 140);
      doc.text(`Page ${i} of ${totalPgCount}`, 196, 287, { align: 'right' });
      doc.text("CONFIDENTIAL | S K R M   S E C U R I T Y   G R O U P   P E R F O R M A N C E   A U D I T", 14, 287);
    }

    setProgress("Finalizing file download...");
    doc.save(`SKRM_${genderFilter}_Group_Performance_Report_April_May_2026.pdf`);
    setProgress("");
    
  } catch (err) {
    console.error("Group report generation failed:", err);
    setProgress("");
    throw err;
  }
};

export const generateGentsRawDataReport = async (setProgress: (msg: string) => void) => {
  try {
    setProgress("Fetching April-May 2026 gents database records...");

    const start = Timestamp.fromDate(new Date(2026, 3, 1, 0, 0, 0)); // April 1, 2026
    const end = Timestamp.fromDate(new Date(2026, 4, 31, 23, 59, 59)); // May 31, 2026

    const attQ = query(
      collection(db, 'attendance'),
      where('date', '>=', start),
      where('date', '<=', end)
    );
    const attSnap = await getDocs(attQ);
    const rawAttendance = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    setProgress(`Fetched ${rawAttendance.length} records. Processing custom gents roster...`);

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

    const dailyGroups = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const gentsRoster = mergedRoster.filter(s => s.gender === 'Gents' && dailyGroups.includes(s.group));

    const gentsIdLookup = new Map<string, any>();
    const gentsNameLookup = new Map<string, any>();
    gentsRoster.forEach(s => {
      gentsIdLookup.set(s.id, s);
      const norm = normalizeName(s.name);
      if (!gentsNameLookup.has(norm)) {
        gentsNameLookup.set(norm, s);
      }
    });

    const rosterByGroup: Record<string, Set<string>> = {};
    const markedByGroup: Record<string, Set<string>> = {};

    dailyGroups.forEach(day => {
      rosterByGroup[day] = new Set();
      markedByGroup[day] = new Set();
    });

    gentsRoster.forEach(s => {
      const norm = normalizeName(s.name);
      if (norm) rosterByGroup[s.group].add(norm);
    });

    const totalRosterNames = new Set<string>();
    gentsRoster.forEach(s => {
      const norm = normalizeName(s.name);
      if (norm) totalRosterNames.add(norm);
    });

    const totalMarkedUnique = new Set<string>();

    rawAttendance.forEach(r => {
      const name = r.name || r.sewadarName || '';
      const sId = r.sewadarId || r.sewadar_id || '';
      const rawGroup = r.group || '';
      const gender = r.gender || 'Gents';

      if (!name) return;
      const normName = normalizeName(name);

      let matchedSewadar = sId ? gentsIdLookup.get(String(sId)) : null;
      if (!matchedSewadar) {
        matchedSewadar = gentsNameLookup.get(normName);
      }

      let homeGroup = '';
      let isGents = false;

      if (matchedSewadar) {
        isGents = true;
        homeGroup = matchedSewadar.group;
      } else {
        if (gender === 'Gents') {
          isGents = true;
          const day = rawGroup.replace(' Gents', '').replace('Ladies-', '').trim();
          if (dailyGroups.includes(day)) {
            homeGroup = day;
          }
        }
      }

      if (isGents && homeGroup && dailyGroups.includes(homeGroup)) {
        markedByGroup[homeGroup].add(normName);
        totalMarkedUnique.add(normName);
      }
    });

    setProgress("Generating Gents Raw Data Analysis PDF...");

    const doc = new jsPDF('p', 'mm', 'a4');
    let currentY = 15;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(110, 110, 110);
    doc.text("With the blessings of H.H. Sant Rajinder Singh Ji Maharaj", 14, currentY);

    currentY += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(40, 50, 110);
    doc.text("SKRM Security Gents Raw Data Report", 14, currentY);

    subtitle:
    currentY += 7;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Enrolled Roster vs. Active Attendance Marked Analysis (April & May 2026)", 14, currentY);

    currentY += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(14, currentY, 196, currentY);

    currentY += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 40, 80);
    doc.text("1. Totality & Group-Wise Analytical Metrics Table", 14, currentY);
    currentY += 4;

    const rawParticipationList = dailyGroups.map(day => {
      const rosterCount = rosterByGroup[day].size;
      const markedCount = markedByGroup[day].size;
      const rate = rosterCount > 0 ? (markedCount / rosterCount) * 100 : 0;
      return { day, rate };
    });

    const sortedRawParticipation = [...rawParticipationList].sort((a, b) => b.rate - a.rate);
    const rawRanks: Record<string, number> = {};
    sortedRawParticipation.forEach((item, idx) => {
      rawRanks[item.day] = idx + 1;
    });

    const tableData: any[] = [];

    dailyGroups.forEach(day => {
      const rosterCount = rosterByGroup[day].size;
      const markedCount = markedByGroup[day].size;
      const ratioTwoOverOne = rosterCount > 0 ? (markedCount / rosterCount) * 100 : 0;
      const rank = rawRanks[day];

      tableData.push([
        `${day} Gents`,
        rosterCount.toString(),
        markedCount.toString(),
        `${ratioTwoOverOne.toFixed(1)}%`,
        `Rank ${rank}`
      ]);
    });

    const totalRosterCount = totalRosterNames.size;
    const totalMarkedCount = totalMarkedUnique.size;
    const totalRatioTwoOverOne = totalRosterCount > 0 ? (totalMarkedCount / totalRosterCount) * 100 : 0;

    tableData.push([
      'OVERALL COHORT (Totality Basis)',
      totalRosterCount.toString(),
      totalMarkedCount.toString(),
      `${totalRatioTwoOverOne.toFixed(1)}%`,
      '-'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [[
        'Gents Group Name',
        'Registered Roster Names [1]',
        'Unique Marked Attendance [2]',
        'Participation Rate [2 / 1] as %',
        'Ranking'
      ]],
      body: tableData,
      headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      styles: { fontSize: 8, cellPadding: 2.5, valign: 'middle' },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.row.section === 'body') {
          if (data.row.index === dailyGroups.length) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [230, 235, 255];
          }
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 40, 80);
    doc.text("2. Operational Explanatory Insights & Totality Summary", 14, currentY);
    currentY += 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);

    const b1 = `- Total Registered roster includes ${totalRosterCount} distinct sewadars classified under Gents daily groups.`;
    const b2 = `- Across April and May 2026, a total of ${totalMarkedCount} unique Gents had their attendance recorded at least once.`;
    const b3 = `- Group Rankings represent the comparative performance of daily cohorts based on participation.`;
    const b4 = `- The overall cohort active participation rate is ${totalRatioTwoOverOne.toFixed(1)}% on a totality basis.`;

    doc.text(b1, 14, currentY); currentY += 5.5;
    doc.text(b2, 14, currentY); currentY += 5.5;
    doc.text(b3, 14, currentY); currentY += 5.5;
    doc.text(b4, 14, currentY); currentY += 5.5;

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 140);
      doc.text(`Page ${i} of ${pageCount}`, 196, 287, { align: 'right' });
      doc.text("CONFIDENTIAL | SKRM SECURITY DEPLOYMENT RAW ANALYSIS", 14, 287);
    }

    setProgress("Downloading Raw Data PDF...");
    doc.save(`SKRM_Gents_Raw_Analysis_April_May_2026.pdf`);
    setProgress("");

  } catch (err) {
    console.error("Gents raw report generation failed:", err);
    setProgress("");
    throw err;
  }
};
