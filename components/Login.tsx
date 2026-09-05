
import React, { useState, useMemo } from 'react';
import { Volunteer, DutyGroup, Notice } from '../types';
import { VOLUNTEERS, GENTS_GROUPS, LADIES_GROUPS } from '../constants';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

interface Props {
  onLogin: (volunteer: Volunteer) => void;
  onShowNotice: () => void;
  onMainScreenChange?: (isMain: boolean) => void;
  latestNotice?: Notice | null;
}

const DEPARTMENT_PASSWORDS: Record<string, string> = {
  'HR Department': 'hr123',
  'HR Table': 'hrtable123',
  'Lost and Found': 'lofo123',
  'PR Department': 'pr123',
  'Langar Department': 'lan123',
  'CCTV Vision Team': 'ccv123',
  'CCTV Maintenance': 'ccm123',
  'Workshop Coordinator': 'coord123',
};

type PortalType = 'GENTS' | 'LADIES' | 'ZONES' | 'BACKOFFICE' | 'SUPERADMIN' | null;

const Login: React.FC<Props> = ({ onLogin, onShowNotice, onMainScreenChange, latestNotice }) => {
  const [portalType, setPortalType] = useState<PortalType>(null);
  const [backOfficeAuthorized, setBackOfficeAuthorized] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [isZoneAuthorized, setIsZoneAuthorized] = useState(false);
  const [zoneAttendanceView, setZoneAttendanceView] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DutyGroup | null>(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Notify parent of screen changes
  React.useEffect(() => {
    onMainScreenChange?.(!portalType);
  }, [portalType, onMainScreenChange]);

  const handlePortalSelect = (type: PortalType) => {
    setPortalType(type);
    setBackOfficeAuthorized(false);
    setSelectedZone(null);
    setIsZoneAuthorized(false);
    setZoneAttendanceView(false);
    setPassword('');
    setError('');
    if (type === 'SUPERADMIN') {
      setSelectedGroup(null);
      const sa = VOLUNTEERS.find(v => v.id === 'sa');
      if (sa) setSelectedVolunteer(sa);
    } else {
      setSelectedGroup(null);
      setSelectedVolunteer(null);
    }
  };

  const handleGroupSelect = (day: DutyGroup) => {
    setSelectedGroup(day);
    if (portalType === 'BACKOFFICE') {
      const adminVol = VOLUNTEERS.find(v => v.id === 'admin');
      if (adminVol) setSelectedVolunteer(adminVol);
    }
  };

  const availableIncharges = useMemo(() => {
    if (portalType === 'SUPERADMIN') {
      return VOLUNTEERS.filter(v => v.id === 'sa');
    }
    if (portalType === 'BACKOFFICE') {
      return VOLUNTEERS.filter(v => v.id === 'admin');
    }
    if (!selectedGroup) return [];
    
    const roleFilter = portalType === 'LADIES' ? 'Ladies Admin' : 'Gents Admin';
    return VOLUNTEERS.filter(v => v.assignedGroup === selectedGroup && v.role === roleFilter);
  }, [selectedGroup, portalType]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (portalType === 'BACKOFFICE') {
      if (!backOfficeAuthorized) {
        if (password === '123') {
          setBackOfficeAuthorized(true);
          setPassword('');
          setError('');
        } else {
          setError('Incorrect password.');
        }
        return;
      }

      if (selectedGroup) {
        const expected = DEPARTMENT_PASSWORDS[selectedGroup];
        const isMatch = (expected && password === expected) ||
          (selectedGroup === 'HR Table' && (password === 'hrtable123' || password === 'hrt123' || password === 'hr123'));
        if (isMatch) {
          const adminVol = VOLUNTEERS.find(v => v.id === (selectedGroup === 'HR Table' ? 'admin_hr_table' : 'admin')) || {
            id: selectedGroup === 'HR Table' ? 'admin_hr_table' : 'admin',
            name: `${selectedGroup} Admin`,
            role: 'Back Office Admin',
            password: password
          };
          if (selectedGroup === 'Workshop Coordinator') {
            onLogin({
              ...adminVol,
              id: 'workshop_coordinator',
              name: 'Workshop Coordinator',
              role: 'Back Office Admin',
              assignedGroup: undefined,
              password: password
            });
          } else {
            onLogin({
              ...adminVol,
              id: selectedGroup === 'HR Table' ? 'admin_hr_table' : adminVol.id,
              name: `${selectedGroup} Admin`,
              role: 'Back Office Admin',
              assignedGroup: selectedGroup,
              password: password
            });
          }
        } else {
          setError('Incorrect password.');
        }
        return;
      }
    }

    if (!selectedVolunteer) return;

    setIsAuthenticating(true);
    setError('');

    try {
      // 1. Check Firestore for overridden password with a 3-second timeout
      const firestorePromise = getDoc(doc(db, 'volunteers', selectedVolunteer.id));
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );

      let data = null;
      try {
        const result: any = await Promise.race([firestorePromise, timeoutPromise]);
        if (result.exists()) {
          data = { id: result.id, ...result.data() };
        }
      } catch (timeoutErr) {
        console.warn('Firestore password check timed out, using local fallback');
      }
      
      const effectivePassword = data?.password || selectedVolunteer.password;

      if (password === effectivePassword) {
        onLogin({ ...selectedVolunteer, password: effectivePassword });
      } else {
        // Fallback check for Super Admin PIN (original behavior)
        const superAdmin = VOLUNTEERS.find(v => v.id === 'sa');
        if (superAdmin && password === superAdmin.password) {
          onLogin(superAdmin);
        } else {
          setError('Incorrect password.');
        }
      }
    } catch (err) {
      if (password === selectedVolunteer.password) {
        onLogin(selectedVolunteer);
      } else {
        setError('Incorrect password.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const goBackStep = () => {
    if (portalType === 'ZONES') {
      if (zoneAttendanceView) {
        setZoneAttendanceView(false);
      } else if (isZoneAuthorized) {
        setIsZoneAuthorized(false);
        setSelectedZone(null);
      } else if (selectedZone) {
        setSelectedZone(null);
      } else {
        setPortalType(null);
      }
      setPassword('');
      setError('');
      return;
    }
    if (portalType === 'BACKOFFICE') {
      if (selectedGroup) {
        setSelectedGroup(null);
        setSelectedVolunteer(null);
      } else if (backOfficeAuthorized) {
        setBackOfficeAuthorized(false);
      } else {
        setPortalType(null);
      }
    } else if (selectedVolunteer) {
      if (portalType === 'SUPERADMIN') {
        setPortalType(null);
        setSelectedVolunteer(null);
      } else {
        setSelectedVolunteer(null);
      }
    } else if (selectedGroup) {
      setSelectedGroup(null);
    } else {
      setPortalType(null);
    }
    setPassword('');
    setError('');
  };

  const handlePunjabPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = password.trim();
    if (cleanPass.toLowerCase() === 'pun123') {
      setIsZoneAuthorized(true);
      setPassword('');
      setError('');
    } else {
      setError('Incorrect password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
      <div className="max-w-md w-full py-8">
        {/* 1. Main Portal Selection Screen */}
        {!portalType && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-indigo-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <span className="text-3xl">👮</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Security Portal</h1>
              <p className="text-slate-500 mt-2 font-medium">Select entry to begin duty</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button onClick={() => handlePortalSelect('GENTS')} className="group bg-white p-6 rounded-[2rem] border-2 border-indigo-100 hover:border-indigo-500 transition-all flex items-center gap-6 active:scale-95">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl">👮‍♂️</div>
                <div className="text-left"><h3 className="text-xl font-black text-slate-800">Gents</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Assignment Portal</p></div>
              </button>
              <button onClick={() => handlePortalSelect('LADIES')} className="group bg-white p-6 rounded-[2rem] border-2 border-pink-100 hover:border-pink-500 transition-all flex items-center gap-6 active:scale-95">
                <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center text-3xl">👩</div>
                <div className="text-left"><h3 className="text-xl font-black text-slate-800">Ladies</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Assignment Portal</p></div>
              </button>
              <button onClick={() => handlePortalSelect('ZONES')} className="group bg-white p-6 rounded-[2rem] border-2 border-amber-100 hover:border-amber-500 transition-all flex items-center gap-6 active:scale-95">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl">🌐</div>
                <div className="text-left"><h3 className="text-xl font-black text-slate-800">Zones</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Regional Portal</p></div>
              </button>
              <button onClick={() => handlePortalSelect('BACKOFFICE')} className="group bg-white p-6 rounded-[2rem] border-2 border-slate-100 hover:border-slate-900 transition-all flex items-center gap-6 active:scale-95">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl">📁</div>
                <div className="text-left"><h3 className="text-xl font-black text-slate-800">Back Office</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Management Portal</p></div>
              </button>
              <button onClick={() => handlePortalSelect('SUPERADMIN')} className="group bg-white p-6 rounded-[2rem] border-2 border-red-100 hover:border-red-500 transition-all flex items-center gap-6 active:scale-95">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-3xl">🔑</div>
                <div className="text-left"><h3 className="text-xl font-black text-slate-800">Super Admin</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Master Portal</p></div>
              </button>
              <button onClick={onShowNotice} className="relative group bg-emerald-600 p-6 rounded-[2rem] border-2 border-emerald-500 hover:bg-emerald-700 transition-all flex items-center gap-6 active:scale-95 text-white">
                {latestNotice && (Date.now() - latestNotice.timestamp < 3 * 24 * 60 * 60 * 1000) && (
                  <div className="absolute -top-4 -right-4 bg-white text-emerald-600 px-4 py-2 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-blink border-[3px] border-emerald-400 z-10 scale-110">
                    <span className="text-base">☁️</span>
                    <span className="uppercase tracking-widest">New</span>
                  </div>
                )}
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">⚠️</div>
                <div className="text-left">
                  <h3 className="text-xl font-black">Important Notice</h3>
                  <div className="flex flex-col mt-0.5">
                    <p className="text-[9px] text-white/90 font-black uppercase tracking-widest">
                      {latestNotice ? new Date(latestNotice.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '6 March 2026'}
                    </p>
                    <p className="text-[9px] text-emerald-100 font-bold uppercase tracking-widest">
                      {latestNotice ? latestNotice.title : 'Entry restricted for Mr Ron Filewich'}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Zones Screen 1: Zone Selection */}
        {portalType === 'ZONES' && !selectedZone && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={goBackStep} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 active:scale-95 transition-all">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-none">Select Zone</h2>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1">
                  Zones Portal
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => { setSelectedZone('Punjab'); setPassword(''); setError(''); }}
                className="group bg-white p-6 rounded-[2rem] border-2 border-amber-100 hover:border-amber-500 transition-all flex items-center gap-6 active:scale-95 text-left"
              >
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl">🌾</div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Punjab</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Zone Portal</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Zones Screen 2: Punjab Password Login */}
        {portalType === 'ZONES' && selectedZone === 'Punjab' && !isZoneAuthorized && (
          <div className="animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={goBackStep} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 active:scale-95 transition-all">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-none">Access Required</h2>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1">
                  Punjab Zone Login
                </p>
              </div>
            </div>
            <form onSubmit={handlePunjabPasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Zone Password</label>
                <input
                  type="password"
                  required
                  autoFocus
                  className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-amber-500"
                  placeholder="••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
              <button type="submit" className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                Unlock Punjab Zone
              </button>
            </form>
          </div>
        )}

        {/* Zones Screen 3: Punjab Menu (Zone Structure & Zone Attendance) */}
        {portalType === 'ZONES' && selectedZone === 'Punjab' && isZoneAuthorized && !zoneAttendanceView && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={goBackStep} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 active:scale-95 transition-all">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-none">Punjab Zone</h2>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1">
                  Select Portal Option
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => {
                  onLogin({
                    id: 'punjab_zone_structure',
                    name: 'Punjab Zone Structure',
                    role: 'Punjab - Zone Structure',
                    assignedGroup: 'Punjab Zone Structure',
                    password: password || 'pun123'
                  });
                }}
                className="group bg-white p-6 rounded-[2rem] border-2 border-slate-100 hover:border-amber-500 transition-all flex items-center gap-6 active:scale-95 text-left"
              >
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl">🏛️</div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Zone Structure</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Organizational Structure</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setZoneAttendanceView(true);
                  setError('');
                }}
                className="group bg-white p-6 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-500 transition-all flex items-center gap-6 active:scale-95 text-left"
              >
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl">📋</div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Zone Attendance</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Attendance Management</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Zones Screen 4: Zone Attendance Menu (Gents & Ladies) */}
        {portalType === 'ZONES' && selectedZone === 'Punjab' && isZoneAuthorized && zoneAttendanceView && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={goBackStep} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 active:scale-95 transition-all">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-none">Zone Attendance</h2>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">
                  Punjab Zone • Select Category
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => {
                  onLogin({
                    id: 'punjab_zone_att_gents',
                    name: 'Punjab Zone (Gents)',
                    role: 'Punjab - Zone Attendance (Gents)',
                    assignedGroup: 'Punjab',
                    password: password || 'pun123'
                  });
                }}
                className="group bg-white p-6 rounded-[2rem] border-2 border-indigo-100 hover:border-indigo-500 transition-all flex items-center gap-6 active:scale-95 text-left"
              >
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl">👮‍♂️</div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Gents</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Punjab Zone Attendance</p>
                </div>
              </button>

              <button
                onClick={() => {
                  onLogin({
                    id: 'punjab_zone_att_ladies',
                    name: 'Punjab Zone (Ladies)',
                    role: 'Punjab - Zone Attendance (Ladies)',
                    assignedGroup: 'Punjab Zone Ladies',
                    password: password || 'pun123'
                  });
                }}
                className="group bg-white p-6 rounded-[2rem] border-2 border-pink-100 hover:border-pink-500 transition-all flex items-center gap-6 active:scale-95 text-left"
              >
                <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center text-3xl">👩</div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Ladies</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Punjab Zone Attendance</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 2. Back Office Stage 1 Password Authorization (Requires "123") */}
        {portalType === 'BACKOFFICE' && !backOfficeAuthorized && (
          <div className="animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={goBackStep} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 active:scale-95 transition-all">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-none">Management Access</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                  Back Office Portal
                </p>
              </div>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Password</label>
                <input type="password" required className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-slate-800" placeholder="••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
              <button type="submit" className="w-full py-4 bg-slate-805 bg-slate-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                Authorize
              </button>
            </form>
          </div>
        )}

        {/* 3. Group Selection Screen (Gents Groups, Ladies Groups, or Back Office Departments) */}
        {portalType && portalType !== 'ZONES' && (portalType !== 'SUPERADMIN' && (portalType !== 'BACKOFFICE' || backOfficeAuthorized)) && !selectedGroup && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={goBackStep} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 active:scale-95 transition-all">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <h2 className="text-2xl font-black text-slate-900">Select Group</h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {portalType === 'BACKOFFICE' ? (
                ['HR Department', 'HR Table', 'Lost and Found', 'PR Department', 'Langar Department', 'CCTV Vision Team', 'CCTV Maintenance', 'Workshop Coordinator'].map(group => (
                  <button key={group} onClick={() => handleGroupSelect(group)} className="w-full bg-white p-5 rounded-2xl border-2 border-slate-100 hover:border-slate-800 text-slate-700 transition-all text-left font-black active:scale-95">
                    {group}
                  </button>
                ))
              ) : (
                (portalType === 'GENTS' ? GENTS_GROUPS : LADIES_GROUPS)
                  .filter(group => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].includes(group))
                  .map(group => (
                    <button key={group} onClick={() => handleGroupSelect(group)} className={`w-full bg-white p-5 rounded-2xl border-2 transition-all text-left font-black active:scale-95 ${portalType === 'LADIES' ? 'border-pink-50 hover:border-pink-500 text-pink-700' : 'border-slate-100 hover:border-indigo-500 text-slate-700'}`}>{group} Group</button>
                  ))
              )}
            </div>
          </div>
        )}

        {/* 4. Back Office Stage 2 Password Authorization (Department-specific) */}
        {portalType === 'BACKOFFICE' && backOfficeAuthorized && selectedGroup && (
          <div className="animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={goBackStep} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 active:scale-95 transition-all">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-none">Access Required</h2>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">
                  {selectedGroup} Admin Login
                </p>
              </div>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pin / Password</label>
                <input type="password" required className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500" placeholder="••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                Unlock Portal
              </button>
            </form>
          </div>
        )}

        {/* 5. Gents / Ladies / Super Admin Login Form */}
        {portalType && portalType !== 'BACKOFFICE' && portalType !== 'ZONES' && (portalType === 'SUPERADMIN' || selectedGroup) && (
          <div className="animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={goBackStep} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 active:scale-95 transition-all">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-none">Access Required</h2>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">
                  {portalType === 'SUPERADMIN' ? 'Master Admin' : `${selectedGroup} Assignment`}
                </p>
              </div>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Incharge Name</label>
                <select className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500" value={selectedVolunteer?.id || ''} onChange={(e) => setSelectedVolunteer(availableIncharges.find(v => v.id === e.target.value) || null)}>
                  <option value="">Select your name...</option>
                  {availableIncharges.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pin / Password</label>
                <input type="password" required className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500" placeholder="••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
              <button type="submit" disabled={isAuthenticating} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                {isAuthenticating ? 'Unlocking...' : 'Unlock Portal'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
