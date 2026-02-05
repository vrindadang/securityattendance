
import React, { useState, useMemo } from 'react';
import { Volunteer, GentsGroup } from '../types';
import { VOLUNTEERS, GENTS_GROUPS } from '../constants';
import { supabase } from '../supabase';

interface Props {
  onLogin: (volunteer: Volunteer) => void;
}

type PortalType = 'GENTS' | 'LADIES' | null;

const Login: React.FC<Props> = ({ onLogin }) => {
  const [portalType, setPortalType] = useState<PortalType>(null);
  const [selectedGroup, setSelectedGroup] = useState<GentsGroup | 'Ladies' | null>(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handlePortalSelect = (type: PortalType) => {
    setPortalType(type);
    if (type === 'LADIES') {
      setSelectedGroup('Ladies');
    }
  };

  const handleGroupSelect = (day: GentsGroup) => {
    setSelectedGroup(day);
  };

  const availableIncharges = useMemo(() => {
    if (!selectedGroup) return [];
    return VOLUNTEERS.filter(v => v.assignedGroup === selectedGroup && v.role !== 'Super Admin');
  }, [selectedGroup]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVolunteer) return;

    setIsAuthenticating(true);
    setError('');

    try {
      // 1. Check Supabase for overridden password
      const { data, error: dbError } = await supabase
        .from('volunteers')
        .select('password')
        .eq('id', selectedVolunteer.id)
        .single();
      
      const effectivePassword = data?.password || selectedVolunteer.password;

      if (password === effectivePassword) {
        onLogin({ ...selectedVolunteer, password: effectivePassword });
      } else {
        // Fallback check for Super Admin PIN
        const superAdmin = VOLUNTEERS.find(v => v.id === 'sa');
        if (superAdmin && password === superAdmin.password) {
          onLogin(superAdmin);
        } else {
          setError('Incorrect password.');
        }
      }
    } catch (err) {
      // If error (like record not found), use hardcoded default
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
    if (selectedVolunteer) {
      setSelectedVolunteer(null);
    } else if (selectedGroup) {
      if (portalType === 'LADIES') {
        setPortalType(null);
        setSelectedGroup(null);
      } else {
        setSelectedGroup(null);
      }
    } else {
      setPortalType(null);
    }
    setPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
      <div className="max-w-md w-full py-8">
        {!portalType ? (
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
            </div>
          </div>
        ) : portalType === 'GENTS' && !selectedGroup ? (
          <div className="animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={goBackStep} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 active:scale-95 transition-all">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <h2 className="text-2xl font-black text-slate-900">Select Group</h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {GENTS_GROUPS.map(group => (
                <button key={group} onClick={() => handleGroupSelect(group)} className="w-full bg-white p-5 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 transition-all text-left font-black text-slate-700 active:scale-95">{group} Group</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={goBackStep} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 active:scale-95 transition-all">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-none">Access Required</h2>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">{selectedGroup} Assignment</p>
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
