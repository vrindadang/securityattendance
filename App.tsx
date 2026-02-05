
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
  const [customLocation, setCustomLocation] = useState('');
  
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

  const resetConfigForm = useCallback(() => {
    setConfigForm({
      locations: [],
      startDate: getLocalDate(),
      startTime: getLocalTime(),
      endDate: getLocalDate(),
      endTime: '22:00'
    });
  }, []);

  const fetchSessions = useCallback(async (isInitial = false) => {
    if (!activeVolunteer) return;
    const groupName = activeVolunteer.assignedGroup || 'Global';
    
    try {
      const { data, error } = await supabase
        .from('daily_settings')
        .select('id, location, "group", start_time, end_time, date, completed')
        .eq('"group"', groupName)
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setAllSessions(data);
        const activeOrFuture = data.find(s => !s.completed);

        if (isInitial) {
          if (activeOrFuture) {
            setSelectedSession(activeOrFuture);
          } else {
            setSelectedSession(null);
            if (activeVolunteer.role !== 'Super Admin') setShowSettingsModal(true);
          }
        } else if (!selectedSession && activeOrFuture) {
          setSelectedSession(activeOrFuture);
        }
      } else {
        setAllSessions([]);
        setSelectedSession(null);
        if (isInitial && activeVolunteer.role !== 'Super Admin') setShowSettingsModal(true);
      }
    } catch (err) {
      console.error("Fetch Sessions Error:", err);
    }
  }, [activeVolunteer, selectedSession]);

  const fetchData = async () => {
    if (!activeVolunteer || !selectedSession) {
      setAttendance([]);
      setIssues([]);
      return;
    }
    setLoading(true);
    
    try {
      const startRange = new Date(selectedSession.start_time).getTime();
      const endRange = new Date(selectedSession.end_time).getTime();

      // Shared Attendance - Visible to all incharges in the same group
      let attQuery = supabase
        .from('attendance')
        .select('*')
        .gte('timestamp', startRange)
        .lte('timestamp', endRange);

      if (activeVolunteer.role !== 'Super Admin' && activeVolunteer.assignedGroup) {
        attQuery = attQuery.eq('group', activeVolunteer.assignedGroup);
      }

      const { data: attData } = await attQuery;
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

      // Shared Issues - Visible to all incharges in the same group
      let issuesQuery = supabase
        .from('issues')
        .select('*')
        .gte('timestamp', startRange)
        .lte('timestamp', endRange);

      if (activeVolunteer.role !== 'Super Admin' && activeVolunteer.assignedGroup) {
        issuesQuery = issuesQuery.eq('group', activeVolunteer.assignedGroup);
      }

      const { data: issuesData } = await issuesQuery;

      if (issuesData) {
        setIssues(issuesData.map((i: any) => ({
          id: i.id,
          description: i.description,
          photo: i.photo,
          timestamp: i.timestamp,
          volunteerId: i.volunteer_id,
          volunteerName: i.volunteer_name
        })));
      }
    } catch (err) {
      console.error("Fetch Data Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeVolunteer) {
      fetchSessions(true);
    }
  }, [activeVolunteer, fetchSessions]);

  useEffect(() => {
    fetchData();
  }, [selectedSession?.id, activeVolunteer]);

  const allSewadars = [...INITIAL_SEWADARS, ...customSewadars];

  const handleAddSewadarToDB = async (name: string, gender: Gender, group: GentsGroup | 'Ladies') => {
    const id = `custom-${Date.now()}`;
    const newSewadar: Sewadar = { id, name, gender, group, isCustom: true };
    setCustomSewadars(prev => [...prev, newSewadar]);
    await supabase.from('custom_sewadars').insert({
      id,
      name,
      gender,
      group,
      created_by: activeVolunteer?.id
    });
  };

  const handleUpdatePassword = async (newPassword: string): Promise<boolean> => {
    if (!activeVolunteer) return false;
    try {
      const { error } = await supabase
        .from('volunteers')
        .upsert({ id: activeVolunteer.id, password: newPassword });
      
      if (error) throw error;
      
      const updatedVolunteer = { ...activeVolunteer, password: newPassword };
      setActiveVolunteer(updatedVolunteer);
      localStorage.setItem(STORAGE_KEY_VOLUNTEER, JSON.stringify(updatedVolunteer));
      return true;
    } catch (err) {
      console.error("Update Password Error:", err);
      return false;
    }
  };

  const saveAttendance = async (id: string, details: Partial<AttendanceRecord>, isDelete: boolean = false) => {
    if (!selectedSession || selectedSession.completed) return;
    const sessionDate = selectedSession.date;
    
    if (isDelete) {
      setAttendance(prev => prev.filter(a => a.sewadarId !== id));
      await supabase.from('attendance')
        .delete()
        .match({ sewadar_id: id, date: sessionDate });
      return;
    }

    const sewadar = allSewadars.find(s => s.id === id);
    if (!sewadar) return;

    const dbPayload = {
      sewadar_id: id,
      name: sewadar.name,
      group: sewadar.group,
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

    setAttendance(prev => {
      const filtered = prev.filter(a => a.sewadarId !== id);
      const updatedRecord: AttendanceRecord = {
        sewadarId: id,
        name: dbPayload.name!,
        group: dbPayload.group as GentsGroup | 'Ladies',
        gender: dbPayload.gender as Gender,
        date: sessionDate,
        timestamp: dbPayload.timestamp,
        volunteerId: activeVolunteer?.id || '',
        inTime: details.inTime,
        outTime: details.outTime,
        sewaPoint: details.sewaPoint,
        workshopLocation: details.workshopLocation,
        isProperUniform: details.isProperUniform
      };
      return [...filtered, updatedRecord];
    });

    const { error } = await supabase.from('attendance').upsert(dbPayload, { onConflict: 'sewadar_id,date' });
    if (error) {
      console.error("Attendance Error:", error);
      alert("Database Error: Could not save attendance.");
    }
  };

  const handleReportIssue = async (description: string, photo?: string) => {
    if (!activeVolunteer || !selectedSession || selectedSession.completed) return;
    const today = selectedSession.date;
    const newIssue: Issue = {
      id: `issue-${Date.now()}`,
      description,
      photo,
      timestamp: Date.now(),
      volunteerId: activeVolunteer.id,
      volunteerName: activeVolunteer.name
    };
    setIssues(prev => [...prev, newIssue]);
    await supabase.from('issues').insert({
      id: newIssue.id,
      date: today,
      group: activeVolunteer.assignedGroup, // Ensure shared visibility by group
      description: newIssue.description,
      photo: newIssue.photo,
      timestamp: newIssue.timestamp,
      volunteer_id: newIssue.volunteerId,
      volunteer_name: newIssue.volunteerName
    });
  };

  const handleUpdateIssue = async (id: string, description: string, photo?: string) => {
    if (!activeVolunteer || !selectedSession || selectedSession.completed) return;
    setIssues(prev => prev.map(i => i.id === id ? { ...i, description, photo } : i));
    await supabase.from('issues')
      .update({ description, photo })
      .eq('id', id);
  };

  const handleDeleteIssue = async (id: string) => {
    if (!activeVolunteer || !selectedSession || selectedSession.completed) return;
    setIssues(prev => prev.filter(i => i.id !== id));
    await supabase.from('issues')
      .delete()
      .eq('id', id);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (configForm.locations.length === 0) {
      alert("Please select at least one location.");
      return;
    }
    
    setIsSavingSettings(true);
    try {
      const groupName = activeVolunteer?.assignedGroup || 'Global';
      const startTS = new Date(`${configForm.startDate}T${configForm.startTime}`).toISOString();
      const endTS = new Date(`${configForm.endDate}T${configForm.endTime}`).toISOString();
      
      const payload: any = {
        date: configForm.startDate, 
        group: groupName,
        location: configForm.locations.join(', '),
        start_time: startTS,
        end_time: endTS,
        completed: false
      };
      
      const { data, error } = await supabase
        .from('daily_settings')
        .insert(payload)
        .select('id, location, "group", start_time, end_time, date, completed');
      
      if (error) throw error;

      if (data && data.length > 0) {
        const savedSession: DutySession = data[0];
        setAllSessions(prev => [savedSession, ...prev]);
        setSelectedSession(savedSession);
        setSaveSuccess(true);
        setIsSavingSettings(false);

        setTimeout(() => {
          setShowSettingsModal(false);
          setSaveSuccess(false);
          setActiveView('Attendance');
        }, 600);
      }
    } catch (err: any) {
      console.error("Config Error:", err);
      alert(`Could not save configuration: ${err.message}.`);
      setIsSavingSettings(false);
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('daily_settings')
        .update({ completed: true })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      setAllSessions(prev => prev.map(s => s.id === sessionId ? { ...s, completed: true } : s));
      setSelectedSession(null); 
      setAttendance([]); 
      setIssues([]); 
      
      await fetchSessions(false);
      setActiveView('Attendance');
      resetConfigForm();
      setTimeout(() => setShowSettingsModal(true), 500);
    } catch (err) {
      console.error("Complete Session Error:", err);
      alert("Error finalizing duty.");
    }
  };

  if (!activeVolunteer) return <Login onLogin={v => { setActiveVolunteer(v); localStorage.setItem(STORAGE_KEY_VOLUNTEER, JSON.stringify(v)); }} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh] no-scrollbar relative">
            <button onClick={() => setShowSettingsModal(false)} className="absolute top-6 right-6 w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100 transition-all active:scale-90">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              </div>
              <h2 className="text-2xl font-black text-slate-900">New Duty Session</h2>
              <p className="text-[10px] font-black text-indigo-500 uppercase mt-1">Configure next shift parameters</p>
            </div>
            
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">1. Select Duty Locations</label>
                <div className="grid grid-cols-1 gap-2">
                  {LOCATIONS_LIST.map(loc => (
                    <button type="button" key={loc} onClick={() => setConfigForm(p => ({ ...p, locations: p.locations.includes(loc) ? p.locations.filter(l => l !== loc) : [...p.locations, loc] }))} className={`py-3.5 px-6 rounded-2xl font-black text-xs uppercase border-2 transition-all flex justify-between items-center ${configForm.locations.includes(loc) ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-emerald-600 uppercase">Start Date</label>
                    <input type="date" required className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm" value={configForm.startDate} onChange={e => setConfigForm(p => ({...p, startDate: e.target.value}))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-emerald-600 uppercase">Start Time</label>
                    <input type="time" required className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm text-center" value={configForm.startTime} onChange={e => setConfigForm(p => ({...p, startTime: e.target.value}))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-amber-600 uppercase">End Date</label>
                    <input type="date" required className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm" value={configForm.endDate} onChange={e => setConfigForm(p => ({...p, endDate: e.target.value}))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-amber-600 uppercase">End Time</label>
                    <input type="time" required className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm text-center" value={configForm.endTime} onChange={e => setConfigForm(p => ({...p, endTime: e.target.value}))} />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={!configForm.locations.length || isSavingSettings || saveSuccess} className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl active:scale-95 ${saveSuccess ? 'bg-emerald-500' : 'bg-indigo-600'} text-white`}>
                {isSavingSettings ? 'Configuring...' : (saveSuccess ? 'Session Started ✓' : 'Start Duty Session')}
              </button>
            </form>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-900 rounded-xl flex items-center justify-center text-xl shadow-lg">👮</div>
          <div>
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-tighter leading-none">Security Sewa</h1>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">SKRM Mission</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black text-slate-900 leading-none">{activeVolunteer.name}</p>
            <p className="text-[8px] font-bold text-indigo-500 uppercase mt-1">{activeVolunteer.role}</p>
          </div>
          <button onClick={() => { localStorage.removeItem(STORAGE_KEY_VOLUNTEER); setActiveVolunteer(null); }} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-6 no-scrollbar pb-24">
        {activeView === 'Attendance' ? (
          <AttendanceManager 
            sewadars={allSewadars} 
            attendance={attendance} 
            onSaveAttendance={saveAttendance}
            onAddSewadar={handleAddSewadarToDB}
            activeVolunteer={activeVolunteer}
            workshopLocation={selectedSession?.location || null}
            sessionDate={selectedSession?.date || ''}
            dutyStartTime={selectedSession?.start_time || ''}
            dutyEndTime={selectedSession?.end_time || ''}
            isCompleted={selectedSession?.completed}
            onChangeLocation={() => setShowSettingsModal(true)}
          />
        ) : (
          <Dashboard 
            attendance={attendance} 
            issues={issues}
            activeVolunteer={activeVolunteer}
            allSessions={allSessions}
            selectedSessionId={selectedSession?.id || null}
            isSessionCompleted={!!selectedSession?.completed}
            onSessionChange={(id) => setSelectedSession(allSessions.find(s => s.id === id) || null)}
            onReportIssue={handleReportIssue}
            onUpdateIssue={handleUpdateIssue}
            onDeleteIssue={handleDeleteIssue}
            onUpdatePassword={handleUpdatePassword}
            isLoading={loading}
            dutyStartTime={selectedSession?.start_time || ''}
            dutyEndTime={selectedSession?.end_time || ''}
            onOpenSettings={() => setShowSettingsModal(true)}
            onCompleteSession={handleCompleteSession}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-slate-100 flex justify-around items-center p-3 pb-6">
        <button onClick={() => setActiveView('Attendance')} className={`flex flex-col items-center gap-1 group transition-all ${activeView === 'Attendance' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <div className={`p-2 rounded-xl transition-all ${activeView === 'Attendance' ? 'bg-indigo-50' : 'group-hover:bg-slate-50'}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Mark Sewa</span>
        </button>
        <button onClick={() => setActiveView('Dashboard')} className={`flex flex-col items-center gap-1 group transition-all ${activeView === 'Dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <div className={`p-2 rounded-xl transition-all ${activeView === 'Dashboard' ? 'bg-indigo-50' : 'group-hover:bg-slate-50'}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Reports</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
