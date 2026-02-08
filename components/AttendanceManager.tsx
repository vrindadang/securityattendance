
import React, { useState, useMemo } from 'react';
import { Sewadar, Gender, AttendanceRecord, GentsGroup, Volunteer, VehicleRecord } from '../types';
import { LOCATIONS_LIST, KIRPAL_BAGH_POINTS, SDS_DHAM_POINTS, KIRPAL_ASHRAM_POINTS, SAWAN_ASHRAM_POINTS } from '../constants';

interface Props {
  sewadars: Sewadar[];
  attendance: AttendanceRecord[];
  vehicles: VehicleRecord[];
  onSaveAttendance: (sewadarId: string, details: Partial<AttendanceRecord>, recordId?: string, isDelete?: boolean) => void;
  onSaveVehicle: (v: Omit<VehicleRecord, 'id' | 'timestamp' | 'volunteerId' | 'volunteerName'>) => void;
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
  vehicles = [],
  onSaveAttendance, 
  onSaveVehicle,
  onAddSewadar, 
  activeVolunteer, 
  workshopLocation, 
  sessionDate,
  dutyStartTime,
  dutyEndTime,
  isCompleted,
  onChangeLocation 
}) => {
  const [mode, setMode] = useState<'ATTENDANCE' | 'VEHICLES'>('ATTENDANCE');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [editInTime, setEditInTime] = useState('');
  const [editOutTime, setEditOutTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPoint, setEditPoint] = useState('');
  const [editProperUniform, setEditProperUniform] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');

  const availableLocs = useMemo(() => {
    return workshopLocation?.split(',').map(l => l.trim()).filter(Boolean) || [];
  }, [workshopLocation]);

  const hasActiveSession = !!workshopLocation;

  const filtered = useMemo(() => {
    const selectedGender = activeVolunteer.assignedGroup === 'Ladies' ? 'Ladies' : 'Gents';
    const selectedGroup = activeVolunteer.assignedGroup;
    return sewadars.filter(s => {
      const matchGender = s.gender === selectedGender;
      const matchGroup = !selectedGroup || s.group === selectedGroup;
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchGender && matchGroup && matchSearch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [sewadars, activeVolunteer, searchTerm]);

  const handleToggle = (s: Sewadar) => {
    if (!hasActiveSession) return;
    if (expandedId === s.id) {
      setExpandedId(null);
      return;
    }
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    setEditInTime(now);
    setEditOutTime('');
    setEditLocation(availableLocs[0] || '');
    setEditPoint('');
    setEditProperUniform(true);
    setExpandedId(s.id);
  };

  const handleSaveAndClose = (sewadarId: string) => {
    onSaveAttendance(sewadarId, {
      inTime: editInTime, outTime: editOutTime, sewaPoint: editPoint,
      workshopLocation: editLocation, isProperUniform: editProperUniform
    });
    setExpandedId(null);
  };

  if (!hasActiveSession) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-8 animate-fade-in">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-5xl">🛑</div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">No Active Session</h2>
          <p className="text-slate-500 text-sm max-w-xs font-medium">Please start a new duty session from the configuration to begin marking attendance.</p>
        </div>
        <button 
          onClick={onChangeLocation}
          className="bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
        >
          Start New Duty Session
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans max-w-2xl mx-auto">
      <div className="bg-slate-200/50 p-1.5 rounded-[2.5rem] flex items-center shadow-inner gap-1">
        <button onClick={() => setMode('ATTENDANCE')} className={`flex-1 py-4 px-6 rounded-[2.2rem] font-black text-[10px] uppercase tracking-widest transition-all ${mode === 'ATTENDANCE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Mark Attendance</button>
        <button onClick={() => setMode('VEHICLES')} className={`flex-1 py-4 px-6 rounded-[2.2rem] font-black text-[10px] uppercase tracking-widest transition-all ${mode === 'VEHICLES' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Vehicle Reports</button>
      </div>

      {mode === 'ATTENDANCE' ? (
        <div className="space-y-4 animate-fade-in">
          <div className="p-6 rounded-[2.5rem] shadow-sm border bg-white border-slate-100 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Active Duty Session</p>
              <h2 className="text-base font-black text-slate-800">{workshopLocation}</h2>
              <p className="text-[10px] font-bold text-slate-400">Date: {sessionDate.split('-').reverse().join('/')}</p>
            </div>
            <button onClick={onChangeLocation} className="px-5 py-3 bg-slate-50 border rounded-xl text-[9px] font-black uppercase text-slate-600">Change</button>
          </div>

          <div className="sticky top-0 z-20 bg-slate-50 pb-4 pt-2 flex gap-2">
             <input type="text" placeholder="Search Sewadars..." className="flex-1 px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none shadow-sm font-black text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             <button onClick={() => setShowAddModal(true)} className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">+</button>
          </div>

          <div className="space-y-3">
            {filtered.map((s, idx) => {
              const records = attendance.filter(a => a.sewadarId === s.id);
              const isExpanded = expandedId === s.id;
              const isMarked = records.length > 0;
              return (
                <div key={s.id} className="flex flex-col gap-1">
                  <button onClick={() => handleToggle(s)} className={`w-full bg-white px-5 py-5 rounded-[2.5rem] shadow-sm border-2 flex items-center justify-between transition-all ${isMarked ? 'border-emerald-100' : 'border-slate-50'}`}>
                    <div className="flex items-center gap-5">
                      <div className="text-[10px] font-black text-slate-200 w-6">{idx + 1}</div>
                      <div className="text-left">
                        <p className="font-black text-base text-slate-900 leading-tight">{s.name}</p>
                        <div className="flex gap-2 mt-2">
                          {isMarked ? <span className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase">{records.length} Points</span> : <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest">Available</span>}
                        </div>
                      </div>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center ${isMarked ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-50 border-slate-100'}`}>{isMarked ? '✓' : ''}</div>
                  </button>
                  {isExpanded && (
                    <div className="bg-white border-2 border-indigo-50 rounded-[2.5rem] p-8 shadow-2xl mx-2 space-y-6">
                      {records.length > 0 && (
                        <div className="space-y-2">
                          {records.map(rec => (
                            <div key={rec.id} className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                              <div className="space-y-1">
                                <p className="text-xs font-black">{rec.sewaPoint || 'General'}</p>
                                <p className="text-[10px] font-bold text-slate-400">{rec.inTime} - {rec.outTime || 'Present'}</p>
                              </div>
                              <button onClick={() => onSaveAttendance(s.id, {}, rec.id, true)} className="text-red-300">✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="space-y-4 pt-4 border-t">
                        <select className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-black text-sm" value={editLocation} onChange={e => setEditLocation(e.target.value)}>{availableLocs.map(l => <option key={l} value={l}>{l}</option>)}</select>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-black text-sm" value={editPoint} onChange={e => setEditPoint(e.target.value)} placeholder="Point (e.g. Gate 1)" />
                        <div className="grid grid-cols-2 gap-4">
                          <input type="time" className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-black" value={editInTime} onChange={e => setEditInTime(e.target.value)} />
                          <input type="time" className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-black" value={editOutTime} onChange={e => setEditOutTime(e.target.value)} />
                        </div>
                        <button onClick={() => handleSaveAndClose(s.id)} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl">Confirm Attendance</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in pb-12">
          {activeVolunteer?.assignedGroup !== 'Ladies' ? (
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <h3 className="text-sm font-black text-slate-900 uppercase">Flag Vehicle</h3>
                <input type="text" placeholder="Vehicle Number (e.g. DL12JU7485)" className="w-full px-6 py-4 bg-slate-50 border-2 rounded-2xl font-black text-sm uppercase" value={editPoint} onChange={e => setEditPoint(e.target.value)} />
                <button onClick={() => { onSaveVehicle({ type: '4-wheeler', plateNumber: editPoint, model: '', remarks: '' }); setEditPoint(''); }} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase shadow-xl">Log Entry</button>
              </div>
              <div className="space-y-3">
                <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Logged for this session</h3>
                {vehicles.map(v => (
                  <div key={v.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center">
                    <div><p className="font-black text-slate-900 text-sm">{v.plateNumber}</p><p className="text-[10px] text-slate-300 uppercase">{new Date(v.timestamp).toLocaleTimeString()}</p></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
             <div className="bg-white p-12 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200"><p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Restricted Section</p></div>
          )}
        </div>
      )}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-6">
              <h2 className="text-2xl font-black">Add Member</h2>
              <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl font-black" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" />
              <button onClick={() => { onAddSewadar(newName, activeVolunteer.assignedGroup === 'Ladies' ? 'Ladies' : 'Gents', activeVolunteer.assignedGroup || 'Monday'); setShowAddModal(false); setNewName(''); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs">Create</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManager;
