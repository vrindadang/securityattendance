
import React, { useState, useEffect, useCallback } from 'react';
import { ViewState, AttendanceRecord, Sewadar, Volunteer, Gender, GentsGroup } from './types';
import { INITIAL_SEWADARS } from './constants';
import AttendanceManager from './components/AttendanceManager';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { supabase } from './supabase';

const STORAGE_KEY_VOLUNTEER = 'skrm_active_volunteer';

const App: React.FC = () => {
  const [activeVolunteer, setActiveVolunteer] = useState<Volunteer | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_VOLUNTEER);
    return saved ? JSON.parse(saved) : null;
  });

  const [activeView, setActiveView] = useState<ViewState>('Attendance');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [workshopLocation, setWorkshopLocation] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDashboardDate, setSelectedDashboardDate] = useState(new Date().toISOString().split('T')[0]);

  // Handle Login and Location Prompt
  const handleLogin = (volunteer: Volunteer) => {
    setActiveVolunteer(volunteer);
    localStorage.setItem(STORAGE_KEY_VOLUNTEER, JSON.stringify(volunteer));
    checkAndPromptLocation();
  };

  const checkAndPromptLocation = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const { data, error } = await supabase
        .from('daily_settings')
        .select('location')
        .eq('date', today)
        .maybeSingle();
      
      if (error) throw error;

      if (data?.location) {
        setWorkshopLocation(data.location);
        setShowLocationPicker(false);
      } else {
        setShowLocationPicker(true);
      }
    } catch (err) {
      console.error("Location Check Error:", err);
      setShowLocationPicker(true);
    }
  }, []);

  const handleSetWorkshopLocation = async (loc: string) => {
    const today = new Date().toISOString().split('T')[0];
    setWorkshopLocation(loc);
    setShowLocationPicker(false);
    await supabase.from('daily_settings').upsert({ date: today, location: loc }, { onConflict: 'date' });
  };

  const fetchAttendance = async (date: string) => {
    if (!activeVolunteer) return [];
    
    try {
      let query = supabase
        .from('attendance')
        .select('*')
        .eq('date', date);
      
      // RESTRICTION: Non-SuperAdmins can only see their own group's data
      if (activeVolunteer.role !== 'Super Admin' && activeVolunteer.assignedGroup) {
        query = query.eq('group', activeVolunteer.assignedGroup);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      return (data || []).map((a: any) => ({
        sewadarId: a.sewadar_id,
        name: a.name,
        group: a.group,
        gender: a.gender,
        date: a.date,
        timestamp: Number(a.timestamp),
        volunteerId: a.volunteer_id,
        inTime: a.in_time,
        outTime: a.out_time,
        sewaPoint: a.sewa_points,
        workshopLocation: a.workshop_location
      }));
    } catch (err) {
      console.error("Fetch Error:", err);
      return [];
    }
  };

  // 1. Initial Data Fetch & Location Check on mount
  useEffect(() => {
    if (activeVolunteer) {
      checkAndPromptLocation();
      const today = new Date().toISOString().split('T')[0];
      fetchAttendance(today).then(data => {
        setAttendance(data);
        setLoading(false);
      });
    }
  }, [activeVolunteer, checkAndPromptLocation]);

  // 2. REAL-TIME SUBSCRIPTION
  useEffect(() => {
    if (!activeVolunteer) return;

    const channel = supabase
      .channel('attendance_changes')
      .on(
        'postgres_changes',
        { event: '*', table: 'attendance', schema: 'public' },
        (payload) => {
          const today = new Date().toISOString().split('T')[0];
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newRecord = payload.new;
            
            // SECURITY FILTER: Ignore updates for other groups if not Super Admin
            if (activeVolunteer.role !== 'Super Admin' && activeVolunteer.assignedGroup) {
              if (newRecord.group !== activeVolunteer.assignedGroup) return;
            }

            // Only update local state if it's for the currently viewed date
            const targetDate = activeView === 'Dashboard' ? selectedDashboardDate : today;
            
            if (newRecord.date === targetDate) {
              setAttendance(prev => {
                const filtered = prev.filter(a => a.sewadarId !== newRecord.sewadar_id);
                return [...filtered, {
                  sewadarId: newRecord.sewadar_id,
                  name: newRecord.name,
                  group: newRecord.group,
                  gender: newRecord.gender,
                  date: newRecord.date,
                  timestamp: Number(newRecord.timestamp),
                  volunteerId: newRecord.volunteer_id,
                  inTime: newRecord.in_time,
                  outTime: newRecord.out_time,
                  sewaPoint: newRecord.sewa_points,
                  workshopLocation: newRecord.workshop_location
                }];
              });
            }
          } else if (payload.eventType === 'DELETE') {
             // Re-fetch to ensure sync on delete
             fetchAttendance(activeView === 'Dashboard' ? selectedDashboardDate : today).then(setAttendance);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeVolunteer, activeView, selectedDashboardDate]);

  // 3. Handle Dashboard Date Change
  useEffect(() => {
    if (activeView === 'Dashboard') {
      setLoading(true);
      fetchAttendance(selectedDashboardDate).then(data => {
        setAttendance(data);
        setLoading(false);
      });
    } else {
      // Re-fetch today when going back to Attendance
      const today = new Date().toISOString().split('T')[0];
      fetchAttendance(today).then(setAttendance);
    }
  }, [activeView, selectedDashboardDate]);

  const saveAttendance = async (sewadarId: string, details: Partial<AttendanceRecord>, isDelete: boolean = false) => {
    if (!activeVolunteer) return;
    const today = new Date().toISOString().split('T')[0];

    if (isDelete) {
      setAttendance(prev => prev.filter(a => a.sewadarId !== sewadarId || a.date !== today));
      await supabase.from('attendance').delete().match({ sewadar_id: sewadarId, date: today });
      return;
    }

    const sewadar = INITIAL_SEWADARS.find(s => s.id === sewadarId);
    const name = sewadar?.name || details.name;
    const group = sewadar?.group || details.group;
    const gender = sewadar?.gender || details.gender;

    if (!name || !group || !gender) return;

    // SECURITY: Ensure admins only mark for their own group
    if (activeVolunteer.role !== 'Super Admin' && activeVolunteer.assignedGroup) {
      if (group !== activeVolunteer.assignedGroup) {
        alert("Unauthorized: You can only mark attendance for your own group.");
        return;
      }
    }

    const dbPayload = {
      sewadar_id: sewadarId,
      name,
      group,
      gender,
      date: today,
      timestamp: Date.now(),
      volunteer_id: activeVolunteer.id,
      in_time: details.inTime,
      out_time: details.outTime,
      sewa_points: details.sewaPoint,
      workshop_location: details.workshopLocation || workshopLocation
    };

    setAttendance(prev => {
      const filtered = prev.filter(a => a.sewadarId !== sewadarId || a.date !== today);
      return [...filtered, { 
        ...dbPayload, 
        sewadarId,
        workshopLocation: dbPayload.workshop_location 
      } as any];
    });

    await supabase.from('attendance').upsert(dbPayload, { onConflict: 'sewadar_id,date' });
  };

  const addSewadar = async (name: string, gender: Gender, group: GentsGroup | 'Ladies') => {
    if (!activeVolunteer) return;
    const newId = `ADDED-${Date.now()}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    
    await saveAttendance(newId, { 
      name,
      gender,
      group,
      inTime: nowTime, 
      workshopLocation: workshopLocation || '',
    });
  };

  const clearTodayAttendance = async () => {
    if (!window.confirm("DANGER: Clear all attendance records for today?")) return;
    const today = new Date().toISOString().split('T')[0];
    
    let query = supabase.from('attendance').delete().eq('date', today);
    if (activeVolunteer?.role !== 'Super Admin' && activeVolunteer?.assignedGroup) {
      query = query.eq('group', activeVolunteer.assignedGroup);
    }
    
    await query;
    setAttendance([]);
  };

  if (!activeVolunteer) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {showLocationPicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl text-center space-y-8 animate-in zoom-in-95 duration-500">
             <div>
               <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-4 text-3xl">📍</div>
               <h2 className="text-3xl font-black text-slate-900">Current Duty Location</h2>
               <p className="text-slate-500 text-sm mt-2">Where is the workshop being conducted today?</p>
             </div>
             <div className="grid grid-cols-2 gap-4">
               {['Kirpal Bagh', 'Kirpal Ashram', 'Sawan Ashram', 'Burari'].map((loc) => (
                 <button 
                  key={loc} 
                  onClick={() => handleSetWorkshopLocation(loc)} 
                  className="group py-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-black hover:border-indigo-500 hover:bg-white hover:shadow-xl transition-all flex flex-col items-center gap-3 active:scale-95"
                 >
                   <span className="text-2xl group-hover:scale-125 transition-transform">🏢</span>
                   <span className="text-xs uppercase tracking-widest text-slate-400 group-hover:text-indigo-600">{loc}</span>
                 </button>
               ))}
             </div>
          </div>
        </div>
      )}

      <header className="fixed top-0 left-0 right-0 z-40 glass-dark text-white shadow-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 md:py-4">
          <div className="flex items-center gap-4">
            <div className="hidden md:flex w-10 h-10 bg-indigo-600 rounded-xl items-center justify-center font-black text-xl">S</div>
            <div>
              <h1 className="text-sm md:text-xl font-black tracking-tight uppercase">Security Workshop</h1>
              <p className="text-[10px] text-indigo-300 font-medium uppercase tracking-widest">
                {activeVolunteer?.name} • {workshopLocation || 'Location Pending...'}
              </p>
            </div>
          </div>
          <button onClick={() => { setActiveVolunteer(null); localStorage.removeItem(STORAGE_KEY_VOLUNTEER); }} className="p-2.5 bg-white/10 rounded-xl hover:bg-red-500/20 hover:text-red-200 transition-all border border-white/5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pt-24 pb-32 md:pl-56">
        {activeView === 'Attendance' ? (
          <AttendanceManager 
            sewadars={INITIAL_SEWADARS} 
            attendance={attendance} 
            onSaveAttendance={saveAttendance} 
            onAddSewadar={addSewadar} 
            activeVolunteer={activeVolunteer} 
            workshopLocation={workshopLocation}
            onChangeLocation={() => setShowLocationPicker(true)}
          />
        ) : (
          <Dashboard 
            attendance={attendance} 
            activeVolunteer={activeVolunteer} 
            onClearAttendance={clearTodayAttendance}
            selectedDate={selectedDashboardDate}
            onDateChange={setSelectedDashboardDate}
            isLoading={loading}
          />
        )}
      </main>

      <nav className="fixed bottom-6 left-4 right-4 z-50 md:hidden">
        <div className="glass-effect rounded-full shadow-2xl border border-white/50 p-1.5 max-w-sm mx-auto flex gap-1">
          {(['Attendance', 'Dashboard'] as ViewState[]).map((v) => (
            <button key={v} onClick={() => setActiveView(v)} className={`flex-1 py-3.5 rounded-full transition-all text-[10px] font-black uppercase tracking-widest ${activeView === v ? 'text-white bg-indigo-600 shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>{v}</button>
          ))}
        </div>
      </nav>

      <aside className="hidden md:block fixed left-0 top-0 bottom-0 z-30 w-52 pt-24 px-4 border-r border-slate-100 bg-white/50 backdrop-blur-sm">
        <div className="space-y-2">
          {(['Attendance', 'Dashboard'] as ViewState[]).map((v) => (
            <button key={v} onClick={() => setActiveView(v)} className={`w-full text-left px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === v ? 'bg-indigo-600 text-white shadow-xl translate-x-1' : 'text-slate-500 hover:bg-white hover:text-indigo-600'}`}>{v}</button>
          ))}
        </div>
        <div className="absolute bottom-10 left-4 right-4 p-4 bg-indigo-50 rounded-2xl">
           <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest text-center mb-2">System Status</p>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-slate-600">
                {activeVolunteer?.assignedGroup ? `${activeVolunteer.assignedGroup} Sync` : 'Global Sync Active'}
              </span>
           </div>
        </div>
      </aside>
    </div>
  );
};

export default App;
