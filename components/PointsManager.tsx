
import React, { useState, useMemo, useEffect } from 'react';
import { Sewadar, Gender, AttendanceRecord, GentsGroup, ScoreRecord } from '../types';
import { GENTS_GROUPS, VOLUNTEERS, GAMES } from '../constants';

interface Props {
  sewadars: Sewadar[];
  attendance: AttendanceRecord[];
  scores: ScoreRecord[];
  onAddScore: (id: string, game: string, points: number) => void;
  onDeleteScore: (id: string) => void;
  onPromoteTo100?: (scoreId: string) => void;
}

const PointsManager: React.FC<Props> = ({ sewadars, attendance, scores, onAddScore, onDeleteScore, onPromoteTo100 }) => {
  const [genderTab, setGenderTab] = useState<Gender>('Gents');
  const [gentsGroupTab, setGentsGroupTab] = useState<GentsGroup>('Monday');
  const [selectedSewadarId, setSelectedSewadarId] = useState<string>('');
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setConfirmDeleteId(null);
  }, [selectedSewadarId, genderTab, gentsGroupTab]);

  const presentSewadars = useMemo(() => {
    const presentIds = attendance
      .filter(a => a.date === today)
      .map(a => a.sewadarId);
    
    return sewadars
      .filter(s => {
        const isPresent = presentIds.includes(s.id);
        const matchesGender = s.gender === genderTab;
        const matchesGroup = searchTerm ? true : (genderTab === 'Gents' ? s.group === gentsGroupTab : true);
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
        return isPresent && matchesGender && matchesGroup && matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sewadars, attendance, today, genderTab, gentsGroupTab, searchTerm]);

  const handleAwardPoints = () => {
    if (selectedSewadarId && selectedGame) {
      onAddScore(selectedSewadarId, selectedGame, 50);
      setSelectedGame('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!id) return;
    if (confirmDeleteId === id) {
      onDeleteScore(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(current => current === id ? null : current), 3000);
    }
  };

  const getVolunteerName = (id: string) => VOLUNTEERS.find(v => v.id === id)?.name || 'Volunteer';

  const selectedSewadar = sewadars.find(s => s.id === selectedSewadarId);
  const sewadarScores = scores.filter(sc => sc.sewadarId === selectedSewadarId);
  
  const gameCounts = useMemo(() => {
    if (!selectedSewadarId) return {};
    const counts: Record<string, number> = {};
    scores.filter(sc => sc.sewadarId === selectedSewadarId && !sc.isDeleted).forEach(sc => {
      counts[sc.game] = (counts[sc.game] || 0) + 1;
    });
    return counts;
  }, [scores, selectedSewadarId]);

  const totalScore = sewadarScores.reduce((acc, curr) => acc + (curr.isDeleted ? 0 : curr.points), 0);

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-4">
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex gap-2">
          {(['Gents', 'Ladies'] as Gender[]).map((g) => (
            <button
              key={g}
              onClick={() => { setGenderTab(g); setSelectedSewadarId(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
                genderTab === g ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {genderTab === 'Gents' && !searchTerm && (
          <div className="overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
            <div className="flex gap-2 min-w-max">
              {GENTS_GROUPS.map((day) => (
                <button
                  key={day}
                  onClick={() => { setGentsGroupTab(day); setSelectedSewadarId(''); }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${
                    gentsGroupTab === day 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                      : 'bg-white text-slate-400 border-slate-100'
                  }`}
                >
                  👮‍♂️ {day.substring(0, 3)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100">
             <input
              type="text"
              placeholder={`Search present ${genderTab.toLowerCase()}...`}
              className="w-full pl-4 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {presentSewadars.length === 0 ? (
               <p className="p-6 text-center text-slate-400 text-xs">No present sewadars found.</p>
            ) : (
              presentSewadars.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSewadarId(s.id)}
                  className={`w-full text-left px-5 py-3 border-b border-slate-50 last:border-0 flex items-center justify-between transition-colors ${
                    selectedSewadarId === s.id ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="font-bold text-sm">{s.name}</span>
                  {selectedSewadarId === s.id && <span className="text-indigo-600 font-black text-xs">SELECTED</span>}
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      {selectedSewadarId && selectedSewadar && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
           <div className="bg-indigo-900 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1">Workshop Score</p>
                <h2 className="text-2xl font-black mb-1">{selectedSewadar.name}</h2>
                <p className="text-sm opacity-80">{selectedSewadar.group} Group • Present Today</p>
                <div className="mt-6 flex items-end gap-2">
                   <span className="text-4xl font-black">{totalScore}</span>
                   <span className="text-sm font-bold opacity-60 mb-1">Total Points</span>
                </div>
              </div>
           </div>

           <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Award Game Points</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {GAMES.map(game => {
                  const currentCount = gameCounts[game] || 0;
                  const isLimitReached = currentCount >= 5;
                  return (
                    <button
                      key={game}
                      disabled={isLimitReached}
                      onClick={() => setSelectedGame(game)}
                      className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-wide border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                        isLimitReached
                          ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-60'
                          : selectedGame === game 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' 
                            : 'bg-white text-slate-500 border-slate-100'
                      }`}
                    >
                      <span>{game}</span>
                      <span className="text-[8px] font-bold opacity-50">({currentCount}/5)</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleAwardPoints}
                disabled={!selectedGame}
                className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
                  selectedGame 
                    ? 'bg-emerald-500 text-white shadow-lg active:scale-95' 
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                Award 50 Points
              </button>
           </div>

           <div className="space-y-2 pb-12">
             <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Score History Today</h3>
             {sewadarScores.length > 0 ? (
               sewadarScores.slice().reverse().map(score => {
                 const isConfirming = confirmDeleteId === score.id;
                 const isDeleted = score.isDeleted;
                 const canPromote = !isDeleted && score.game === 'Daily Attendance' && score.points === 50;
                 
                 return (
                   <div key={score.id} className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all ${isDeleted ? 'bg-red-50/50' : 'bg-white'}`}>
                      <div>
                        <p className={`font-bold text-sm ${isDeleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          {score.game}
                          {isDeleted && <span className="ml-2 text-[8px] bg-red-100 text-red-500 px-1 py-0.5 rounded uppercase no-underline">Void</span>}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400">
                          {new Date(score.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {getVolunteerName(score.volunteerId)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="text-right">
                           <span className={`font-black ${isDeleted ? 'text-slate-300 line-through' : 'text-emerald-600'}`}>+{score.points}</span>
                         </div>
                         
                         {canPromote && onPromoteTo100 && (
                            <button 
                              onClick={() => onPromoteTo100(score.id)}
                              className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[8px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 shadow-sm"
                            >
                              Force 100
                            </button>
                         )}

                         {!isDeleted && (
                           <button onClick={(e) => handleDeleteClick(e, score.id)} className={`w-10 h-10 rounded-full flex items-center justify-center border ${isConfirming ? 'bg-red-500 border-red-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                             {isConfirming ? '?' : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                           </button>
                         )}
                      </div>
                   </div>
                 );
               })
             ) : (
               <p className="text-center py-6 text-slate-400 text-xs italic">No points yet.</p>
             )}
           </div>
        </section>
      )}
    </div>
  );
};

export default PointsManager;