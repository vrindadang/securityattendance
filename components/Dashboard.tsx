
import React, { useMemo } from 'react';
import { AttendanceRecord, Volunteer } from '../types';
import { GENTS_GROUPS, VOLUNTEERS } from '../constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  attendance: AttendanceRecord[];
  activeVolunteer: Volunteer | null;
  onClearAttendance?: () => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  isLoading: boolean;
  dutyStartTime: string;
  dutyEndTime: string;
  onOpenSettings: () => void;
}

const Dashboard: React.FC<Props> = ({ 
  attendance, 
  activeVolunteer, 
  onClearAttendance, 
  selectedDate, 
  onDateChange, 
  isLoading,
  dutyStartTime,
  dutyEndTime,
  onOpenSettings
}) => {
  const isSuperAdmin = activeVolunteer?.role === 'Super Admin';
  const assignedGroup = activeVolunteer?.assignedGroup;
  
  // The attendance list passed from App.tsx is already filtered by group if not Super Admin.
  const totalPresent = attendance.length;

  // Helper to calculate duration between two HH:MM strings
  const calculateDuration = (inTime?: string, outTime?: string): string => {
    if (!inTime || !outTime) return '-';
    
    try {
      const [inH, inM] = inTime.split(':').map(Number);
      const [outH, outM] = outTime.split(':').map(Number);
      
      const inMinutes = inH * 60 + inM;
      const outMinutes = outH * 60 + outM;
      
      let diff = outMinutes - inMinutes;
      if (diff < 0) diff += 24 * 60;
      
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      
      return `${hours}h ${mins}m`;
    } catch (e) {
      return '-';
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr.split('-').reverse().join('-');
  };

  // Find records that are missing an out time
  const incompleteRecords = useMemo(() => {
    return attendance.filter(a => !a.outTime || a.outTime.trim() === '');
  }, [attendance]);

  const isDownloadEnabled = totalPresent > 0 && incompleteRecords.length === 0;

  const groupStats = useMemo(() => {
    // If specific group, only show stats for that group.
    const groupsToShow = isSuperAdmin ? [...GENTS_GROUPS, 'Ladies'] : (assignedGroup ? [assignedGroup] : []);
    return groupsToShow.map(group => {
      const count = attendance.filter(a => a.group === group).length;
      return { name: group.substring(0, 3), count };
    });
  }, [attendance, isSuperAdmin, assignedGroup]);

  const generatePDF = () => {
    if (!isDownloadEnabled) return;

    const doc = new jsPDF();
    const groupSuffix = isSuperAdmin ? "Consolidated" : assignedGroup;
    const displayDate = formatDisplayDate(selectedDate);
    
    // --- DATA PROCESSING FOR SUMMARY ---

    // 1. Locations
    const distinctLocations = Array.from(new Set(attendance.map(a => a.workshopLocation).filter(Boolean)));
    
    // 2. Shifts
    const shifts = {
      morning: 0, // 07:00 to 17:00
      evening: 0, // 17:00 to 02:00
      night: 0    // 02:00 to 07:00
    };

    // 3. Sewa Points Frequency
    const pointStats: Record<string, number> = {};

    attendance.forEach(a => {
      // Shift Logic based on In Time
      if (a.inTime) {
        const [h] = a.inTime.split(':').map(Number);
        if (h >= 7 && h < 17) {
          shifts.morning++;
        } else if (h >= 17 || h < 2) {
          shifts.evening++;
        } else if (h >= 2 && h < 7) {
          shifts.night++;
        }
      }

      // Points Logic
      const point = a.sewaPoint ? a.sewaPoint.trim().toUpperCase() : 'GENERAL / UNASSIGNED';
      pointStats[point] = (pointStats[point] || 0) + 1;
    });

    const sortedPoints = Object.entries(pointStats).sort((a, b) => b[1] - a[1]);
    
    // Format times for PDF with AM/PM
    const formatDateTimeForPDF = (dtStr: string) => {
        if (!dtStr) return '-';
        
        let datePart = '';
        let timePart = '';

        if (dtStr.includes(' ')) {
            const [d, t] = dtStr.split(' ');
            datePart = d.split('-').reverse().join('-');
            timePart = t;
        } else {
            timePart = dtStr;
        }

        try {
            const [hStr, mStr] = timePart.split(':');
            let hours = parseInt(hStr, 10);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            
            hours = hours % 12;
            hours = hours ? hours : 12; 
            
            const strTime = `${hours}:${mStr} ${ampm}`;
            return datePart ? `${datePart}  ${strTime}` : strTime;
        } catch (e) {
            return dtStr;
        }
    };

    // --- PDF GENERATION: PAGE 1 (SUMMARY) ---

    // Title
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 90);
    doc.text("SKRM Security Sewa report", 14, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    
    // Calculate report date from duty start time if available, else use display date
    let dutyStartReportDate = displayDate;
    if (dutyStartTime && dutyStartTime.includes(' ')) {
      const [d] = dutyStartTime.split(' ');
      dutyStartReportDate = d.split('-').reverse().join('-');
    }

    doc.text(`Duty Report: ${dutyStartReportDate}`, 14, 28);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 32, 196, 32);

    // Section 1: High Level Stats
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("1. Duty Overview", 14, 42);
    
    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Details']],
      body: [
        ['Reporting Security Group', groupSuffix || 'All Groups'],
        ['Total Sewadars on Duty', totalPresent],
        ['Ashram / Locations Covered', distinctLocations.join(', ') || 'Not Specified'],
        ['Duty Start Timing', formatDateTimeForPDF(dutyStartTime)],
        ['Duty End Timing', formatDateTimeForPDF(dutyEndTime)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [63, 63, 106], fontStyle: 'bold' },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } }
    });

    // Section 2: Shift Breakdown
    const finalY1 = (doc as any).lastAutoTable.finalY;
    doc.text("2. Shift Distribution", 14, finalY1 + 10);

    autoTable(doc, {
      startY: finalY1 + 13,
      head: [['Time Slot', 'Shift Description', 'Sewadar Count']],
      body: [
        ['07:00 AM - 05:00 PM', 'Day Shift', shifts.morning],
        ['05:00 PM - 02:00 AM', 'Evening/Late Shift', shifts.evening],
        ['02:00 AM - 07:00 AM', 'Night/Early Morning', shifts.night],
      ],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
    });

    // Section 3: Sewa Points
    const finalY2 = (doc as any).lastAutoTable.finalY;
    doc.text("3. Sewa Point Deployment (Manpower Distribution)", 14, finalY2 + 10);

    autoTable(doc, {
      startY: finalY2 + 13,
      head: [['Sewa Point / Spot', 'Number of Sewadars']],
      body: sortedPoints.map(([point, count]) => [point, count]),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] }, // Emerald color
    });

    // --- PDF GENERATION: PAGE 2 (DETAILED LIST) ---
    doc.addPage();
    
    doc.setFontSize(16);
    doc.text(`Detailed Attendance Log - ${dutyStartReportDate}`, 14, 20);

    const tableData = attendance.map((a, i) => {
      const verifier = VOLUNTEERS.find(v => v.id === a.volunteerId)?.name || a.volunteerId;
      const duration = calculateDuration(a.inTime, a.outTime);
      return [
        i + 1, 
        a.name, 
        a.group, 
        a.inTime || '-', 
        a.outTime || '-', 
        duration,
        a.workshopLocation || '-', 
        a.sewaPoint || '-', 
        verifier
      ];
    });

    autoTable(doc, {
      startY: 25,
      head: [['#', 'Name', 'Group', 'In', 'Out', 'Duration', 'Location', 'Spot', 'Verified By']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [63, 63, 106] },
      styles: { fontSize: 8 }
    });

    doc.save(`Security_Report_${groupSuffix}_${dutyStartReportDate}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Date Picker & Action Header */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Viewing Date</label>
          <div className="relative w-full">
             <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => onDateChange(e.target.value)}
              className="px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:border-indigo-500 transition-all opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
            />
            <div className="px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 flex items-center justify-between md:justify-start gap-3 w-full">
               <span>{formatDisplayDate(selectedDate)}</span>
               <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-stretch w-full md:w-auto gap-3">
           <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
             <button
               onClick={onOpenSettings}
               className="w-full md:w-auto px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-100 text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-lg transition-all border border-transparent hover:border-indigo-100 active:scale-95"
             >
               Edit Settings
             </button>
             <button 
               onClick={generatePDF} 
               disabled={!isDownloadEnabled}
               className={`w-full md:w-auto flex-1 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 ${isDownloadEnabled ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-300 cursor-not-allowed grayscale'}`}
             >
               {incompleteRecords.length > 0 ? 'Duty Pending' : 'Download Report'}
             </button>
           </div>
          
          {totalPresent > 0 && incompleteRecords.length > 0 && (
            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest flex items-center justify-center gap-1.5 bg-amber-50 px-3 py-2 rounded-xl animate-pulse text-center">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0"></span>
              Waiting for {incompleteRecords.length} sewadars
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center space-y-4">
           <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Records...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 p-8 md:p-10 rounded-[2.5rem] text-white relative overflow-hidden">
               <div className="relative z-10">
                 <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                    {assignedGroup ? `${assignedGroup} Presence` : 'Total Presence'}
                 </p>
                 <p className="text-5xl md:text-6xl font-black">{totalPresent}</p>
                 <p className="text-xs text-slate-400 mt-2 font-medium">Recorded Sewadars on Duty</p>
               </div>
               <div className="absolute -bottom-6 -right-6 text-9xl opacity-10">👮‍♂️</div>
            </div>

            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Presence Distribution</h3>
               <div className="h-32 flex items-end gap-2">
                 {groupStats.map(s => (
                   <div key={s.name} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-indigo-500 rounded-t-lg transition-all" 
                        style={{ height: `${(s.count / Math.max(totalPresent, 1)) * 100}%`, minHeight: '4px' }}
                      ></div>
                      <span className="text-[8px] font-black text-slate-400 uppercase">{s.name}</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
             <div className="px-6 py-5 md:px-8 md:py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                {assignedGroup ? `${assignedGroup} Log` : 'Master Log'}
               </h3>
               <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{totalPresent}</span>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left min-w-[800px]">
                 <thead>
                   <tr className="bg-slate-50/30 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                     <th className="px-6 py-4">Sewadar</th>
                     <th className="px-4 py-4">Group</th>
                     <th className="px-4 py-4">In Time</th>
                     <th className="px-4 py-4">Out Time</th>
                     <th className="px-4 py-4">Duration</th>
                     <th className="px-4 py-4">Location</th>
                     <th className="px-4 py-4">Spot</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {attendance.map(a => (
                     <tr key={a.sewadarId} className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-6 py-4">
                         <div className="flex flex-col">
                           <span className="text-sm font-black text-slate-800">{a.name}</span>
                           {!a.outTime && (
                             <span className="text-[7px] text-amber-500 font-black uppercase tracking-widest">On Duty</span>
                           )}
                         </div>
                       </td>
                       <td className="px-4 py-4"><span className="text-[10px] font-bold text-slate-500">{a.group}</span></td>
                       <td className="px-4 py-4"><span className="text-[10px] font-black text-emerald-600">{a.inTime}</span></td>
                       <td className="px-4 py-4">
                         <span className={`text-[10px] font-black ${a.outTime ? 'text-indigo-600' : 'text-slate-200 italic'}`}>
                           {a.outTime || 'Pending'}
                         </span>
                       </td>
                       <td className="px-4 py-4">
                         <span className="text-[10px] font-black text-slate-900">
                           {calculateDuration(a.inTime, a.outTime)}
                         </span>
                       </td>
                       <td className="px-4 py-4"><span className="text-[10px] font-bold text-slate-600">{a.workshopLocation || '-'}</span></td>
                       <td className="px-4 py-4"><span className="text-[10px] font-bold text-amber-600">{a.sewaPoint || '-'}</span></td>
                     </tr>
                   ))}
                   {totalPresent === 0 && (
                     <tr><td colSpan={7} className="py-20 text-center text-slate-300 text-xs italic">No records for this date in your assigned group.</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>

          {(isSuperAdmin || assignedGroup) && selectedDate === new Date().toISOString().split('T')[0] && (
            <div className="p-8 bg-red-50 rounded-[2.5rem] border-2 border-dashed border-red-200 flex flex-col items-center gap-4 mb-20 md:mb-0">
              <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">Danger Zone</p>
              <button onClick={onClearAttendance} className="bg-white px-8 py-3 rounded-xl border border-red-200 text-red-600 font-black text-[10px] uppercase shadow-sm hover:bg-red-50 transition-all active:scale-95">
                Wipe {assignedGroup ? `${assignedGroup} Group` : "Master"} Records
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default Dashboard;
