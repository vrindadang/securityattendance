
import React, { useMemo, useState } from 'react';
import { AttendanceRecord, Volunteer, Issue, VehicleRecord } from '../types';
import { VOLUNTEERS } from '../constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DutySession } from '../App';

interface Props {
  attendance: AttendanceRecord[];
  issues: Issue[];
  vehicles: VehicleRecord[];
  activeVolunteer: Volunteer | null;
  allSessions: DutySession[];
  selectedSessionId: string | null;
  isSessionCompleted: boolean;
  onSessionChange: (id: string) => void;
  onReportIssue: (desc: string, photo?: string) => void;
  onSaveVehicle: (v: Omit<VehicleRecord, 'id' | 'timestamp' | 'volunteerId' | 'volunteerName'>) => void;
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
  vehicles = [],
  activeVolunteer, 
  allSessions,
  selectedSessionId,
  isSessionCompleted,
  onSessionChange,
  onReportIssue,
  onSaveVehicle,
  onDeleteIssue,
  isLoading, 
  dutyStartTime,
  dutyEndTime,
  onCompleteSession
}) => {
  const [issueDesc, setIssueDesc] = useState('');
  const [showReportConfirmModal, setShowReportConfirmModal] = useState(false);
  
  // Vehicle Form state
  const [vType, setVType] = useState<'2-wheeler' | '4-wheeler'>('4-wheeler');
  const [vPlate, setVPlate] = useState('');
  const [vModel, setVModel] = useState('');
  const [vRemarks, setVRemarks] = useState('');

  const archivedSessions = useMemo(() => {
    return allSessions.filter(s => s.completed);
  }, [allSessions]);

  const activeSessions = useMemo(() => {
    return allSessions.filter(s => !s.completed);
  }, [allSessions]);

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

    // 1. Header Section
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

    // 2. Duty Overview
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

    const getCoveredShifts = (inTime: string, outTime?: string) => {
      const toMins = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      const dutyStart = toMins(inTime);
      let dutyEnd = outTime ? toMins(outTime) : dutyStart + 1;
      const dutyMinutes = new Set<number>();
      if (dutyEnd < dutyStart) {
        for (let i = dutyStart; i < 1440; i++) dutyMinutes.add(i);
        for (let i = 0; i < dutyEnd; i++) dutyMinutes.add(i);
      } else {
        for (let i = dutyStart; i < dutyEnd; i++) dutyMinutes.add(i);
      }
      const shiftConfigs = [
        { id: 'day', start: 420, end: 1140 },
        { id: 'evening', start: 1140, end: 120 },
        { id: 'night', start: 120, end: 420 }
      ];
      return shiftConfigs.map(shift => {
        let overlap = false;
        if (shift.end < shift.start) {
          for (let i = shift.start; i < 1440; i++) if (dutyMinutes.has(i)) { overlap = true; break; }
          if (!overlap) for (let i = 0; i < shift.end; i++) if (dutyMinutes.has(i)) { overlap = true; break; }
        } else {
          for (let i = shift.start; i < shift.end; i++) if (dutyMinutes.has(i)) { overlap = true; break; }
        }
        return overlap;
      });
    };

    // 3. Shift Distribution
    const shiftSummaries = [
      { slot: '07:00 AM - 07:00 PM', desc: 'Day Shift', count: 0 },
      { slot: '07:00 PM - 02:00 AM', desc: 'Evening/Late Shift', count: 0 },
      { slot: '02:00 AM - 07:00 AM', desc: 'Night/Early Morning', count: 0 }
    ];
    attendance.forEach(a => {
      if (!a.inTime) return;
      const [day, eve, night] = getCoveredShifts(a.inTime, a.outTime);
      if (day) shiftSummaries[0].count++;
      if (eve) shiftSummaries[1].count++;
      if (night) shiftSummaries[2].count++;
    });

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("2. Shift Distribution", 14, currentY);
    autoTable(doc, {
      startY: currentY + 3,
      head: [['Time Slot', 'Shift Description', 'Sewadar Count']],
      body: shiftSummaries.map(s => [s.slot, s.desc, s.count]),
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      theme: 'grid'
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;

    // 4. Sewa Point Deployment
    const deployments: Record<string, Record<string, { day: number, eve: number, night: number }>> = {};
    attendance.forEach(a => {
      const loc = a.workshopLocation || 'General Ashram';
      const spot = a.sewaPoint || 'General Duty';
      if (!deployments[loc]) deployments[loc] = {};
      if (!deployments[loc][spot]) deployments[loc][spot] = { day: 0, eve: 0, night: 0 };
      if (a.inTime) {
        const [day, eve, night] = getCoveredShifts(a.inTime, a.outTime);
        if (day) deployments[loc][spot].day++;
        if (eve) deployments[loc][spot].eve++;
        if (night) deployments[loc][spot].night++;
      }
    });
    const deploymentRows: any[] = [];
    Object.keys(deployments).sort().forEach(loc => {
      Object.keys(deployments[loc]).sort().forEach(spot => {
        const counts = deployments[loc][spot];
        deploymentRows.push([loc, spot, counts.day, counts.eve, counts.night]);
      });
    });

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("3. Sewa Point Deployment", 14, currentY);
    autoTable(doc, {
      startY: currentY + 3,
      head: [
        [
          { content: 'Ashram / Location', rowSpan: 2, styles: { valign: 'middle' } },
          { content: 'Sewa Point / Spot', rowSpan: 2, styles: { valign: 'middle' } },
          { content: 'Number of Sewadars', colSpan: 3, styles: { halign: 'center' } }
        ],
        [
          { content: 'Day', styles: { halign: 'center' } },
          { content: 'Evening', styles: { halign: 'center' } },
          { content: 'Night', styles: { halign: 'center' } }
        ]
      ],
      body: deploymentRows,
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5 },
      theme: 'grid'
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;

    // 5. Reported Issues & Incidents
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("4. Reported Issues & Incidents", 14, currentY);
    
    if (issues.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("No incidents reported during this session.", 14, currentY + 7);
      currentY += 15;
    } else {
      autoTable(doc, {
        startY: currentY + 3,
        head: [['#', 'Incident Description', 'Time', 'Reported By']],
        body: issues.map((issue, idx) => [
          idx + 1,
          issue.description,
          new Date(issue.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          issue.volunteerName
        ]),
        headStyles: { fillColor: [180, 0, 0], textColor: 255, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          1: { cellWidth: 100 }
        },
        theme: 'grid'
      });
      currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    // 6. Vehicle Report Table (Gents Only) - Right below Issues
    if (!isLadies) {
      if (currentY > 260) { doc.addPage(); currentY = 20; }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("5. Vehicle Incident / Observation Log", 14, currentY);
      
      if (vehicles.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text("No vehicle incidents flagged.", 14, currentY + 7);
        currentY += 15;
      } else {
        autoTable(doc, {
          startY: currentY + 3,
          head: [['S.No', 'Type', 'Vehicle Number', 'Car Model', 'Remarks']],
          body: vehicles.map((v, i) => [
            i + 1, 
            v.type === '4-wheeler' ? '4-Wheeler' : '2-Wheeler', 
            v.plateNumber.toUpperCase(), 
            v.model || '-', 
            v.remarks || '-'
          ]),
          headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          theme: 'grid'
        });
        currentY = (doc as any).lastAutoTable.finalY + 12;
      }
    }

    // 7. Detailed Attendance Log (New Page)
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

  const handleReportIssue = () => {
    if (!issueDesc.trim()) return;
    onReportIssue(issueDesc);
    setIssueDesc('');
    setShowReportConfirmModal(false);
  };

  const handleVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vPlate.trim()) return;
    onSaveVehicle({ type: vType, plateNumber: vPlate, model: vModel, remarks: vRemarks });
    setVPlate('');
    setVModel('');
    setVRemarks('');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl">
        <div>
          <h2 className="text-2xl font-black mb-1">Reports & Issues</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            {isSessionCompleted ? 'Finalized Shift Record' : 'Live Shift Management'}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={generateAttendancePDF} className="bg-indigo-500 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-400 transition-all active:scale-95">Download Official Report</button>
          {!isSessionCompleted && (
            <button onClick={() => onCompleteSession(selectedSessionId || '')} className="bg-emerald-500 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-400 transition-all active:scale-95">Finalize Duty</button>
          )}
        </div>
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

      {/* Vehicle Form - Gents Only */}
      {activeVolunteer?.assignedGroup !== 'Ladies' && !isSessionCompleted && (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-lg">🚔</div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Flag Vehicle Report</h3>
          </div>
          <form onSubmit={handleVehicleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setVType('4-wheeler')} className={`py-4 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${vType === '4-wheeler' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>🚗 4-Wheeler</button>
              <button type="button" onClick={() => setVType('2-wheeler')} className={`py-4 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${vType === '2-wheeler' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>🏍️ 2-Wheeler</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Vehicle Number" className="px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm uppercase outline-none focus:border-indigo-500" value={vPlate} onChange={e => setVPlate(e.target.value)} required />
              <input type="text" placeholder="Car/Bike Model" className="px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none focus:border-indigo-500" value={vModel} onChange={e => setVModel(e.target.value)} />
            </div>
            <textarea placeholder="Observations / Reason for flagging..." className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium text-slate-800 outline-none focus:border-indigo-500" value={vRemarks} onChange={e => setVRemarks(e.target.value)} rows={2} />
            <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">Log Vehicle Entry</button>
          </form>
          
          {vehicles.length > 0 && (
            <div className="space-y-2 mt-4 pt-4 border-t border-slate-50">
               {vehicles.map((v, i) => (
                 <div key={v.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                    <div>
                      <p className="font-black text-xs text-slate-900">{i+1}. {v.plateNumber.toUpperCase()} ({v.type === '4-wheeler' ? '4-W' : '2-W'})</p>
                      <p className="text-[10px] font-bold text-slate-400">{v.model || 'Unknown Model'} • {v.remarks}</p>
                    </div>
                    <div className="text-[10px] font-black text-slate-300">LOGGED</div>
                 </div>
               ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Active Session</label>
        <select 
          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-800 outline-none focus:border-indigo-500"
          value={selectedSessionId || ''}
          onChange={(e) => {
            onSessionChange(e.target.value);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
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
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase mb-4">Report an Issue</h3>
          <textarea 
            className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium text-slate-800 outline-none focus:border-indigo-500 transition-all"
            rows={3}
            placeholder="Describe any incidents, uniform issues, or security concerns..."
            value={issueDesc}
            onChange={(e) => setIssueDesc(e.target.value)}
          />
          <button 
            disabled={!issueDesc.trim()}
            onClick={() => setShowReportConfirmModal(true)}
            className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50"
          >
            Submit Incident Report
          </button>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Incident Logs</h3>
        {issues.length > 0 ? issues.map(issue => (
          <div key={issue.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-start">
            <div className="space-y-1">
              <p className="font-bold text-slate-800">{issue.description}</p>
              <p className="text-[10px] font-bold text-slate-400">
                {new Date(issue.timestamp).toLocaleTimeString()} • Reported by {issue.volunteerName}
              </p>
            </div>
            {onDeleteIssue && !isSessionCompleted && (
              <button onClick={() => onDeleteIssue(issue.id)} className="text-red-400 hover:text-red-600 p-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>
        )) : (
          <p className="text-center py-10 text-slate-300 italic text-sm">No incidents reported for this session.</p>
        )}
      </div>

      <div className="mt-12 pt-12 border-t-2 border-slate-100 space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Archive Reports</h3>
          <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{archivedSessions.length} RECORDS</span>
        </div>
        
        {archivedSessions.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {archivedSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  onSessionChange(session.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`w-full text-left p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between group ${
                  selectedSessionId === session.id 
                    ? 'bg-indigo-50 border-indigo-200' 
                    : 'bg-white border-slate-50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs ${
                    selectedSessionId === session.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-base">{session.date.split('-').reverse().join('/')}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{session.location}</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  selectedSessionId === session.id 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white'
                }`}>
                  {selectedSessionId === session.id ? 'VIEWING' : 'VIEW REPORT'}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 p-12 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">No finalized reports found</p>
          </div>
        )}
      </div>

      {showReportConfirmModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6 text-center">
             <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto text-3xl">⚠️</div>
             <h3 className="text-xl font-black text-slate-900">Submit Report?</h3>
             <p className="text-slate-500 text-sm">This incident will be logged in the permanent shift record.</p>
             <div className="flex gap-2">
                <button onClick={() => setShowReportConfirmModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase">Cancel</button>
                <button onClick={handleReportIssue} className="flex-1 py-4 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg">Confirm</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
