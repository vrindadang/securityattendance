
import React, { useState, useMemo } from 'react';
import { Sewadar, Gender, AttendanceRecord, DutyGroup, Volunteer, VehicleRecord, FlaggedVehicle } from '../types';
import { LOCATIONS_LIST, KIRPAL_BAGH_POINTS, SDS_DHAM_POINTS, KIRPAL_ASHRAM_POINTS, SAWAN_ASHRAM_POINTS, GENTS_GROUPS, SATURDAY_REMOVED_NAMES, isRemovedSaturday, TUESDAY_REMOVED_NAMES, isRemovedTuesday, normalizeName } from '../constants';

interface Props {
  sewadars: Sewadar[];
  attendance: AttendanceRecord[];
  vehicles: VehicleRecord[];
  flaggedVehicles?: FlaggedVehicle[];
  onSaveAttendance: (sewadarId: string, details: Partial<AttendanceRecord>, recordId?: string, isDelete?: boolean) => void;
  onSaveVehicle: (v: Partial<VehicleRecord>, id?: string, isDelete?: boolean) => void;
  onAddSewadar: (name: string, gender: Gender, group: DutyGroup, shift?: 'DAY' | 'NIGHT', details?: { dob: string, phone: string, address: string }, isRestored?: boolean) => void;
  onDeleteSewadar?: (id: string) => void;
  onEditSewadar?: (id: string, newName: string) => void;
  activeVolunteer: Volunteer;
  workshopLocation: string | null;
  sessionDate: string;
  dutyStartTime: string;
  dutyEndTime: string;
  isCompleted?: boolean;
  onChangeLocation?: () => void;
  sessionGroup?: DutyGroup | null;
}

const AttendanceManager: React.FC<Props> = ({ 
  sewadars, 
  attendance, 
  vehicles = [],
  flaggedVehicles = [],
  onSaveAttendance, 
  onSaveVehicle,
  onAddSewadar, 
  onDeleteSewadar,
  onEditSewadar,
  activeVolunteer, 
  workshopLocation, 
  sessionDate,
  dutyStartTime,
  dutyEndTime,
  isCompleted,
  onChangeLocation,
  sessionGroup
}) => {
  const [mode, setMode] = useState<'ATTENDANCE' | 'VEHICLES'>('ATTENDANCE');
  const isSuperAdmin = activeVolunteer.role === 'Super Admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // States for marking NEW duty assignment
  const [editInTime, setEditInTime] = useState('');
  const [editOutTime, setEditOutTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPoint, setEditPoint] = useState('');
  const [editProperUniform, setEditProperUniform] = useState(true);
  const [editShift, setEditShift] = useState<'DAY' | 'NIGHT' | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  // States for adding new sewadar
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Gender>(
    activeVolunteer.role.includes('Ladies') ? 'Ladies' : 'Gents'
  );
  const [newGroup, setNewGroup] = useState<DutyGroup>(
    activeVolunteer.assignedGroup || (activeVolunteer.role.includes('Ladies') ? 'Ladies' : 'Monday')
  );
  const [newShift, setNewShift] = useState<'DAY' | 'NIGHT' | undefined>(undefined);
  const [newDob, setNewDob] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [restorePrompt, setRestorePrompt] = useState<{
    name: string;
    gender: Gender;
    group: DutyGroup;
    shift?: 'DAY' | 'NIGHT';
    details: { dob: string; phone: string; address: string };
  } | null>(null);

  // Vehicle Form state
  const [vType, setVType] = useState<'2-wheeler' | '4-wheeler'>('4-wheeler');
  const [vPlate, setVPlate] = useState('');
  const [vModel, setVModel] = useState('');
  const [vRemarks, setVRemarks] = useState('');
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  const availableLocs = useMemo(() => {
    const list = workshopLocation?.split(',').map(l => l.trim()).filter(l => LOCATIONS_LIST.includes(l)) || [];
    return list.length > 0 ? list : LOCATIONS_LIST;
  }, [workshopLocation]);

  const cleanWorkshopLocation = useMemo(() => {
    if (!workshopLocation) return '';
    return workshopLocation.split(',').map(l => l.trim()).filter(l => LOCATIONS_LIST.includes(l)).join(', ');
  }, [workshopLocation]);

  const hasConfig = !!workshopLocation;
  const isLocked = !hasConfig;

  const normalizeDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split(/[-/]/).map(Number);
    if (parts.length !== 3) return dateStr;
    let y, m, d;
    if (parts[0] > 1000) {
      [y, m, d] = parts;
    } else {
      [d, m, y] = parts;
    }
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const normalizedSessionDate = useMemo(() => normalizeDate(sessionDate), [sessionDate]);

  const isGentsSaturday = useMemo(() => {
    const isSaturdayGroup = sessionGroup === 'Saturday';
    const isGentsSaturdayVolunteer = activeVolunteer.role === 'Gents Admin' && activeVolunteer.assignedGroup === 'Saturday';
    const isSuperAdmin = activeVolunteer.role === 'Super Admin';
    return isSaturdayGroup && (isGentsSaturdayVolunteer || isSuperAdmin);
  }, [activeVolunteer, sessionGroup]);

  const isGentsTuesday = useMemo(() => {
    const isTuesdayGroup = sessionGroup === 'Tuesday';
    const isGentsTuesdayVolunteer = activeVolunteer.role === 'Gents Admin' && activeVolunteer.assignedGroup === 'Tuesday';
    const isSuperAdmin = activeVolunteer.role === 'Super Admin';
    return isTuesdayGroup && (isGentsTuesdayVolunteer || isSuperAdmin);
  }, [activeVolunteer, sessionGroup]);

  const activeRestoredNorms = useMemo(() => {
    return new Set(
      sewadars
        .filter(s => s.isRestored && s.group === sessionGroup)
        .map(s => normalizeName(s.name))
    );
  }, [sewadars, sessionGroup]);

  const filtered = useMemo(() => {
    const list = sewadars.filter(s => {
      if (s.isRestored || activeRestoredNorms.has(normalizeName(s.name))) {
        return s.name.toLowerCase().includes(searchTerm.toLowerCase());
      }
      if (isGentsSaturday && isRemovedSaturday(s.name)) {
        return false;
      }
      if (isGentsTuesday && isRemovedTuesday(s)) {
        return false;
      }
      return s.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Deduplicate in case a restored member exists as both custom and legacy
    const uniqueMap = new Map<string, Sewadar>();
    for (const s of list) {
      const key = `${s.group}_${normalizeName(s.name)}`;
      const existing = uniqueMap.get(key);
      if (!existing || (!existing.isRestored && s.isRestored)) {
        uniqueMap.set(key, s);
      }
    }

    return Array.from(uniqueMap.values()).sort((a, b) => {
      const aMarked = attendance.some(rec => rec.sewadarId === a.id && normalizeDate(rec.date) === normalizedSessionDate);
      const bMarked = attendance.some(rec => rec.sewadarId === b.id && normalizeDate(rec.date) === normalizedSessionDate);
      
      if (aMarked && !bMarked) return -1;
      if (!aMarked && bMarked) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [sewadars, searchTerm, attendance, normalizedSessionDate, isGentsSaturday, isGentsTuesday, activeRestoredNorms]);

  const markedCount = useMemo(() => {
    const markedIds = new Set(attendance.filter(a => normalizeDate(a.date) === normalizedSessionDate).map(a => a.sewadarId));
    return markedIds.size;
  }, [attendance, normalizedSessionDate]);

  const formatConfigHeader = () => {
    if (!dutyStartTime || !dutyEndTime || !normalizedSessionDate) return '-';
    const d = new Date(normalizedSessionDate);
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
      setEditShift(incomplete.shift || null);
      setEditingRecordId(incomplete.id);
    } else {
      resetForm();
    }
    
    setExpandedId(s.id);
    setIsEditingName(false);
    setTempName(s.name);
  };

  const resetForm = () => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    setEditInTime(now);
    setEditOutTime('');
    setEditLocation(availableLocs[0] || '');
    setEditPoint('');
    setEditProperUniform(true);
    setEditShift(null);
    setEditingRecordId(null);
  };

  const handleSaveAndAnother = (sewadarId: string) => {
    if (isLocked || !editInTime || !editOutTime) return;
    onSaveAttendance(sewadarId, {
      inTime: editInTime,
      outTime: editOutTime,
      sewaPoint: editPoint,
      workshopLocation: editLocation,
      isProperUniform: editProperUniform,
      shift: editShift || undefined
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
      isProperUniform: editProperUniform,
      shift: editShift || undefined
    }, editingRecordId || undefined);
    setExpandedId(null);
  };

  const handleCreateSewadar = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    // Optional phone validation: only validate if phone is provided
    if (newPhone.trim() && !/^\d{10}$/.test(newPhone.trim())) {
      setDuplicateError("Mobile number must be a valid 10-digit number.");
      return;
    }

    const normalizedNewName = normalizeName(trimmedName);

    // Check if sewadar is in removed list for this group
    const isRemoved = (newGroup === 'Saturday' && newGender === 'Gents' && isRemovedSaturday(trimmedName)) ||
                      (newGroup === 'Tuesday' && newGender === 'Gents' && isRemovedTuesday(trimmedName));

    // Find any existing sewadars in this group with matching normalized name
    const existingMatching = sewadars.filter(s => 
      s.group === newGroup && normalizeName(s.name) === normalizedNewName
    );

    // A sewadar is genuinely an active duplicate if it's currently active (not in removed list, or marked isRestored)
    const isAlreadyActive = existingMatching.some(s => {
      if (s.isRestored) return true;
      if (newGroup === 'Saturday' && newGender === 'Gents' && isRemovedSaturday(s.name)) return false;
      if (newGroup === 'Tuesday' && newGender === 'Gents' && isRemovedTuesday(s)) return false;
      return true;
    });

    if (isAlreadyActive) {
      setDuplicateError(`A member with a similar name already exists and is active in the ${newGroup} group.`);
      return;
    }

    // If member is removed (in removed lists or was hidden in existing sewadars)
    if (isRemoved || existingMatching.length > 0) {
      setRestorePrompt({
        name: trimmedName,
        gender: newGender,
        group: newGroup,
        shift: newShift,
        details: {
          dob: newDob,
          phone: newPhone.trim(),
          address: newAddress.trim()
        }
      });
      return;
    }

    onAddSewadar(trimmedName, newGender, newGroup, newShift, {
      dob: newDob,
      phone: newPhone.trim(),
      address: newAddress.trim()
    });

    setNewName('');
    setNewDob('');
    setNewPhone('');
    setNewAddress('');
    setNewShift(undefined);
    setDuplicateError(null);
    setShowAddModal(false);
  };

  const handleConfirmRestore = () => {
    if (!restorePrompt) return;
    onAddSewadar(
      restorePrompt.name,
      restorePrompt.gender,
      restorePrompt.group,
      restorePrompt.shift,
      restorePrompt.details,
      true
    );
    setNewName('');
    setNewDob('');
    setNewPhone('');
    setNewAddress('');
    setNewShift(undefined);
    setDuplicateError(null);
    setShowAddModal(false);
    setRestorePrompt(null);
  };

  const handleVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vPlate.trim()) return;
    onSaveVehicle({ type: vType, plateNumber: vPlate.toUpperCase(), model: vModel, remarks: vRemarks }, editingVehicleId || undefined);
    setVPlate('');
    setVModel('');
    setVRemarks('');
    setEditingVehicleId(null);
    alert(editingVehicleId ? "Vehicle entry updated." : "Vehicle incident logged successfully.");
  };

  const handleEditVehicle = (v: VehicleRecord) => {
    setVType(v.type);
    setVPlate(v.plateNumber);
    setVModel(v.model);
    setVRemarks(v.remarks);
    setEditingVehicleId(v.id);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteVehicle = (id: string) => {
    if (window.confirm("Are you sure you want to delete this vehicle entry?")) {
      onSaveVehicle({}, id, true);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-2xl mx-auto">
      {/* Restore Confirmation Prompt Modal */}
      {restorePrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto text-2xl shadow-inner border border-amber-100">
              ⚠️
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">Restore Member</h3>
              <p className="text-sm font-bold text-slate-700">
                This person was previously marked as removed. Would you like to restore them to the active list?
              </p>
              <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-black text-indigo-900">
                Member: <span className="text-slate-900 font-extrabold">{restorePrompt.name}</span> ({restorePrompt.group} {restorePrompt.gender})
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setRestorePrompt(null)} 
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black uppercase text-xs transition-all active:scale-95"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleConfirmRestore} 
                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-indigo-200 transition-all active:scale-95"
              >
                Yes, Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Sewadar Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto no-scrollbar">
              <h2 className="text-2xl font-black text-slate-900">Add New Member</h2>
              <form onSubmit={handleCreateSewadar} className="space-y-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Name</label>
                    <input type="text" required className="w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl font-black" value={newName} onChange={e => { setNewName(e.target.value); setDuplicateError(null); }} placeholder="Full Name" />
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Date of Birth (DOB) (Optional)</label>
                    <input 
                       type="date" 
                       className="w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none" 
                       value={newDob} 
                       onChange={e => setNewDob(e.target.value)} 
                    />
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Mobile Number (Optional)</label>
                    <input 
                       type="tel" 
                       maxLength={10}
                       className="w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none" 
                       placeholder="10-Digit Mobile Number" 
                       value={newPhone} 
                       onChange={e => setNewPhone(e.target.value)} 
                    />
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Address (Optional)</label>
                    <textarea 
                       className="w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none min-h-[60px]" 
                       placeholder="Residential Address" 
                       value={newAddress} 
                       onChange={e => setNewAddress(e.target.value)} 
                    />
                 </div>
                 
                 {isSuperAdmin && (
                   <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Gender</label>
                        <select 
                          className="w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none"
                          value={newGender}
                          onChange={e => {
                            const val = e.target.value as Gender;
                            setNewGender(val);
                            if (val === 'Ladies') setNewGroup('Ladies');
                            setDuplicateError(null);
                          }}
                        >
                          <option value="Gents">Gents</option>
                          <option value="Ladies">Ladies</option>
                        </select>
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Group</label>
                        <select 
                          className="w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none"
                          value={newGroup}
                          onChange={e => { setNewGroup(e.target.value as DutyGroup); setDuplicateError(null); }}
                        >
                          {newGender === 'Ladies' ? (
                            <>
                              <option value="Ladies">Ladies</option>
                              <option value="Monday">Monday</option>
                            </>
                          ) : (
                            GENTS_GROUPS.map(g => <option key={g} value={g}>{g}</option>)
                          )}
                        </select>
                     </div>
                   </div>
                 )}

                 {newGroup === 'Monday' && newGender === 'Ladies' && (
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Shift</label>
                     <div className="flex gap-2">
                       <button 
                         type="button"
                         onClick={() => setNewShift('DAY')}
                         className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${newShift === 'DAY' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                       >
                         Day
                       </button>
                       <button 
                         type="button"
                         onClick={() => setNewShift('NIGHT')}
                         className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${newShift === 'NIGHT' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                       >
                         Night
                       </button>
                     </div>
                   </div>
                 )}

                 {duplicateError && (
                   <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl">
                     <p className="text-xs font-bold text-red-600 text-center">{duplicateError}</p>
                   </div>
                 )}

                 <div className="flex gap-2 pt-4">
                    <button type="button" onClick={() => { setShowAddModal(false); setDuplicateError(null); }} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs">Cancel</button>
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
          <div className={`p-6 rounded-[2.5rem] shadow-sm border flex items-center justify-between ${hasConfig ? 'bg-white border-slate-100' : 'bg-amber-50 border-amber-200'}`}>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                {hasConfig ? (normalizedSessionDate === new Date().toISOString().split('T')[0] ? 'Current Session' : 'Session Record') : 'Pending Config'}
              </p>
              <h2 className="text-base font-black text-slate-800">
                {cleanWorkshopLocation === LOCATIONS_LIST.join(', ') ? 'All Locations' : (cleanWorkshopLocation || 'No Location Set')}
              </h2>
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-bold text-slate-400">{formatConfigHeader()}</p>
                <div className="h-1 w-1 bg-slate-200 rounded-full"></div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Marked: {markedCount}</p>
              </div>
            </div>
            <button onClick={onChangeLocation} className="px-5 py-3 bg-slate-50 border rounded-xl text-[9px] font-black uppercase text-slate-600">Change</button>
          </div>

          <div className={`${isLocked ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="sticky top-0 z-20 bg-slate-50 pb-4 pt-2">
              <div className="flex gap-2">
                 <input 
                  type="text" 
                  placeholder="Search Sewadars..." 
                  className="flex-1 px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none shadow-sm font-black text-slate-800 focus:border-indigo-500 transition-all text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button onClick={() => { setDuplicateError(null); setShowAddModal(true); }} className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all flex-shrink-0">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-400 font-black text-sm uppercase tracking-wider">No Sewadars Found</p>
                  <p className="text-slate-300 text-[10px] mt-2 font-bold max-w-[200px]">
                    Try changing the search term. 
                  </p>
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="mt-6 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              ) : filtered.map((s, idx) => {
                const records = attendance.filter(a => a.sewadarId === s.id && normalizeDate(a.date) === normalizedSessionDate);
                const isExpanded = expandedId === s.id;
                const isMarked = records.length > 0;
                const isWorkshopMarked = records.some(r => r.workshopLocation === 'Workshop');

                return (
                  <div key={s.id} className="flex flex-col gap-1">
                    <button 
                      onClick={() => handleToggle(s)} 
                      className={isMarked 
                        ? "w-full bg-emerald-50/40 px-6 py-3.5 rounded-[1.8rem] shadow-sm border border-emerald-100 flex items-center justify-between transition-all hover:bg-emerald-50/60"
                        : `w-full bg-white px-5 py-5 rounded-[2.5rem] shadow-sm border-2 flex items-center justify-between transition-all border-slate-50`
                      }
                    >
                      {isMarked ? (
                        <>
                          <div className="flex items-center gap-4">
                            <div className="text-[9px] font-black text-emerald-300 w-5 text-center">{idx + 1}</div>
                            <div className="text-left">
                               <div className="flex items-center flex-wrap gap-1.5">
                                 <p className="font-black text-sm text-slate-800 leading-tight">
                                   {s.name}
                                 </p>
                                 {isWorkshopMarked && (
                                   <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[9px] font-black uppercase tracking-wider">
                                     Marked via Workshop
                                   </span>
                                 )}
                               </div>
                               <p className="text-[10px] font-bold text-emerald-600/70 mt-0.5">
                                 {records.map(r => r.sewaPoint || (r.workshopLocation === 'Workshop' ? 'Workshop' : 'General')).join(', ')} • {records.every(r => r.isProperUniform !== false) ? 'Uniform' : <span className="text-red-600 font-black">No Dress</span>}
                               </p>
                            </div>
                          </div>
                          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                             <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                               <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                             </svg>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-5">
                            <div className="text-[10px] font-black text-slate-200 w-6 text-center">{idx + 1}</div>
                            <div className="text-left">
                               <p className="font-black text-base text-slate-900 leading-tight">{s.name}</p>
                               <div className="flex flex-wrap gap-2 mt-2">
                                  <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest">Available</span>
                               </div>
                            </div>
                          </div>
                          <div className="w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all bg-slate-50 border-slate-100">
                            <div className="w-5 h-5 rounded-full border-2 border-slate-200"></div>
                          </div>
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="bg-white border-2 border-indigo-50 rounded-[2.5rem] p-8 shadow-2xl mx-2 space-y-8 animate-in slide-in-from-top-4 duration-300">
                        
                        {/* Name Editing Section */}
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Member Details</h3>
                              {isSuperAdmin && onEditSewadar && (
                                <button 
                                  onClick={() => {
                                    if (isEditingName) {
                                      if (tempName.trim() && tempName.trim() !== s.name) {
                                        onEditSewadar(s.id, tempName.trim());
                                      }
                                      setIsEditingName(false);
                                    } else {
                                      setTempName(s.name);
                                      setIsEditingName(true);
                                    }
                                  }}
                                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1"
                                >
                                  {isEditingName ? (
                                    <>
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                      Save Name
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      Edit Name
                                    </>
                                  )}
                                </button>
                              )}
                           </div>
                           
                           {isEditingName ? (
                             <div className="space-y-2">
                               <input 
                                 type="text" 
                                 className="w-full px-5 py-4 bg-slate-50 border-2 border-indigo-100 rounded-2xl font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                                 value={tempName}
                                 onChange={e => setTempName(e.target.value)}
                                 autoFocus
                               />
                               <p className="text-[9px] font-bold text-slate-400 ml-2 italic">* This will update the name across the current session records.</p>
                             </div>
                           ) : (
                             <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                               <p className="text-base font-black text-slate-900">{s.name}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{s.gender} • {s.group} {s.shift ? `(${s.shift})` : ''}</p>
                             </div>
                           )}
                        </div>

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
                                    setEditShift(rec.shift || null);
                                    setEditingRecordId(rec.id);
                                  }}
                                  className={`p-4 rounded-2xl flex items-center justify-between border cursor-pointer transition-all ${editingRecordId === rec.id ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500' : 'bg-slate-50 border-slate-100 hover:bg-white'}`}
                                >
                                   <div className="space-y-1">
                                       <div className="flex items-center gap-2 flex-wrap">
                                          <p className="text-xs font-black text-slate-800">{rec.workshopLocation} — {rec.sewaPoint || 'General'}</p>
                                          {rec.workshopLocation === 'Workshop' && (
                                            <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase bg-indigo-100 text-indigo-700">
                                              Marked via Workshop
                                            </span>
                                          )}
                                          {rec.shift && (
                                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase ${rec.shift === 'DAY' ? 'bg-amber-100 text-amber-700' : 'bg-slate-800 text-white'}`}>
                                              {rec.shift}
                                            </span>
                                          )}
                                       </div>
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
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Shift</label>
                                <div className="flex gap-2">
                                   <button 
                                     type="button" 
                                     onClick={() => setEditShift('DAY')} 
                                     className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${editShift === 'DAY' ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                                   >
                                     DAY
                                   </button>
                                   <button 
                                     type="button" 
                                     onClick={() => setEditShift('NIGHT')} 
                                     className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${editShift === 'NIGHT' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                                   >
                                     NIGHT
                                   </button>
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
                              {(!editingRecordId || editOutTime) && (
                                <button 
                                  disabled={!editInTime || !editOutTime}
                                  onClick={() => handleSaveAndAnother(s.id)} 
                                  className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${(!editInTime || !editOutTime) ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-60 shadow-none' : 'bg-indigo-100 text-indigo-600 shadow-sm active:scale-95'}`}
                                >
                                   {editingRecordId ? 'Update & Add Another' : '+ Add Another Duty Point'}
                                </button>
                              )}
                              <button 
                                disabled={!editInTime}
                                onClick={() => handleSaveAndClose(s.id)} 
                                className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${!editInTime ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-60 shadow-none' : 'bg-indigo-600 text-white shadow-xl active:scale-95'}`}
                              >
                                 {editingRecordId ? 'Update & Close' : 'Confirm & Done'}
                              </button>
                              <button onClick={() => { setExpandedId(null); setEditingRecordId(null); }} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Cancel / Close</button>
                              {isSuperAdmin && onDeleteSewadar && (
                                <button 
                                  onClick={() => {
                                    onDeleteSewadar(s.id);
                                    setExpandedId(null);
                                  }} 
                                  className="w-full py-4 text-red-400 font-black text-[10px] uppercase tracking-widest border-t border-red-50 mt-4"
                                >
                                  Delete Member Permanently
                                </button>
                              )}
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {isGentsSaturday && (
              <div className="mt-8 border-t border-slate-100 pt-8 pb-4">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                    Removed Saturday Members
                  </h3>
                  <span className="text-[9px] bg-red-50 text-red-500 font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    Total Removed: {SATURDAY_REMOVED_NAMES.filter(name => !activeRestoredNorms.has(normalizeName(name))).length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SATURDAY_REMOVED_NAMES.filter(name => 
                    !activeRestoredNorms.has(normalizeName(name)) &&
                    name.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((name, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50/50 px-5 py-4 rounded-2xl border border-slate-100/80 transition-all hover:bg-slate-50/80">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold text-slate-300 w-5 text-center">{i + 1}</span>
                        <span className="font-semibold text-sm text-slate-400 line-through decoration-slate-300">{name}</span>
                      </div>
                      <span className="text-[8px] bg-red-50 text-red-500 font-black px-2.5 py-1 rounded-full uppercase tracking-wider">Removed</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isGentsTuesday && (
              <div className="mt-8 border-t border-slate-100 pt-8 pb-4">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                    Removed Tuesday Members
                  </h3>
                  <span className="text-[9px] bg-red-50 text-red-500 font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    Total Removed: {TUESDAY_REMOVED_NAMES.filter(name => !activeRestoredNorms.has(normalizeName(name))).length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {TUESDAY_REMOVED_NAMES.filter(name => 
                    !activeRestoredNorms.has(normalizeName(name)) &&
                    name.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((name, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50/50 px-5 py-4 rounded-2xl border border-slate-100/80 transition-all hover:bg-slate-50/80">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold text-slate-300 w-5 text-center">{i + 1}</span>
                        <span className="font-semibold text-sm text-slate-400 line-through decoration-slate-300">{name}</span>
                      </div>
                      <span className="text-[8px] bg-red-50 text-red-500 font-black px-2.5 py-1 rounded-full uppercase tracking-wider">Removed</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      ) : (
        /* VEHICLE REPORTING VIEW */
        <div className="space-y-6 animate-fade-in pb-12">
          {/* Flagged / Stationary Intelligence Section */}
          {flaggedVehicles.length > 0 && (
            <div className="space-y-3">
              <h3 className="px-4 text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                Stationary Vehicle Alerts (3+ Days)
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {flaggedVehicles.map(v => (
                  <div key={v.plateNumber} className="bg-amber-50 p-5 rounded-[2rem] border-2 border-amber-200 shadow-sm flex items-center justify-between group transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-slate-900 text-sm">{v.plateNumber}</p>
                        <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase">Suspicious</span>
                      </div>
                      <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Seen across {v.daysSpotted} sessions • {v.model || 'Unknown Model'}</p>
                    </div>
                    <div className="text-right">
                       <span className="bg-amber-500 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase shadow-sm">Stationary</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xl shadow-lg">🚔</div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                    {editingVehicleId ? 'Update Vehicle Report' : 'Flag Vehicle Report'}
                  </h3>
                </div>
                {editingVehicleId && (
                  <button 
                    onClick={() => {
                      setEditingVehicleId(null);
                      setVPlate('');
                      setVModel('');
                      setVRemarks('');
                    }}
                    className="text-[10px] font-black text-red-500 uppercase tracking-widest"
                  >
                    Cancel Edit
                  </button>
                )}
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

          {/* Session Vehicle Logs */}
          <div className="space-y-3">
            <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Logged entries for this session
            </h3>
            {vehicles.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {vehicles.slice().reverse().map((v, i) => (
                  <div key={v.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-100 transition-all">
                     <div className="flex-1 space-y-1">
                       <p className="font-black text-slate-900 text-sm">{vehicles.length - i}. {v.plateNumber} ({v.type === '4-wheeler' ? '4-W' : '2-W'})</p>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v.model || 'Unknown Model'}</p>
                       {v.remarks && <p className="text-xs text-slate-500 mt-2 italic">"{v.remarks}"</p>}
                     </div>
                     <div className="flex items-center gap-4">
                       <div className="text-right">
                         <p className="text-[10px] font-black text-slate-300 uppercase">{new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                       </div>
                       <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEditVehicle(v)}
                              className="p-2 text-indigo-400 hover:text-indigo-600 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button 
                              onClick={() => handleDeleteVehicle(v.id)}
                              className="p-2 text-red-300 hover:text-red-500 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" /></svg>
                            </button>
                         </div>
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
