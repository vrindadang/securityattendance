
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
}

const Dashboard: React.FC<Props> = ({ attendance, activeVolunteer, onClearAttendance, selectedDate, onDateChange, isLoading }) => {
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

    const doc = new jsPDF('landscape');
    const groupSuffix = isSuperAdmin ? "Consolidated" : assignedGroup;
    
    doc.setFontSize(20);
    doc.text(`Security Attendance Report (${groupSuffix}) - ${selectedDate}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Total Present in ${groupSuffix}: ${totalPresent}`, 14, 28);
    
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
      startY: 35,
      head: [['#', 'Name', 'Group', 'In', 'Out', 'Duration', 'Location', 'Spot', 'Verified By']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [63, 63, 106] },
      styles: { fontSize: 8 }
    });
    doc.save(`Security_Attendance_${groupSuffix}_${selectedDate}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Date Picker & Action Header */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Viewing Date</label>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => onDateChange(e.target.value)}
            className="px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:border-indigo-500 transition-all"
          />
        </div>
        
        <div className="flex flex-col items-end gap-2 w-full md:w-auto">
          <button 
            onClick={generatePDF} 
            disabled={!isDownloadEnabled}
            className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 ${isDownloadEnabled ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-300 cursor-not-allowed grayscale'}`}
          >
            {incompleteRecords.length > 0 ? 'Duty Completion Pending' : 'Download PDF Report'}
          </button>
          
          {totalPresent > 0 && incompleteRecords.length > 0 && (
            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              Wait: {incompleteRecords.length} sewadars still on duty
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
            <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white relative overflow-hidden">
               <div className="relative z-10">
                 <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                    {assignedGroup ? `${assignedGroup} Presence` : 'Total Presence'}
                 </p>
                 <p className="text-6xl font-black">{totalPresent}</p>
                 <p className="text-xs text-slate-400 mt-2 font-medium">Recorded Sewadars on Duty</p>
               </div>
               <div className="absolute -bottom-6 -right-6 text-9xl opacity-10">👮‍♂️</div>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
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
             <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                {assignedGroup ? `${assignedGroup} Attendance Log` : 'Master Attendance Log'}
               </h3>
               <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{totalPresent} Entries</span>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="bg-slate-50/30 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                     <th className="px-8 py-4">Sewadar</th>
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
                       <td className="px-8 py-4">
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
            <div className="p-8 bg-red-50 rounded-[2.5rem] border-2 border-dashed border-red-200 flex flex-col items-center gap-4">
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
