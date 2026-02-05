
import React, { useMemo, useState, useRef } from 'react';
import { AttendanceRecord, Volunteer, Issue } from '../types';
import { VOLUNTEERS } from '../constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DutySession } from '../App';

interface Props {
  attendance: AttendanceRecord[];
  issues: Issue[];
  activeVolunteer: Volunteer | null;
  allSessions: DutySession[];
  selectedSessionId: string | null;
  isSessionCompleted: boolean;
  onSessionChange: (id: string) => void;
  onReportIssue: (desc: string, photo?: string) => void;
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
  isLoading, 
  dutyStartTime,
  dutyEndTime,
  onOpenSettings,
  onCompleteSession
}) => {
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showReportConfirmModal, setShowReportConfirmModal] = useState(false);
  const [issueDesc, setIssueDesc] = useState('');
  const [issuePhoto, setIssuePhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = activeVolunteer?.role === 'Super Admin';
  const assignedGroup = activeVolunteer?.assignedGroup;
  const totalPresent = attendance.length;

  const incompleteRecords = useMemo(() => {
    return attendance.filter(a => !a.outTime || a.outTime.trim() === '');
  }, [attendance]);

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
      h = h % 12;
      h = h ? h : 12; // the hour '0' should be '12'
      const min = String(dateObj.getMinutes()).padStart(2, '0');
      
      return `${d}/${m}/${y} ${h}:${min} ${ampm}`;
    } catch { return dateTimeStr; }
  };

  const generatePDF = (isFinal: boolean = false) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const groupLabel = isSuperAdmin ? "Consolidated" : assignedGroup;
    const dateDisplay = dutyStartTime ? dutyStartTime.split('T')[0].split('-').reverse().join('/') : '-';
    
    // 1. Title Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(50, 60, 120);
    doc.text("SKRM Security Sewa report", 14, 20);
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text(`Duty Report: ${dateDisplay}`, 14, 28);
    doc.setDrawColor(230, 230, 230);
    doc.line(14, 32, 196, 32);

    // 2. Section 1: Duty Overview
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("1. Duty Overview", 14, 42);
    
    // Updated to use the refined helper for full date and time
    const startFormatted = formatDateTimeForReport(dutyStartTime);
    const endFormatted = formatDateTimeForReport(dutyEndTime);

    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Details']],
      body: [
        ['Reporting Security Group', groupLabel || '-'],
        ['Total Sewadars on Duty', totalPresent],
        ['Ashram / Locations Covered', attendance[0]?.workshopLocation || (allSessions.find(s => s.id === selectedSessionId)?.location || 'Mission Ashram')],
        ['Duty Start Timing', startFormatted],
        ['Duty End Timing', endFormatted]
      ],
      headStyles: { fillColor: [50, 60, 120], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, textColor: 80 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      theme: 'grid'
    });

    // 3. Section 2: Shift Distribution
    const shifts = [
      { slot: '07:00 AM - 05:00 PM', desc: 'Day Shift', count: 0 },
      { slot: '05:00 PM - 02:00 AM', desc: 'Evening/Late Shift', count: 0 },
      { slot: '02:00 AM - 07:00 AM', desc: 'Night/Early Morning', count: 0 }
    ];

    attendance.forEach(a => {
      if (!a.inTime) return;
      const [h] = a.inTime.split(':').map(Number);
      if (h >= 7 && h < 17) shifts[0].count++;
      else if (h >= 17 || h < 2) shifts[1].count++;
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

    // 4. Section 3: Sewa Point Deployment
    const deployments: Record<string, number> = {};
    attendance.forEach(a => {
      const spot = a.sewaPoint || 'General Duty';
      deployments[spot] = (deployments[spot] || 0) + 1;
    });

    doc.text("3. Sewa Point Deployment (Manpower Distribution)", 14, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 13,
      head: [['Sewa Point / Spot', 'Number of Sewadars']],
      body: Object.entries(deployments).map(([spot, count]) => [spot, count]),
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, textColor: 80 },
      theme: 'grid'
    });

    // 5. Section 4: Reported Issues & Incidents
    doc.text("4. Reported Issues & Incidents", 14, (doc as any).lastAutoTable.finalY + 10);
    let currentY = (doc as any).lastAutoTable.finalY + 16;

    issues.forEach((issue, idx) => {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      
      const timeStr = new Date(issue.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(185, 28, 28); // Red
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

    // 6. Final Page: Detailed Attendance Log
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

    const filename = `SKRM_Security_Report_${groupLabel}_${dateDisplay}${isFinal ? '_FINAL' : ''}.pdf`;
    doc.save(filename);

    if (isFinal && selectedSessionId) {
      onCompleteSession(selectedSessionId);
    }
    setShowReportConfirmModal(false);
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
    onReportIssue(issueDesc.trim(), issuePhoto || undefined);
    setIssueDesc('');
    setIssuePhoto(null);
  };

  const formatHeaderTime = (start: string, end: string) => {
    if (!start || !end) return '-';
    try {
      const s = new Date(start);
      const e = new Date(end);
      const sT = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const eT = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const d = s.toLocaleDateString('en-GB'); // dd/mm/yyyy
      return `(${d}) ${sT} - ${eT}`;
    } catch { return '-'; }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Duty Session</label>
          <div className="relative">
            <select 
              value={selectedSessionId || ''} 
              onChange={(e) => onSessionChange(e.target.value)}
              className="w-full md:w-72 px-6 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs text-slate-900 outline-none appearance-none focus:border-indigo-500 pr-12 transition-all"
            >
              {allSessions.map(s => {
                const now = new Date();
                const isActive = now >= new Date(s.start_time) && now <= new Date(s.end_time) && !s.completed;
                const dateParts = s.date.split('-');
                const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                return (
                  <option key={s.id} value={s.id}>
                    {s.completed ? '✅ DONE: ' : (isActive ? '🔴 ACTIVE: ' : '')}
                    {formattedDate}
                    {s.completed ? ' (Finalized)' : ''}
                  </option>
                );
              })}
              {allSessions.length === 0 && <option value="">No sessions configured</option>}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
          </div>
        </div>
        
        <div className="flex flex-col items-stretch w-full md:w-auto gap-3">
           <div className="flex gap-2">
             {!isSessionCompleted && (
               <button 
                onClick={onOpenSettings} 
                className="px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all active:scale-95"
               >
                 Config Duty
               </button>
             )}
             <button 
              onClick={() => totalPresent > 0 && setShowReportConfirmModal(true)} 
              disabled={totalPresent === 0} 
              className={`flex-1 px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg ${totalPresent > 0 ? (isSessionCompleted ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white') : 'bg-slate-100 text-slate-300'}`}
             >
               {isSessionCompleted ? 'RE-EXPORT PDF' : 'Report PDF'}
             </button>
           </div>
          
          {incompleteRecords.length > 0 && !isSessionCompleted && (
            <button 
              onClick={() => setShowPendingModal(true)}
              className="text-[9px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-4 py-2.5 rounded-xl animate-pulse text-center shadow-sm border border-amber-100"
            >
              Pending {incompleteRecords.length} Out-times
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-8 rounded-[2.5rem] text-white relative overflow-hidden transition-all duration-500 ${isSessionCompleted ? 'bg-emerald-900' : 'bg-slate-900'}`}>
           <div className="relative z-10">
             <div className="flex items-center gap-2 mb-2">
                {isSessionCompleted ? (
                   <span className="bg-white/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">FINALIZED REPORT</span>
                ) : (
                   <span className="bg-red-500/80 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                      <span className="w-1 h-1 bg-white rounded-full animate-ping"></span>
                      ACTIVE DUTY
                   </span>
                )}
             </div>
             <p className="text-indigo-300 text-[10px] font-black uppercase mb-2">Presence in Selected Duty</p>
             <p className="text-5xl font-black">{totalPresent}</p>
             <p className="text-[10px] font-black text-white/40 uppercase mt-4 tracking-widest">{formatHeaderTime(dutyStartTime, dutyEndTime)}</p>
           </div>
           <div className="absolute -bottom-6 -right-6 text-9xl opacity-10">{isSessionCompleted ? '✅' : '👮‍♂️'}</div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative">
           {isSessionCompleted && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 rounded-[2.5rem] flex items-center justify-center p-6 text-center">
                 <div>
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                       <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Duty Log Sealed</p>
                    <p className="text-[8px] text-slate-400 font-bold mt-1">Reporting is closed for this session.</p>
                 </div>
              </div>
           )}
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Post Incident Log</h3>
           <textarea 
            disabled={isSessionCompleted}
            className="w-full bg-slate-50 rounded-2xl p-4 text-xs font-bold outline-none border border-transparent focus:border-indigo-500 h-24"
            placeholder="Log gate blockages, safety issues, or suspicious activity..."
            value={issueDesc}
            onChange={e => setIssueDesc(e.target.value)}
           />
           <div className="mt-3 flex gap-2">
              <button 
                disabled={isSessionCompleted}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${issuePhoto ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}
              >
                {issuePhoto ? 'Photo Attached ✓' : 'Add Photo'}
              </button>
              <button 
                disabled={isSessionCompleted}
                onClick={submitIssue} 
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase"
              >
                Post Log
              </button>
           </div>
           <input type="file" hidden accept="image/*" ref={fileInputRef} onChange={handleFileChange} />
        </div>
      </div>

      {issues.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duty Incident Log</h3>
            <span className="text-[8px] bg-indigo-50 text-indigo-500 px-2 py-1 rounded font-black">{issues.length} LOGS</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {issues.slice().reverse().map(issue => (
              <div key={issue.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex gap-4 items-start transition-all hover:shadow-md">
                {issue.photo && <img src={issue.photo} className="w-20 h-20 rounded-2xl object-cover shadow-sm border border-slate-50 flex-shrink-0" />}
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-800 leading-relaxed">{issue.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <p className="text-[8px] text-slate-400 font-black uppercase">{issue.volunteerName} • {new Date(issue.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showPendingModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-black text-slate-900">Waiting for Out-Time</h2>
              <button onClick={() => setShowPendingModal(false)} className="text-slate-400 font-black px-2">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {incompleteRecords.map(a => (
                <div key={a.sewadarId} className="bg-slate-50/50 p-4 rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="font-black text-sm text-slate-800">{a.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-black">{a.group}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-emerald-600">IN: {a.inTime}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">{a.sewaPoint}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6">
              <button onClick={() => setShowPendingModal(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Close List</button>
            </div>
          </div>
        </div>
      )}

      {showReportConfirmModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-indigo-950/95 backdrop-blur-xl animate-fade-in">
          <div className="bg-white w-full max-md rounded-[2.5rem] p-8 shadow-2xl space-y-8 relative text-center">
            <button 
              onClick={() => setShowReportConfirmModal(false)}
              className="absolute top-6 right-6 text-slate-300 hover:text-slate-600"
            >
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="space-y-4">
              <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner ${isSessionCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                 <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h2 className="text-2xl font-black text-slate-900 leading-tight">Duty Status Check</h2>
              <p className="text-slate-500 font-medium text-sm px-4">
                {isSessionCompleted 
                  ? "This duty session is already finalized. You can re-generate the PDF report if needed." 
                  : "Is this duty complete? Choosing 'Yes' will finalize all entries and seal the roster for this session."}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {!isSessionCompleted ? (
                <>
                  <button 
                    onClick={() => generatePDF(true)}
                    className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-200 active:scale-95 transition-all flex flex-col items-center"
                  >
                    <span className="text-sm">Yes, Finalize & Export</span>
                    <span className="text-[8px] opacity-70 mt-1">Saves status as COMPLETED</span>
                  </button>
                  
                  <button 
                    onClick={() => generatePDF(false)}
                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 flex flex-col items-center"
                  >
                    <span className="text-[10px]">No, Just Export PDF</span>
                    <span className="text-[7px] opacity-60 mt-1">Keep duty active for marking</span>
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => generatePDF(false)}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  <span>Download Final Report</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Dashboard;
