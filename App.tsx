
import React, { useState, useEffect, useCallback } from 'react';
import { ViewState, AttendanceRecord, Sewadar, Volunteer, Gender, GentsGroup } from './types';
import { INITIAL_SEWADARS } from './constants';
import AttendanceManager from './components/AttendanceManager';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { supabase } from './supabase';

const STORAGE_KEY_VOLUNTEER = 'skrm_active_volunteer';

interface DailySettings {
  locations: string[];
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

const LOCATIONS_LIST = ['Kirpal Bagh', 'Kirpal Ashram', 'Sawan Ashram', 'Burari'];

const App: React.FC = () => {
  const [activeVolunteer, setActiveVolunteer] = useState<Volunteer | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_VOLUNTEER);
    return saved ? JSON.parse(saved) : null;
  });

  const [activeView, setActiveView] = useState<ViewState>('Attendance');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  
  // Daily Settings State
  const [dailySettings, setDailySettings] = useState<DailySettings>({
    locations: [],
    startDate: new Date().toISOString().split('T')[0],
    startTime: '07:00',
    endDate: new Date().toISOString().split('T')[0],
    endTime: '17:00'
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [customLocation, setCustomLocation] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [selectedDashboardDate, setSelectedDashboardDate] = useState(new Date().toISOString().split('T')[0]);

  // Handle Login and Settings Prompt
  const handleLogin = (volunteer: Volunteer) => {
    setActiveVolunteer(volunteer);
    localStorage.setItem(STORAGE_KEY_VOLUNTEER, JSON.stringify(volunteer));
    checkAndPromptSettings();
  };

  const checkAndPromptSettings = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      // Use .select().limit(1) instead of .maybeSingle() to avoid errors if duplicates exist
      const { data, error } = await supabase
        .from('daily_settings')
        .select('location, start_time, end_time')
        .eq('date', today)
        .limit(1);
      
      if (error) throw error;

      const settings = data && data.length > 0 ? data[0] : null;

      if (settings && settings.location && settings.start_time && settings.end_time) {
        // Robust parsing for 'YYYY-MM-DD HH:MM' or 'YYYY-MM-DDTHH:MM'
        const parseDateTime = (dt: string) => {
           if (!dt) return { date: today, time: '00:00' };
           const cleanDt = dt.replace('T', ' '); // Handle ISO format
           const parts = cleanDt.split(' ');
           return { 
             date: parts[0] || today, 
             time: parts[1] ? parts[1].substring(0, 5) : '00:00' 
           };
        };

        const start = parseDateTime(settings.start_time);
        const end = parseDateTime(settings.end_time);
        
        setDailySettings({
          locations: (settings.location || '').split(',').map((s: string) => s.trim()).filter(Boolean),
          startDate: start.date,
          startTime: start.time,
          endDate: end.date,
          endTime: end.time
        });
        // Crucial: explicitly hide modal if data exists
        setShowSettingsModal(false);
      } else {
        // Pre-fill defaults or partial data if available
        if (settings) {
           const parseDateTime = (dt: string) => {
             if (!dt) return { date: today, time: '' };
             const cleanDt = dt.replace('T', ' ');
             const parts = cleanDt.split(' ');
             return { date: parts[0] || today, time: parts[1] ? parts[1].substring(0, 5) : '' };
           };

           const start = parseDateTime(settings.start_time || '');
           const end = parseDateTime(settings.end_time || '');

           setDailySettings(prev => ({
             locations: settings.location ? settings.location.split(',').map((s: string) => s.trim()) : prev.locations,
             startDate: start.date || prev.startDate,
             startTime: start.time || prev.startTime,
             endDate: end.date || prev.endDate,
             endTime: end.time || prev.endTime
           }));
        }
        setShowSettingsModal(true);
      }
    } catch (err) {
      console.error("Settings Check Error:", err);
      // In case of error, showing modal is safer so user can retry/configure
      setShowSettingsModal(true);
    }
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    setShowSettingsModal(false);
    
    // Combine Date and Time for storage
    const fullStartTime = `${dailySettings.startDate} ${dailySettings.startTime}`;
    const fullEndTime = `${dailySettings.endDate} ${dailySettings.endTime}`;
    const locationsString = dailySettings.locations.join(', ');

    await supabase.from('daily_settings').upsert({ 
      date: today, 
      location: locationsString,
      start_time: fullStartTime,
      end_time: fullEndTime
    }, { onConflict: 'date' });
  };

  const toggleLocation = (loc: string) => {
    setDailySettings(prev => {
      if (prev.locations.includes(loc)) {
        return { ...prev, locations: prev.locations.filter(l => l !== loc) };
      } else {
        return { ...prev, locations: [...prev.locations, loc] };
      }
    });
  };

  const handleAddCustomLocation = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!customLocation.trim()) return;
    const formatted = customLocation.trim();
    if (!dailySettings.locations.includes(formatted)) {
      setDailySettings(prev => ({
        ...prev,
        locations: [...prev.locations, formatted]
      }));
    }
    setCustomLocation('');
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
      checkAndPromptSettings();
      const today = new Date().toISOString().split('T')[0];
      fetchAttendance(today).then(data => {
        setAttendance(data);
        setLoading(false);
      });
    }
  }, [activeVolunteer, checkAndPromptSettings]);

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

    // Default location logic: Use the first selected location or the one provided
    const defaultLocation = dailySettings.locations.length > 0 ? dailySettings.locations[0] : '';

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
      workshop_location: details.workshopLocation || defaultLocation
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
    const defaultLocation = dailySettings.locations.length > 0 ? dailySettings.locations[0] : '';
    
    await saveAttendance(newId, { 
      name,
      gender,
      group,
      inTime: nowTime, 
      workshopLocation: defaultLocation,
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

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr.split('-').reverse().join('-');
  };

  if (!activeVolunteer) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Configuration Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-6 md:p-10 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-500 overflow-y-auto max-h-[90vh] no-scrollbar">
             <div>
               <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-4 text-2xl md:text-3xl">⚙️</div>
               <h2 className="text-2xl md:text-3xl font-black text-slate-900">Duty Configuration</h2>
               <p className="text-slate-500 text-xs md:text-sm mt-2 font-medium">Set Sewa parameters for {formatDisplayDate(new Date().toISOString().split('T')[0])}</p>
             </div>
             
             <form onSubmit={handleSaveSettings} className="space-y-6 text-left">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Duty Locations</label>
                 <div className="grid grid-cols-2 gap-3">
                   {LOCATIONS_LIST.map((loc) => (
                     <button 
                      type="button"
                      key={loc} 
                      onClick={() => toggleLocation(loc)} 
                      className={`py-3 px-2 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-wide border-2 transition-all active:scale-95 ${dailySettings.locations.includes(loc) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'}`}
                     >
                       {loc}
                     </button>
                   ))}
                 </div>
                 
                 {/* Custom Location Input */}
                 <div className="flex gap-2 mt-3 pt-2 border-t border-slate-50">
                    <input 
                      type="text" 
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      placeholder="Add other location..."
                      className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-indigo-400 text-slate-900 placeholder:text-slate-300"
                    />
                    <button 
                      type="button" 
                      onClick={handleAddCustomLocation}
                      disabled={!customLocation.trim()}
                      className="px-5 py-2 bg-slate-800 text-white rounded-xl font-black text-xs uppercase hover:bg-black transition-colors disabled:opacity-50"
                    >
                      Add
                    </button>
                 </div>

                 {/* Display Added Custom Locations */}
                 {dailySettings.locations.filter(l => !LOCATIONS_LIST.includes(l)).length > 0 && (
                   <div className="flex flex-wrap gap-2 mt-2">
                      {dailySettings.locations.filter(l => !LOCATIONS_LIST.includes(l)).map(loc => (
                        <button 
                          key={loc} 
                          type="button"
                          onClick={() => toggleLocation(loc)} 
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors group"
                        >
                          {loc}
                          <span className="opacity-50 group-hover:opacity-100">✕</span>
                        </button>
                      ))}
                   </div>
                 )}
               </div>

               <div className="space-y-4 border-t border-slate-100 pt-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Duty Start</label>
                   <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="date" 
                        required
                        value={dailySettings.startDate}
                        onChange={(e) => setDailySettings(prev => ({...prev, startDate: e.target.value}))}
                        className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs md:text-sm text-slate-900 outline-none focus:border-emerald-500"
                      />
                      <input 
                        type="time" 
                        required
                        value={dailySettings.startTime}
                        onChange={(e) => setDailySettings(prev => ({...prev, startTime: e.target.value}))}
                        className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-xs md:text-sm text-slate-900 text-center outline-none focus:border-emerald-500"
                      />
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">Duty End</label>
                   <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="date" 
                        required
                        value={dailySettings.endDate}
                        onChange={(e) => setDailySettings(prev => ({...prev, endDate: e.target.value}))}
                        className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs md:text-sm text-slate-900 outline-none focus:border-amber-500"
                      />
                      <input 
                        type="time" 
                        required
                        value={dailySettings.endTime}
                        onChange={(e) => setDailySettings(prev => ({...prev, endTime: e.target.value}))}
                        className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-xs md:text-sm text-slate-900 text-center outline-none focus:border-amber-500"
                      />
                   </div>
                 </div>
               </div>

               <button 
                type="submit"
                disabled={dailySettings.locations.length === 0}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 ${dailySettings.locations.length > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
               >
                 Confirm & Enter Portal
               </button>
             </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass-dark text-white shadow-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2 md:py-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-lg md:text-xl shadow-lg">S</div>
            <div>
              <h1 className="text-sm md:text-xl font-black tracking-tight uppercase leading-tight">Security Sewa</h1>
              <p className="text-[9px] md:text-[10px] text-indigo-300 font-medium uppercase tracking-widest leading-tight">
                {activeVolunteer?.name.split(' ')[0]} • {dailySettings.locations.length > 0 ? `${dailySettings.locations.length} Locs` : 'Pending'}
              </p>
            </div>
          </div>
          <button onClick={() => { setActiveVolunteer(null); localStorage.removeItem(STORAGE_KEY_VOLUNTEER); }} className="p-2 md:p-2.5 bg-white/10 rounded-xl hover:bg-red-500/20 hover:text-red-200 transition-all border border-white/5 active:scale-95">
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pt-20 md:pt-28 pb-32 md:pl-56">
        {activeView === 'Attendance' ? (
          <AttendanceManager 
            sewadars={INITIAL_SEWADARS} 
            attendance={attendance} 
            onSaveAttendance={saveAttendance} 
            onAddSewadar={addSewadar} 
            activeVolunteer={activeVolunteer} 
            workshopLocation={dailySettings.locations.join(', ')}
            dutyStartTime={`${dailySettings.startDate} ${dailySettings.startTime}`}
            dutyEndTime={`${dailySettings.endDate} ${dailySettings.endTime}`}
            onChangeLocation={() => setShowSettingsModal(true)}
          />
        ) : (
          <Dashboard 
            attendance={attendance} 
            activeVolunteer={activeVolunteer} 
            onClearAttendance={clearTodayAttendance}
            selectedDate={selectedDashboardDate}
            onDateChange={setSelectedDashboardDate}
            isLoading={loading}
            dutyStartTime={`${dailySettings.startDate} ${dailySettings.startTime}`}
            dutyEndTime={`${dailySettings.endDate} ${dailySettings.endTime}`}
            onOpenSettings={() => setShowSettingsModal(true)}
          />
        )}
      </main>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-6 left-4 right-4 z-50 md:hidden">
        <div className="glass-effect rounded-full shadow-2xl border border-white/50 p-1.5 max-w-sm mx-auto flex gap-1">
          {(['Attendance', 'Dashboard'] as ViewState[]).map((v) => (
            <button key={v} onClick={() => setActiveView(v)} className={`flex-1 py-3.5 rounded-full transition-all text-[10px] font-black uppercase tracking-widest ${activeView === v ? 'text-white bg-indigo-600 shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>{v}</button>
          ))}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed left-0 top-0 bottom-0 z-30 w-52 pt-28 px-4 border-r border-slate-100 bg-white/50 backdrop-blur-sm">
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
