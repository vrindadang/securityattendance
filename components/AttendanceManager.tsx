
import React, { useState, useMemo } from 'react';
import { Sewadar, Gender, AttendanceRecord, GentsGroup, Volunteer } from '../types';

interface Props {
  sewadars: Sewadar[];
  attendance: AttendanceRecord[];
  onSaveAttendance: (id: string, details: Partial<AttendanceRecord>, isDelete?: boolean) => void;
  onAddSewadar: (name: string, gender: Gender, group: GentsGroup | 'Ladies') => void;
  activeVolunteer: Volunteer;
  workshopLocation: string | null;
  sessionDate: string;
  dutyStartTime: string;
  dutyEndTime: string;
  isCompleted?: boolean;
  onChangeLocation?: () => void;
}

const AttendanceManager: React.FC<Props> = ({ 
  sewadars, 
  attendance, 
  onSaveAttendance, 
  onAddSewadar, 
  activeVolunteer, 
  workshopLocation, 
  sessionDate,
  dutyStartTime,
  dutyEndTime,
  isCompleted,
  onChangeLocation 
}) => {
  const [selectedGender, setSelectedGender] = useState<Gender | null>(activeVolunteer.assignedGroup === 'Ladies' ? 'Ladies' : (activeVolunteer.assignedGroup ? 'Gents' : null));
  const [selectedGroup, setSelectedGroup] = useState<GentsGroup | 'Ladies' | null>(activeVolunteer.assignedGroup || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [editInTime, setEditInTime] = useState('');
  const [editOutTime, setEditOutTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPoint, setEditPoint] = useState('');

  const availableLocs = useMemo(() => workshopLocation?.split(',').map(l => l.trim()).filter(Boolean) || [], [workshopLocation]);

  const hasConfig = !!workshopLocation;
  const isLocked = isCompleted || !hasConfig;

  const filtered = useMemo(() => {
    return sewadars.filter(s => {
      const matchGender = !selectedGender || s.gender === selectedGender;
      const matchGroup = !selectedGroup || s.group === selectedGroup;
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchGender && matchGroup && matchSearch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [sewadars, selectedGender, selectedGroup, searchTerm]);

  const formatTimeStr = (iso: string) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return '-'; }
  };

  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return '-';
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [y, m, d] = cleanDate.split('-');
    return `${d}/${m}/${y}`;
  };

  const formatConfigHeader = () => {
    if (!dutyStartTime || !dutyEndTime || !sessionDate) return '-';
    const datePart = formatDateStr(sessionDate);
    const startPart = formatTimeStr(dutyStartTime);
    const endPart = formatTimeStr(dutyEndTime);
    return `(${datePart}) ${startPart} - ${endPart}`;
  };

  const handleToggle = (s: Sewadar) => {
    if (isLocked) return;
    if (expandedId === s.id) {
      setExpandedId(null);
      return;
    }
    const record = attendance.find(a => a.sewadarId === s.id && a.date === sessionDate);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    
    setEditInTime(record?.inTime || now);
    setEditOutTime(record?.outTime || '');
    setEditLocation(record?.workshopLocation || (availableLocs[0] || ''));
    setEditPoint(record?.sewaPoint || '');
    setExpandedId(s.id);
  };

  const handleSave = (id: string) => {
    if (isLocked) return;
    onSaveAttendance(id, {
      inTime: editInTime,
      outTime: editOutTime,
      sewaPoint: editPoint,
      workshopLocation: editLocation
    });
    setExpandedId(null);
  };

  return (
    <div className="space-y-4 font-sans max-w-2xl mx-auto">
      <div className={`p-6 rounded-[2.5rem] shadow-sm border transition-all flex items-center justify-between ${isCompleted ? 'bg-indigo-50 border-indigo-200' : hasConfig ? 'bg-white border-slate-100' : 'bg-amber-50 border-amber-200'}`}>
        <div className="space-y-1">
          <p className={`text-[10px] font-black uppercase tracking-widest ${isCompleted ? 'text-indigo-600' : hasConfig ? 'text-indigo-500' : 'text-amber-600'}`}>
            {isCompleted ? '✅ SESSION FINALIZED' : hasConfig ? 'Active Duty Config' : 'Configuration Pending'}
          </p>
          <h2 className={`text-base font-black leading-tight ${isCompleted ? 'text-indigo-900' : hasConfig ? 'text-slate-800' : 'text-amber-900'}`}>
            {workshopLocation || 'No Location Set'}
          </h2>
          <p className="text-[10px] font-bold text-slate-400">
            {hasConfig ? formatConfigHeader() : 'Set duty details to start marking'}
          </p>
        </div>
        {!isCompleted && (
          <button onClick={onChangeLocation} className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm ${hasConfig ? 'bg-slate-50 border border-slate-100 text-slate-600 hover:bg-indigo-50' : 'bg-amber-600 text-white'}`}>
            {hasConfig ? 'Change' : 'Configure Now'}
          </button>
        )}
      </div>

      <div className={`transition-all duration-500 ${isLocked && !isCompleted ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
        <div className="sticky top-0 z-20 bg-slate-50 pb-4 pt-2">
           <input 
            type="text" 
            placeholder={isCompleted ? 'Session finalized' : hasConfig ? `Search members...` : 'Configure session first...'} 
            className={`w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none shadow-sm font-black text-slate-800 placeholder:text-slate-300 focus:border-indigo-500 transition-all text-sm`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          {filtered.map((s, idx) => {
            const record = attendance.find(a => a.sewadarId === s.id && a.date === sessionDate);
            const isExpanded = expandedId === s.id;
            const isMarked = !!record;
            const isDone = isMarked && !!record.outTime;

            return (
              <div key={s.id} className="flex flex-col gap-1">
                <button 
                  onClick={() => handleToggle(s)} 
                  disabled={isCompleted && !isMarked}
                  className={`w-full bg-white px-5 py-5 rounded-[2.5rem] shadow-sm border-2 flex items-center justify-between transition-all active:scale-[0.98] ${isMarked ? (isDone ? 'border-indigo-100 bg-indigo-50/5' : 'border-emerald-100 bg-emerald-50/5') : 'border-slate-50'}`}
                >
                  <div className="flex items-center gap-5">
                    <div className="text-[10px] font-black text-slate-200 w-6 text-center">{idx + 1}</div>
                    <div className="text-left space-y-3">
                      <p className="font-black text-base text-slate-900 leading-tight">{s.name}</p>
                      {isMarked ? (
                        <div className="flex items-center gap-2">
                           <div className="bg-slate-900 text-white rounded-xl px-4 py-2 flex flex-col items-center min-w-[70px]">
                              <span className="text-[7px] font-black uppercase opacity-60">In Time</span>
                              <span className="text-xs font-black tracking-tight">{record.inTime || '--:--'}</span>
                           </div>
                           <div className={`rounded-xl px-4 py-2 flex flex-col items-center min-w-[70px] border-2 ${record.outTime ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-300 border-slate-100 italic'}`}>
                              <span className="text-[7px] font-black uppercase opacity-60">Out Time</span>
                              <span className="text-xs font-black tracking-tight">{record.outTime || 'On Duty'}</span>
                           </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Available to Mark</p>
                      )}
                    </div>
                  </div>
                  
                  <div className={`w-14 h-14 rounded-[1.25rem] border-2 flex items-center justify-center transition-all ${isMarked ? (isDone ? 'bg-indigo-500 border-indigo-400 shadow-lg' : 'bg-emerald-500 border-emerald-400 shadow-lg') : 'bg-slate-50 border-slate-100'}`}>
                    {isMarked ? <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg> : <div className="w-5 h-5 rounded-full border-2 border-slate-200"></div>}
                  </div>
                </button>

                {isExpanded && !isCompleted && (
                  <div className="bg-white border-2 border-indigo-50 rounded-[2.5rem] p-8 shadow-2xl mx-2 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2">In Time</label>
                        <input type="time" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-base text-center outline-none focus:border-indigo-400" value={editInTime} onChange={(e) => setEditInTime(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Out Time</label>
                        <input type="time" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-base text-center outline-none focus:border-indigo-400" value={editOutTime} onChange={(e) => setEditOutTime(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Sewa Point / Spot</label>
                      <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-400" value={editPoint} onChange={(e) => setEditPoint(e.target.value)} placeholder="e.g. Main Gate, Parking, etc." />
                    </div>
                    <div className="pt-2 flex flex-col gap-3">
                      <button onClick={() => handleSave(s.id)} className="w-full py-4.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95">
                        {isMarked ? 'Save Changes' : 'Confirm Attendance'}
                      </button>
                      <div className="flex gap-2">
                        <button onClick={() => setExpandedId(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase">Cancel</button>
                        {isMarked && (
                          <button onClick={() => { if(confirm("Remove entry?")) onSaveAttendance(s.id, {}, true); setExpandedId(null); }} className="flex-1 py-4 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase">Delete</button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AttendanceManager;
