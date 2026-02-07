import React, { useState, useEffect, useCallback } from 'react';
import { ViewState, AttendanceRecord, Sewadar, Volunteer, Gender, GentsGroup, Issue } from './types';
import { INITIAL_SEWADARS, LOCATIONS_LIST } from './constants';
import AttendanceManager from './components/AttendanceManager';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { supabase } from './supabase';

const STORAGE_KEY_VOLUNTEER = 'skrm_active_volunteer';

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
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [customSewadars, setCustomSewadars] = useState<Sewadar[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [allSessions, setAllSessions] = useState<DutySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<DutySession | null>(null);

  const getLocalDate = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const getLocalTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const [configForm, setConfigForm] = useState({
    locations: [] as string[],
    startDate: getLocalDate(),
    startTime: getLocalTime(),
    endDate: getLocalDate(),
    endTime: '22:00'
  });

  // Handle defaults when modal opens
  useEffect(() => {
    if (showSettingsModal && activeVolunteer) {
      if (activeVolunteer.assignedGroup === 'Ladies') {
        // Default to ALL locations for Ladies
        setConfigForm(prev => ({
          ...prev,
          locations: [...LOCATIONS_LIST],
          startDate: getLocalDate(),
          startTime: getLocalTime()
        }));
      } else {
        // Default to EMPTY locations for Gents
        setConfigForm(prev => ({
          ...prev,
          locations: [],
          startDate: getLocalDate(),
          startTime: getLocalTime()
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
        setAllSessions(data);
        if (isInitial) {
          const activeOrFuture = data.find(s => !s.completed);
          if (activeOrFuture) {
            setSelectedSession(activeOrFuture);
          } else {
            setSelectedSession(null);
            if (activeVolunteer.role !== 'Super Admin') setShowSettingsModal(true);
          }
        }
      } else {
        setAllSessions([]);
        setSelectedSession(null);
        if (isInitial && activeVolunteer.role !== 'Super Admin') setShowSettingsModal(true);
      }
    } catch (err) {
      console.error("Fetch Sessions Error:", err);
    }
  }, [activeVolunteer]);

  const fetchData = useCallback(async () => {
    if (!activeVolunteer || !selectedSession) {
      setAttendance([]);
      setIssues([]);
      return;
    }
    setLoading(true);
    
    try {
      const sessionDate = selectedSession.date;
      const sessionGroup = selectedSession.group;

      let { data: attData } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', sessionDate)
        .eq('group', sessionGroup);

      if ((!attData || attData.length === 0) && sessionDate) {
        const { data: fallbackData } = await supabase
          .from('attendance')
          .select('*')
          .eq('date', sessionDate);
        if (fallbackData && fallbackData.length > 0) attData = fallbackData;
      }

      if (attData) {
        setAttendance(attData.map((a: any) => ({
          ...a,
          sewadarId: a.sewadar_id,
          volunteerId: a.volunteer_id,
          inTime: a.in_time,
          outTime: a.out_time,
          sewaPoint: a.sewa_points,
          workshopLocation: a.workshop_location,
          isProperUniform: a.is_proper_uniform 
        })));
      } else {
        setAttendance([]);
      }

      const { data: customData } = await supabase.from('custom_sewadars').select('*');
      if (customData) {
        setCustomSewadars(customData.map((s: any) => ({
          id: s.id,
          name: s.name,
          gender: s.gender as Gender,
          group: s.group as GentsGroup | 'Ladies',
          isCustom: true
        })));
      }

      let { data: issuesData } = await supabase
        .from('issues')
        .select('*')
        .eq('date', sessionDate)
        .eq('group', sessionGroup);

      if ((!issuesData || issuesData.length === 0) && sessionDate) {
        const { data: fallbackIssues } = await supabase
          .from('issues')
          .select('*')
          .eq('date', sessionDate);
        if (fallbackIssues) issuesData = fallbackIssues;
      }

      if (issuesData) {
        setIssues(issuesData.map((i: any) => ({
          id: i.id,
          description: i.description,
          photo: i.photo,
          timestamp: i.timestamp,
          volunteerId: i.volunteer_id,
          volunteerName: i.volunteer_name
        })));
      } else {
        setIssues([]);
      }
    } catch (err) {
      console.error("Fetch Data Error:", err);
    } finally {
      setLoading(false);
    }
  }, [activeVolunteer, selectedSession]);

  useEffect(() => {
    if (activeVolunteer) {
      fetchSessions(true);
    }
  }, [activeVolunteer, fetchSessions]);

  useEffect(() => {
    fetchData();
  }, [selectedSession?.id, fetchData]);

  const handleUpdatePassword = async (newPassword: string): Promise<boolean> => {
    if (!activeVolunteer) return false;
    try {
      await supabase.from('volunteers').upsert({ id: activeVolunteer.id, password: newPassword });
      const updatedVolunteer = { ...activeVolunteer, password: newPassword };
      setActiveVolunteer(updatedVolunteer);
      localStorage.setItem(STORAGE_KEY_VOLUNTEER, JSON.stringify(updatedVolunteer));
      return true;
    } catch (err) { return false; }
  };

  const saveAttendance = async (sewadarId: string, details: Partial<AttendanceRecord>, recordId?: string, isDelete: boolean = false) => {
    if (!selectedSession || selectedSession.completed) return;
    const sessionDate = selectedSession.date;
    const sessionGroup = selectedSession.group;

    if (isDelete && recordId) {
      setAttendance(prev => prev.filter(a => a.id !== recordId));
      await supabase.from('attendance').delete().eq('id', recordId);
      return;
    }

    const sewadar = [...INITIAL_SEWADARS, ...customSewadars].find(s => s.id === sewadarId);
    if (!sewadar) return;

    const finalRecordId = recordId || `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const dbPayload = {
      id: finalRecordId,
      sewadar_id: sewadarId, 
      name: sewadar.name, 
      group: sessionGroup, 
      gender: sewadar.gender,
      date: sessionDate, 
      timestamp: Date.now(), 
      volunteer_id: activeVolunteer?.id,
      in_time: details.inTime, 
      out_time: details.outTime, 
      sewa_points: details.sewaPoint,
      workshop_location: details.workshopLocation, 
      is_proper_uniform: details.isProperUniform 
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
      inTime: details.inTime, 
      outTime: details.outTime,
      sewaPoint: details.sewaPoint, 
      workshopLocation: details.workshopLocation, 
      isProperUniform: details.isProperUniform
    };

    setAttendance(prev => {
      const filtered = prev.filter(a => a.id !== finalRecordId);
      return [...filtered, newRecord];
    });

    await supabase.from('attendance').upsert(dbPayload, { onConflict: 'id' });
  };

  const handleReportIssue = async (description: string) => {
    if (!activeVolunteer || !selectedSession || selectedSession.completed) return;
    const newIssue: Issue = {
      id: `issue-${Date.now()}`, description, timestamp: Date.now(),
      volunteerId: activeVolunteer.id, volunteerName: activeVolunteer.name
    };
    setIssues(prev => [...prev, newIssue]);
    await supabase.from('issues').insert({
      id: newIssue.id, date: selectedSession.date, group: selectedSession.group,
      description: newIssue.description, timestamp: newIssue.timestamp,
      volunteer_id: newIssue.volunteerId, volunteer_name: newIssue.volunteerName
    });
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
        setAllSessions(prev => [data[0], ...prev]);
        setSelectedSession(data[0]);
        setSaveSuccess(true);
        setTimeout(() => { setShowSettingsModal(false); setSaveSuccess(false); setActiveView('Attendance'); }, 600);
      }
    } catch (err) { alert("Config error"); } finally { setIsSavingSettings(false); }
  };

  const handleCompleteSession = async (sessionId: string) => {
    try {
      await supabase.from('daily_settings').update({ completed: true }).eq('id', sessionId);
      setAllSessions(prev => prev.map(s => s.id === sessionId ? { ...s, completed: true } : s));
      setSelectedSession(null);
      setActiveView('Attendance');
    } catch (err) { alert("Error finalizing duty."); }
  };

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
          <button onClick={() => { localStorage.removeItem(STORAGE_KEY_VOLUNTEER); setActiveVolunteer(null); }} className="p-2.5 bg-slate-50 rounded-xl hover:text-red-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-6 pb-24 no-scrollbar">
        {activeView === 'Attendance' ? (
          <AttendanceManager sewadars={[...INITIAL_SEWADARS, ...customSewadars]} attendance={attendance} onSaveAttendance={saveAttendance} onAddSewadar={(n, g, grp) => {}} activeVolunteer={activeVolunteer} workshopLocation={selectedSession?.location || null} sessionDate={selectedSession?.date || ''} dutyStartTime={selectedSession?.start_time || ''} dutyEndTime={selectedSession?.end_time || ''} isCompleted={selectedSession?.completed} onChangeLocation={() => setShowSettingsModal(true)} />
        ) : (
          <Dashboard attendance={attendance} issues={issues} activeVolunteer={activeVolunteer} allSessions={allSessions} selectedSessionId={selectedSession?.id || null} isSessionCompleted={!!selectedSession?.completed} onSessionChange={id => setSelectedSession(allSessions.find(s => s.id === id) || null)} onReportIssue={handleReportIssue} isLoading={loading} dutyStartTime={selectedSession?.start_time || ''} dutyEndTime={selectedSession?.end_time || ''} onOpenSettings={() => setShowSettingsModal(true)} onCompleteSession={handleCompleteSession} />
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
