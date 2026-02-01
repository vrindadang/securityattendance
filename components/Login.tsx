
import React, { useState, useMemo } from 'react';
import { Volunteer, GentsGroup } from '../types';
import { VOLUNTEERS, GENTS_GROUPS } from '../constants';

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
  const [showPassword, setShowPassword] = useState(false);

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
    return VOLUNTEERS.filter(v => v.assignedGroup === selectedGroup);
  }, [selectedGroup]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVolunteer && password === selectedVolunteer.password) {
      onLogin(selectedVolunteer);
    } else {
      const superAdmin = VOLUNTEERS.find(v => v.id === 'sa');
      if (superAdmin && password === superAdmin.password) {
        onLogin(superAdmin);
      } else {
        setError('Incorrect password. Please try again.');
      }
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600"></div>
      
      <div className="max-w-md w-full py-12 relative z-10">
        {!portalType ? (
          /* Step 1: Portal Selection (Gents or Ladies) */
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center mb-12">
              <div className="w-24 h-24 bg-indigo-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl ring-8 ring-indigo-50">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Security Portal</h1>
              <p className="text-slate-500 mt-2 font-medium">Select entry to begin duty</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <button
                onClick={() => handlePortalSelect('GENTS')}
                className="group bg-white p-10 rounded-[2.5rem] border-2 border-indigo-100 hover:border-indigo-500 hover:shadow-indigo-100 hover:shadow-2xl transition-all flex items-center gap-8 active:scale-[0.98]"
              >
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-4xl shadow-inner group-hover:bg-indigo-600 transition-colors">
                  👮‍♂️
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">Gents</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Assignment Portal</p>
                </div>
              </button>
              
              <button
                onClick={() => handlePortalSelect('LADIES')}
                className="group bg-white p-10 rounded-[2.5rem] border-2 border-pink-100 hover:border-pink-500 hover:shadow-pink-100 hover:shadow-2xl transition-all flex items-center gap-8 active:scale-[0.98]"
              >
                <div className="w-20 h-20 bg-pink-50 rounded-3xl flex items-center justify-center text-4xl shadow-inner group-hover:bg-pink-600 transition-colors">
                  👩
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-black text-slate-800 group-hover:text-pink-600 transition-colors">Ladies</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Assignment Portal</p>
                </div>
              </button>
            </div>
          </div>
        ) : portalType === 'GENTS' && !selectedGroup ? (
          /* Step 2 (Gents Only): Group Selection (Mon-Sun) */
          <div className="animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-4 mb-10">
              <button onClick={goBackStep} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all active:scale-95">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-none">Select Group</h2>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Gents Assignment Profiles</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {GENTS_GROUPS.map((day) => (
                <button
                  key={day}
                  onClick={() => handleGroupSelect(day)}
                  className="w-full bg-white p-5 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:shadow-xl transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      📅
                    </div>
                    <span className="text-lg font-black text-slate-800 group-hover:text-indigo-600">{day} Group</span>
                  </div>
                  <div className="text-slate-300 group-hover:text-indigo-400">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : !selectedVolunteer ? (
          /* Step 2.5: Incharge Selection */
          <div className="animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-4 mb-10">
              <button onClick={goBackStep} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all active:scale-95">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-none">Select Incharge</h2>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">{selectedGroup} Profile</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {availableIncharges.map((vol, idx) => (
                <button
                  key={vol.id}
                  onClick={() => {
                    setSelectedVolunteer(vol);
                    setError('');
                    setPassword('');
                  }}
                  className="w-full bg-white p-8 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-500 hover:shadow-2xl transition-all flex items-center gap-6 group active:scale-[0.98]"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl transition-colors ${
                    portalType === 'GENTS' ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-pink-50 text-pink-600 group-hover:bg-pink-600 group-hover:text-white'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="text-left">
                    <span className="text-xl font-black text-slate-800 group-hover:text-indigo-600">{vol.name}</span>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Assigned Officer</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Step 3: Password Verification */
          <div className="animate-in zoom-in-95 fade-in duration-300">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 relative overflow-hidden">
              <div className={`absolute top-0 right-0 p-4 font-black text-[8px] uppercase tracking-widest ${portalType === 'GENTS' ? 'text-indigo-300' : 'text-pink-300'}`}>
                {selectedGroup} Portal Active
              </div>

              <div className="text-center mb-10">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner ${
                  portalType === 'GENTS' ? 'bg-indigo-50' : 'bg-pink-50'
                }`}>
                  {portalType === 'GENTS' ? '👮‍♂️' : '👩'}
                </div>
                <h2 className="text-3xl font-black text-slate-900">{selectedVolunteer?.name}</h2>
                <p className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">Verification Required</p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center block">Enter Portal Secret</label>
                  <div className="relative">
                    <input
                      autoFocus
                      type={showPassword ? "text" : "password"}
                      className={`w-full px-6 py-5 bg-slate-50 border rounded-2xl outline-none focus:ring-8 font-bold transition-all text-center tracking-[0.5em] text-2xl ${
                        error 
                          ? 'border-red-300 ring-red-50 ring-8' 
                          : 'border-slate-100 focus:border-indigo-300 focus:ring-indigo-50'
                      }`}
                      placeholder="••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors p-2"
                    >
                      {showPassword ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      ) : (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.882 9.882L9.75 9.75M13.125 13.125l.125.125m9.938-9.938l-20.312 20.312" /></svg>
                      )}
                    </button>
                  </div>
                  {error && (
                    <p className="text-[10px] font-bold text-red-500 text-center animate-bounce mt-3">{error}</p>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={!password}
                    className={`w-full py-6 rounded-2xl font-black text-xl shadow-2xl transition-all transform active:scale-95 ${
                      password 
                        ? 'bg-slate-900 text-white hover:bg-black shadow-slate-200' 
                        : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    Enter Portal
                  </button>
                  
                  <button 
                    type="button"
                    onClick={goBackStep}
                    className="w-full py-4 text-slate-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest transition-colors"
                  >
                    Switch Selection
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        <p className="text-center text-slate-300 text-[10px] mt-12 font-black uppercase tracking-[0.4em]">
          SKRM Security Workforce
        </p>
      </div>
    </div>
  );
};

export default Login;
