import React, { useState, useEffect, useMemo } from 'react';
import { Sewadar, AttendanceRecord, DutyGroup, Gender, WorkshopPoint } from '../types';
import { GENTS_GROUPS, LADIES_GROUPS } from '../constants';
import { doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { saveStoredTestAttendance, saveStoredTestPoints } from '../workshopTestUtils';
import { getWorkshopTeam, isWorkshopDate } from './WorkshopAttendanceView';

interface ManualPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSewadar: Sewadar | null;
  allSewadars: Sewadar[];
  activeVolunteer: { id: string; name: string; role: string };
  isTestMode: boolean;
  workshopAttendance: AttendanceRecord[];
  workshopPoints: WorkshopPoint[];
  setWorkshopAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  setWorkshopPoints: React.Dispatch<React.SetStateAction<WorkshopPoint[]>>;
  normalizeName: (name: string) => string;
}

const WORKSHOP_DATE = '2026-08-30';

export const ManualPointsModal: React.FC<ManualPointsModalProps> = ({
  isOpen,
  onClose,
  initialSewadar,
  allSewadars,
  activeVolunteer,
  isTestMode,
  workshopAttendance,
  workshopPoints,
  setWorkshopAttendance,
  setWorkshopPoints,
  normalizeName
}) => {
  // Selected Sewadar state
  const [selectedSewadarId, setSelectedSewadarId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState<Gender>('Gents');
  const [filterGroup, setFilterGroup] = useState<string>('All');

  // Point type: 'attendance' | 'quiz'
  const [pointCategory, setPointCategory] = useState<'attendance' | 'quiz'>('attendance');

  // Attendance point options
  const [attPointsValue, setAttPointsValue] = useState<number>(100);
  const [attCustomPoints, setAttCustomPoints] = useState<string>('');
  const [attTypePreset, setAttTypePreset] = useState<'100' | '50' | 'custom'>('100');
  const [markAsPresent, setMarkAsPresent] = useState<boolean>(true);
  const [customInTime, setCustomInTime] = useState<string>('');

  // Quiz / Custom point options
  const [quizPointsValue, setQuizPointsValue] = useState<number>(50);
  const [quizCustomPoints, setQuizCustomPoints] = useState<string>('');
  const [quizPreset, setQuizPreset] = useState<'50' | '100' | '25' | '10' | 'custom'>('50');
  const [quizReason, setQuizReason] = useState<string>('Quiz');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync selected sewadar when modal opens or initialSewadar changes
  useEffect(() => {
    if (isOpen) {
      if (initialSewadar) {
        setSelectedSewadarId(initialSewadar.id);
        setFilterGender(initialSewadar.gender);
        setFilterGroup(initialSewadar.group.replace(/^ladies-/i, ''));
      } else {
        setSelectedSewadarId('');
      }
      setSuccessMsg(null);
      
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setCustomInTime(`${h}:${m}`);
    }
  }, [isOpen, initialSewadar]);

  const activeSewadar = useMemo(() => {
    return allSewadars.find(s => s.id === selectedSewadarId) || initialSewadar || null;
  }, [allSewadars, selectedSewadarId, initialSewadar]);

  // Filtered sewadars for selection picker
  const filteredSewadarsList = useMemo(() => {
    return allSewadars.filter(s => {
      if (s.gender !== filterGender) return false;
      const cleanGroup = s.group.replace(/^ladies-/i, '');
      if (filterGroup !== 'All' && cleanGroup !== filterGroup) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const norm = normalizeName(s.name);
        return s.name.toLowerCase().includes(q) || norm.includes(q) || s.id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allSewadars, filterGender, filterGroup, searchQuery, normalizeName]);

  // Existing points and attendance for the currently selected sewadar
  const sewadarHistory = useMemo(() => {
    if (!activeSewadar) return { attendanceRec: null, pointsList: [] };

    const normName = normalizeName(activeSewadar.name);
    const cleanGroup = activeSewadar.group.toLowerCase().replace(/^ladies-/i, '').trim();

    const att = workshopAttendance.find(r => {
      if (r.sewadarId && r.sewadarId === activeSewadar.id) return true;
      const rNorm = normalizeName(r.name || '');
      const rGroup = (r.group || '').toLowerCase().replace(/^ladies-/i, '').trim();
      return r.gender === activeSewadar.gender && rGroup === cleanGroup && rNorm === normName;
    }) || null;

    const pts = workshopPoints.filter(p => {
      if (p.sewadarId && p.sewadarId === activeSewadar.id) return true;
      const pNorm = normalizeName(p.sewadarName || '');
      const pGroup = (p.group || '').toLowerCase().replace(/^ladies-/i, '').trim();
      return p.gender === activeSewadar.gender && pGroup === cleanGroup && pNorm === normName;
    });

    return { attendanceRec: att, pointsList: pts };
  }, [activeSewadar, workshopAttendance, workshopPoints, normalizeName]);

  if (!isOpen) return null;

  const handleSavePoints = async () => {
    if (!activeSewadar) {
      alert('Please select a sewadar first.');
      return;
    }

    setSaving(true);
    setSuccessMsg(null);

    try {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const fallbackTime = `${currentHours}:${currentMinutes}`;
      const timeStr = customInTime.trim() || fallbackTime;

      const teamName = getWorkshopTeam(activeSewadar.gender, activeSewadar.group);
      const uniqueSuffix = Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

      if (pointCategory === 'attendance') {
        const finalAttPoints = attTypePreset === 'custom' 
          ? (Number(attCustomPoints) || 0)
          : attPointsValue;

        const reasonLabel = finalAttPoints === 100 
          ? 'Attendance – Early' 
          : finalAttPoints === 50 
            ? 'Attendance – Late' 
            : `Attendance (${finalAttPoints} pts)`;

        const pointRecordId = `wp_att_manual_${uniqueSuffix}`;
        const pointsPayload: WorkshopPoint = {
          id: pointRecordId,
          sewadarId: activeSewadar.id,
          sewadarName: activeSewadar.name,
          gender: activeSewadar.gender,
          group: activeSewadar.group,
          team: teamName,
          points: finalAttPoints,
          reason: reasonLabel,
          checkInTime: timeStr,
          timestamp: Date.now(),
          date: WORKSHOP_DATE,
          awardedBy: activeVolunteer.id
        };

        let attendancePayload: AttendanceRecord | null = null;
        if (markAsPresent && !sewadarHistory.attendanceRec) {
          const attRecordId = `att_manual_${uniqueSuffix}`;
          attendancePayload = {
            id: attRecordId,
            sewadarId: activeSewadar.id,
            name: activeSewadar.name,
            group: activeSewadar.group as DutyGroup,
            gender: activeSewadar.gender as Gender,
            date: WORKSHOP_DATE,
            timestamp: Date.now(),
            volunteerId: activeVolunteer.id,
            inTime: timeStr,
            outTime: '',
            sewaPoint: 'Workshop',
            workshopLocation: 'Workshop',
            isProperUniform: true
          };
        }

        if (isTestMode) {
          const newPts = [...workshopPoints, pointsPayload];
          setWorkshopPoints(newPts);
          saveStoredTestPoints(newPts);

          if (attendancePayload) {
            const newAtt = [...workshopAttendance, attendancePayload];
            setWorkshopAttendance(newAtt);
            saveStoredTestAttendance(newAtt);
          }
        } else {
          const promises: Promise<any>[] = [
            setDoc(doc(db, 'workshop_points', pointRecordId), pointsPayload)
          ];

          if (attendancePayload) {
            const [y, m, d] = WORKSHOP_DATE.split('-').map(Number);
            const dateTimestamp = Timestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0));
            const dbAtt = {
              id: attendancePayload.id,
              sewadar_id: activeSewadar.id,
              name: activeSewadar.name,
              group: activeSewadar.group,
              gender: activeSewadar.gender,
              date: dateTimestamp,
              timestamp: Date.now(),
              volunteer_id: activeVolunteer.id,
              in_time: timeStr,
              out_time: '',
              sewa_points: 'Workshop',
              workshop_location: 'Workshop',
              is_proper_uniform: true
            };
            promises.push(setDoc(doc(db, 'attendance', attendancePayload.id), dbAtt));
          }

          await Promise.all(promises);
          setWorkshopPoints(prev => [...prev, pointsPayload]);
          if (attendancePayload) {
            setWorkshopAttendance(prev => [...prev, attendancePayload!]);
          }
        }

        setSuccessMsg(`Successfully added ${finalAttPoints} attendance points for ${activeSewadar.name}!`);
      } else {
        // Quiz / Custom points
        const finalQuizPoints = quizPreset === 'custom'
          ? (Number(quizCustomPoints) || 0)
          : quizPointsValue;

        const reasonLabel = (quizReason.trim() || 'Quiz');
        const pointRecordId = `wp_quiz_manual_${uniqueSuffix}`;

        const pointsPayload: WorkshopPoint = {
          id: pointRecordId,
          sewadarId: activeSewadar.id,
          sewadarName: activeSewadar.name,
          gender: activeSewadar.gender,
          group: activeSewadar.group,
          team: teamName,
          points: finalQuizPoints,
          reason: reasonLabel,
          checkInTime: timeStr,
          timestamp: Date.now(),
          date: WORKSHOP_DATE,
          awardedBy: activeVolunteer.id
        };

        if (isTestMode) {
          const newPts = [...workshopPoints, pointsPayload];
          setWorkshopPoints(newPts);
          saveStoredTestPoints(newPts);
        } else {
          await setDoc(doc(db, 'workshop_points', pointRecordId), pointsPayload);
          setWorkshopPoints(prev => [...prev, pointsPayload]);
        }

        setSuccessMsg(`Successfully awarded +${finalQuizPoints} pts (${reasonLabel}) to ${activeSewadar.name}!`);
      }
    } catch (err) {
      console.error('Error saving manual points:', err);
      alert('Failed to save points. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePoint = async (pointId: string, pointReason: string) => {
    if (!window.confirm(`Delete this point entry (${pointReason})?`)) return;

    try {
      if (isTestMode) {
        const newPts = workshopPoints.filter(p => p.id !== pointId);
        setWorkshopPoints(newPts);
        saveStoredTestPoints(newPts);
      } else {
        await deleteDoc(doc(db, 'workshop_points', pointId));
        setWorkshopPoints(prev => prev.filter(p => p.id !== pointId));
      }
      setSuccessMsg('Point entry removed successfully.');
    } catch (err) {
      console.error('Failed to delete point entry:', err);
      alert('Could not delete point entry.');
    }
  };

  const groupsForFilter = filterGender === 'Gents' ? GENTS_GROUPS : LADIES_GROUPS.map(g => g.replace(/^Ladies-/i, ''));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-950/50 px-2.5 py-0.5 rounded-md border border-amber-500/30">
              Workshop 30 Aug 2026
            </span>
            <h2 className="text-xl font-black mt-1">Manual Points Entry</h2>
            <p className="text-xs text-indigo-200 font-medium">
              Add attendance points (50/100 pts) or custom quiz/activity points
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Sewadar Selector / Search Card */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
              1. Select Sewadar / Volunteer
            </label>

            {/* Quick Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-slate-200/70 p-1 rounded-xl flex items-center text-xs font-black">
                <button
                  type="button"
                  onClick={() => { setFilterGender('Gents'); setFilterGroup('All'); }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${filterGender === 'Gents' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-600'}`}
                >
                  Gents
                </button>
                <button
                  type="button"
                  onClick={() => { setFilterGender('Ladies'); setFilterGroup('All'); }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${filterGender === 'Ladies' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-600'}`}
                >
                  Ladies
                </button>
              </div>

              <select
                value={filterGroup}
                onChange={e => setFilterGroup(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="All">All Groups</option>
                {groupsForFilter.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <div className="flex-1 min-w-[180px]">
                <input
                  type="text"
                  placeholder="Search sewadar name or ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Sewadar Dropdown Picker */}
            <div>
              <select
                value={selectedSewadarId}
                onChange={e => {
                  setSelectedSewadarId(e.target.value);
                  setSuccessMsg(null);
                }}
                className="w-full px-4 py-2.5 bg-white border-2 border-indigo-100 rounded-xl text-sm font-black text-slate-900 outline-none focus:border-indigo-500 shadow-xs"
              >
                <option value="">-- Choose a Sewadar ({filteredSewadarsList.length} matching) --</option>
                {filteredSewadarsList.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.gender} - {s.group}{s.shift ? ` / ${s.shift}` : ''})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Sewadar Information Box */}
            {activeSewadar && (
              <div className="bg-white p-3.5 rounded-xl border border-indigo-100/80 flex items-center justify-between gap-3 flex-wrap shadow-2xs">
                <div>
                  <p className="font-black text-indigo-950 text-sm">{activeSewadar.name}</p>
                  <p className="text-[11px] font-bold text-slate-500">
                    {activeSewadar.gender} • {activeSewadar.group} {activeSewadar.shift ? `(${activeSewadar.shift})` : ''} • Team: <span className="font-black text-indigo-600">{getWorkshopTeam(activeSewadar.gender, activeSewadar.group)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {sewadarHistory.attendanceRec ? (
                    <span className="text-[10px] font-black px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
                      Checked In ({sewadarHistory.attendanceRec.inTime || 'Present'})
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg">
                      Not Checked In
                    </span>
                  )}
                  <span className="text-[10px] font-black px-2.5 py-1 bg-indigo-100 text-indigo-900 rounded-lg">
                    Total: {sewadarHistory.pointsList.reduce((sum, p) => sum + p.points, 0)} pts
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Point Category Selector Tabs */}
          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
              2. Point Type
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setPointCategory('attendance')}
                className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  pointCategory === 'attendance'
                    ? 'bg-white text-indigo-900 shadow-md scale-[1.01]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🎫</span>
                <span>Attendance (50 / 100)</span>
              </button>

              <button
                type="button"
                onClick={() => setPointCategory('quiz')}
                className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  pointCategory === 'quiz'
                    ? 'bg-white text-purple-900 shadow-md scale-[1.01]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🧠</span>
                <span>Quiz / Any Points</span>
              </button>
            </div>
          </div>

          {/* Form Options: Attendance vs Quiz */}
          {pointCategory === 'attendance' ? (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-4">
              <label className="text-xs font-black text-emerald-900 uppercase tracking-wider block">
                3. Attendance Points Option
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setAttTypePreset('100'); setAttPointsValue(100); }}
                  className={`p-3 rounded-xl border font-black text-xs text-center transition-all ${
                    attTypePreset === '100'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <p className="text-base font-black">100 pts</p>
                  <p className="text-[10px] opacity-90">Early (&lt;9:30 AM)</p>
                </button>

                <button
                  type="button"
                  onClick={() => { setAttTypePreset('50'); setAttPointsValue(50); }}
                  className={`p-3 rounded-xl border font-black text-xs text-center transition-all ${
                    attTypePreset === '50'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <p className="text-base font-black">50 pts</p>
                  <p className="text-[10px] opacity-90">Late (≥9:30 AM)</p>
                </button>

                <button
                  type="button"
                  onClick={() => setAttTypePreset('custom')}
                  className={`p-3 rounded-xl border font-black text-xs text-center transition-all ${
                    attTypePreset === 'custom'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <p className="text-base font-black">Custom</p>
                  <p className="text-[10px] opacity-90">Any Points</p>
                </button>
              </div>

              {attTypePreset === 'custom' && (
                <div>
                  <label className="text-[11px] font-black text-slate-700 block mb-1">Enter Custom Points Amount:</label>
                  <input
                    type="number"
                    value={attCustomPoints}
                    onChange={e => setAttCustomPoints(e.target.value)}
                    placeholder="e.g. 75 or 100"
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl font-black text-slate-800 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* In Time and Attendance Checkbox */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-black text-slate-700 block mb-1">Check-in Time (HH:mm):</label>
                  <input
                    type="text"
                    value={customInTime}
                    onChange={e => setCustomInTime(e.target.value)}
                    placeholder="09:15"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="markPresentCheck"
                    checked={markAsPresent}
                    onChange={e => setMarkAsPresent(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="markPresentCheck" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                    Also mark as Present in Attendance
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-purple-50/50 border border-purple-200/80 rounded-2xl space-y-4">
              <label className="text-xs font-black text-purple-900 uppercase tracking-wider block">
                3. Quiz / Activity Points Amount
              </label>

              {/* Presets */}
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: '+10 pts', val: 10, key: '10' },
                  { label: '+25 pts', val: 25, key: '25' },
                  { label: '+50 pts', val: 50, key: '50' },
                  { label: '+100 pts', val: 100, key: '100' },
                  { label: 'Custom', val: 0, key: 'custom' }
                ].map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setQuizPreset(item.key as any);
                      if (item.val > 0) setQuizPointsValue(item.val);
                    }}
                    className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all ${
                      quizPreset === item.key
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-white text-purple-900 border border-purple-200 hover:bg-purple-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {quizPreset === 'custom' && (
                <div>
                  <label className="text-[11px] font-black text-slate-700 block mb-1">Enter Custom Quiz / Bonus Points:</label>
                  <input
                    type="number"
                    value={quizCustomPoints}
                    onChange={e => setQuizCustomPoints(e.target.value)}
                    placeholder="e.g. 15, 30, 75, etc."
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl font-black text-slate-800 text-sm outline-none focus:border-purple-500"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-black text-slate-700 block mb-1">Reason / Description:</label>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {['Quiz', 'Quiz Round 1', 'Quiz Round 2', 'Bonus Question', 'Special Sewa'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setQuizReason(r)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        quizReason === r
                          ? 'bg-purple-100 text-purple-900 border-purple-300'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={quizReason}
                  onChange={e => setQuizReason(e.target.value)}
                  placeholder="e.g. Quiz, Rapid Fire, Bonus"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 text-xs outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="p-3.5 bg-emerald-100 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-black flex items-center justify-between">
              <span>✅ {successMsg}</span>
              <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">✕</button>
            </div>
          )}

          {/* History of Points for this Sewadar */}
          {activeSewadar && sewadarHistory.pointsList.length > 0 && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Awarded Points for {activeSewadar.name} ({sewadarHistory.pointsList.length} entries)
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {sewadarHistory.pointsList.map((pt) => (
                  <div key={pt.id} className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md font-black ${pt.reason.startsWith('Attendance') ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'}`}>
                        +{pt.points} pts
                      </span>
                      <span className="font-bold text-slate-800">{pt.reason}</span>
                      {pt.checkInTime && (
                        <span className="text-[10px] text-slate-400">({pt.checkInTime})</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeletePoint(pt.id, pt.reason)}
                      title="Delete this point record"
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 font-black text-xs uppercase tracking-wider text-slate-700 hover:bg-slate-100 transition-all"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleSavePoints}
            disabled={saving || !activeSewadar}
            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
              pointCategory === 'attendance'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'
            }`}
          >
            {saving ? 'Saving...' : pointCategory === 'attendance' ? 'Save Attendance Points' : 'Award Quiz Points'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default ManualPointsModal;
