
import React, { useMemo } from 'react';
import { Sewadar, AttendanceRecord, Volunteer } from './types';
import { GENTS_GROUPS, VOLUNTEERS } from './constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  sewadars: Sewadar[];
  attendance: AttendanceRecord[];
  onSyncMasterList?: () => void;
  syncingMasterList?: boolean;
  onClearAttendance?: () => void;
  activeVolunteer?: Volunteer | null;
}

const Dashboard: React.FC<Props> = ({ sewadars, attendance, onSyncMasterList, syncingMasterList, onClearAttendance, activeVolunteer }) => {
  const today = new Date().toISOString().split('T')[0];
  const isSuperAdmin = activeVolunteer?.role === 'Super Admin';

  const totalAttendanceCount = attendance.filter(a => a.date === today).length;

  const combinedGroupData = useMemo(() => {
    const allGroups = [...GENTS_GROUPS, 'Ladies'];
    return allGroups.map(group => {
      const groupSewadars = sewadars.filter(s => s.group === group);
      const presentInGroup = attendance.filter(a => a.date === today && groupSewadars.some(s => s.id === a.sewadarId)).length;
      return { name: group.substring(0, 3), Attendance: presentInGroup };
    });
  }, [sewadars, attendance, today]);

  const generateAttendancePDF = () => {
    const doc = new jsPDF('landscape');
    const todayAtt = attendance.filter(a => a.date === today);
    doc.setFontSize(18);
    doc.text("Security Team - Workshop Attendance Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Date: ${today} | Total Present: ${todayAtt.length}`, 14, 28);
    
    const tableData = todayAtt.map((a, i) => {
      const sewadar = sewadars.find(s => s.id === a.sewadarId);
      const vol = VOLUNTEERS.find(v => v.id === a.volunteerId);
      return [
        i + 1, 
        a.name, 
        sewadar?.group || '-', 
        a.inTime || '-',
        a.outTime || '-',
        a.workshopLocation || '-',
        a.sewaPoint || '-',
        vol?.name || '-'
      ];
    });

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Name', 'Group', 'In', 'Out', 'Location', 'Spot', 'Verified By']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    });
    doc.save(`Attendance_Report_${today}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl">
        <div>
          <h2 className="text-2xl font-black mb-1">Attendance Dashboard</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Real-time Workshop Stats</p>
        </div>
        <button onClick={generateAttendancePDF} className="bg-indigo-500 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-400 transition-all active:scale-95">Download PDF Report</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 text-center shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Total Present Today</p>
          <p className="text-4xl font-black text-slate-900">{totalAttendanceCount}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 text-center shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Engagement Rate</p>
          <p className="text-4xl font-black text-indigo-600">{Math.round((totalAttendanceCount / (Math.max(sewadars.length, 1))) * 100)}%</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
        <h3 className="text-xs font-black text-slate-400 uppercase mb-8">Presence by Group</h3>
        <div className="h-48 flex items-end gap-2 px-4">
          {combinedGroupData.map((d) => (
            <div key={d.name} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-[9px] font-bold text-slate-400">{d.Attendance}</span>
              <div className="w-full bg-indigo-500 rounded-t-lg transition-all" style={{ height: `${(d.Attendance / (Math.max(totalAttendanceCount, 1))) * 100}%`, minHeight: '4px' }}></div>
              <span className="text-[8px] font-black uppercase text-slate-400">{d.name}</span>
            </div>
          ))}
        </div>
      </div>

      {isSuperAdmin && (
        <div className="bg-red-50 p-8 rounded-[2rem] border-2 border-dashed border-red-200">
          <h3 className="text-red-700 font-black text-sm uppercase mb-6 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.268 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Incharge Controls
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={onClearAttendance} className="bg-white py-4 rounded-2xl text-red-600 font-black text-[10px] uppercase border border-red-100 hover:bg-red-50 transition-colors shadow-sm">Clear Today's Log</button>
            <button 
              onClick={onSyncMasterList} 
              disabled={syncingMasterList}
              className={`bg-white py-4 rounded-2xl text-indigo-600 font-black text-[10px] uppercase border border-indigo-100 hover:bg-indigo-50 transition-colors shadow-sm ${syncingMasterList ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {syncingMasterList ? 'Syncing...' : 'Sync Master List'}
            </button>
          </div>
          <p className="text-center mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Master List must be synced once to the new project</p>
        </div>
      )}
    </div>
  );
};
export default Dashboard;
