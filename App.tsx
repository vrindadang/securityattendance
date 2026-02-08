
import React, { useState, useEffect, useCallback } from 'react';
import { ViewState, AttendanceRecord, Sewadar, Volunteer, Gender, GentsGroup, Issue, VehicleRecord } from './types';
import { INITIAL_SEWADARS, LOCATIONS_LIST } from './constants';
import AttendanceManager from './components/AttendanceManager';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { supabase } from './supabase';

const STORAGE_KEY_VOLUNTEER = 'skrm_active_volunteer';
const STORAGE_KEY_VIEW_SESSION_ID = 'skrm_view_session_id';

export interface DutySession {
  id: string;
  location: string;
  start_time: string;
  end_time: string;
  group: string;
  date: string;
  completed?: boolean;
}

const App: React.FC = () => {
  const [activeVolunteer, setActiveVolunteer] = useState<Volunteer | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_VOLUNTEER);
    return saved ? JSON.parse(saved) : null;
  });

  const [activeView, setActiveView] = useState<ViewState>('Attendance');
  const [loading, setLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // SESSIONS
  const [allSessions, setAllSessions] = useState<DutySession[]>([]);
  const [activeSession, setActiveSession] = useState<DutySession | null>(null);
  const [viewSession, setViewSession] = useState<DutySession | null>(null);

  // DATA BUCKETS - Active Marking (STRICTLY for live session)
  const [activeAttendance, setActiveAttendance] = useState<AttendanceRecord[]>([]);
  const [activeIssues, setActiveIssues] = useState<Issue[]>([]);
  const [activeVehicles, setActiveVehicles] = useState<VehicleRecord[]>([]);

  // DATA BUCKETS - View/Reports (Independent of marking tab)
  const [viewAttendance, setViewAttendance] = useState<AttendanceRecord[]>([]);
  const [viewIssues, setViewIssues] = useState<Issue[]>([]);
  const [viewVehicles, setViewVehicles] = useState<VehicleRecord[]>([]);

  const [customSewadars, setCustomSewadars] = useState<Sewadar[]>([]);

  const getLocalDate = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const [configForm, setConfigForm] = useState({
    locations: [] as string[],
    startDate: getLocalDate(),
    startTime: '07:00',
    endDate: getTomorrowDate(),
    endTime: '07:00'
  });

  const fetchSessions = useCallback(async (isInitial = false) => {
    if (!activeVolunteer) return;
    
    try {
      let query = supabase
        .from('daily_settings')
        .select('id, location, "group", start_time, end_time, date, completed');
      
      if (activeVolunteer.role !== 'Super Admin' && activeVolunteer.assignedGroup) {
        query = query.eq('"group"', activeVolunteer.assignedGroup);
      }
      
      const { data, error } = await query.order('start_time', { ascending: false });
      if (error) throw error;
      
      if (data) {
        const mappedSessions = data.map(s => ({ ...s, id: String(s.id) }));
        setAllSessions(mappedSessions);
        
        // STRICT: Find the single UNCOMPLETED active session for the marking area
        const active = mappedSessions.find(s => !s.completed) || null;
        setActiveSession(active);

        if (isInitial) {
          // Dashboard default view - initially follows active or most recent
          const savedViewId = localStorage.getItem(STORAGE_KEY_VIEW_SESSION_ID);
          const savedView = mappedSessions.find(s => s.id === savedViewId);
          setViewSession(savedView || active || mappedSessions[0] || null);
        }
      }
    } catch (err) {
      console.error("Fetch Sessions Error:", err);
    }
  }, [activeVolunteer]);

  const fetchSessionData = async (session: DutySession | null, setAtt: any, setIss: any, setVeh: any) => {
    if (!session) {
      setAtt([]); setIss([]); setVeh([]);
      return;
    }
    
    try {
      const { data: attData } = await supabase.from('attendance').select('*').eq('date', session.date).eq('group', session.group);
      if (attData) {
        setAtt(attData.map((a: any) => ({
          ...a, id: String(a.id), sewadarId: a.sewadar_id, volunteerId: a.volunteer_id,
          inTime: a.in_time, outTime: a.out_time, sewaPoint: a.sewa_points,
          workshopLocation: a.workshop_location, isProperUniform: a.is_proper_uniform 
        })));
      }

      const { data: issuesData } = await supabase.from('issues').select('*').eq('date', session.date).eq('group', session.group);
      if (issuesData) {
        setIss(issuesData.map((i: any) => ({
          id: String(i.id), description: i.description, photo: i.photo, timestamp: i.timestamp,
          volunteerId: i.volunteer_id, volunteerName: i.volunteer_name
        })));
      }

      const { data: vData } = await supabase.from('vehicles').select('*').eq('date', session.date).eq('group', session.group);
      if (vData) {
        setVeh(vData.map((v: any) => ({
          id: String(v.id), type: v.type, plateNumber: v.plate_number, model: v.model,
          remarks: v.remarks, timestamp: v.timestamp, volunteerId: v.volunteer_id, volunteerName: v.volunteer_name
        })));
      }
    } catch (err) {
      console.error("Fetch Data Error:", err);
    }
  };

  useEffect(() => {
    if (activeVolunteer) fetchSessions(true);
  }, [activeVolunteer, fetchSessions]);

  // Sync Active Marking Data (Marking Tab)
  useEffect(() => {
    fetchSessionData(activeSession, setActiveAttendance, setActiveIssues, setActiveVehicles);
  }, [activeSession]);

  // Sync View/Archive Data (Dashboard Tab)
  useEffect(() => {
    fetchSessionData(viewSession, setViewAttendance, setViewIssues, setViewVehicles);
  }, [viewSession]);

  useEffect(() => {
    const fetchCustom = async () => {
      const { data: customData } = await supabase.from('custom_sewadars').select('*');
      if (customData) {
        setCustomSewadars(customData.map((s: any) => ({
          id: String(s.id), name: s.name, gender: s.gender as Gender,
          group: s.group as GentsGroup | 'Ladies', isCustom: true
        })));
      }
    };
    fetchCustom();
  }, []);

  const generateNumericId = () => Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

  const saveAttendance = async (sewadarId: string, details: Partial<AttendanceRecord>, recordId?: string, isDelete: boolean = false) => {
    if (!activeSession) return;
    
    if (isDelete && recordId) {
      await supabase.from('attendance').delete().eq('id', recordId);
      setActiveAttendance(prev => prev.filter(a => a.id !== recordId));
      return;
    }

    const sewadar = [...INITIAL_SEWADARS, ...customSewadars].find(s => s.id === sewadarId);
    if (!sewadar) return;

    const finalRecordId = recordId || generateNumericId();
    const payload = {
      id: finalRecordId, sewadar_id: sewadarId, name: sewadar.name, group: activeSession.group,
      gender: sewadar.gender, date: activeSession.date, timestamp: Date.now(), 
      volunteer_id: activeVolunteer?.id || '', in_time: details.inTime || '', out_time: details.outTime || '', 
      sewa_points: details.sewaPoint || '', workshop_location: details.workshopLocation || '', 
      is_proper_uniform: details.isProperUniform ?? true 
    };

    if (recordId) await supabase.from('attendance').update(payload).eq('id', finalRecordId);
    else await supabase.from('attendance').insert(payload);
    
    fetchSessionData(activeSession, setActiveAttendance, setActiveIssues, setActiveVehicles);
  };

  const handleSaveVehicle = async (v: Omit<VehicleRecord, 'id' | 'timestamp' | 'volunteerId' | 'volunteerName'>) => {
    if (!activeSession || !activeVolunteer) return;
    const id = generateNumericId();
    await supabase.from('vehicles').insert({
      id, type: v.type, plate_number: v.plateNumber, model: v.model, remarks: v.remarks,
      timestamp: Date.now(), volunteer_id: activeVolunteer.id, volunteer_name: activeVolunteer.name,
      date: activeSession.date, group: activeSession.group
    });
    fetchSessionData(activeSession, setActiveAttendance, setActiveIssues, setActiveVehicles);
  };

  const handleAddSewadar = async (name: string, gender: Gender, group: GentsGroup | 'Ladies') => {
    const { data } = await supabase.from('custom_sewadars').insert({ name, gender, group }).select();
    if (data) setCustomSewadars(prev => [...prev, { id: String(data[0].id), name, gender, group, isCustom: true }]);
  };

  const handleReportIssue = async (description: string) => {
    if (!activeSession || !activeVolunteer) return;
    const id = generateNumericId();
    await supabase.from('issues').insert({
      id, description, timestamp: Date.now(), volunteer_id: activeVolunteer.id, 
      volunteer_name: activeVolunteer.name, date: activeSession.date, group: activeSession.group
    });
    fetchSessionData(activeSession, setActiveAttendance, setActiveIssues, setActiveVehicles);
  };

  const handleDeleteIssue = async (id: string) => {
    await supabase.from('issues').delete().eq('id', id);
    fetchSessionData(activeSession, setActiveAttendance, setActiveIssues, setActiveVehicles);
    fetchSessionData(viewSession, setViewAttendance, setViewIssues, setViewVehicles);
  };

  const handleCompleteSession = async (sessionId: string) => {
    await supabase.from('daily_settings').update({ completed: true }).eq('id', sessionId);
    fetchSessions();
  };

  const handleResetAllData = async () => {
    if (!window.confirm("ARE YOU SURE? THIS WILL DELETE ALL DATA FOREVER.")) return;
    await supabase.from('attendance').delete().neq('id', '0');
    await supabase.from('issues').delete().neq('id', '0');
    await supabase.from('vehicles').delete().neq('id', '0');
    await supabase.from('daily_settings').delete().neq('id', '0');
    fetchSessions();
  };

  const handleSaveSettings = async () => {
    if (!activeVolunteer || !activeVolunteer.assignedGroup) return;
    setIsSavingSettings(true);
    const id = generateNumericId();
    const payload = {
      id, location: configForm.locations.join(', '), group: activeVolunteer.assignedGroup,
      start_time: `${configForm.startDate}T${configForm.startTime}:00`,
      end_time: `${configForm.endDate}T${configForm.endTime}:00`,
      date: configForm.startDate, completed: false
    };
    const { error } = await supabase.from('daily_settings').insert(payload);
    if (!error) {
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); setShowSettingsModal(false); fetchSessions(); }, 1000);
    }
    setIsSavingSettings(false);
  };

  if (!activeVolunteer) return <Login onLogin={v => { setActiveVolunteer(v); localStorage.setItem(STORAGE_KEY_VOLUNTEER, JSON.stringify(v)); }} />;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-900 rounded-xl flex items-center justify-center text-white font-black shadow-lg">SK</div>
          <div>
            <h1 className="text-sm font-black text-slate-800 leading-none">Security Portal</h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {activeVolunteer.role} • {activeVolunteer.assignedGroup || 'Global'}
            </p>
          </div>
        </div>
        <button onClick={() => { setActiveVolunteer(null); localStorage.removeItem(STORAGE_KEY_VOLUNTEER); }} className="p-2 text-slate-400">
           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {activeView === 'Attendance' ? (
          <AttendanceManager 
            sewadars={[...INITIAL_SEWADARS, ...customSewadars]}
            attendance={activeAttendance}
            vehicles={activeVehicles}
            onSaveAttendance={saveAttendance}
            onSaveVehicle={handleSaveVehicle}
            onAddSewadar={handleAddSewadar}
            activeVolunteer={activeVolunteer}
            workshopLocation={activeSession?.location || null}
            sessionDate={activeSession?.date || getLocalDate()}
            dutyStartTime={activeSession?.start_time || ''}
            dutyEndTime={activeSession?.end_time || ''}
            isCompleted={false} 
            onChangeLocation={() => setShowSettingsModal(true)}
          />
        ) : (
          <Dashboard 
            attendance={viewAttendance} issues={viewIssues} vehicles={viewVehicles}
            activeVolunteer={activeVolunteer} allSessions={allSessions}
            selectedSessionId={viewSession?.id || null}
            isSessionCompleted={viewSession?.completed || false}
            onSessionChange={id => {
              const s = allSessions.find(x => x.id === id);
              if (s) { setViewSession(s); localStorage.setItem(STORAGE_KEY_VIEW_SESSION_ID, id); }
            }}
            onReportIssue={handleReportIssue}
            onSaveVehicle={handleSaveVehicle}
            onDeleteIssue={handleDeleteIssue}
            dutyStartTime={viewSession?.start_time || ''}
            dutyEndTime={viewSession?.end_time || ''}
            onOpenSettings={() => setShowSettingsModal(true)}
            onCompleteSession={handleCompleteSession}
            onResetAllData={handleResetAllData}
            isLoading={loading}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 px-6 py-3 flex justify-around items-center z-40 shadow-lg">
        <button onClick={() => setActiveView('Attendance')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'Attendance' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
          <svg className="w-6 h-6" fill={activeView === 'Attendance' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Marking</span>
        </button>
        <button onClick={() => setActiveView('Dashboard')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'Dashboard' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
          <svg className="w-6 h-6" fill={activeView === 'Dashboard' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Reports</span>
        </button>
      </nav>

      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto">
             <div><h2 className="text-2xl font-black text-slate-900 leading-tight">Duty Configuration</h2><p className="text-slate-400 text-xs font-bold uppercase mt-2 tracking-widest">Setup your current session</p></div>
             <div className="space-y-6">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duty Locations</label><div className="grid grid-cols-2 gap-2">{LOCATIONS_LIST.map(loc => (<button key={loc} onClick={() => setConfigForm(p => ({...p, locations: p.locations.includes(loc) ? p.locations.filter(l => l !== loc) : [...p.locations, loc]}))} className={`px-4 py-3 rounded-xl text-[10px] font-black text-left transition-all border-2 ${configForm.locations.includes(loc) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{loc}</button>))}</div></div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label><input type="date" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-xs" value={configForm.startDate} onChange={e => setConfigForm({...configForm, startDate: e.target.value})} /></div><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</label><input type="time" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-xs" value={configForm.startTime} onChange={e => setConfigForm({...configForm, startTime: e.target.value})} /></div></div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label><input type="date" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-xs" value={configForm.endDate} onChange={e => setConfigForm({...configForm, endDate: e.target.value})} /></div><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Time</label><input type="time" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-xs" value={configForm.endTime} onChange={e => setConfigForm({...configForm, endTime: e.target.value})} /></div></div>
             </div>
             <div className="flex flex-col gap-3 pt-4"><button onClick={handleSaveSettings} disabled={isSavingSettings || configForm.locations.length === 0} className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl ${saveSuccess ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white disabled:opacity-50'}`}>{isSavingSettings ? 'Configuring...' : saveSuccess ? 'Success!' : 'Start Active Session'}</button><button onClick={() => setShowSettingsModal(false)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
