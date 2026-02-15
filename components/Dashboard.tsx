
import React, { useMemo, useState } from 'react';
import { AttendanceRecord, Volunteer, Issue, VehicleRecord, Requirement } from '../types';
import { VOLUNTEERS } from '../constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DutySession } from '../App';

interface Props {
  attendance: AttendanceRecord[];
  issues: Issue[];
  vehicles: VehicleRecord[];
  requirements: Requirement[];
  activeVolunteer: Volunteer | null;
  allSessions: DutySession[];
  selectedSessionId: string | null;
  isSessionCompleted: boolean;
  onSessionChange: (id: string) => void;
  onReportIssue: (desc: string, photo?: string) => void;
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
  vehicles = [],
  requirements = [],
  activeVolunteer, 
  allSessions,
  selectedSessionId,
  isSessionCompleted,
  onSessionChange,
  onReportIssue,
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
    let currentY = 15;

    const groupName = activeVolunteer?.assignedGroup || 'Security';
    const currentSession = allSessions.find(s => s.id === selectedSessionId);
    const dateDisplay = currentSession?.date?.split('-').reverse().join('/') || '-';

    const isLadies = groupName === 'Ladies';
    const groupText = isLadies ? "Ladies Security Group" : `${groupName} Gents Security Group`;
    const introText = `With the blessings of H.H. Sant Rajinder Singh Ji Maharaj, ${groupText}, presents the security report for ${dateDisplay}`;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(introText, 14, currentY);
    
    currentY += 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(50, 60, 120);
    doc.text("SKRM Security Sewa report", 14, currentY);
    
    currentY += 7;
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text(`Duty Report Summary`, 14, currentY);
    
    currentY += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(14, currentY, 196, currentY);

    currentY += 9;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("1. Duty Overview", 14, currentY);
    
    autoTable(doc, {
      startY: currentY + 3,
      head: [['Metric', 'Details']],
      body: [
        ['Reporting Security Group', isLadies ? 'Ladies' : `${groupName} Gents`],
        ['Total Sewadars on Duty', attendance.length],
        ['Ashram / Locations Covered', currentSession?.location || 'General Ashram'],
        ['Duty Start Timing', formatDateTime(dutyStartTime)],
        ['Duty End Timing', formatDateTime(dutyEndTime)]
      ],
      headStyles: { fillColor: [50, 60, 120], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      theme: 'grid'
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0,0,0);
    doc.text("Reported Issues & Incidents", 14, currentY);
    
    autoTable(doc, {
      startY: currentY + 3,
      head: [['#', 'Description', 'Time', 'Reported By']],
      body: issues.map((issue, idx) => [
        idx + 1,
        issue.description,
        new Date(issue.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        issue.volunteerName
      ]),
      headStyles: { fillColor: [180, 0, 0], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      theme: 'grid'
    });

    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(50, 60, 120);
    doc.text("Detailed Attendance Log", 14, 20);
    
    autoTable(doc, {
      startY: 32,
      head: [['#', 'Name', 'In', 'Out', 'Dur', 'Location', 'Spot', 'Verified By']],
      body: attendance.map((a, i) => {
        const verifier = VOLUNTEERS.find(v => v.id === a.volunteerId)?.name || 'Incharge';
        return [
          i + 1, 
          a.name, 
          a.inTime || '-', 
          a.outTime || '-', 
          calculateDuration(a.inTime, a.outTime), 
          a.workshopLocation || '-', 
          a.sewaPoint || '-', 
          verifier
        ];
      }),
      headStyles: { fillColor: [50, 60, 120], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      theme: 'grid'
    });

    doc.save(`SKRM_Security_Report_${groupName}_${dateDisplay.replace(/\//g, '-')}.pdf`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIssuePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReportIssueSubmit = () => {
    if (!issueDesc.trim()) return;
    onReportIssue(issueDesc, issuePhoto || undefined);
    setIssueDesc('');
    setIssuePhoto(null);
    setShowReportConfirmModal(false);
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
          <p className="text-4xl font-black text-slate-900">{attendance.length}</p>
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
              {s.date.split('-').reverse().join('/')} - {s.location} ({s.completed ? 'Finalized' : 'Active'})
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
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 text-center">
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
