
import React, { useState, useEffect, useCallback } from 'react';
import { ViewState, AttendanceRecord, Sewadar, Volunteer, Gender, GentsGroup, Issue, VehicleRecord } from './types';
import { INITIAL_SEWADARS, LOCATIONS_LIST } from './constants';
import AttendanceManager from './components/AttendanceManager';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { supabase } from './supabase';

const STORAGE_KEY_VOLUNTEER = 'skrm_active_volunteer';
const STORAGE_KEY_SESSION_ID = 'skrm_selected_session_id';

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
  
  // States for Dashboard View (Reports)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [dashboardSelectedSession, setDashboardSelectedSession] = useState<DutySession | null>(null);

  // States for Active Attendance View (Mark Sewa)
  const [activeSession, setActiveSession] = useState<DutySession | null>(null);
  const [activeAttendance, setActiveAttendance] = useState<AttendanceRecord[]>([]);
  const [activeIssues, setActiveIssues] = useState<Issue[]>([]);
  const [activeVehicles, setActiveVehicles] = useState<VehicleRecord[]>([]);

  const [customSewadars, setCustomSewadars] = useState<Sewadar[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [allSessions, setAllSessions] = useState<DutySession[]>([]);

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

  useEffect(() => {
    if (showSettingsModal && activeVolunteer) {
      if (activeVolunteer.assignedGroup === 'Ladies') {
        setConfigForm(prev => ({
          ...prev,
          locations: [...LOCATIONS_LIST],
          startDate: getLocalDate(),
          startTime: '07:00',
          endDate: getTomorrowDate(),
          endTime: '07:00'
        }));
      } else {
        setConfigForm(prev => ({
          ...prev,
          locations: [],
          startDate: getLocalDate(),
          startTime: '07:00',
          endDate: getTomorrowDate(),
          endTime: '07:00'
        }));
      }
    }
  }, [showSettingsModal, activeVolunteer]);

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
      
      if (data && data.length > 0) {
        const mappedSessions = data.map(s => ({ ...s, id: String(s.id) }));
        setAllSessions(mappedSessions);
        
        const activeOrFuture = mappedSessions.find(s => !s.completed);
        setActiveSession(activeOrFuture || null);

        if (isInitial) {
          const savedSessionId = localStorage.getItem(STORAGE_KEY_SESSION_ID);
          const savedSession = mappedSessions.find(s => s.id === savedSessionId);
          
          if (savedSession) {
            setDashboardSelectedSession(savedSession);
          } else if (activeOrFuture) {
            setDashboardSelectedSession(activeOrFuture);
            localStorage.setItem(STORAGE_KEY_SESSION_ID, activeOrFuture.id);
          } else {
            setDashboardSelectedSession(null);
            if (activeVolunteer.role !== 'Super Admin') setShowSettingsModal(true);
          }
        }
      } else {
        setAllSessions([]);
        setActiveSession(null);
        setDashboardSelectedSession(null);
        if (isInitial && activeVolunteer.role !== 'Super Admin') setShowSettingsModal(true);
      }
    } catch (err) {
      console.error("Fetch Sessions Error:", err);
    }
  }, [activeVolunteer]);

  const fetchData = useCallback(async (session: DutySession | null, target: 'active' | 'dashboard') => {
    if (!activeVolunteer || !session) {
      if (target === 'active') {
        setActiveAttendance([]);
        setActiveIssues([]);
        setActiveVehicles([]);
      } else {
        setAttendance([]);
        setIssues([]);
        setVehicles([]);
      }
      return;
    }
    
    if (target === 'dashboard') setLoading(true);
    
    try {
      const { data: attData } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', session.date)
        .eq('group', session.group);

      const mappedAtt = attData ? attData.map((a: any) => ({
        ...a,
        id: String(a.id),
        sewadarId: a.sewadar_id,
        volunteerId: a.volunteer_id,
        inTime: a.in_time,
        outTime: a.out_time,
        sewaPoint: a.sewa_points,
        workshopLocation: a.workshop_location,
        isProperUniform: a.is_proper_uniform 
      })) : [];

      const { data: issuesData } = await supabase
        .from('issues')
        .select('*')
        .eq('date', session.date)
        .eq('group', session.group);

      const mappedIssues = issuesData ? issuesData.map((i: any) => ({
        id: String(i.id),
        description: i.description,
        photo: i.photo,
        timestamp: i.timestamp,
        volunteerId: i.volunteer_id,
        volunteerName: i.volunteer_name
      })) : [];

      const { data: vData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('date', session.date)
        .eq('group', session.group);

      const mappedVehicles = vData ? vData.map((v: any) => ({
        id: String(v.id),
        type: v.type,
        plateNumber: v.plate_number,
        model: v.model,
        remarks: v.remarks,
        timestamp: v.timestamp,
        volunteerId: v.volunteer_id,
        volunteerName: v.volunteer_name
      })) : [];

      if (target === 'active') {
        setActiveAttendance(mappedAtt);
        setActiveIssues(mappedIssues);
        setActiveVehicles(mappedVehicles);
      } else {
        setAttendance(mappedAtt);
        setIssues(mappedIssues);
        setVehicles(mappedVehicles);
      }

      // Custom sewadars are global
      const { data: customData } = await supabase.from('custom_sewadars').select('*');
      if (customData) {
        setCustomSewadars(customData.map((s: any) => ({
          id: String(s.id),
          name: s.name,
          gender: s.gender as Gender,
          group: s.group as GentsGroup | 'Ladies',
          isCustom: true
        })));
      }

    } catch (err) {
      console.error("Fetch Data Error:", err);
    } finally {
      if (target === 'dashboard') setLoading(false);
    }
  }, [activeVolunteer]);

  useEffect(() => {
    if (activeVolunteer) {
      fetchSessions(true);
    }
  }, [activeVolunteer, fetchSessions]);

  useEffect(() => {
    fetchData(activeSession, 'active');
  }, [activeSession?.id, fetchData]);

  useEffect(() => {
    fetchData(dashboardSelectedSession, 'dashboard');
  }, [dashboardSelectedSession?.id, fetchData]);

  const generateNumericId = () => {
    return Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  };

  const saveAttendance = async (sewadarId: string, details: Partial<AttendanceRecord>, recordId?: string, isDelete: boolean = false) => {
    if (!activeSession || activeSession.completed) return;
    const sessionDate = activeSession.date;
    const sessionGroup = activeSession.group;

    if (isDelete && recordId) {
      try {
        const { error } = await supabase.from('attendance').delete().eq('id', recordId);
        if (error) throw error;
        setActiveAttendance(prev => prev.filter(a => a.id !== recordId));
        if (dashboardSelectedSession?.id === activeSession.id) {
           setAttendance(prev => prev.filter(a => a.id !== recordId));
        }
      } catch (error) {
        console.error('Failed to delete attendance:', error);
      }
      return;
    }

    const sewadar = [...INITIAL_SEWADARS, ...customSewadars].find(s => s.id === sewadarId);
    if (!sewadar) return;

    const isExisting = !!recordId;
    const finalRecordId = recordId || generateNumericId();

    const dbPayload = {
      id: finalRecordId,
      sewadar_id: sewadarId, 
      name: sewadar.name, 
      group: sessionGroup, 
      gender: sewadar.gender,
      date: sessionDate, 
      timestamp: Date.now(), 
      volunteer_id: activeVolunteer?.id || '',
      in_time: details.inTime || '', 
      out_time: details.outTime || '', 
      sewa_points: details.sewaPoint || '',
      workshop_location: details.workshopLocation || '', 
      is_proper_uniform: details.isProperUniform ?? true 
    };

    const newRecord: AttendanceRecord = {
      id: finalRecordId,
      sewadarId: sewadarId, 
      name: sewadar.name, 
      group: sessionGroup as GentsGroup | 'Ladies',
      gender: sewadar.gender as Gender, 
      date: sessionDate, 
      timestamp: dbPayload.timestamp,
      volunteerId: activeVolunteer?.id || '', 
      inTime: details.inTime || '', 
      outTime: details.outTime || '',
      sewaPoint: details.sewaPoint || '', 
      workshopLocation: details.workshopLocation || '', 
      isProperUniform: details.isProperUniform ?? true
    };

    try {
      let result;
      if (isExisting) {
        result = await supabase.from('attendance').update(dbPayload).eq('id', finalRecordId);
      } else {
        result = await supabase.from('attendance').insert(dbPayload);
      }

      if (result.error) throw result.error;
      
      setActiveAttendance(prev => {
        const filtered = prev.filter(a => a.id !== finalRecordId);
        return [...filtered, newRecord];
      });
      if (dashboardSelectedSession?.id === activeSession.id) {
        setAttendance(prev => {
          const filtered = prev.filter(a => a.id !== finalRecordId);
          return [...filtered, newRecord];
        });
      }
    } catch (error) {
      console.error('Failed to save attendance:', error);
    }
  };

  const handleReportIssue = async (description: string, photo?: string) => {
    if (!activeVolunteer || !activeSession || activeSession.completed) return;
    const newIssue: Issue = {
      id: generateNumericId(), 
      description, 
      photo,
      timestamp: Date.now(),
      volunteerId: activeVolunteer.id, 
      volunteerName: activeVolunteer.name
    };
    setActiveIssues(prev => [...prev, newIssue]);
    if (dashboardSelectedSession?.id === activeSession.id) {
      setIssues(prev => [...prev, newIssue]);
    }
    await supabase.from('issues').insert({
      id: newIssue.id, date: activeSession.date, group: activeSession.group,
      description: newIssue.description, photo: newIssue.photo, timestamp: newIssue.timestamp,
      volunteer_id: newIssue.volunteerId, volunteer_name: newIssue.volunteerName
    });
  };

  const handleSaveVehicle = async (v: Omit<VehicleRecord, 'id' | 'timestamp' | 'volunteerId' | 'volunteerName'>) => {
    if (!activeVolunteer || !activeSession || activeSession.completed) return;
    
    const cleanPlate = v.plateNumber.toUpperCase().trim();
    const newV: VehicleRecord = {
      ...v,
      plateNumber: cleanPlate,
      id: generateNumericId(),
      timestamp: Date.now(),
      volunteerId: activeVolunteer.id,
      volunteerName: activeVolunteer.name
    };

    try {
      setActiveVehicles(prev => [...prev, newV]);
      if (dashboardSelectedSession?.id === activeSession.id) {
        setVehicles(prev => [...prev, newV]);
      }

      const { error } = await supabase.from('vehicles').insert({
        id: newV.id, 
        date: activeSession.date, 
        group: activeSession.group,
        type: newV.type, 
        plate_number: cleanPlate, 
        model: newV.model,
        remarks: newV.remarks, 
        timestamp: newV.timestamp,
        volunteer_id: newV.volunteerId, 
        volunteer_name: newV.volunteerName
      });

      if (error) throw error;
    } catch (err: any) {
      console.error("Failed to save vehicle log:", err);
      setActiveVehicles(prev => prev.filter(item => item.id !== newV.id));
      if (dashboardSelectedSession?.id === activeSession.id) {
        setVehicles(prev => prev.filter(item => item.id !== newV.id));
      }
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (configForm.locations.length === 0) {
      alert("Please select at least one location.");
      return;
    }
    setIsSavingSettings(true);
    try {
      const payload = {
        date: configForm.startDate, group: activeVolunteer?.assignedGroup || 'Global',
        location: configForm.locations.join(', '),
        start_time: new Date(`${configForm.startDate}T${configForm.startTime}`).toISOString(),
        end_time: new Date(`${configForm.endDate}T${configForm.endTime}`).toISOString(),
        completed: false
      };
      const { data } = await supabase.from('daily_settings').insert(payload).select('*');
      if (data && data.length > 0) {
        const mappedSession = { ...data[0], id: String(data[0].id) };
        setAllSessions(prev => [mappedSession, ...prev]);
        setActiveSession(mappedSession);
        setDashboardSelectedSession(mappedSession);
        localStorage.setItem(STORAGE_KEY_SESSION_ID, mappedSession.id);
        setSaveSuccess(true);
        setTimeout(() => { setShowSettingsModal(false); setSaveSuccess(false); setActiveView('Attendance'); }, 600);
      }
    } catch (err) { alert("Config error"); } finally { setIsSavingSettings(false); }
  };

  const handleCompleteSession = async (sessionId: string) => {
    try {
      await supabase.from('daily_settings').update({ completed: true }).eq('id', sessionId);
      setAllSessions(prev => prev.map(s => s.id === sessionId ? { ...s, completed: true } : s));
      if (activeSession?.id === sessionId) setActiveSession(null);
      if (dashboardSelectedSession?.id === sessionId) {
         setDashboardSelectedSession(prev => prev ? { ...prev, completed: true } : null);
      }
      setActiveView('Attendance');
    } catch (err) { alert("Error finalizing duty."); }
  };

  const handleSessionChange = (id: string) => {
    const session = allSessions.find(s => s.id === id) || null;
    setDashboardSelectedSession(session);
    if (session) {
      localStorage.setItem(STORAGE_KEY_SESSION_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION_ID);
    }
  };

  const handleResetAllData = useCallback(async () => {
    if (!window.confirm("☢️ NUCLEAR RESET WARNING: This will permanently delete ALL data. Are you sure?")) {
      return;
    }

    setLoading(true);
    try {
      await Promise.all([
        supabase.from('attendance').delete().neq('id', '0'),
        supabase.from('issues').delete().neq('id', '0'),
        supabase.from('vehicles').delete().neq('id', '0'),
        supabase.from('daily_settings').delete().neq('id', '0')
      ]);

      setActiveAttendance([]);
      setActiveIssues([]);
      setActiveVehicles([]);
      setAttendance([]);
      setIssues([]);
      setVehicles([]);
      setAllSessions([]);
      setActiveSession(null);
      setDashboardSelectedSession(null);
      localStorage.removeItem(STORAGE_KEY_SESSION_ID);
      
      alert("Database wiped successfully.");
      setShowSettingsModal(true);
      setActiveView('Attendance');
    } catch (error) {
      console.error("Reset Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!activeVolunteer) return <Login onLogin={v => { setActiveVolunteer(v); localStorage.setItem(STORAGE_KEY_VOLUNTEER, JSON.stringify(v)); }} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh] relative">
            <button onClick={() => setShowSettingsModal(false)} className="absolute top-6 right-6 w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="text-center">
              <h2 className="text-2xl font-black text-slate-900">New Duty Session</h2>
            </div>
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duty Locations</label>
                <div className="grid grid-cols-1 gap-2">
                  {LOCATIONS_LIST.map(loc => (
                    <button type="button" key={loc} onClick={() => setConfigForm(p => ({ ...p, locations: p.locations.includes(loc) ? p.locations.filter(l => l !== loc) : [...p.locations, loc] }))} className={`py-3.5 px-6 rounded-2xl font-black text-xs uppercase border-2 transition-all ${configForm.locations.includes(loc) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{loc}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duty Start</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" className="px-4 py-3.5 bg-slate-50 border-2 rounded-2xl font-black text-sm" value={configForm.startDate} onChange={e => setConfigForm(p => ({...p, startDate: e.target.value}))} />
                    <input type="time" className="px-4 py-3.5 bg-slate-50 border-2 rounded-2xl font-black text-sm" value={configForm.startTime} onChange={e => setConfigForm(p => ({...p, startTime: e.target.value}))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duty End</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" className="px-4 py-3.5 bg-slate-50 border-2 rounded-2xl font-black text-sm" value={configForm.endDate} onChange={e => setConfigForm(p => ({...p, endDate: e.target.value}))} />
                    <input type="time" className="px-4 py-3.5 bg-slate-50 border-2 rounded-2xl font-black text-sm" value={configForm.endTime} onChange={e => setConfigForm(p => ({...p, endTime: e.target.value}))} />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={isSavingSettings || saveSuccess} className="w-full py-5 rounded-[2rem] font-black uppercase tracking-widest bg-indigo-600 text-white shadow-xl">{isSavingSettings ? 'Starting...' : (saveSuccess ? 'Session Started ✓' : 'Start Duty')}</button>
            </form>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Security Sewa</h1>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black text-slate-900">{activeVolunteer.name}</p>
            <p className="text-[8px] font-bold text-indigo-500 uppercase">{activeVolunteer.role}</p>
          </div>
          <button onClick={() => { localStorage.removeItem(STORAGE_KEY_VOLUNTEER); localStorage.removeItem(STORAGE_KEY_SESSION_ID); setActiveVolunteer(null); }} className="p-2.5 bg-slate-50 rounded-xl hover:text-red-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-6 pb-24 no-scrollbar">
        {activeView === 'Attendance' ? (
          <AttendanceManager 
            sewadars={[...INITIAL_SEWADARS, ...customSewadars]} 
            attendance={activeAttendance} 
            onSaveAttendance={saveAttendance} 
            onSaveVehicle={handleSaveVehicle}
            vehicles={activeVehicles}
            onAddSewadar={async (n, g, grp) => {
              const newSewadar = { id: generateNumericId(), name: n, gender: g, group: grp };
              try {
                await supabase.from('custom_sewadars').insert({ id: newSewadar.id, name: newSewadar.name, gender: newSewadar.gender, group: newSewadar.group });
                setCustomSewadars(prev => [...prev, { ...newSewadar, isCustom: true }]);
              } catch (error) { console.error('Failed to add sewadar:', error); }
            }} 
            activeVolunteer={activeVolunteer} 
            workshopLocation={activeSession?.location || null} 
            sessionDate={activeSession?.date || ''} 
            dutyStartTime={activeSession?.start_time || ''} 
            dutyEndTime={activeSession?.end_time || ''} 
            isCompleted={activeSession?.completed} 
            onChangeLocation={() => setShowSettingsModal(true)} 
          />
        ) : (
          <Dashboard 
            attendance={attendance} 
            issues={issues} 
            vehicles={vehicles} 
            activeVolunteer={activeVolunteer} 
            allSessions={allSessions} 
            selectedSessionId={dashboardSelectedSession?.id || null} 
            isSessionCompleted={!!dashboardSelectedSession?.completed} 
            onSessionChange={handleSessionChange} 
            onReportIssue={handleReportIssue} 
            onSaveVehicle={handleSaveVehicle} 
            isLoading={loading} 
            dutyStartTime={dashboardSelectedSession?.start_time || ''} 
            dutyEndTime={dashboardSelectedSession?.end_time || ''} 
            onOpenSettings={() => setShowSettingsModal(true)} 
            onCompleteSession={handleCompleteSession} 
            onResetAllData={handleResetAllData} 
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t flex justify-around items-center p-3 pb-6">
        <button onClick={() => setActiveView('Attendance')} className={`flex flex-col items-center gap-1 ${activeView === 'Attendance' ? 'text-indigo-600' : 'text-slate-400'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg><span className="text-[10px] font-black uppercase">Mark Sewa</span></button>
        <button onClick={() => setActiveView('Dashboard')} className={`flex flex-col items-center gap-1 ${activeView === 'Dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2" /></svg><span className="text-[10px] font-black uppercase">Reports</span></button>
      </nav>
    </div>
  );
};

export default App;
