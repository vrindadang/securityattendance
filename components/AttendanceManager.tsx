
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
  const [selectedGender] = useState<Gender | null>(activeVolunteer.assignedGroup === 'Ladies' ? 'Ladies' : (activeVolunteer.assignedGroup ? 'Gents' : null));
  const [selectedGroup] = useState<GentsGroup | 'Ladies' | null>(activeVolunteer.assignedGroup || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // States for marking NEW duty assignment
  const [editInTime, setEditInTime] = useState('');
  const [editOutTime, setEditOutTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPoint, setEditPoint] = useState('');
  const [editProperUniform, setEditProperUniform] = useState(true);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // States for adding new sewadar
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGender] = useState<Gender>(activeVolunteer.assignedGroup === 'Ladies' ? 'Ladies' : 'Gents');
  const [newGroup] = useState<GentsGroup | 'Ladies'>(activeVolunteer.assignedGroup || 'Monday');

  // Vehicle Form state
  const [vType, setVType] = useState<'2-wheeler' | '4-wheeler'>('4-wheeler');
  const [vPlate, setVPlate] = useState('');
  const [vModel, setVModel] = useState('');
  const [vRemarks, setVRemarks] = useState('');

  const availableLocs = useMemo(() => {
    const list = workshopLocation?.split(',').map(l => l.trim()).filter(Boolean) || [];
    return list.length > 0 ? list : LOCATIONS_LIST;
  }, [workshopLocation]);

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

  const formatConfigHeader = () => {
    if (!dutyStartTime || !dutyEndTime || !sessionDate) return '-';
    const d = new Date(sessionDate);
    const dateStr = d.toLocaleDateString('en-GB');
    const start = new Date(dutyStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const end = new Date(dutyEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `(${dateStr}) ${start} - ${end}`;
  };

  const handleToggle = (s: Sewadar) => {
    if (isLocked) return;
    if (expandedId === s.id) {
      setExpandedId(null);
      setEditingRecordId(null);
      return;
    }
    
    // Check for an incomplete record (missing out-time) for today
    const recordsForToday = attendance.filter(a => a.sewadarId === s.id && a.date === sessionDate);
    const incomplete = recordsForToday.find(r => !r.outTime);

    if (incomplete) {
      // Auto-load incomplete record for editing
      setEditInTime(incomplete.inTime || '');
      setEditOutTime(incomplete.outTime || '');
      setEditLocation(incomplete.workshopLocation || '');
      setEditPoint(incomplete.sewaPoint || '');
      setEditProperUniform(incomplete.isProperUniform ?? true);
      setEditingRecordId(incomplete.id);
    } else {
      resetForm();
    }
    
    setExpandedId(s.id);
  };

  const resetForm = () => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    setEditInTime(now);
    setEditOutTime('');
    setEditLocation(availableLocs[0] || '');
    setEditPoint('');
    setEditProperUniform(true);
    setEditingRecordId(null);
  };

  const handleSaveAndAnother = (sewadarId: string) => {
    if (isLocked || !editInTime || !editOutTime) return;
    onSaveAttendance(sewadarId, {
      inTime: editInTime,
      outTime: editOutTime,
      sewaPoint: editPoint,
      workshopLocation: editLocation,
      isProperUniform: editProperUniform
    }, editingRecordId || undefined);
    resetForm();
  };

  const handleSaveAndClose = (sewadarId: string) => {
    if (isLocked || !editInTime) return;
    onSaveAttendance(sewadarId, {
      inTime: editInTime,
      outTime: editOutTime,
      sewaPoint: editPoint,
      workshopLocation: editLocation,
      isProperUniform: editProperUniform
    }, editingRecordId || undefined);
    setExpandedId(null);
  };

  const handleCreateSewadar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddSewadar(newName.trim(), newGender, newGroup);
    setNewName('');
    setShowAddModal(false);
  };

  const handleVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vPlate.trim()) return;
    onSaveVehicle({ type: vType, plateNumber: vPlate.toUpperCase(), model: vModel, remarks: vRemarks });
    setVPlate('');
    setVModel('');
    setVRemarks('');
    alert("Vehicle incident logged successfully.");
  };

  return (
    <div className="space-y-6 font-sans max-w-2xl mx-auto">
      {/* Add Sewadar Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6">
              <h2 className="text-2xl font-black text-slate-900">Add New Member</h2>
              <form onSubmit={handleCreateSewadar} className="space-y-4">
                 <input type="text" required className="w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl font-black" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full Name" />
                 <div className="flex gap-2">
                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs">Cancel</button>
                    <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg">Create</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Toggle Bar */}
      <div className="bg-slate-200/50 p-1.5 rounded-[2.5rem] flex items-center shadow-inner gap-1">
        <button 
          onClick={() => setMode('ATTENDANCE')}
          className={`flex-1 py-4 px-6 rounded-[2.2rem] font-black text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
            mode === 'ATTENDANCE' 
              ? 'bg-white text-indigo-600 shadow-[0_4px_20px_rgba(0,0,0,0.08)] scale-[1.02]' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg>
          Mark Attendance
        </button>
        <button 
          onClick={() => setMode('VEHICLES')}
          className={`flex-1 py-4 px-6 rounded-[2.2rem] font-black text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
            mode === 'VEHICLES' 
              ? 'bg-white text-indigo-600 shadow-[0_4px_20px_rgba(0,0,0,0.08)] scale-[1.02]' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Vehicle Reports
        </button>
      </div>

      {mode === 'ATTENDANCE' ? (
        <div className="space-y-4 animate-fade-in">
          {/* Session Config Card */}
          <div className={`p-6 rounded-[2.5rem] shadow-sm border flex items-center justify-between ${isCompleted ? 'bg-indigo-50 border-indigo-200' : hasConfig ? 'bg-white border-slate-100' : 'bg-amber-50 border-amber-200'}`}>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                {isCompleted ? '✅ FINALIZED' : hasConfig ? 'Active Session' : 'Pending Config'}
              </p>
              <h2 className="text-base font-black text-slate-800">{workshopLocation || 'No Location Set'}</h2>
              <p className="text-[10px] font-bold text-slate-400">{formatConfigHeader()}</p>
            </div>
            {!isCompleted && (
              <button onClick={onChangeLocation} className="px-5 py-3 bg-slate-50 border rounded-xl text-[9px] font-black uppercase text-slate-600">Change</button>
            )}
          </div>

          <div className={`${isLocked && !isCompleted ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="sticky top-0 z-20 bg-slate-50 pb-4 pt-2 flex gap-2">
               <input 
                type="text" 
                placeholder="Search Sewadars..." 
                className="flex-1 px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none shadow-sm font-black text-slate-800 focus:border-indigo-500 transition-all text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button onClick={() => setShowAddModal(true)} className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all flex-shrink-0">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </button>
            </div>

            <div className="space-y-3">
              {filtered.map((s, idx) => {
                const records = attendance.filter(a => a.sewadarId === s.id && a.date === sessionDate);
                const isExpanded = expandedId === s.id;
                const isMarked = records.length > 0;

                return (
                  <div key={s.id} className="flex flex-col gap-1">
                    <button 
                      onClick={() => handleToggle(s)} 
                      className={`w-full bg-white px-5 py-5 rounded-[2.5rem] shadow-sm border-2 flex items-center justify-between transition-all ${isMarked ? 'border-emerald-100 bg-emerald-50/5' : 'border-slate-50'}`}
                    >
                      <div className="flex items-center gap-5">
                        <div className="text-[10px] font-black text-slate-200 w-6 text-center">{idx + 1}</div>
                        <div className="text-left">
                           <p className="font-black text-base text-slate-900 leading-tight">{s.name}</p>
                           <div className="flex gap-2 mt-2">
                              {isMarked ? (
                                <span className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm">
                                  {records.length} Duty Point{records.length > 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest">Available</span>
                              )}
                              {isMarked && records.some(r => !r.isProperUniform) && (
                                <span className="bg-red-100 text-red-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase">No Dress</span>
                              )}
                           </div>
                        </div>
                      </div>
                      <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${isMarked ? 'bg-emerald-500 border-emerald-400 shadow-md' : 'bg-slate-50 border-slate-100'}`}>
                        {isMarked ? <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg> : <div className="w-5 h-5 rounded-full border-2 border-slate-200"></div>}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="bg-white border-2 border-indigo-50 rounded-[2.5rem] p-8 shadow-2xl mx-2 space-y-8 animate-in slide-in-from-top-4 duration-300">
                        
                        {/* List Existing assignments */}
                        {records.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Assignments</h3>
                            <div className="space-y-2">
                              {records.map(rec => (
                                <div 
                                  key={rec.id} 
                                  onClick={() => {
                                    if (isLocked) return;
                                    setEditInTime(rec.inTime || '');
                                    setEditOutTime(rec.outTime || '');
                                    setEditLocation(rec.workshopLocation || '');
                                    setEditPoint(rec.sewaPoint || '');
                                    setEditProperUniform(rec.isProperUniform ?? true);
                                    setEditingRecordId(rec.id);
                                  }}
                                  className={`p-4 rounded-2xl flex items-center justify-between border cursor-pointer transition-all ${editingRecordId === rec.id ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500' : 'bg-slate-50 border-slate-100 hover:bg-white'}`}
                                >
                                   <div className="space-y-1">
                                      <p className="text-xs font-black text-slate-800">{rec.workshopLocation} — {rec.sewaPoint || 'General'}</p>
                                      <p className="text-[10px] font-bold text-slate-400">{rec.inTime} to {rec.outTime || 'On Duty'}</p>
                                   </div>
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); onSaveAttendance(s.id, {}, rec.id, true); }} 
                                     className="p-2 text-red-300 hover:text-red-500 transition-colors"
                                   >
                                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" /></svg>
                                   </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Form for new assignment */}
                        <div className="space-y-6 pt-4 border-t-2 border-slate-50">
                           <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest ml-1">
                             {editingRecordId ? 'Update Duty Point' : 'Mark New Duty Point'}
                           </h3>
                           <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Ashram</label>
                                    <select 
                                      className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-black text-sm outline-none appearance-none" 
                                      value={editLocation} 
                                      onChange={e => {
                                        setEditLocation(e.target.value);
                                        // Reset point if location changes
                                        setEditPoint('');
                                      }}
                                    >
                                       {availableLocs.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                 </div>
                                 <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Point / Spot</label>
                                    {editLocation === 'Kirpal Bagh' ? (
                                      <select 
                                        className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-black text-sm outline-none appearance-none"
                                        value={editPoint}
                                        onChange={e => setEditPoint(e.target.value)}
                                      >
                                        <option value="">-- Select Point --</option>
                                        {KIRPAL_BAGH_POINTS.map(p => <option key={p} value={p}>{p}</option>)}
                                        <option value="Other">Other Duty</option>
                                      </select>
                                    ) : editLocation === 'Kirpal Ashram' ? (
                                      <select 
                                        className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-black text-sm outline-none appearance-none"
                                        value={editPoint}
                                        onChange={e => setEditPoint(e.target.value)}
                                      >
                                        <option value="">-- Select Point --</option>
                                        {KIRPAL_ASHRAM_POINTS.map(p => <option key={p} value={p}>{p}</option>)}
                                        <option value="Other">Other Duty</option>
                                      </select>
                                    ) : editLocation === 'Sawan Ashram' ? (
                                      <select 
                                        className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-black text-sm outline-none appearance-none"
                                        value={editPoint}
                                        onChange={e => setEditPoint(e.target.value)}
                                      >
                                        <option value="">-- Select Point --</option>
                                        {SAWAN_ASHRAM_POINTS.map(p => <option key={p} value={p}>{p}</option>)}
                                        <option value="Other">Other Duty</option>
                                      </select>
                                    ) : editLocation === 'Sant Darshan Singh Ji Dham' ? (
                                      <select 
                                        className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-black text-sm outline-none appearance-none"
                                        value={editPoint}
                                        onChange={e => setEditPoint(e.target.value)}
                                      >
                                        <option value="">-- Select Point --</option>
                                        {SDS_DHAM_POINTS.map(p => <option key={p} value={p}>{p}</option>)}
                                        <option value="Other">Other Duty</option>
                                      </select>
                                    ) : (
                                      <input 
                                        type="text" 
                                        className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none" 
                                        value={editPoint} 
                                        onChange={e => setEditPoint(e.target.value)} 
                                        placeholder="e.g. Main Gate..." 
                                      />
                                    )}
                                 </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">In Time</label>
                                    <input type="time" className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-black text-base text-center outline-none" value={editInTime} onChange={e => setEditInTime(e.target.value)} />
                                 </div>
                                 <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Out Time</label>
                                    <input type="time" className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-black text-base text-center outline-none" value={editOutTime} onChange={e => setEditOutTime(e.target.value)} />
                                 </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Proper Dress Code?</label>
                                <div className="flex gap-2">
                                   <button type="button" onClick={() => setEditProperUniform(true)} className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${editProperUniform ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>YES</button>
                                   <button type="button" onClick={() => setEditProperUniform(false)} className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${!editProperUniform ? 'bg-red-500 text-white border-red-500' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>NO</button>
                                </div>
                              </div>
                           </div>

                           <div className="flex flex-col gap-3 pt-4">
                              <button 
                                disabled={!editInTime || !editOutTime}
                                onClick={() => handleSaveAndAnother(s.id)} 
                                className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${(!editInTime || !editOutTime) ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-60 shadow-none' : 'bg-indigo-100 text-indigo-600 shadow-sm active:scale-95'}`}
                              >
                                 {editingRecordId ? 'Update & Add Another' : '+ Add Another Duty Point'}
                              </button>
                              <button 
                                disabled={!editInTime}
                                onClick={() => handleSaveAndClose(s.id)} 
                                className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${!editInTime ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-60 shadow-none' : 'bg-indigo-600 text-white shadow-xl active:scale-95'}`}
                              >
                                 {editingRecordId ? 'Update & Close' : 'Confirm & Done'}
                              </button>
                              <button onClick={() => { setExpandedId(null); setEditingRecordId(null); }} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Cancel / Close</button>
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
      ) : (
        /* VEHICLE REPORTING VIEW */
        <div className="space-y-6 animate-fade-in pb-12">
          {!isCompleted && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xl shadow-lg">🚔</div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Flag Vehicle Report</h3>
              </div>

              <form onSubmit={handleVehicleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setVType('4-wheeler')} className={`py-4 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${vType === '4-wheeler' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>🚗 4-Wheeler</button>
                  <button type="button" onClick={() => setVType('2-wheeler')} className={`py-4 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${vType === '2-wheeler' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>🏍️ 2-Wheeler</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Vehicle Number</label>
                    <input type="text" placeholder="e.g. DL12JU7485" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm uppercase outline-none focus:border-indigo-500 transition-all" value={vPlate} onChange={e => setVPlate(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Car / Bike Model</label>
                    <input type="text" placeholder="e.g. Maruti Swift..." className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none focus:border-indigo-500 transition-all" value={vModel} onChange={e => setVModel(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Observations / Remarks</label>
                  <textarea placeholder="Observations / Reason for flagging..." className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium text-slate-800 outline-none focus:border-indigo-500 transition-all" value={vRemarks} onChange={e => setVRemarks(e.target.value)} rows={3} />
                </div>

                <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                  Log Vehicle Entry
                </button>
              </form>
            </div>
          )}

          {/* Session Vehicle Logs */}
          <div className="space-y-3">
            <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Logged entries for this session
            </h3>
            {vehicles.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {vehicles.slice().reverse().map((v, i) => (
                  <div key={v.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-100 transition-all">
                     <div className="space-y-1">
                       <p className="font-black text-slate-900 text-sm">{vehicles.length - i}. {v.plateNumber} ({v.type === '4-wheeler' ? '4-W' : '2-W'})</p>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v.model || 'Unknown Model'}</p>
                       {v.remarks && <p className="text-xs text-slate-500 mt-2 italic">"{v.remarks}"</p>}
                     </div>
                     <div className="text-right">
                       <p className="text-[10px] font-black text-slate-300 uppercase">{new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                     </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 p-12 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200">
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">No vehicle incidents logged for this session</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManager;
