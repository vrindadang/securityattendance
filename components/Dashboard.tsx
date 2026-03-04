
import React, { useMemo, useState } from 'react';
import { AttendanceRecord, Volunteer, Issue, VehicleRecord, Requirement, GroupPhoto, DutySession } from '../types';
import { VOLUNTEERS } from '../constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  attendance: AttendanceRecord[];
  issues: Issue[];
  groupPhotos: GroupPhoto[];
  vehicles: VehicleRecord[];
  requirements: Requirement[];
  activeVolunteer: Volunteer | null;
  allSessions: DutySession[];
  selectedSessionId: string | null;
  isSessionCompleted: boolean;
  onSessionChange: (id: string) => void;
  onReportIssue: (desc: string, photo?: string) => void;
  onSaveGroupPhoto: (photo: string) => void;
  onSaveVehicle: (v: Omit<VehicleRecord, 'id' | 'timestamp' | 'volunteerId' | 'volunteerName'>) => void;
  onAddRequirement: (desc: string) => void;
  onUpdateRequirementStatus?: (id: string, status: Requirement['status']) => void;
  onUpdateIssue?: (id: string, desc: string, photo?: string) => void;
  onDeleteIssue?: (id: string) => void;
  onUpdatePassword?: (newPassword: string) => Promise<boolean>;
  isLoading: boolean;
  dutyStartTime: string;
  dutyEndTime: string;
  onOpenSettings: () => void;
  onCompleteSession: (sessionId: string) => void;
  onResetAllData?: () => void;
}

const Dashboard: React.FC<Props> = ({ 
  attendance, 
  issues,
  groupPhotos = [],
  vehicles = [],
  requirements = [],
  activeVolunteer, 
  allSessions,
  selectedSessionId,
  isSessionCompleted,
  onSessionChange,
  onReportIssue,
  onSaveGroupPhoto,
  onDeleteIssue,
  dutyStartTime,
  dutyEndTime,
  onCompleteSession,
  onResetAllData
}) => {
  const [issueDesc, setIssueDesc] = useState('');
  const [issuePhoto, setIssuePhoto] = useState<string | null>(null);
  const [showReportConfirmModal, setShowReportConfirmModal] = useState(false);

  const isSuperAdmin = activeVolunteer?.role === 'Super Admin';
  
  const formatDateTime = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${date} ${time}`;
  };

  const calculateDuration = (inTime?: string, outTime?: string): string => {
    if (!inTime || !outTime) return '-';
    try {
      const [inH, inM] = inTime.split(':').map(Number);
      const [outH, outM] = outTime.split(':').map(Number);
      let diff = (outH * 60 + outM) - (inH * 60 + inM);
      if (diff < 0) diff += 24 * 60;
      return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    } catch { return '-'; }
  };

  const generateAttendancePDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const groupName = activeVolunteer?.assignedGroup || 'Security';
    const currentSession = allSessions.find(s => s.id === selectedSessionId);
    const dateDisplay = (typeof currentSession?.date === 'string' ? currentSession.date : '').split('-').reverse().join('/') || '-';
    const isLadies = activeVolunteer?.role.includes('Ladies');
    const groupText = isLadies ? `${groupName} Ladies Security Group` : `${groupName} Gents Security Group`;
    
    let currentY = 15;

    // Helper to ensure vertical space
    const ensureSpace = (h: number) => {
      if (currentY + h > 275) {
        doc.addPage();
        currentY = 20;
        return true;
      }
      return false;
    };

    // Header Intro
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const introText = `With the blessings of H.H. Sant Rajinder Singh Ji Maharaj, ${groupText}, presents the security report for ${dateDisplay}`;
    doc.text(introText, 14, currentY);

    // Title
    currentY += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(50, 60, 120);
    doc.text("SKRM Security Sewa report", 14, currentY);
    
    // Subtitle
    currentY += 7;
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Duty Report Summary", 14, currentY);
    
    // Horizontal Divider
    currentY += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(14, currentY, 196, currentY);

    // 1. Duty Overview
    currentY += 10;
    ensureSpace(40);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("1. Duty Overview", 14, currentY);
    
    const totalSewadarsOnDuty = new Set(attendance.map(a => a.sewadarId)).size;

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Metric', 'Details']],
      body: [
        ['Reporting Security Group', isLadies ? 'Ladies' : `${groupName} Gents`],
        ['Total Sewadars on Duty', totalSewadarsOnDuty],
        ['Ashram / Locations Covered', currentSession?.location || 'General Ashram'],
        ['Duty Start Timing', formatDateTime(dutyStartTime)],
        ['Duty End Timing', formatDateTime(dutyEndTime)]
      ],
      headStyles: { fillColor: [50, 60, 120], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      theme: 'grid'
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;

    // Shift Logic in minutes
    const MOR_S = 7 * 60;
    const MOR_E = 13 * 60;
    const DAY_S = 13 * 60; 
    const DAY_E = 19 * 60;
    const EVE_S = 19 * 60;
    const EVE_E = 2 * 60;
    const NIT_S = 2 * 60;
    const NIT_E = 7 * 60;

    const timeToMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const getStatusDots = (inTime: string, outTime?: string) => {
      const start = timeToMins(inTime);
      const end = outTime ? timeToMins(outTime) : (start + 1);
      const dots: string[] = [];
      const shifts = [
        { s: MOR_S, e: MOR_E, dur: 360 },
        { s: DAY_S, e: DAY_E, dur: 360 },
        { s: EVE_S, e: 1440, wrap: EVE_E, dur: 420 },
        { s: NIT_S, e: NIT_E, dur: 300 }
      ];
      const intervals: [number, number][] = [];
      if (end < start) { intervals.push([start, 1440]); intervals.push([0, end]); }
      else { intervals.push([start, end]); }
      shifts.forEach(shift => {
        let overlap = 0;
        intervals.forEach(([is, ie]) => {
          if (shift.wrap !== undefined) {
            overlap += Math.max(0, Math.min(ie, 1440) - Math.max(is, shift.s));
            overlap += Math.max(0, Math.min(ie, shift.wrap) - Math.max(is, 0));
          } else {
            overlap += Math.max(0, Math.min(ie, shift.e) - Math.max(is, shift.s));
          }
        });
        if (overlap > 0) {
          const pct = (overlap / shift.dur) * 100;
          if (pct >= 80) dots.push('#22c55e');
          else if (pct >= 50) dots.push('#eab308');
          else dots.push('#ef4444');
        }
      });
      return dots;
    };

    const getOverlappingShifts = (inTime: string, outTime?: string) => {
      const start = timeToMins(inTime);
      const end = outTime ? timeToMins(outTime) : (start + 1);
      const shifts: ('Morning' | 'Day' | 'Evening' | 'Night')[] = [];
      const intervals: [number, number][] = [];
      if (end < start) {
        intervals.push([start, 1440]);
        intervals.push([0, end]);
      } else {
        intervals.push([start, end]);
      }
      const checkOverlap = (s1: number, e1: number, s2: number, e2: number) => Math.max(s1, s2) < Math.min(e1, e2);
      intervals.forEach(([is, ie]) => {
        if (checkOverlap(is, ie, MOR_S, MOR_E)) shifts.push('Morning');
        if (checkOverlap(is, ie, DAY_S, DAY_E)) shifts.push('Day');
        if (checkOverlap(is, ie, EVE_S, 1440)) shifts.push('Evening');
        if (checkOverlap(is, ie, 0, EVE_E)) shifts.push('Evening');
        if (checkOverlap(is, ie, NIT_S, NIT_E)) shifts.push('Night');
      });
      return Array.from(new Set(shifts));
    };

    // 2. Shift Distribution Summary
    ensureSpace(45);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("2. Shift Distribution", 14, currentY);

    const shiftCounts = { Morning: new Set<string>(), Day: new Set<string>(), Evening: new Set<string>(), Night: new Set<string>() };
    attendance.forEach(a => {
      if (a.inTime) {
        const covered = getOverlappingShifts(a.inTime, a.outTime);
        covered.forEach(s => shiftCounts[s].add(a.sewadarId));
      }
    });

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Time Slot', 'Shift Description', 'Sewadar Count']],
      body: [
        ['07:00 AM - 01:00 PM', 'Morning Shift', shiftCounts.Morning.size],
        ['01:00 PM - 07:00 PM', 'Day Shift', shiftCounts.Day.size],
        ['07:00 PM - 02:00 AM', 'Evening Shift', shiftCounts.Evening.size],
        ['02:00 AM - 07:00 AM', 'Night Shift', shiftCounts.Night.size]
      ],
      headStyles: { fillColor: [80, 80, 230], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      theme: 'grid'
    });
    
    const shiftTotalSum = shiftCounts.Morning.size + shiftCounts.Day.size + shiftCounts.Evening.size + shiftCounts.Night.size;
    currentY = (doc as any).lastAutoTable.finalY + 4;
    
    // Check space for the note
    const noteText = `Note: The Total Sewadars on Duty in Table 1 is ${totalSewadarsOnDuty}, but the Shift Distribution in Table 2 totals to ${shiftTotalSum}. This is because several sewadars did sewa across multiple shifts; if a person was active during two different time slots, they were counted in the total for both shifts in above table to show full sewa coverage.`;
    const splitNote = doc.splitTextToSize(noteText, 180);
    const noteHeight = (splitNote.length * 4) + 6;
    ensureSpace(noteHeight);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(splitNote, 14, currentY);
    currentY += noteHeight + 4;

    // 3. Sewa Point Deployment Summary
    ensureSpace(30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("3. Sewa Point Deployment", 14, currentY);

    const pointMap: Record<string, { loc: string, spot: string, morSet: Set<string>, daySet: Set<string>, eveSet: Set<string>, nitSet: Set<string> }> = {};
    attendance.forEach(a => {
      const key = `${a.workshopLocation}-${a.sewaPoint}`;
      if (!pointMap[key]) {
        pointMap[key] = { 
          loc: a.workshopLocation || 'Other', 
          spot: a.sewaPoint || 'General', 
          morSet: new Set(), daySet: new Set(), eveSet: new Set(), nitSet: new Set() 
        };
      }
      if (a.inTime) {
        const covered = getOverlappingShifts(a.inTime, a.outTime);
        covered.forEach(s => {
          if (s === 'Morning') pointMap[key].morSet.add(a.sewadarId);
          else if (s === 'Day') pointMap[key].daySet.add(a.sewadarId);
          else if (s === 'Evening') pointMap[key].eveSet.add(a.sewadarId);
          else pointMap[key].nitSet.add(a.sewadarId);
        });
      }
    });

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Ashram / Location', 'Sewa Point / Spot', 'Morning', 'Day', 'Evening', 'Night']],
      body: Object.values(pointMap).map(p => [p.loc, p.spot, p.morSet.size, p.daySet.size, p.eveSet.size, p.nitSet.size]),
      headStyles: { fillColor: [20, 180, 120], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' } },
      bodyStyles: { fontSize: 8.5 },
      theme: 'grid'
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;

    // 4. Reported Issues & Incidents
    ensureSpace(25);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("4. Reported Issues & Incidents", 14, currentY);
    
    if (issues.length > 0) {
      autoTable(doc, {
        startY: currentY + 3,
        head: [['#', 'Description', 'Time', 'Reported By']],
        body: issues.map((issue, idx) => [
          idx + 1, issue.description,
          new Date(issue.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          issue.volunteerName
        ]),
        headStyles: { fillColor: [180, 50, 50], textColor: 255, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        theme: 'grid'
      });
      currentY = (doc as any).lastAutoTable.finalY + 12;
    } else {
      doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(150, 150, 150);
      doc.text("No incidents reported during this session.", 14, currentY + 8);
      currentY += 16;
    }

    // 5. Vehicle Incident / Observation Log
    ensureSpace(25);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0,0,0);
    doc.text("5. Vehicle Incident / Observation Log", 14, currentY);

    if (vehicles.length > 0) {
      autoTable(doc, {
        startY: currentY + 3,
        head: [['#', 'Plate Number', 'Type', 'Model', 'Observation', 'Time']],
        body: vehicles.map((v, idx) => [
          idx + 1, v.plateNumber, v.type, v.model || '-', v.remarks || '-',
          new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        ]),
        headStyles: { fillColor: [70, 70, 70], textColor: 255, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8.5 },
        theme: 'grid'
      });
      currentY = (doc as any).lastAutoTable.finalY + 12;
    } else {
      doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(150, 150, 150);
      doc.text("No vehicle incidents flagged.", 14, currentY + 8);
      currentY += 16;
    }

    // 6. Photos of Group
    if (groupPhotos.length > 0) {
      ensureSpace(35);
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(0, 0, 0);
      doc.text("6. Photos of Group", 14, currentY);
      currentY += 10;
      let photoX = 14; let photoW = 85; let photoH = 60; let gap = 10;
      groupPhotos.forEach((gp) => {
        if (photoX + photoW > 196) { photoX = 14; currentY += photoH + gap + 8; }
        if (currentY + photoH + 10 > 280) { doc.addPage(); currentY = 20; }
        try {
          doc.addImage(gp.photo, 'JPEG', photoX, currentY, photoW, photoH);
          doc.setFontSize(7); doc.setFont("helvetica", "italic"); doc.setTextColor(100, 100, 100);
          doc.text(`Photo by ${gp.volunteerName} - ${new Date(gp.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`, photoX, currentY + photoH + 4);
        } catch (e) { console.error("PDF Image Error", e); }
        photoX += photoW + gap;
      });
    }

    // Detailed Log Page
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(50, 60, 120);
    doc.text("Detailed Attendance Log", 14, 20);

    // Legend at top
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    
    let legendX = 14;
    const legendY = 27;
    
    doc.setFillColor('#22c55e'); doc.circle(legendX, legendY - 0.8, 1, 'F');
    doc.text(">80% Shift", legendX + 3, legendY);
    
    legendX += 25;
    doc.setFillColor('#eab308'); doc.circle(legendX, legendY - 0.8, 1, 'F');
    doc.text("50-80% Shift", legendX + 3, legendY);
    
    legendX += 30;
    doc.setFillColor('#ef4444'); doc.circle(legendX, legendY - 0.8, 1, 'F');
    doc.text("<50% Shift", legendX + 3, legendY);

    autoTable(doc, {
      startY: 34,
      head: [['#', 'Name', 'In', 'Out', 'Dur', 'Location', 'Spot', 'Verified By', 'Status']],
      body: attendance.map((a, i) => {
        const verifier = VOLUNTEERS.find(v => v.id === a.volunteerId)?.name || 'Incharge';
        return [i + 1, a.name, a.inTime || '-', a.outTime || '-', calculateDuration(a.inTime, a.outTime), a.workshopLocation || '-', a.sewaPoint || '-', verifier, ''];
      }),
      headStyles: { fillColor: [50, 60, 120], textColor: 255, fontSize: 8, halign: 'center' },
      columnStyles: { 0: { halign: 'center' }, 8: { halign: 'center', cellWidth: 15 } },
      bodyStyles: { fontSize: 7.5 },
      theme: 'grid',
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 8) {
          const record = attendance[data.row.index];
          if (record.inTime) {
            const dots = getStatusDots(record.inTime, record.outTime);
            const dotRadius = 1.2;
            const dotGap = 1.5;
            const totalWidth = dots.length * (dotRadius * 2) + (dots.length - 1) * dotGap;
            let startX = data.cell.x + (data.cell.width - totalWidth) / 2 + dotRadius;
            
            dots.forEach((color, idx) => {
              doc.setFillColor(color);
              doc.circle(startX + (idx * (dotRadius * 2 + dotGap)), data.cell.y + data.cell.height / 2, dotRadius, 'F');
            });
          }
        }
      }
    });

    doc.save(`SKRM_Security_Report_${groupName}_${dateDisplay.replace(/\//g, '-')}.pdf`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setIssuePhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGroupPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onSaveGroupPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleReportIssueSubmit = () => {
    if (!issueDesc.trim()) return;
    onReportIssue(issueDesc, issuePhoto || undefined);
    setIssueDesc(''); setIssuePhoto(null); setShowReportConfirmModal(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl overflow-hidden relative">
        <div className="relative z-10">
          <h2 className="text-2xl font-black mb-1">Shift Management</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            {isSessionCompleted ? 'Shift Record: Finalized' : 'Shift Record: Active'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 relative z-10">
          <button onClick={generateAttendancePDF} className="bg-indigo-500 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-400 transition-all active:scale-95">Download PDF</button>
          {!isSessionCompleted && (
            <button onClick={() => onCompleteSession(selectedSessionId || '')} className="bg-emerald-500 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-400 transition-all active:scale-95">Finalize Duty</button>
          )}
        </div>
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 text-center shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Total Present</p>
          <p className="text-4xl font-black text-slate-900">{new Set(attendance.map(a => a.sewadarId)).size}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 text-center shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Open Issues</p>
          <p className="text-4xl font-black text-amber-600">{issues.length}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select History Session</label>
        <select 
          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-800 outline-none focus:border-indigo-500"
          value={selectedSessionId || ''}
          onChange={(e) => onSessionChange(e.target.value)}
        >
          {allSessions.length === 0 && <option value="">No sessions found</option>}
          {allSessions.map(s => (
            <option key={s.id} value={s.id}>
              {(typeof s.date === 'string' ? s.date : '').split('-').reverse().join('/')} - {s.location} ({s.completed ? 'Finalized' : 'Active'})
            </option>
          ))}
        </select>
      </div>

      {!isSessionCompleted && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase mb-4">Report an Issue</h3>
          <textarea 
            className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium text-slate-800 outline-none focus:border-indigo-500 transition-all"
            rows={3}
            placeholder="Describe any incidents, uniform issues, or security concerns..."
            value={issueDesc}
            onChange={(e) => setIssueDesc(e.target.value)}
          />
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Attach Photo (Optional)</label>
            <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100" />
          </div>

          <button disabled={!issueDesc.trim()} onClick={() => setShowReportConfirmModal(true)} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50">
            Submit Incident Report
          </button>
        </div>
      )}

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase">Photos of Group</h3>
            <p className="text-[10px] font-bold text-slate-300 mt-1 uppercase tracking-widest">Share moments from your shift</p>
          </div>
          {!isSessionCompleted && (
            <label className="cursor-pointer bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-indigo-100 transition-all">
              Add Photo
              <input type="file" accept="image/*" onChange={handleGroupPhotoChange} className="hidden" />
            </label>
          )}
        </div>

        {groupPhotos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {groupPhotos.map((gp) => (
              <div key={gp.id} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-100 shadow-sm group">
                <img src={gp.photo} alt="Group Moment" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-[7px] font-black text-white uppercase tracking-widest truncate">{gp.volunteerName}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No group photos captured yet.</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Incident Logs</h3>
        {issues.length > 0 ? issues.map(issue => (
          <div key={issue.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="font-bold text-slate-800">{issue.description}</p>
                <p className="text-[10px] font-bold text-slate-400">
                  {new Date(issue.timestamp).toLocaleTimeString()} • Reported by {issue.volunteerName}
                </p>
              </div>
              {onDeleteIssue && !isSessionCompleted && (
                <button onClick={() => onDeleteIssue(issue.id)} className="text-red-400 hover:text-red-600 p-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" /></svg>
                </button>
              )}
            </div>
            {issue.photo && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                <img src={issue.photo} alt="Issue evidence" className="w-full h-auto object-cover" style={{ maxHeight: '200px' }} />
              </div>
            )}
          </div>
        )) : (
          <p className="text-center py-10 text-slate-300 italic text-sm">No incidents reported for this session.</p>
        )}
      </div>

      {isSuperAdmin && (
        <div className="mt-12 bg-red-50 p-8 rounded-[2rem] border-2 border-dashed border-red-200">
          <h3 className="text-red-700 font-black text-sm uppercase mb-6 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.268 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Danger Zone
          </h3>
          <button onClick={() => onResetAllData && onResetAllData()} className="w-full bg-red-600 py-5 rounded-2xl text-white font-black text-[10px] uppercase shadow-xl hover:bg-red-700 transition-all active:scale-95">Reset System Data</button>
        </div>
      )}

      {showReportConfirmModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl animate-fade-in">
          <div className="bg-white w-full max-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 text-center">
             <div className="w-20 h-20 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto text-4xl shadow-inner">⚠️</div>
             <div>
                <h3 className="text-2xl font-black text-slate-900">Submit Incident?</h3>
                <p className="text-slate-500 text-xs mt-2 font-medium">This will be added to the permanent shift log and cannot be easily undone.</p>
             </div>
             <div className="flex gap-3 pt-4">
                <button onClick={() => setShowReportConfirmModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
                <button onClick={handleReportIssueSubmit} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-200 active:scale-95 transition-all">Confirm Report</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
