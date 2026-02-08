
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

  // DATA BUCKETS
  const [activeAttendance, setActiveAttendance] = useState<AttendanceRecord[]>([]);
  const [activeIssues, setActiveIssues] = useState<Issue[]>([]);
  const [activeVehicles, setActiveVehicles] = useState<VehicleRecord[]>([]);

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

  const fetchSessions = useCallback(async () => {
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
        const mapped = data.map(s => ({ ...s, id: String(s.id) }));
        setAllSessions(mapped);
        
        // Find the single uncompleted active session
        const active = mapped.find(s => !s.completed) || null;
        setActiveSession(active);

        // Dashboard View Session (defaults to active or most recent)
        const savedViewId = localStorage.getItem(STORAGE_KEY_VIEW_SESSION_ID);
        const savedView = mapped.find(s => s.id === savedViewId);
        setViewSession(savedView || active || mapped[0] || null);
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
      const { data: att } = await supabase.from('attendance').select('*').eq('date', session.date).eq('group', session.group);
      if (att) {
        setAtt(att.map((a: any) => ({
          ...a, id: String(a.id), sewadarId: a.sewadar_id, volunteerId: a.volunteer_id,
          inTime: a.in_time, outTime: a.out_time, sewaPoint: a.sewa_points,
          workshopLocation: a.workshop_location, isProperUniform: a.is_proper_uniform 
        })));
      }

      const { data: iss } = await supabase.from('issues').select('*').eq('date', session.date).eq('group', session.group);
      if (iss) {
        setIss(iss.map((i: any) => ({
          id: String(i.id), description: i.description, photo: i.photo, timestamp: i.timestamp,
          volunteerId: i.volunteer_id, volunteerName: i.volunteer_name
        })));
      }

      const { data: veh } = await supabase.from('vehicles').select('*').eq('date', session.date).eq('group', session.group);
      if (veh) {
        setVeh(veh.map((v: any) => ({
          id: String(v.id), type: v.type, plateNumber: v.plate_number, model: v.model,
          remarks: v.remarks, timestamp: v.timestamp, volunteerId: v.volunteer_id, volunteerName: v.volunteer_name
        })));
      }
    } catch (err) {
      console.error("Fetch Data Error:", err);
    }
  };

  useEffect(() => {
    if (activeVolunteer) fetchSessions();
  }, [activeVolunteer, fetchSessions]);

  useEffect(() => {
    fetchSessionData(activeSession, setActiveAttendance, setActiveIssues, setActiveVehicles);
  }, [activeSession]);

  useEffect(() => {
    fetchSessionData(viewSession, setViewAttendance, setViewIssues, setViewVehicles);
  }, [viewSession]);

  useEffect(() => {
    const fetchCustom = async () => {
      const { data } = await supabase.from('custom_sewadars').select('*');
      if (data) setCustomSewadars(data.map((s: any) => ({
        id: String(s.id), name: s.name, gender: s.gender as Gender,
        group: s.group as GentsGroup | 'Ladies', isCustom: true
      })));
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

    if (recordId) await supabase.from('attendance').update(payload).eq('id', recordId);
    else await supabase.from('attendance').insert(payload);
    
    fetchSessionData(activeSession, setActiveAttendance, setActiveIssues, setActiveVehicles);
  };

  const handleReportIssue = async (description: string) => {
    if (!activeVolunteer || !activeSession) return;
    const id = generateNumericId();
    const ts = Date.now();
    await supabase.from('issues').insert({
      id, date: activeSession.date, group: activeSession.group,
      description, timestamp: ts, volunteer_id: activeVolunteer.id, volunteer_name: activeVolunteer.name
    });
    fetchSessionData(activeSession, setActiveAttendance, setActiveIssues, setActiveVehicles);
  };

  const handleSaveVehicle = async (v: Omit<VehicleRecord, 'id' | 'timestamp' | 'volunteerId' | 'volunteerName'>) => {
    if (!activeVolunteer || !activeSession) return;
    const cleanPlate = v.plateNumber.toUpperCase().trim();
    const id = generateNumericId();
    const ts = Date.now();

    try {
      const { error } = await supabase.from('vehicles').insert({
        id, date: activeSession.date, group: activeSession.group, type: v.type, 
        plate_number: cleanPlate, model: v.model, remarks: v.remarks, timestamp: ts,
        volunteer_id: activeVolunteer.id, volunteer_name: activeVolunteer.name
      });
      if (error) throw error;
      fetchSessionData(activeSession, setActiveAttendance, setActiveIssues, setActiveVehicles);
    } catch (err: any) {
      alert("Error saving vehicle. Ensure the database table exists.");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (configForm.locations.length === 0) return alert("Select location.");
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
        const mapped = { ...data[0], id: String(data[0].id) };
        setActiveSession(mapped);
        setAllSessions(prev => [mapped, ...prev]);
        setSaveSuccess(true);
        setTimeout(() => { setShowSettingsModal(false); setSaveSuccess(false); setActiveView('Attendance'); }, 600);
      }
    } catch (err) { alert("Config error"); } finally { setIsSavingSettings(false); }
  };

  const handleCompleteSession = async (sessionId: string) => {
    await supabase.from('daily_settings').update({ completed: true }).eq('id', sessionId);
    setAllSessions(prev => prev.map(s => s.id === sessionId ? { ...s, completed: true } : s));
    if (activeSession?.id === sessionId) setActiveSession(null);
    fetchSessions();
  };

  const handleResetAllData = useCallback(async () => {
    if (!window.confirm("☢️ NUCLEAR RESET: Delete all data?")) return;
    setLoading(true);
    await Promise.all([
      supabase.from('attendance').delete().neq('id', '0'),
      supabase.from('issues').delete().neq('id', '0'),
      supabase.from('vehicles').delete().neq('id', '0'),
      supabase.from('daily_settings').delete().neq('id', '0')
    ]);
    setActiveAttendance([]); setActiveIssues([]); setActiveVehicles([]);
    setAllSessions([]); setActiveSession(null); setViewSession(null);
    localStorage.removeItem(STORAGE_KEY_VIEW_SESSION_ID);
    setLoading(false);
    setShowSettingsModal(true);
  }, []);

  if (!activeVolunteer) return <Login onLogin={v => { setActiveVolunteer(v); localStorage.setItem(STORAGE_KEY_VOLUNTEER, JSON.stringify(v)); }} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh] relative">
            <button onClick={() => setShowSettingsModal(false)} className="absolute top-6 right-6 w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center">✕</button>
            <h2 className="text-2xl font-black text-center">New Duty Session</h2>
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 gap-2">
                {LOCATIONS_LIST.map(loc => (
                  <button type="button" key={loc} onClick={() => setConfigForm(p => ({ ...p, locations: p.locations.includes(loc) ? p.locations.filter(l => l !== loc) : [...p.locations, loc] }))} className={`py-3.5 rounded-2xl font-black text-xs uppercase border-2 ${configForm.locations.includes(loc) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{loc}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className="px-4 py-3.5 bg-slate-50 border-2 rounded-2xl font-black" value={configForm.startDate} onChange={e => setConfigForm(p => ({...p, startDate: e.target.value}))} />
                <input type="time" className="px-4 py-3.5 bg-slate-50 border-2 rounded-2xl font-black" value={configForm.startTime} onChange={e => setConfigForm(p => ({...p, startTime: e.target.value}))} />
              </div>
              <button type="submit" disabled={isSavingSettings} className="w-full py-5 rounded-[2rem] font-black uppercase bg-indigo-600 text-white">{isSavingSettings ? 'Starting...' : 'Start Duty'}</button>
            </form>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-sm font-black text-slate-900 uppercase">Security Portal</h1>
        <button onClick={() => { localStorage.clear(); setActiveVolunteer(null); }} className="p-2.5 bg-slate-50 rounded-xl">Logout</button>
      </header>

      <main className="flex-1 px-6 pt-6 pb-24 no-scrollbar">
        {activeView === 'Attendance' ? (
          <AttendanceManager 
            sewadars={[...INITIAL_SEWADARS, ...customSewadars]} 
            attendance={activeAttendance} 
            onSaveAttendance={saveAttendance} 
            onSaveVehicle={handleSaveVehicle}
            vehicles={activeVehicles}
            onAddSewadar={async (n, g, grp) => {
              const id = generateNumericId();
              await supabase.from('custom_sewadars').insert({ id, name: n, gender: g, group: grp });
              setCustomSewadars(prev => [...prev, { id, name: n, gender: g, group: grp, isCustom: true }]);
            }} 
            activeVolunteer={activeVolunteer} 
            workshopLocation={activeSession?.location || null} 
            sessionDate={activeSession?.date || ''} 
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
            isSessionCompleted={!!viewSession?.completed} 
            onSessionChange={id => {
              const s = allSessions.find(x => x.id === id) || null;
              setViewSession(s);
              if (s) localStorage.setItem(STORAGE_KEY_VIEW_SESSION_ID, s.id);
            }} 
            onReportIssue={handleReportIssue} 
            onSaveVehicle={handleSaveVehicle} 
            isLoading={loading} 
            dutyStartTime={viewSession?.start_time || ''} 
            dutyEndTime={viewSession?.end_time || ''} 
            onOpenSettings={() => setShowSettingsModal(true)} 
            onCompleteSession={handleCompleteSession} 
            onResetAllData={handleResetAllData} 
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t flex justify-around p-3 pb-6">
        <button onClick={() => setActiveView('Attendance')} className={`flex flex-col items-center gap-1 ${activeView === 'Attendance' ? 'text-indigo-600' : 'text-slate-400'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg><span className="text-[10px] font-black uppercase">Attendance</span></button>
        <button onClick={() => setActiveView('Dashboard')} className={`flex flex-col items-center gap-1 ${activeView === 'Dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2" /></svg><span className="text-[10px] font-black uppercase">Reports</span></button>
      </nav>
    </div>
  );
};

export default App;
