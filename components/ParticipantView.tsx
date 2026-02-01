import React, { useState, useMemo } from 'react';
import { Sewadar, AttendanceRecord, ScoreRecord } from '../types';
import { GENTS_GROUPS } from '../constants';

interface Props {
  sewadars: Sewadar[];
  attendance: AttendanceRecord[];
  scores: ScoreRecord[];
  onAdminLogin: () => void;
}

// Fixed ScorerCard type to include React component attributes like 'key' by moving it outside and using React.FC
const ScorerCard: React.FC<{ scorer: any, idx: number, gender: 'Ladies' | 'Gents' }> = ({ scorer, idx, gender }) => (
  <div className={`bg-white p-4 rounded-2xl shadow-sm border-l-[6px] ${gender === 'Ladies' ? 'border-l-pink-500' : 'border-l-indigo-600'} border-y border-r border-slate-100 flex items-center justify-between group transition-all hover:shadow-md`}>
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 ${gender === 'Ladies' ? 'bg-pink-50 text-pink-600' : 'bg-indigo-50 text-indigo-600'} rounded-xl flex items-center justify-center font-black text-xs`}>#{idx + 1}</div>
      <div>
        <p className="font-black text-slate-800 text-sm leading-none">{scorer.name}</p>
        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">
          {scorer.group}
        </p>
      </div>
    </div>
    <div className="text-right">
       <span className={`font-black ${gender === 'Ladies' ? 'text-pink-600' : 'text-indigo-600'} text-lg block leading-none`}>{scorer.totalPoints}</span>
       <span className="text-[7px] text-slate-400 font-bold uppercase">Pts</span>
    </div>
  </div>
);

const ParticipantView: React.FC<Props> = ({ sewadars, attendance, scores, onAdminLogin }) => {
  const [searchName, setSearchName] = useState('');
  const [selectedSewadarId, setSelectedSewadarId] = useState<string | null>(null);

  const teamStandings = useMemo(() => {
    const allGroups = [...GENTS_GROUPS, 'Ladies'];
    return allGroups.map(group => {
      const groupSewadars = sewadars.filter(s => s.group === group);
      const groupPoints = scores.filter(sc => 
        groupSewadars.some(s => s.id === sc.sewadarId) && !sc.isDeleted
      ).reduce((sum, sc) => sum + sc.points, 0);
      return { name: group, points: groupPoints };
    }).sort((a, b) => {
      // Ladies always on top
      if (a.name === 'Ladies') return -1;
      if (b.name === 'Ladies') return 1;
      // Sort others by points descending
      return b.points - a.points;
    });
  }, [sewadars, scores]);

  const topLadies = useMemo(() => {
    return sewadars
      .filter(s => s.gender === 'Ladies')
      .map(s => ({
        ...s,
        totalPoints: scores
          .filter(sc => sc.sewadarId === s.id && !sc.isDeleted)
          .reduce((sum, sc) => sum + sc.points, 0)
      }))
      .filter(s => s.totalPoints > 0)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 3);
  }, [sewadars, scores]);

  const topGents = useMemo(() => {
    return sewadars
      .filter(s => s.gender === 'Gents')
      .map(s => ({
        ...s,
        totalPoints: scores
          .filter(sc => sc.sewadarId === s.id && !sc.isDeleted)
          .reduce((sum, sc) => sum + sc.points, 0)
      }))
      .filter(s => s.totalPoints > 0)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 3);
  }, [sewadars, scores]);

  const searchResults = useMemo(() => {
    if (searchName.length < 2) return [];
    return sewadars
      .filter(s => s.name.toLowerCase().includes(searchName.toLowerCase()))
      .slice(0, 10);
  }, [sewadars, searchName]);

  const selectedSewadar = sewadars.find(s => s.id === selectedSewadarId);
  const individualScores = scores.filter(s => s.sewadarId === selectedSewadarId);
  const totalIndividualPoints = individualScores.filter(s => !s.isDeleted).reduce((sum, s) => sum + s.points, 0);

  return (
    <div className="flex flex-col gap-8 pb-8">
      
      {/* Split Layout for Standings & Top Scorers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* 1. Team Standings */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Team Standings</h2>
            <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center text-sm font-black shadow-sm">🏆</div>
          </div>
          <div className="space-y-3">
            {teamStandings.map((team, idx) => (
              <div key={team.name} className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between transition-all ${idx === 0 ? 'ring-2 ring-amber-400' : ''}`}>
                <div className="flex items-center gap-4">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${
                    idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    #{idx + 1}
                  </span>
                  <span className="font-black text-slate-700 text-sm">
                    {team.name === 'Ladies' ? '👩' : '👮‍♂️'} {team.name}
                  </span>
                </div>
                <span className="font-black text-slate-900 text-lg">{team.points} <span className="text-[8px] text-slate-400 font-bold uppercase ml-1">Pts</span></span>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Top Performers (Ladies & Gents) */}
        <section className="space-y-6">
          {/* Top 3 Ladies */}
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span className="p-1.5 bg-pink-100 rounded-lg text-pink-600 text-xs">👩</span> Top 3 Ladies
              </h2>
            </div>
            <div className="space-y-2">
              {topLadies.map((scorer, idx) => (
                <ScorerCard key={scorer.id} scorer={scorer} idx={idx} gender="Ladies" />
              ))}
              {topLadies.length === 0 && (
                <div className="p-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-[10px] text-slate-400 font-medium italic">No scores yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Top 3 Gents */}
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600 text-xs">👮‍♂️</span> Top 3 Gents
              </h2>
            </div>
            <div className="space-y-2">
              {topGents.map((scorer, idx) => (
                <ScorerCard key={scorer.id} scorer={scorer} idx={idx} gender="Gents" />
              ))}
              {topGents.length === 0 && (
                <div className="p-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-[10px] text-slate-400 font-medium italic">No scores yet.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* 3. Individual Lookup Tool */}
      <div className="bg-indigo-900 rounded-[2rem] p-6 md:p-8 text-white shadow-2xl relative">
        <div className="relative z-20">
          <h2 className="text-xl font-black mb-2">Check Your Score</h2>
          <p className="text-indigo-200 mb-6 font-medium text-xs leading-relaxed opacity-80">Enter your name to see your detailed performance logs.</p>
          
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search your name..." 
              className="w-full bg-white/10 border border-white/20 rounded-2xl py-3.5 px-6 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-base shadow-inner"
              value={searchName}
              onChange={(e) => {
                setSearchName(e.target.value);
                if (e.target.value === '') setSelectedSewadarId(null);
              }}
            />
            {searchName.length > 0 && (
              <button 
                onClick={() => {setSearchName(''); setSelectedSewadarId(null);}} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white z-30"
              >
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            
            {searchResults.length > 0 && !selectedSewadarId && (
              <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden text-slate-900 z-[100] ring-1 ring-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="max-h-[260px] overflow-y-auto">
                  {searchResults.map(s => (
                    <button 
                      key={s.id}
                      onClick={() => { setSelectedSewadarId(s.id); setSearchName(s.name); }}
                      className="w-full text-left px-6 py-4 hover:bg-indigo-50 border-b border-slate-100 last:border-0 flex justify-between items-center transition-all active:bg-indigo-100"
                    >
                      <div>
                        <p className="font-black text-slate-800 text-sm">{s.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                          {s.group === 'Ladies' ? '👩' : '👮‍♂️'} {s.group}
                        </p>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* Individual Detail View (Appears right after search) */}
      {selectedSewadarId && selectedSewadar && (
        <section className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="flex flex-col md:flex-row justify-between gap-6 border-b border-slate-100 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl shadow-inner">
                 {selectedSewadar.name[0]}
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">{selectedSewadar.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {selectedSewadar.group === 'Ladies' ? '👩' : '👮‍♂️'} {selectedSewadar.group}
                </p>
              </div>
            </div>
            <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-lg flex flex-col items-center justify-center">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Your Score</span>
              <span className="text-3xl font-black">{totalIndividualPoints}</span>
            </div>
          </div>

          <div className="space-y-3">
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Achievement History</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {individualScores.slice().reverse().map(score => {
                   const isDeleted = score.isDeleted;
                   return (
                      <div key={score.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          isDeleted ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                             isDeleted ? 'bg-red-100 text-red-500' : (score.game === 'Daily Attendance' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600')
                          }`}>
                            {isDeleted ? '✕' : (score.game === 'Daily Attendance' ? '✓' : '🏆')}
                          </div>
                          <div>
                            <p className={`font-black text-[11px] ${isDeleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{score.game}</p>
                            <p className={`text-[8px] font-bold uppercase tracking-tight ${isDeleted ? 'text-red-400' : 'text-slate-400'}`}>
                               {isDeleted ? 'Revoked / Deleted' : `Earned on ${new Date(score.timestamp).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <span className={`text-base font-black ${isDeleted ? 'text-slate-300 line-through' : 'text-emerald-600'}`}>+{score.points}</span>
                      </div>
                   );
                })}
                {individualScores.length === 0 && (
                  <p className="text-slate-400 italic text-xs py-4 text-center w-full">No scores recorded yet.</p>
                )}
             </div>
          </div>
        </section>
      )}

      {/* Footer / Login Link */}
      <div className="mt-8 text-center">
        <button 
          onClick={onAdminLogin} 
          className="bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-sm active:scale-95"
        >
          Back Office Login
        </button>
      </div>
    </div>
  );
};

export default ParticipantView;