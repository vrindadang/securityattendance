
import React, { useState, useMemo } from 'react';
import { Sewadar, Gender, AttendanceRecord, GentsGroup, Volunteer } from '../types';
import { GENTS_GROUPS } from '../constants';

interface Props {
  sewadars: Sewadar[];
  attendance: AttendanceRecord[];
  onSaveAttendance: (id: string, details: Partial<AttendanceRecord>, isDelete?: boolean) => void;
  onAddSewadar: (name: string, gender: Gender, group: GentsGroup | 'Ladies') => void;
  activeVolunteer: Volunteer;
  workshopLocation: string | null;
  onChangeLocation?: () => void;
}

type PortalStep = 'GENDER' | 'GROUP' | 'LIST';

const AttendanceManager: React.FC<Props> = ({ sewadars, attendance, onSaveAttendance, onAddSewadar, activeVolunteer, workshopLocation, onChangeLocation }) => {
  const [step, setStep] = useState<PortalStep>(() => 
    activeVolunteer.assignedGroup ? 'LIST' : 'GENDER'
  );
  
  const [selectedGender, setSelectedGender] = useState<Gender | null>(() => {
    if (activeVolunteer.assignedGroup === 'Ladies') return 'Ladies';
    if (activeVolunteer.assignedGroup) return 'Gents';
    return null;
  });
  
  const [selectedGroup, setSelectedGroup] = useState<GentsGroup | 'Ladies' | null>(() => 
    activeVolunteer.assignedGroup || null
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Gender>(activeVolunteer.assignedGroup === 'Ladies' ? 'Ladies' : 'Gents');
  const [newGroup, setNewGroup] = useState<GentsGroup | 'Ladies'>(activeVolunteer.assignedGroup || 'Monday');

  // Inline marking state
  const [expandedSewadarId, setExpandedSewadarId] = useState<string | null>(null);
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [sewaPoint, setSewaPoint] = useState<string>('');
  const [individualLocation, setIndividualLocation] = useState<string>('');
  const [isInTimeLocked, setIsInTimeLocked] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const formattedToday = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const filteredSewadars = useMemo(() => {
    if (step !== 'LIST') return [];
    return sewadars
      .filter(s => {
        const matchesGender = s.gender === selectedGender;
        const matchesGroup = s.group === selectedGroup || searchTerm;
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesGender && (searchTerm ? true : matchesGroup) && matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sewadars, selectedGender, selectedGroup, searchTerm, step]);

  const getAttendanceRecord = (id: string) => attendance.find(a => a.sewadarId === id && a.date === today);

  const resetPortal = () => {
    if (activeVolunteer.assignedGroup) return;
    setStep('GENDER');
    setSelectedGender(null);
    setSelectedGroup(null);
    setSearchTerm('');
    setExpandedSewadarId(null);
  };

  const handleGenderSelect = (g: Gender) => {
    setSelectedGender(g);
    if (g === 'Ladies') {
      setSelectedGroup('Ladies');
      setStep('LIST');
    } else setStep('GROUP');
  };

  const toggleMarking = (s: Sewadar) => {
    if (expandedSewadarId === s.id) {
      setExpandedSewadarId(null);
      return;
    }

    const record = getAttendanceRecord(s.id);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    
    setExpandedSewadarId(s.id);
    if (record) {
      setIsInTimeLocked(true);
      setInTime(record.inTime || now);
      setOutTime(record.outTime || now);
      setSewaPoint(record.sewaPoint || '');
      setIndividualLocation(record.workshopLocation || workshopLocation || '');
    } else {
      setIsInTimeLocked(false);
      setInTime(now);
      setOutTime('');
      setSewaPoint('');
      setIndividualLocation(workshopLocation || '');
    }
  };

  const handleSaveAttendance = (id: string) => {
    onSaveAttendance(id, { 
      inTime, 
      outTime, 
      sewaPoint, 
      workshopLocation: individualLocation 
    });
    setExpandedSewadarId(null);
  };

  const handleDeleteAttendance = (id: string, name: string) => {
    if (window.confirm(`Remove attendance for ${name}?`)) {
      onSaveAttendance(id, {}, true);
      setExpandedSewadarId(null);
    }
  };

  if (step === 'GENDER') return (
    <div className="space-y-8 animate-fade-in py-10 max-w-2xl mx-auto">
      <div className="text-center space-y-2 mb-12">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Portal Selection</h2>
        <p className="text-slate-500 font-medium">SKRM Security Workforce Management</p>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <button onClick={() => handleGenderSelect('Gents')} className="group bg-white p-10 rounded-[2.5rem] border-2 border-slate-100 hover:border-indigo-500 hover:shadow-2xl transition-all flex items-center gap-8 active:scale-[0.99]">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-4xl group-hover:bg-indigo-600 transition-colors shadow-inner">👮‍♂️</div>
          <div className="text-left"><span className="text-3xl font-black text-slate-800 group-hover:text-indigo-600 block">Gents</span><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Duty Assignments</span></div>
        </button>
        <button onClick={() => handleGenderSelect('Ladies')} className="group bg-white p-10 rounded-[2.5rem] border-2 border-slate-100 hover:border-pink-500 hover:shadow-2xl transition-all flex items-center gap-8 active:scale-[0.99]">
          <div className="w-20 h-20 bg-pink-50 rounded-3xl flex items-center justify-center text-4xl group-hover:bg-pink-600 transition-colors shadow-inner">👩</div>
          <div className="text-left"><span className="text-3xl font-black text-slate-800 group-hover:text-pink-600 block">Ladies</span><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Duty Assignments</span></div>
        </button>
      </div>
    </div>
  );

  if (step === 'GROUP') return (
    <div className="space-y-6 animate-fade-in py-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={resetPortal} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all active:scale-95">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div><h2 className="text-2xl font-black text-slate-900 leading-none">Select Group</h2><p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Gents Assignment List</p></div>
      </div>
      <div className="space-y-3">
        {GENTS_GROUPS.map((day) => (
          <button key={day} onClick={() => { setSelectedGroup(day); setStep('LIST'); }} className="w-full bg-white p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:shadow-xl transition-all flex items-center justify-between group">
            <div className="flex items-center gap-5"><div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-xl">📅</div><div><span className="text-xl font-black text-slate-800 group-hover:text-indigo-600 block">{day} Group</span></div></div>
            <div className="text-slate-300 group-hover:text-indigo-400"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg></div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-2xl mx-auto">
      <div className="flex flex-col gap-4 sticky top-20 z-10 bg-slate-50 pb-4">
        <div className="flex items-start justify-between">
           <div className="flex items-center gap-3">
            {!activeVolunteer.assignedGroup && (
              <button onClick={() => setStep(selectedGender === 'Ladies' ? 'GENDER' : 'GROUP')} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-black text-slate-900 leading-tight">
                {selectedGender === 'Ladies' ? 'Ladies' : `${selectedGroup} Group`}
              </h2>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                Mark Daily Presence - {formattedToday}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {workshopLocation && (
              <button onClick={onChangeLocation} className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-1.5 hover:bg-amber-100 transition-colors group">
                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">{workshopLocation}</span>
                <svg className="w-3 h-3 text-amber-400 group-hover:text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
            )}
            <button onClick={() => setShowAddForm(true)} className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg hover:bg-emerald-600 active:scale-90 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
        </div>
        <input type="text" placeholder={`Search in ${selectedGroup}...`} className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none shadow-sm font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="flex flex-col gap-3">
        {filteredSewadars.map((s, idx) => {
          const record = getAttendanceRecord(s.id);
          const isMarked = !!record;
          const isDone = isMarked && !!record.outTime;
          const isExpanded = expandedSewadarId === s.id;
          
          return (
            <div key={s.id} className="flex flex-col gap-1">
              <button onClick={() => toggleMarking(s)} className={`w-full bg-white px-6 py-4 rounded-3xl shadow-sm border-2 flex items-center justify-between transition-all text-left ${isMarked ? (isDone ? 'border-indigo-200 bg-indigo-50/10' : 'border-emerald-200 bg-emerald-50/10') : 'border-slate-100'} ${isExpanded ? 'ring-4 ring-indigo-50' : ''}`}>
                <div className="flex items-center gap-5">
                  <div className="text-[10px] font-black text-slate-300 w-6 text-center">{idx + 1}</div>
                  <div className="flex flex-col">
                    <span className={`font-black text-base ${isMarked ? 'text-slate-900' : 'text-slate-600'}`}>{s.name}</span>
                    {isMarked && (
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${isDone ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {isDone ? 'Duty Completed' : 'Present'}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">
                          In: {record.inTime} {record.outTime && `• Out: ${record.outTime}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className={`w-14 h-14 rounded-[1.25rem] border-2 flex items-center justify-center transition-all ${isMarked ? (isDone ? 'bg-indigo-500 border-indigo-400' : 'bg-emerald-500 border-emerald-400') : 'bg-slate-50 border-slate-100'}`}>
                  {isMarked ? <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg> : <div className="w-5 h-5 rounded-full border-2 border-slate-200"></div>}
                </div>
              </button>

              {/* Inline Marking Form */}
              {isExpanded && (
                <div className="bg-white border-2 border-indigo-100 rounded-[2rem] p-6 shadow-xl animate-in slide-in-from-top-2 duration-300 mx-2">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                          In Time {isInTimeLocked && <svg className="w-2.5 h-2.5 text-slate-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>}
                        </label>
                        <input 
                          type="time" 
                          disabled={isInTimeLocked}
                          className={`w-full px-4 py-3 border-2 rounded-xl font-black text-sm text-center transition-all ${isInTimeLocked ? 'bg-slate-50 border-slate-50 text-slate-400' : 'bg-slate-50 border-slate-100'}`} 
                          value={inTime} 
                          onChange={(e) => setInTime(e.target.value)} 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Out Time</label>
                        <input type="time" className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-sm text-center" value={outTime} onChange={(e) => setOutTime(e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Duty Location</label>
                        <select 
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-xs outline-none focus:border-indigo-400"
                          value={individualLocation}
                          onChange={(e) => setIndividualLocation(e.target.value)}
                        >
                          <option value="">Select Location</option>
                          <option value="Kirpal Bagh">Kirpal Bagh</option>
                          <option value="Kirpal Ashram">Kirpal Ashram</option>
                          <option value="Sawan Ashram">Sawan Ashram</option>
                          <option value="Burari">Burari</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sewa Point (Spot)</label>
                        <input type="text" className="w-full px-4 py-3 bg-amber-50/20 border-2 border-amber-50 rounded-xl font-black text-sm outline-none focus:border-amber-300 transition-all placeholder:text-amber-200" placeholder="e.g. Main Gate" value={sewaPoint} onChange={(e) => setSewaPoint(e.target.value)} />
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-2">
                      <button onClick={() => handleSaveAttendance(s.id)} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-700 active:scale-[0.98] transition-all">Save Changes</button>
                      <div className="flex gap-2">
                        <button onClick={() => setExpandedSewadarId(null)} className="flex-1 sm:flex-none px-6 py-3.5 bg-slate-100 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest">Close</button>
                        {isMarked && (
                          <button onClick={() => handleDeleteAttendance(s.id, s.name)} className="px-6 py-3.5 bg-red-50 text-red-500 border border-red-100 rounded-xl font-black text-[10px] uppercase tracking-widest">Delete</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setShowAddForm(false)}></div>
          <form onSubmit={(e) => { e.preventDefault(); if (newName.trim()) { onAddSewadar(newName, newGender, newGender === 'Ladies' ? 'Ladies' : newGroup); setNewName(''); setShowAddForm(false); } }} className="relative bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in slide-in-from-bottom-20">
            <h3 className="text-2xl font-black text-slate-900 mb-6">Register New Sewadar</h3>
            <div className="space-y-5">
              <input autoFocus required type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" placeholder="Full Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                {(['Gents', 'Ladies'] as Gender[]).map((g) => (
                  <button key={g} type="button" onClick={() => { setNewGender(g); if (g === 'Ladies') setNewGroup('Ladies'); }} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${newGender === g ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-400 border-slate-100'}`}>{g}</button>
                ))}
              </div>
              {newGender === 'Gents' && (
                <select className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={newGroup} onChange={(e) => setNewGroup(e.target.value as GentsGroup)}>
                  {GENTS_GROUPS.map(day => <option key={day} value={day}>{day} Group</option>)}
                </select>
              )}
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setShowAddForm(false)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase">Cancel</button><button type="submit" className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase shadow-xl">Mark & Save</button></div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AttendanceManager;
