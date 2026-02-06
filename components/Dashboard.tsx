
import React, { useMemo, useState, useRef } from 'react';
import { AttendanceRecord, Volunteer, Issue } from '../types';
import { VOLUNTEERS, FRIDAY_LIST } from '../constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DutySession } from '../App';
import { supabase } from '../supabase';

interface Props {
  attendance: AttendanceRecord[];
  issues: Issue[];
  activeVolunteer: Volunteer | null;
  allSessions: DutySession[];
  selectedSessionId: string | null;
  isSessionCompleted: boolean;
  onSessionChange: (id: string) => void;
  onReportIssue: (desc: string, photo?: string) => void;
  onUpdateIssue?: (id: string, desc: string, photo?: string) => void;
  onDeleteIssue?: (id: string) => void;
  onUpdatePassword?: (newPassword: string) => Promise<boolean>;
  isLoading: boolean;
  dutyStartTime: string;
  dutyEndTime: string;
  onOpenSettings: () => void;
  onCompleteSession: (sessionId: string) => void;
}

const Dashboard: React.FC<Props> = ({ 
  attendance, 
  issues,
  activeVolunteer, 
  allSessions,
  selectedSessionId,
  isSessionCompleted,
  onSessionChange,
  onReportIssue,
  onUpdateIssue,
  onDeleteIssue,
  onUpdatePassword,
  isLoading, 
  dutyStartTime,
  dutyEndTime,
  onOpenSettings,
  onCompleteSession
}) => {
  const [showReportConfirmModal, setShowReportConfirmModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [issueDesc, setIssueDesc] = useState('');
  const [issuePhoto, setIssuePhoto] = useState<string | null>(null);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [isReplicating, setIsReplicating] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = activeVolunteer?.role === 'Super Admin';
  const assignedGroup = activeVolunteer?.assignedGroup;
  const totalPresent = attendance.length;

  const replicateFridayReport = async () => {
    if (!selectedSessionId || isSessionCompleted || !isSuperAdmin) return;
    if (!confirm("This will PERMANENTLY DELETE current Friday attendance and replace it with 51 records from the 06/02/2026 report. Continue?")) return;

    setIsReplicating(true);
    const session = allSessions.find(s => s.id === selectedSessionId);
    if (!session) return;

    // FULL 51-RECORD DATASET EXTRACTED FROM PDF
    const reportData = [
      { name: "Bijender Singh", in: "02:00", out: "07:00", loc: "Kirpal Ashram", spot: "Gate No 2" },
      { name: "Sushil Ahuja", in: "16:00", out: "02:00", loc: "Kirpal Bagh", spot: "Main Gate" },
      { name: "Sachin Kumar", in: "18:25", out: "21:25", loc: "Kirpal Bagh", spot: "Round" },
      { name: "Rajender Singh", in: "02:00", out: "07:00", loc: "Kirpal Ashram", spot: "Gate No 2" },
      { name: "Rahul Girdhar", in: "19:35", out: "01:00", loc: "Kirpal Bagh", spot: "Gate 1" },
      { name: "Akash Thakral", in: "17:45", out: "02:00", loc: "Kirpal Bagh", spot: "Gate No 4" },
      { name: "Anil Sehgal", in: "10:00", out: "12:30", loc: "Kirpal Bagh", spot: "Gate No 1" },
      { name: "Ashish K Sardana", in: "20:10", out: "01:32", loc: "Kirpal Bagh", spot: "Gate No 2" },
      { name: "Ashok Kr Sharma", in: "07:00", out: "20:15", loc: "Kirpal Bagh", spot: "Gate No 1" },
      { name: "Bhola Shankar", in: "16:00", out: "21:00", loc: "Kirpal Bagh", spot: "Gate No 4" },
      { name: "Deepak Seghal", in: "17:30", out: "02:00", loc: "Kirpal Bagh", spot: "Main Gate" },
      { name: "Devender Kumar", in: "17:30", out: "01:30", loc: "Kirpal Bagh", spot: "Gate No 1" },
      { name: "Hari Chand Bajaj", in: "18:50", out: "02:00", loc: "Kirpal Bagh", spot: "Langar" },
      { name: "Himanshu Sachdeva", in: "19:35", out: "02:00", loc: "Kirpal Bagh", spot: "Stage" },
      { name: "Jeet Singh Juneja", in: "20:50", out: "02:00", loc: "Kirpal Bagh", spot: "Bhajan Sthal" },
      { name: "Neeraj Sachdeva", in: "19:00", out: "02:00", loc: "Kirpal Bagh", spot: "Stage" },
      { name: "Puneet Chachra", in: "19:00", out: "02:00", loc: "Kirpal Bagh", spot: "Langa" },
      { name: "Rajesh Malhotra", in: "16:00", out: "01:00", loc: "Kirpal Bagh", spot: "Cash" },
      { name: "Rajinder Jindal", in: "11:50", out: "15:00", loc: "Kirpal Bagh", spot: "Gate No 1" },
      { name: "Rakesh Arora", in: "19:00", out: "01:30", loc: "Kirpal Bagh", spot: "Gate No 1" },
      { name: "Sarabjeet Singh Bedi", in: "18:35", out: "01:00", loc: "Kirpal Bagh", spot: "Bhajan Sthal" },
      { name: "Rampal", in: "12:00", out: "17:00", loc: "Kirpal Bagh", spot: "Gate No 2" },
      { name: "Shyam Sunder", in: "15:00", out: "19:40", loc: "Kirpal Bagh", spot: "Gate No 2" },
      { name: "Sunil Kumar", in: "21:00", out: "01:30", loc: "Sawan Ashram", spot: "-" },
      { name: "Vijender Solanki", in: "19:00", out: "02:00", loc: "Sawan Ashram", spot: "Gate No 1 and Round" },
      { name: "Krishan Kumar", in: "19:00", out: "02:00", loc: "Sawan Ashram", spot: "Gate No 1 and Round" },
      { name: "H.S.Rana", in: "19:00", out: "23:00", loc: "Kirpal Bagh", spot: "Gate No 1" },
      { name: "Ram Nivas", in: "22:08", out: "07:00", loc: "Kirpal Ashram", spot: "Kothi Gate" },
      { name: "Sonu Kumar", in: "02:00", out: "07:00", loc: "Kirpal Bagh", spot: "Main Gate" },
      { name: "Gurjot Singh", in: "02:00", out: "07:00", loc: "Kirpal Ashram", spot: "Round" },
      { name: "Umesh Kumar", in: "02:10", out: "07:00", loc: "Kirpal Bagh", spot: "Cash" },
      { name: "Ajay Malik", in: "17:00", out: "12:00", loc: "Kirpal Bagh", spot: "Bhajan Sthal" },
      { name: "Rajiv Arora", in: "17:00", out: "12:00", loc: "Kirpal Bagh", spot: "Bhajan Sthal" },
      { name: "Lokesh Kumar", in: "02:00", out: "07:00", loc: "Kirpal Bagh", spot: "Main Gate" },
      { name: "Raj Kumar Sharma", in: "02:00", out: "07:00", loc: "Kirpal Bagh", spot: "In Front of Kanta Auntys" },
      { name: "Lakshaya Saraswat", in: "02:00", out: "07:00", loc: "Kirpal Bagh", spot: "In Front of Kanta aunties Room" },
      { name: "D L Kapoor", in: "07:00", out: "11:00", loc: "Kirpal Ashram", spot: "Gate No 2" },
      { name: "Sandeep Saraswat", in: "02:00", out: "07:00", loc: "Kirpal Bagh", spot: "Stage" },
      { name: "Bhagwat Prasad", in: "20:10", out: "01:00", loc: "Kirpal Ashram", spot: "Gate No 1" },
      { name: "Harish Sethi", in: "19:00", out: "01:00", loc: "Kirpal Ashram", spot: "Main Gate" },
      { name: "Jitender Arora", in: "19:15", out: "02:00", loc: "Kirpal Ashram", spot: "Round" },
      { name: "Nanak Chand", in: "16:00", out: "19:30", loc: "Kirpal Ashram", spot: "Langar" },
      { name: "Rajinder Khurana", in: "19:30", out: "02:00", loc: "Kirpal Ashram", spot: "Gate No 2" },
      { name: "Gulab Prasad", in: "10:15", out: "19:00", loc: "Kirpal Ashram", spot: "Gate No 1" },
      { name: "Prem Lal", in: "02:00", out: "07:00", loc: "Kirpal Bagh", spot: "Gate No 1" },
      { name: "Jitender Solanki", in: "02:00", out: "07:00", loc: "Kirpal Bagh", spot: "Round" },
      { name: "Shiv Ram", in: "14:00", out: "19:00", loc: "Kirpal Ashram", spot: "Finance" },
      { name: "Anil Kumar", in: "02:00", out: "07:00", loc: "Sawan Ashram", spot: "Main Gate and Round" },
      { name: "Amit Verma", in: "02:00", out: "07:00", loc: "Kirpal Ashram", spot: "Kothi Gate and Round" },
      { name: "Mohan Lal Gumber", in: "19:00", out: "02:00", loc: "Kirpal Bagh", spot: "Gate No 1" },
      { name: "Sunil Nagpal", in: "02:00", out: "07:00", loc: "Kirpal Ashram", spot: "Round and Langar" }
    ];

    try {
      // Step 1: Wipe current Friday data for this date to ensure no duplicates
      // We don't use upsert with onConflict for all tables as some lack the necessary unique index
      await supabase.from('attendance').delete().match({ date: session.date, group: 'Friday' });

      // Step 2: Mark all 51 members with exact report details
      for (const row of reportData) {
        const sewadarIndex = FRIDAY_LIST.indexOf(row.name);
        const payload = {
          sewadar_id: `G-Friday-${sewadarIndex}`,
          name: row.name,
          group: 'Friday',
          gender: 'Gents',
          date: session.date,
          timestamp: Date.now(),
          volunteer_id: activeVolunteer?.id || 'sa',
          in_time: row.in,
          out_time: row.out,
          sewa_points: row.spot,
          workshop_location: row.loc,
          is_proper_uniform: true
        };
        await supabase.from('attendance').insert(payload);
      }
      alert("Success: Wiped existing Friday data and re-marked 51 sewadars exactly as per report.");
      window.location.reload(); 
    } catch (err) {
      console.error(err);
      alert("Failed to replicate report data.");
    } finally {
      setIsReplicating(false);
    }
  };

  const calculateDuration = (inTime?: string, outTime?: string): string => {
    if (!inTime || !outTime || outTime.trim() === '') return '-';
    try {
      const [inH, inM] = inTime.split(':').map(Number);
      const [outH, outM] = outTime.split(':').map(Number);
      const inMin = inH * 60 + inM;
      const outMin = outH * 60 + outM;
      let diff = outMin - inMin;
      if (diff < 0) diff += 24 * 60;
      return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    } catch { return '-'; }
  };

  const formatDateTimeForReport = (dateTimeStr: string) => {
    if (!dateTimeStr) return '-';
    try {
      const dateObj = new Date(dateTimeStr);
      if (isNaN(dateObj.getTime())) return dateTimeStr;
      const d = String(dateObj.getDate()).padStart(2, '0');
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const y = dateObj.getFullYear();
      let h = dateObj.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      const min = String(dateObj.getMinutes()).padStart(2, '0');
      return `${d}/${m}/${y} ${h}:${min} ${ampm}`;
    } catch { return dateTimeStr; }
  };

  const generatePDF = (isFinal: boolean = false) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const groupLabel = isSuperAdmin ? "Consolidated" : assignedGroup;
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sessionDateObj = new Date(dutyStartTime || Date.now());
    const dd = String(sessionDateObj.getDate()).padStart(2, '0');
    const mon = months[sessionDateObj.getMonth()];
    const yyyy = sessionDateObj.getFullYear();
    const filenameDate = `${dd}-${mon}-${yyyy}`;

    let fileGroupName = groupLabel || "Security";
    if (groupLabel !== 'Ladies' && groupLabel !== 'Consolidated' && groupLabel !== 'Global') {
      fileGroupName = `${groupLabel} Gents`;
    }

    const dateDisplayForHeader = dutyStartTime ? dutyStartTime.split('T')[0].split('-').reverse().join('/') : '-';
    
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const introText = `With the blessings of H.H. Sant Rajinder Singh Ji Maharaj, ${fileGroupName} group, presents the Security report for ${filenameDate}`;
    doc.text(introText, 14, 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(50, 60, 120);
    doc.text("SKRM Security Sewa report", 14, 22);
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text(`Duty Report: ${dateDisplayForHeader}`, 14, 30);
    
    doc.setDrawColor(230, 230, 230);
    doc.line(14, 34, 196, 34);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("1. Duty Overview", 14, 44);
    
    const startFormatted = formatDateTimeForReport(dutyStartTime);
    const endFormatted = formatDateTimeForReport(dutyEndTime);
    
    const currentSession = allSessions.find(s => s.id === selectedSessionId);
    const configuredLocations = currentSession?.location || 'Mission Ashram';

    autoTable(doc, {
      startY: 47,
      head: [['Metric', 'Details']],
      body: [
        ['Reporting Security Group', groupLabel || '-'],
        ['Total Sewadars on Duty', totalPresent],
        ['Ashram / Locations Covered', configuredLocations],
        ['Duty Start Timing', startFormatted],
        ['Duty End Timing', endFormatted]
      ],
      headStyles: { fillColor: [50, 60, 120], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, textColor: 80 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      theme: 'grid'
    });

    const shifts = [
      { slot: '07:00 AM - 07:00 PM', desc: 'Day Shift', count: 0 },
      { slot: '07:00 PM - 02:00 AM', desc: 'Evening/Late Shift', count: 0 },
      { slot: '02:00 AM - 07:00 AM', desc: 'Night/Early Morning', count: 0 }
    ];

    attendance.forEach(a => {
      if (!a.inTime) return;
      const [h] = a.inTime.split(':').map(Number);
      if (h >= 7 && h < 19) shifts[0].count++;
      else if (h >= 19 || h < 2) shifts[1].count++;
      else shifts[2].count++;
    });

    doc.text("2. Shift Distribution", 14, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 13,
      head: [['Time Slot', 'Shift Description', 'Sewadar Count']],
      body: shifts.map(s => [s.slot, s.desc, s.count]),
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, textColor: 80 },
      theme: 'grid'
    });

    const ashramDeployments: Record<string, Record<string, number>> = {};
    attendance.forEach(a => {
      const loc = a.workshopLocation || 'General Ashram';
      const spot = a.sewaPoint || 'General Duty';
      if (!ashramDeployments[loc]) ashramDeployments[loc] = {};
      ashramDeployments[loc][spot] = (ashramDeployments[loc][spot] || 0) + 1;
    });

    const deploymentRows: [string, string, string][] = [];
    Object.entries(ashramDeployments).sort(([a], [b]) => a.localeCompare(b)).forEach(([loc, spots]) => {
      Object.entries(spots).sort(([a], [b]) => a.localeCompare(b)).forEach(([spot, count]) => {
        deploymentRows.push([loc, spot, count.toString()]);
      });
    });

    doc.text("3. Sewa Point Deployment (Manpower Distribution)", 14, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 13,
      head: [['Ashram / Location', 'Sewa Point / Spot', 'Number of Sewadars']],
      body: deploymentRows,
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, textColor: 80 },
      theme: 'grid',
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 40, halign: 'center' }
      }
    });

    doc.text("4. Reported Issues & Incidents", 14, (doc as any).lastAutoTable.finalY + 10);
    let currentY = (doc as any).lastAutoTable.finalY + 16;

    issues.forEach((issue, idx) => {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      const timeStr = new Date(issue.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(185, 28, 28); 
      doc.setFontSize(9);
      doc.text(`Entry #${idx + 1} - Recorded at ${timeStr}`, 14, currentY);
      currentY += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.text(issue.description, 14, currentY);
      currentY += 8;
      if (issue.photo) {
        try {
          doc.addImage(issue.photo, 'JPEG', 14, currentY, 60, 60);
          currentY += 65;
        } catch(e) { console.error("PDF Image Error", e); }
      }
      currentY += 5;
    });

    if (issues.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 150, 150);
      doc.text("No incidents reported during this session.", 14, currentY);
    }

    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text(`Detailed Attendance Log`, 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const sessionTimes = `${startFormatted} - ${endFormatted}`;
    doc.text(`Period: ${sessionTimes}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Name', 'Group', 'In', 'Out', 'Duration', 'Location', 'Spot', 'Verified By']],
      body: attendance.map((a, i) => [
        i + 1, a.name, a.group, a.inTime || '-', a.outTime || '-',
        calculateDuration(a.inTime, a.outTime),
        a.workshopLocation || '-', a.sewaPoint || '-',
        VOLUNTEERS.find(v => v.id === a.volunteerId)?.name || 'Incharge'
      ]),
      margin: { left: 14, right: 14 },
      headStyles: { fillColor: [50, 60, 120], textColor: 255, fontSize: 8.5, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 7.5, textColor: 50, overflow: 'linebreak' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: 'grid',
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },
        1: { cellWidth: 35 },
        2: { cellWidth: 20 },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 16, halign: 'center' },
        6: { cellWidth: 24 },
        7: { cellWidth: 22 },
        8: { cellWidth: 34 }
      }
    });

    const finalFilename = `${fileGroupName} (${filenameDate})${isFinal ? '_FINAL' : ''}.pdf`;
    doc.save(finalFilename);

    if (isFinal && selectedSessionId) {
      onCompleteSession(selectedSessionId);
    }
    setShowReportConfirmModal(false);
  };

  const handleUpdatePasswordClick = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', msg: 'Passwords must match.' });
      return;
    }
    setIsUpdatingPassword(true);
    if (onUpdatePassword) {
      const success = await onUpdatePassword(newPassword);
      if (success) {
        setPasswordFeedback({ type: 'success', msg: 'Updated!' });
        setTimeout(() => setShowProfileModal(false), 1500);
      } else {
        setPasswordFeedback({ type: 'error', msg: 'Failed.' });
      }
    }
    setIsUpdatingPassword(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setIssuePhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const submitIssue = () => {
    if (!issueDesc.trim()) return;
    if (editingIssueId && onUpdateIssue) {
      onUpdateIssue(editingIssueId, issueDesc.trim(), issuePhoto || undefined);
      setEditingIssueId(null);
    } else {
      onReportIssue(issueDesc.trim(), issuePhoto || undefined);
    }
    setIssueDesc('');
    setIssuePhoto(null);
  };

  const startEditIssue = (issue: Issue) => {
    setEditingIssueId(issue.id);
    setIssueDesc(issue.description);
    setIssuePhoto(issue.photo || null);
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatHeaderTime = (start: string, end: string) => {
    if (!start || !end) return '-';
    try {
      const s = new Date(start);
      const sT = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const e = new Date(end);
      const eT = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `(${s.toLocaleDateString('en-GB')}) ${sT} - ${eT}`;
    } catch { return '-'; }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duty Session History</label>
          <div className="relative">
            <select 
              value={selectedSessionId || ''} 
              onChange={(e) => onSessionChange(e.target.value)}
              className="w-full md:w-80 px-6 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs text-slate-900 outline-none appearance-none focus:border-indigo-500 pr-12 transition-all"
            >
              {allSessions.map(s => {
                const now = new Date();
                const isActive = now >= new Date(s.start_time) && now <= new Date(s.end_time) && !s.completed;
                const d = s.date.split('-');
                const fmt = `${d[2]}/${d[1]}/${d[0]}`;
                return (
                  <option key={s.id} value={s.id}>
                    {s.completed ? '✅ Finalized: ' : (isActive ? '🔴 Active: ' : '⌛ Upcoming: ')}
                    {fmt}
                  </option>
                );
              })}
              {allSessions.length === 0 && <option value="">No sessions configured</option>}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button onClick={() => setShowProfileModal(true)} className="w-12 h-12 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-all active:scale-95 shadow-sm">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
           </button>
           <div className="flex flex-col items-stretch w-full md:w-auto gap-3">
              <div className="flex gap-2">
                {!isSessionCompleted && (
                  <button onClick={onOpenSettings} className="px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-100 text-slate-500 hover:bg-slate-200">Config</button>
                )}
                <button 
                 onClick={() => selectedSessionId && setShowReportConfirmModal(true)} 
                 disabled={!selectedSessionId} 
                 className={`flex-1 px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg ${selectedSessionId ? (isSessionCompleted ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white') : 'bg-slate-100 text-slate-300'}`}
                >
                  {isSessionCompleted ? 'RE-EXPORT PDF' : 'Report PDF'}
                </button>
              </div>
           </div>
        </div>
      </div>

      <div ref={topRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-8 rounded-[2.5rem] text-white relative overflow-hidden transition-all duration-500 ${isSessionCompleted ? 'bg-emerald-900' : 'bg-slate-900'}`}>
           <div className="relative z-10">
             <div className="flex items-center gap-2 mb-2">
                {isSessionCompleted ? <span className="bg-white/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">FINALIZED REPORT</span> : <span className="bg-red-500/80 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1"><span className="w-1 h-1 bg-white rounded-full animate-ping"></span>ACTIVE DUTY</span>}
             </div>
             <p className="text-indigo-300 text-[10px] font-black uppercase mb-2">Presence in Selected Duty</p>
             <p className="text-5xl font-black">{totalPresent}</p>
             <p className="text-[10px] font-black text-white/40 uppercase mt-4 tracking-widest">{formatHeaderTime(dutyStartTime, dutyEndTime)}</p>
           </div>
        </div>

        <div className={`bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative transition-all ${editingIssueId ? 'ring-4 ring-indigo-500/10 border-indigo-200' : ''}`}>
           {isSessionCompleted && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 rounded-[2.5rem] flex items-center justify-center p-6 text-center">
                 <div><div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div><p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Duty Log Sealed</p></div>
              </div>
           )}
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{editingIssueId ? 'Updating Incident' : 'Post Incident Log'}</h3>
              {editingIssueId && <button onClick={() => {setEditingIssueId(null); setIssueDesc(''); setIssuePhoto(null);}} className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">Cancel</button>}
           </div>
           <textarea disabled={isSessionCompleted} className="w-full bg-slate-50 rounded-2xl p-4 text-xs font-bold outline-none border border-transparent focus:border-indigo-500 h-24" placeholder="Log issues..." value={issueDesc} onChange={e => setIssueDesc(e.target.value)} />
           <div className="mt-3 flex gap-2">
              <button disabled={isSessionCompleted} onClick={() => fileInputRef.current?.click()} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest ${issuePhoto ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{issuePhoto ? 'Photo Attached ✓' : 'Add Photo'}</button>
              <button disabled={isSessionCompleted} onClick={submitIssue} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase ${editingIssueId ? 'bg-indigo-700' : 'bg-indigo-600'} text-white shadow-lg`}>{editingIssueId ? 'Update' : 'Post'}</button>
           </div>
           <input type="file" hidden accept="image/*" ref={fileInputRef} onChange={handleFileChange} />
        </div>
      </div>

      {isSuperAdmin && !isSessionCompleted && (
        <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 p-8 rounded-[2.5rem]">
           <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-lg shadow-md">⚙️</div>
              <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest">Wipe & Sync Friday Roster (Full Report)</h3>
           </div>
           <p className="text-indigo-600 text-[10px] font-bold uppercase mb-6 opacity-70">Clears current session data and marks 51 sewadars exactly as per 06/02/2026 report pages 3 & 4</p>
           <button 
             onClick={replicateFridayReport}
             disabled={isReplicating || !selectedSessionId}
             className={`w-full py-4.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isReplicating ? 'bg-slate-200 text-slate-400 animate-pulse' : 'bg-white border-2 border-indigo-200 text-indigo-600 shadow-sm hover:bg-indigo-600 hover:text-white hover:border-indigo-600'}`}
           >
             {isReplicating ? 'Wiping & Syncing 51 Entries...' : 'Wipe & mark 51 Sewadars (Friday 06/02)'}
           </button>
        </div>
      )}

      {issues.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center px-4"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Incident Log</h3></div>
          <div className="grid grid-cols-1 gap-3">
            {issues.slice().reverse().map(issue => (
              <div key={issue.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex gap-4 items-start relative group">
                {issue.photo && <img src={issue.photo} className="w-20 h-20 rounded-2xl object-cover shadow-sm border border-slate-50 flex-shrink-0" />}
                <div className="flex-1 pr-12">
                  <p className="text-xs font-bold text-slate-800 leading-relaxed">{issue.description}</p>
                  <p className="text-[8px] text-slate-400 font-black uppercase mt-3">{issue.volunteerName} • {new Date(issue.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-8 relative">
              <button onClick={() => setShowProfileModal(false)} className="absolute top-6 right-6 text-slate-300">✕</button>
              <div className="text-center space-y-2"><div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner text-3xl font-black">{activeVolunteer?.name[0]}</div><h2 className="text-2xl font-black text-slate-900">{activeVolunteer?.name}</h2></div>
              <div className="space-y-4 pt-6 border-t border-slate-100">
                 <input type="password" placeholder="New PIN" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                 <input type="password" placeholder="Confirm" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                 {passwordFeedback && <p className={`text-[10px] font-black text-center ${passwordFeedback.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>{passwordFeedback.msg}</p>}
                 <button disabled={isUpdatingPassword} onClick={handleUpdatePasswordClick} className="w-full py-4.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs">Update Security PIN</button>
              </div>
           </div>
        </div>
      )}

      {showReportConfirmModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-indigo-950/95 backdrop-blur-xl">
          <div className="bg-white w-full max-md rounded-[2.5rem] p-8 shadow-2xl space-y-8 relative text-center">
            <button onClick={() => setShowReportConfirmModal(false)} className="absolute top-6 right-6 text-slate-300">✕</button>
            <h2 className="text-2xl font-black text-slate-900">Duty Status Check</h2>
            <p className="text-slate-500 font-medium text-sm">{isSessionCompleted ? "Session is finalized. You can download the report again." : "Finalize this duty session and seal all logs?"}</p>
            <div className="flex flex-col gap-3">
              {!isSessionCompleted ? (
                <><button onClick={() => generatePDF(true)} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs">Finalize & Export</button><button onClick={() => generatePDF(false)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs">Just Export PDF</button></>
              ) : (
                <button onClick={() => generatePDF(false)} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs">Download Final Report</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Dashboard;
