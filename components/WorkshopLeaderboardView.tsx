import React, { useState, useEffect, useMemo } from 'react';
import { WorkshopPoint, AttendanceRecord, Gender } from '../types';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { isWorkshopDate, getWorkshopTeam } from './WorkshopAttendanceView';
import {
  getWorkshopTestMode,
  setWorkshopTestMode,
  isTestModeDisabledByDate,
  checkAndAutoResetTestData,
  getStoredTestPoints,
  getStoredTestAttendance,
  clearStoredTestData
} from '../workshopTestUtils';

interface WorkshopLeaderboardViewProps {
  onNavigateToAttendance?: () => void;
  onNavigateToReport?: () => void;
}

interface TeamScore {
  team: string;
  category: 'Gents' | 'Ladies';
  totalPoints: number;
  membersCount: number;
  attendancePoints: number;
  quizPoints: number;
  topContributors: {
    sewadarName: string;
    points: number;
    quizCount: number;
    attPoints: number;
  }[];
}

const ALL_TEAMS: { team: string; category: 'Gents' | 'Ladies'; emoji: string }[] = [
  // Gents teams
  { team: 'Monday', category: 'Gents', emoji: '⚡' },
  { team: 'Tuesday', category: 'Gents', emoji: '🔥' },
  { team: 'Wednesday', category: 'Gents', emoji: '🛡️' },
  { team: 'Thursday', category: 'Gents', emoji: '🌟' },
  { team: 'Friday', category: 'Gents', emoji: '🦁' },
  { team: 'Saturday', category: 'Gents', emoji: '🚀' },
  { team: 'Sunday', category: 'Gents', emoji: '☀️' },
  // Ladies teams
  { team: 'Ladies Monday', category: 'Ladies', emoji: '🌸' },
  { team: 'Ladies Tuesday', category: 'Ladies', emoji: '🌺' },
  { team: 'Ladies Wednesday', category: 'Ladies', emoji: '🌷' },
  { team: 'Ladies Thursday', category: 'Ladies', emoji: '🌼' },
  { team: 'Ladies Friday', category: 'Ladies', emoji: '✨' },
  { team: 'Ladies Saturday', category: 'Ladies', emoji: '💎' },
  { team: 'Ladies Sunday', category: 'Ladies', emoji: '💫' },
];

export const WorkshopLeaderboardView: React.FC<WorkshopLeaderboardViewProps> = ({
  onNavigateToAttendance,
  onNavigateToReport
}) => {
  const isDateLocked = isTestModeDisabledByDate();
  const [isTestMode, setIsTestMode] = useState<boolean>(() => getWorkshopTestMode());

  const [points, setPoints] = useState<WorkshopPoint[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'Gents' | 'Ladies'>('All');
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  useEffect(() => {
    checkAndAutoResetTestData();
  }, []);

  // Live real-time listener or sandbox reader
  useEffect(() => {
    if (isTestMode) {
      setLoading(true);
      const testPts = getStoredTestPoints();
      const testAtt = getStoredTestAttendance();
      setPoints(testPts);
      setAttendance(testAtt);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [y, m, d] = '2026-08-30'.split('-').map(Number);
    const startOfDay = Timestamp.fromDate(new Date(y, m - 1, d - 1, 18, 0, 0));
    const endOfDay = Timestamp.fromDate(new Date(y, m - 1, d + 1, 6, 0, 0));

    // 1. Attendance listener for 30 Aug 2026
    const qAtt = query(
      collection(db, 'attendance'),
      where('date', '>=', startOfDay),
      where('date', '<=', endOfDay)
    );

    const unsubAtt = onSnapshot(
      qAtt,
      (snapshotAtt) => {
        const records: AttendanceRecord[] = [];
        snapshotAtt.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (!isWorkshopDate(data.date)) return;
          const rawGroup = (data.group || '').toString();
          const isLadies = data.gender === 'Ladies' || rawGroup.toLowerCase().includes('ladies');
          const gender: Gender = isLadies ? 'Ladies' : 'Gents';

          records.push({
            id: docSnap.id,
            sewadarId: data.sewadar_id || data.sewadarId || '',
            name: data.name || data.sewadarName || '',
            group: data.group,
            gender: gender,
            date: '2026-08-30',
            timestamp: data.timestamp || Date.now(),
            volunteerId: data.volunteer_id || data.volunteerId || '',
            inTime: data.in_time || data.inTime || '',
            outTime: data.out_time || data.outTime || '',
            sewaPoint: data.sewa_points || data.sewaPoint || 'Workshop',
            workshopLocation: data.workshop_location || data.workshopLocation || 'Workshop',
            isProperUniform: data.is_proper_uniform ?? data.isProperUniform ?? true
          });
        });
        setAttendance(records);
      },
      (err) => {
        console.error('Error in attendance snapshot for leaderboard:', err);
      }
    );

    // 2. Points listener for 30 Aug 2026
    const q = query(
      collection(db, 'workshop_points'),
      where('date', '==', '2026-08-30')
    );

    const unsubPoints = onSnapshot(
      q,
      (snapshot) => {
        const records: WorkshopPoint[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const rawGroup = (data.group || '').toString();
          const isLadies = data.gender === 'Ladies' || rawGroup.toLowerCase().includes('ladies');
          const gender: Gender = isLadies ? 'Ladies' : 'Gents';

          return {
            id: docSnap.id,
            sewadarId: data.sewadarId || data.sewadar_id || '',
            sewadarName: data.sewadarName || data.name || '',
            gender: gender,
            group: data.group,
            team: data.team || getWorkshopTeam(gender, data.group || ''),
            points: Number(data.points) || 0,
            reason: data.reason || 'Attendance',
            checkInTime: data.checkInTime || data.in_time || '',
            timestamp: data.timestamp || Date.now(),
            date: '2026-08-30',
            awardedBy: data.awardedBy || data.volunteer_id || ''
          };
        });
        setPoints(records);
        setLoading(false);
      },
      (err) => {
        console.error('Error in workshop_points snapshot:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubAtt();
      unsubPoints();
    };
  }, [isTestMode]);

  const handleToggleTestMode = (newMode: boolean) => {
    if (isDateLocked) return;
    setIsTestMode(newMode);
    setWorkshopTestMode(newMode);
  };

  const handleClearTestData = () => {
    if (!window.confirm('Reset all test sandbox data? Real database will not be touched.')) return;
    clearStoredTestData();
    setPoints([]);
    setAttendance([]);
  };

  // Compute team statistics & top contributors
  const teamScores = useMemo(() => {
    const teamMembersMap = new Map<string, Map<string, { points: number; quizCount: number; attPoints: number }>>();
    const teamTotalsMap = new Map<string, { total: number; attPoints: number; quizPoints: number }>();

    // Process explicit points
    const accountedSewadars = new Set<string>();

    for (const p of points) {
      const teamName = p.team || 'Unassigned';
      
      const curTotals = teamTotalsMap.get(teamName) || { total: 0, attPoints: 0, quizPoints: 0 };
      curTotals.total += p.points;
      if (p.reason === 'Quiz') {
        curTotals.quizPoints += p.points;
      } else {
        curTotals.attPoints += p.points;
        if (p.sewadarId) accountedSewadars.add(p.sewadarId);
        if (p.sewadarName) accountedSewadars.add(p.sewadarName.trim().toLowerCase());
      }
      teamTotalsMap.set(teamName, curTotals);

      const memberName = (p.sewadarName || 'Unknown').trim();
      const members = teamMembersMap.get(teamName) || new Map<string, { points: number; quizCount: number; attPoints: number }>();
      const curMember = members.get(memberName) || { points: 0, quizCount: 0, attPoints: 0 };
      curMember.points += p.points;
      if (p.reason === 'Quiz') {
        curMember.quizCount += 1;
      } else {
        curMember.attPoints += p.points;
      }
      members.set(memberName, curMember);
      teamMembersMap.set(teamName, members);
    }

    // Also sync attendance check-ins from 30 August 2026 if not already in workshop_points
    for (const rec of attendance) {
      const sewadarKey = (rec.sewadarId || '').trim();
      const nameKey = (rec.name || '').trim().toLowerCase();
      if (accountedSewadars.has(sewadarKey) || accountedSewadars.has(nameKey)) {
        continue;
      }

      const teamName = getWorkshopTeam(rec.gender, rec.group);
      const time = rec.inTime || '';
      const [h, m] = time.split(':').map(Number);
      const isEarly = !isNaN(h) ? (h < 9 || (h === 9 && m < 30)) : true;
      const attPts = isEarly ? 100 : 50;

      const curTotals = teamTotalsMap.get(teamName) || { total: 0, attPoints: 0, quizPoints: 0 };
      curTotals.total += attPts;
      curTotals.attPoints += attPts;
      teamTotalsMap.set(teamName, curTotals);

      const memberName = (rec.name || 'Unknown').trim();
      const members = teamMembersMap.get(teamName) || new Map<string, { points: number; quizCount: number; attPoints: number }>();
      const curMember = members.get(memberName) || { points: 0, quizCount: 0, attPoints: 0 };
      curMember.points += attPts;
      curMember.attPoints += attPts;
      members.set(memberName, curMember);
      teamMembersMap.set(teamName, members);

      if (sewadarKey) accountedSewadars.add(sewadarKey);
      if (nameKey) accountedSewadars.add(nameKey);
    }

    const result: TeamScore[] = ALL_TEAMS.map((t) => {
      const totals = teamTotalsMap.get(t.team) || { total: 0, attPoints: 0, quizPoints: 0 };
      const membersMap = teamMembersMap.get(t.team) || new Map();
      
      const contributors = Array.from(membersMap.entries())
        .map(([name, data]) => ({
          sewadarName: name,
          points: data.points,
          quizCount: data.quizCount,
          attPoints: data.attPoints
        }))
        .sort((a, b) => b.points - a.points);

      return {
        team: t.team,
        category: t.category,
        totalPoints: totals.total,
        membersCount: membersMap.size,
        attendancePoints: totals.attPoints,
        quizPoints: totals.quizPoints,
        topContributors: contributors
      };
    });

    return result;
  }, [points, attendance]);

  // Filtered and sorted teams
  const rankedTeams = useMemo(() => {
    let list = teamScores;
    if (activeTab !== 'All') {
      list = list.filter((t) => t.category === activeTab);
    }
    return [...list].sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      if (b.membersCount !== a.membersCount) {
        return b.membersCount - a.membersCount;
      }
      return a.team.localeCompare(b.team);
    });
  }, [teamScores, activeTab]);

  // Grand summary stats
  const totalWorkshopPoints = useMemo(() => {
    return points.reduce((sum, p) => sum + p.points, 0);
  }, [points]);

  const totalQuizAnswers = useMemo(() => {
    return points.filter((p) => p.reason === 'Quiz').length;
  }, [points]);

  const uniqueSewadarsCount = useMemo(() => {
    const set = new Set<string>();
    for (const p of points) {
      if (p.sewadarId) set.add(p.sewadarId);
      else if (p.sewadarName) set.add(p.sewadarName);
    }
    return set.size;
  }, [points]);

  const getTeamEmoji = (teamName: string) => {
    const found = ALL_TEAMS.find((t) => t.team === teamName);
    return found?.emoji || '🎖️';
  };

  return (
    <div className="space-y-6 font-sans max-w-3xl mx-auto pb-16 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          {/* Top Controls Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Standings
              </span>
              <span className="text-xs font-black text-amber-300 bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-500/30">
                30 August 2026
              </span>
            </div>

            {/* Test vs Live Mode Toggle */}
            {isDateLocked ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl text-emerald-300 text-xs font-black uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Mode (30 Aug)</span>
              </div>
            ) : (
              <div className="bg-black/30 p-1 rounded-2xl flex items-center border border-white/10 shadow-inner">
                <button
                  onClick={() => handleToggleTestMode(true)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                    isTestMode
                      ? 'bg-amber-400 text-amber-950 shadow-md scale-105'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <span>🧪</span>
                  <span>Test</span>
                </button>
                <button
                  onClick={() => handleToggleTestMode(false)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                    !isTestMode
                      ? 'bg-emerald-500 text-white shadow-md scale-105'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <span>🟢</span>
                  <span>Live</span>
                </button>
              </div>
            )}
          </div>

          {/* Test Mode Notification Strip */}
          {isTestMode && !isDateLocked && (
            <div className="flex items-center justify-between gap-2 px-4 py-2 bg-amber-500/20 border border-amber-400/30 rounded-2xl text-amber-200 text-xs font-bold">
              <div className="flex items-center gap-1.5 min-w-0">
                <span>⚠️</span>
                <span className="truncate">Test Mode: Displaying test sandbox scores only.</span>
              </div>
              <button
                onClick={handleClearTestData}
                className="px-2.5 py-1 bg-amber-400 text-amber-950 rounded-lg text-[10px] font-black uppercase tracking-wider flex-shrink-0 hover:bg-amber-300 active:scale-95 transition-all shadow-sm"
              >
                Reset Test Data
              </button>
            </div>
          )}

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <span>🏆</span> Workshop Team Standings
            </h1>
            <p className="text-xs text-indigo-200 font-medium mt-1">
              Leaderboard calculated from Attendance check-ins and Oral Quiz awards.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
              <p className="text-[9px] font-black text-amber-300 uppercase tracking-widest">Total Points</p>
              <p className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">{totalWorkshopPoints.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
              <p className="text-[9px] font-black text-purple-300 uppercase tracking-widest">Quiz Correct</p>
              <p className="text-xl sm:text-2xl font-black text-purple-300 mt-0.5">{totalQuizAnswers}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
              <p className="text-[9px] font-black text-emerald-300 uppercase tracking-widest">Active Sewadars</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">{uniqueSewadarsCount}</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Category Tabs & Switch View Button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="bg-slate-200/70 p-1 rounded-2xl flex items-center shadow-inner gap-1">
          {(['All', 'Gents', 'Ladies'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-white text-indigo-900 shadow-md scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToReport && (
            <button
              onClick={onNavigateToReport}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-indigo-200 transition-all active:scale-95"
            >
              <span>📊</span>
              <span>Points Report</span>
            </button>
          )}

          {onNavigateToAttendance && (
            <button
              onClick={onNavigateToAttendance}
              className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              Mark Attendance & Points
            </button>
          )}
        </div>
      </div>

      {/* Leaderboard Cards */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="text-center py-16 bg-white rounded-[2.5rem] border border-slate-100">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3">Loading standings...</p>
          </div>
        ) : (
          rankedTeams.map((teamData, index) => {
            const rank = index + 1;
            const isRank1 = rank === 1 && teamData.totalPoints > 0;
            const isExpanded = expandedTeam === teamData.team;
            const emoji = getTeamEmoji(teamData.team);

            return (
              <div
                key={teamData.team}
                className={`rounded-[2rem] border transition-all duration-300 overflow-hidden ${
                  isRank1
                    ? 'bg-gradient-to-r from-amber-500/10 via-amber-50/80 to-yellow-500/10 border-2 border-amber-400 shadow-lg shadow-amber-200/50'
                    : 'bg-white border-slate-100/90 hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* Main Team Card Row */}
                <div
                  onClick={() => setExpandedTeam(isExpanded ? null : teamData.team)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  {/* Left: Rank & Team Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm ${
                        isRank1
                          ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 ring-4 ring-amber-200/70 shadow-amber-300'
                          : rank === 2
                          ? 'bg-slate-200 text-slate-800'
                          : rank === 3
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-500 font-bold'
                      }`}
                    >
                      {isRank1 ? '👑' : `#${rank}`}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{emoji}</span>
                        <h3 className="font-black text-base sm:text-lg text-slate-900 truncate">
                          {teamData.team}
                        </h3>
                        {isRank1 && (
                          <span className="hidden sm:inline-flex px-2 py-0.5 bg-amber-400 text-amber-950 rounded-full text-[9px] font-black uppercase tracking-wider">
                            Leader
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] font-black text-slate-400 uppercase">
                        <span>{teamData.membersCount} Participants</span>
                        <span>•</span>
                        <span>Att: {teamData.attendancePoints} pts</span>
                        <span>•</span>
                        <span>Quiz: {teamData.quizPoints} pts</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Total Points & Expand Toggle */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-xl sm:text-2xl font-black tracking-tight ${
                          isRank1 ? 'text-amber-600' : 'text-slate-900'
                        }`}
                      >
                        {teamData.totalPoints.toLocaleString()}
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Points
                      </p>
                    </div>

                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 transition-transform">
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Expanded Section: Top Contributors */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100/80 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-950">
                        Top Contributors ({teamData.topContributors.length})
                      </p>
                      <span className="text-[9px] font-bold text-slate-400">Ranked by Individual Points</span>
                    </div>

                    {teamData.topContributors.length === 0 ? (
                      <p className="text-xs text-slate-400 font-bold py-2 text-center">
                        No points recorded yet for this team.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {teamData.topContributors.map((c, cIdx) => (
                          <div
                            key={c.sewadarName}
                            className="bg-white p-3 rounded-2xl border border-slate-100 flex items-center justify-between gap-2 shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`text-[10px] font-black w-5 text-center ${
                                  cIdx === 0
                                    ? 'text-amber-500 font-black'
                                    : cIdx === 1
                                    ? 'text-slate-600 font-bold'
                                    : cIdx === 2
                                    ? 'text-amber-700 font-bold'
                                    : 'text-slate-400'
                                }`}
                              >
                                {cIdx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900 truncate">
                                  {c.sewadarName}
                                </p>
                                <p className="text-[9px] font-black text-slate-400">
                                  {c.attPoints > 0 ? `Att: ${c.attPoints} pts` : 'No Check-in'}
                                  {c.quizCount > 0 ? ` • Quiz: ${c.quizCount}x (${c.quizCount * 50} pts)` : ''}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-black text-indigo-600 flex-shrink-0 bg-indigo-50 px-2 py-1 rounded-lg">
                              {c.points} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default WorkshopLeaderboardView;
