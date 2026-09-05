import React, { useState, useMemo } from 'react';
import { Volunteer, Sewadar, Gender, DutyGroup } from '../types';
import { GENTS_INCHARGES, LADIES_INCHARGES, DAYS_LIST } from '../constants';

interface HrTableAddSewadarProps {
  activeVolunteer: Volunteer | null;
  customSewadars: Sewadar[];
  onSaveSewadar: (data: {
    id?: string;
    name: string;
    gender: Gender;
    group: DutyGroup;
    shift?: 'DAY' | 'NIGHT';
    hrTableData: {
      phoneNumber?: string;
      address?: string;
      qualification?: string;
      timing?: string;
      weeklyOff?: string;
      sewaDays?: string[];
      selectedOptions?: string[];
      handoverDayGroup?: string;
      handoverIncharge?: string;
      createdAt?: number;
      updatedAt?: number;
    };
  }) => Promise<Sewadar>;
  onDeleteSewadar: (id: string) => Promise<void>;
}

const SEWA_OPTIONS = [
  'Cctv vision',
  'Cctv maintenance',
  'PR',
  'Langar sewa',
  'Security gents',
  'Security ladies',
  'Another department sewa',
  'It related sewa',
  'Setup sewa'
];

export const HrTableAddSewadar: React.FC<HrTableAddSewadarProps> = ({
  activeVolunteer,
  customSewadars,
  onSaveSewadar,
  onDeleteSewadar
}) => {
  // Tabs: 'add' or 'list'
  const [activeTab, setActiveTab] = useState<'form' | 'list'>('form');

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'Gents' | 'Ladies'>('Gents');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [qualification, setQualification] = useState('');
  const [timing, setTiming] = useState('');
  const [weeklyOff, setWeeklyOff] = useState('');
  const [sewaDays, setSewaDays] = useState<string[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  // Handover state
  const [showHandover, setShowHandover] = useState(false);
  const [selectedDayGroup, setSelectedDayGroup] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search & Filter for Routed List
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'Gents' | 'Ladies'>('ALL');
  const [dayFilter, setDayFilter] = useState<string>('ALL');

  // Sewadars routed by HR Table or Zone Attendance
  const routedSewadars = useMemo(() => {
    return customSewadars.filter(s => 
      s.routedByHrTable || 
      s.routedByZone || 
      s.tag === 'Punjab Zone' || 
      s.originZone === 'Punjab Zone' || 
      Boolean(s.hrTableData?.handoverDayGroup)
    );
  }, [customSewadars]);

  const filteredRoutedSewadars = useMemo(() => {
    return routedSewadars.filter(s => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.hrTableData?.phoneNumber && s.hrTableData.phoneNumber.includes(searchTerm)) ||
        (s.hrTableData?.handoverIncharge && s.hrTableData.handoverIncharge.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.group.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesGender = genderFilter === 'ALL' || s.gender === genderFilter;
      const matchesDay = 
        dayFilter === 'ALL' || 
        s.group === dayFilter || 
        (dayFilter === 'HR Table' && (s.group === 'HR Table' || !s.hrTableData?.handoverIncharge));

      return matchesSearch && matchesGender && matchesDay;
    });
  }, [routedSewadars, searchTerm, genderFilter, dayFilter]);

  const toggleOption = (opt: string) => {
    setSelectedOptions(prev => 
      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    );
  };

  const toggleSewaDay = (day: string) => {
    setSewaDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setGender('Gents');
    setPhoneNumber('');
    setAddress('');
    setQualification('');
    setTiming('');
    setWeeklyOff('');
    setSewaDays([]);
    setSelectedOptions([]);
    setSelectedDayGroup(null);
    setShowHandover(false);
  };

  const handleStartEdit = (s: Sewadar) => {
    setEditingId(s.id);
    setName(s.name);
    setGender(s.gender);
    setPhoneNumber(s.hrTableData?.phoneNumber || '');
    setAddress(s.hrTableData?.address || '');
    setQualification(s.hrTableData?.qualification || '');
    setTiming(s.hrTableData?.timing || '');
    setWeeklyOff(s.hrTableData?.weeklyOff || '');
    setSewaDays(s.hrTableData?.sewaDays || []);
    setSelectedOptions(s.hrTableData?.selectedOptions || []);
    setSelectedDayGroup(s.group !== 'HR Table' ? (s.group || s.hrTableData?.handoverDayGroup || null) : null);
    setShowHandover(Boolean(!s.hrTableData?.handoverIncharge));
    setActiveTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Option to save sewadar only (handover at a later stage or preserve existing group)
  const handleSaveOnly = async () => {
    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'Please enter Sewadar Name before saving.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const existing = editingId ? routedSewadars.find(item => item.id === editingId) : null;
      const targetDay = selectedDayGroup || existing?.group || 'HR Table';
      const keepIncharge = (existing && (!selectedDayGroup || selectedDayGroup === existing.group))
        ? existing.hrTableData?.handoverIncharge
        : undefined;

      await onSaveSewadar({
        id: editingId || undefined,
        name: name.trim(),
        gender,
        group: targetDay,
        hrTableData: {
          phoneNumber: phoneNumber.trim() || undefined,
          address: address.trim() || undefined,
          qualification: qualification.trim() || undefined,
          timing: timing.trim() || undefined,
          weeklyOff: weeklyOff || undefined,
          sewaDays: sewaDays.length > 0 ? sewaDays : undefined,
          selectedOptions: selectedOptions.length > 0 ? selectedOptions : undefined,
          handoverDayGroup: selectedDayGroup || existing?.hrTableData?.handoverDayGroup || (targetDay !== 'HR Table' ? targetDay : undefined),
          handoverIncharge: keepIncharge,
        }
      });

      const actionText = editingId ? 'updated' : 'saved';
      setFeedback({
        type: 'success',
        message: keepIncharge
          ? `Sewadar "${name.trim()}" successfully ${actionText}!`
          : targetDay !== 'HR Table'
          ? `Sewadar "${name.trim()}" saved for ${targetDay} ${gender}! You can handover to an incharge whenever ready.`
          : `Sewadar "${name.trim()}" saved successfully! You can handover to a group & incharge at a later stage.`
      });

      resetForm();
      setActiveTab('list');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Save Error:', err);
      setFeedback({ type: 'error', message: err?.message || 'Failed to save sewadar. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHandoverAndSave = async (targetDay: string, inchargeName: string) => {
    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'Please enter Sewadar Name before handover.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await onSaveSewadar({
        id: editingId || undefined,
        name: name.trim(),
        gender,
        group: targetDay,
        hrTableData: {
          phoneNumber: phoneNumber.trim() || undefined,
          address: address.trim() || undefined,
          qualification: qualification.trim() || undefined,
          timing: timing.trim() || undefined,
          weeklyOff: weeklyOff || undefined,
          sewaDays: sewaDays.length > 0 ? sewaDays : undefined,
          selectedOptions: selectedOptions.length > 0 ? selectedOptions : undefined,
          handoverDayGroup: targetDay,
          handoverIncharge: inchargeName,
        }
      });

      const actionText = editingId ? 'updated and re-assigned' : 'added and handed over';
      setFeedback({
        type: 'success',
        message: `Sewadar "${name.trim()}" successfully ${actionText} to ${inchargeName} in ${targetDay} ${gender} group!`
      });

      resetForm();
      setActiveTab('list');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Handover Error:', err);
      setFeedback({ type: 'error', message: err?.message || 'Failed to save sewadar. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, sewadarName: string) => {
    if (!window.confirm(`Are you sure you want to delete sewadar "${sewadarName}"?\n\nThis sewadar will be removed from HR Table and their assigned group.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await onDeleteSewadar(id);
      setFeedback({
        type: 'success',
        message: `Sewadar "${sewadarName}" deleted successfully.`
      });
      if (editingId === id) {
        resetForm();
      }
    } catch (err: any) {
      console.error('Delete Error:', err);
      setFeedback({ type: 'error', message: 'Failed to delete sewadar.' });
    } finally {
      setDeletingId(null);
    }
  };

  const effectiveGender = gender || 'Gents';

  return (
    <div className="min-h-screen bg-slate-50 pb-36">
      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-4 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">HR Table</h1>
              <p className="text-xs font-semibold text-slate-400">Sewadar Registration & Handover</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-full border border-indigo-100">
            {activeVolunteer?.name || 'HR Table'}
          </span>
        </div>

        {/* View Switcher Tabs */}
        <div className="max-w-2xl mx-auto mt-4 flex gap-2">
          <button
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'form'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>{editingId ? 'Edit Sewadar' : 'Add Sewadar'}</span>
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'list'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Routed Sewadars ({routedSewadars.length})</span>
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-bold animate-in fade-in duration-200 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-200 shadow-sm'
                : 'bg-rose-50 text-rose-800 border-2 border-rose-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{feedback.type === 'success' ? '✅' : '⚠️'}</span>
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs font-black uppercase opacity-60 hover:opacity-100 px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ===================== TAB 1: FORM ===================== */}
        {activeTab === 'form' && (
          <div className="space-y-6">
            {/* Editing Header Notice */}
            {editingId && (
              <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-xs font-black text-amber-900 uppercase tracking-wide">
                    Editing Sewadar Mode
                  </div>
                  <div className="text-sm font-bold text-amber-800">
                    Modifying selections & group for <span className="font-black text-black">"{name}"</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Cancel Edit
                </button>
              </div>
            )}

            {/* Main Details Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  Sewadar Information
                </h2>
                <span className="text-[11px] font-bold text-slate-400">All fields</span>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter full name of sewadar"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
                />
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Gender <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setGender('Gents');
                      setSelectedDayGroup(null);
                    }}
                    className={`py-3 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all border-2 ${
                      gender === 'Gents'
                        ? 'bg-blue-50 border-blue-600 text-blue-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>👨</span> Gents
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGender('Ladies');
                      setSelectedDayGroup(null);
                    }}
                    className={`py-3 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all border-2 ${
                      gender === 'Ladies'
                        ? 'bg-pink-50 border-pink-600 text-pink-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>👩</span> Ladies
                  </button>
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-sm">+91</span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    className="w-full pl-14 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Address
                </label>
                <textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Residential address / Colony / City"
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all outline-none resize-none"
                />
              </div>

              {/* Qualification */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Qualification
                </label>
                <input
                  type="text"
                  value={qualification}
                  onChange={e => setQualification(e.target.value)}
                  placeholder="e.g. 10th, 12th, Graduate, B.Tech, Diploma"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
                />
              </div>

              {/* Timing */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Timing
                </label>
                <input
                  type="text"
                  value={timing}
                  onChange={e => setTiming(e.target.value)}
                  placeholder="e.g. Morning, Evening, 8 AM - 2 PM, Full Day"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
                />
              </div>

              {/* Weekly Off */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Weekly Off
                </label>
                <select
                  value={weeklyOff}
                  onChange={e => setWeeklyOff(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
                >
                  <option value="">Select Weekly Off Day</option>
                  {DAYS_LIST.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                  <option value="None / Flexible">None / Flexible</option>
                </select>
              </div>

              {/* Sewa Days */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Sewa Days
                  </label>
                  <span className="text-[11px] font-bold text-indigo-600">
                    {sewaDays.length > 0 ? `${sewaDays.length} selected` : 'Select available days'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DAYS_LIST.map(day => {
                    const isSelected = sewaDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleSewaDay(day)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      if (sewaDays.length === DAYS_LIST.length) {
                        setSewaDays([]);
                      } else {
                        setSewaDays([...DAYS_LIST]);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-black border border-dashed border-slate-300 text-slate-500 hover:text-slate-800 hover:border-slate-400 transition-all"
                  >
                    {sewaDays.length === DAYS_LIST.length ? 'Clear All' : 'All Days'}
                  </button>
                </div>
              </div>

              {/* Options to Choose From (Integrated inside Sewadar Information) */}
              <div className="pt-5 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Options to choose from
                    </label>
                    <p className="text-[11px] text-slate-400 font-medium">Select departments or sewa categories</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {selectedOptions.length} chosen
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SEWA_OPTIONS.map(option => {
                    const isChecked = selectedOptions.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleOption(option)}
                        className={`p-3.5 rounded-2xl text-left font-bold text-xs flex items-center justify-between border-2 transition-all active:scale-[0.98] ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="truncate pr-2">{option}</span>
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                            isChecked
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions: Save Sewadar (Handover at later stage) vs Handover To Group */}
            <div className="space-y-4 pt-1">
              {/* Option A: Save Sewadar (Handover Later) */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {editingId ? 'Save Sewadar Changes' : 'Save Sewadar'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      {editingId 
                        ? 'Save updated sewadar details while preserving current group assignment'
                        : 'Save sewadar details now — you can handover to a group & incharge at a later stage'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSaveOnly}
                    className="flex-1 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-md shadow-emerald-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Saving Sewadar...
                      </span>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        <span>{editingId ? 'Save Changes (Keep Group)' : 'Save Sewadar (Handover Later)'}</span>
                      </>
                    )}
                  </button>

                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-wider rounded-2xl transition-all"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Option B: Handover To Group & Incharge Accordion Trigger */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowHandover(prev => !prev)}
                  className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-between gap-3 text-base active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span>{editingId ? 'Handover / Re-assign Group & Incharge' : 'Handover Directly To Incharge'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
                      {effectiveGender}
                    </span>
                    <svg
                      className={`w-5 h-5 transition-transform ${showHandover ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>

            {/* Handover Section */}
            {showHandover && (
              <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-indigo-200 space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                      Select Group & Incharge: {effectiveGender === 'Gents' ? 'Gents Groups' : 'Ladies Groups'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Select a day and click on an Incharge to add & handover this sewadar
                    </p>
                  </div>
                </div>

                {/* Day Groups Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {DAYS_LIST.map(day => {
                    const isSelected = selectedDayGroup === day;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDayGroup(day)}
                        className={`p-3 rounded-2xl text-center font-black text-xs border-2 transition-all active:scale-95 ${
                          isSelected
                            ? effectiveGender === 'Gents'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                              : 'bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <div className="text-[10px] uppercase font-bold opacity-80 mb-0.5">
                          {effectiveGender}
                        </div>
                        <div className="text-sm font-black">{day}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Incharge Name Display and Handover Action */}
                {selectedDayGroup ? (
                  <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-2xl p-5 border border-indigo-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg">
                          {selectedDayGroup} {effectiveGender}
                        </span>
                        <span className="text-xs font-black text-slate-500 uppercase">
                          Tap Incharge to Complete Handover
                        </span>
                      </div>
                    </div>

                    {effectiveGender === 'Gents' ? (
                      (() => {
                        const incharge = GENTS_INCHARGES[selectedDayGroup] || 'Incharge';
                        return (
                          <div className="bg-white rounded-2xl p-4 border-2 border-indigo-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xl shadow-inner">
                                👨
                              </div>
                              <div>
                                <div className="text-base font-black text-slate-900">
                                  {incharge}
                                </div>
                                <div className="text-xs font-semibold text-slate-400">
                                  {selectedDayGroup} Gents Security Incharge
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleHandoverAndSave(selectedDayGroup, incharge)}
                              className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isSubmitting ? (
                                <span>Saving...</span>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Handover to {incharge}</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="space-y-2.5">
                        {(LADIES_INCHARGES[selectedDayGroup] || []).map((inchargeName, idx) => (
                          <div
                            key={idx}
                            className="bg-white rounded-2xl p-4 border border-pink-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-black text-lg">
                                👩
                              </div>
                              <div>
                                <div className="text-sm font-black text-slate-800">{inchargeName}</div>
                                <div className="text-[11px] font-semibold text-slate-400">
                                  {selectedDayGroup} Ladies Security Incharge
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleHandoverAndSave(selectedDayGroup, inchargeName)}
                              className="w-full sm:w-auto px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-pink-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {isSubmitting ? (
                                <span>Saving...</span>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Handover to {inchargeName}</span>
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                    <p className="text-xs font-bold">Please select a day group above to view the incharge</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 2: ROUTED SEWADARS LIST ===================== */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3">
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search sewadar by name, incharge, phone, or group..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-600 outline-none text-sm"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setGenderFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      genderFilter === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setGenderFilter('Gents')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      genderFilter === 'Gents' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    👨 Gents
                  </button>
                  <button
                    onClick={() => setGenderFilter('Ladies')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      genderFilter === 'Ladies' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    👩 Ladies
                  </button>
                </div>

                <select
                  value={dayFilter}
                  onChange={e => setDayFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none"
                >
                  <option value="ALL">All Groups</option>
                  <option value="HR Table">⏳ Pending Handover</option>
                  {DAYS_LIST.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List Header */}
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                {filteredRoutedSewadars.length} {filteredRoutedSewadars.length === 1 ? 'Sewadar' : 'Sewadars'} Routed by HR Table
              </span>
              <button
                onClick={() => {
                  resetForm();
                  setActiveTab('form');
                }}
                className="text-xs font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider flex items-center gap-1"
              >
                <span>+ Add New</span>
              </button>
            </div>

            {/* Empty State */}
            {filteredRoutedSewadars.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-sm space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center text-2xl">
                  📋
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">No Routed Sewadars Found</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {routedSewadars.length === 0
                      ? 'No sewadars have been routed by the HR Table yet. Fill the registration form to handover sewadars to respective groups.'
                      : 'No sewadars match your search or filter criteria.'}
                  </p>
                </div>
                {routedSewadars.length === 0 && (
                  <button
                    onClick={() => {
                      resetForm();
                      setActiveTab('form');
                    }}
                    className="px-6 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md shadow-indigo-200 active:scale-95 transition-all"
                  >
                    + Register First Sewadar
                  </button>
                )}
              </div>
            ) : (
              /* Sewadars Cards */
              <div className="space-y-3">
                {filteredRoutedSewadars.map((s, idx) => {
                  const data = s.hrTableData || {};
                  return (
                    <div
                      key={s.id}
                      className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-sm hover:border-indigo-200 transition-all space-y-4"
                    >
                      {/* Top Row: Name, Tags & Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black text-slate-300 w-5">#{idx + 1}</span>
                            <h3 className="text-base font-black text-slate-900 leading-tight">
                              {s.name}
                            </h3>
                            {s.routedByHrTable && (
                              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[9px] font-black uppercase tracking-wider shadow-xs">
                                Routed by HR table
                              </span>
                            )}
                            {(s.tag === 'Punjab Zone' || s.originZone === 'Punjab Zone' || s.routedByZone) && (
                              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[9px] font-black uppercase tracking-wider shadow-xs">
                                Punjab Zone
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                s.gender === 'Gents'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                  : 'bg-pink-50 text-pink-700 border border-pink-100'
                              }`}
                            >
                              {s.group === 'HR Table' ? 'HR Table' : `${s.group} ${s.gender}`}
                            </span>
                            {data.handoverIncharge ? (
                              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-black flex items-center gap-1">
                                <span>🤝 Handover:</span>
                                <span>{data.handoverIncharge}</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black flex items-center gap-1">
                                <span>⏳ Handover Pending</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Edit and Delete Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(s)}
                            className="px-3.5 py-2 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
                            title="Edit details or change group"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <span>{data.handoverIncharge ? 'Edit / Group' : 'Edit / Handover'}</span>
                          </button>

                          <button
                            type="button"
                            disabled={deletingId === s.id}
                            onClick={() => handleDelete(s.id, s.name)}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50 shadow-xs"
                            title="Delete this sewadar"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>{deletingId === s.id ? '...' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Detail Chips */}
                      <div className="flex flex-wrap gap-2 text-xs pt-1 border-t border-slate-100">
                        {data.phoneNumber && (
                          <span className="px-2.5 py-1 bg-slate-50 text-slate-700 rounded-lg font-bold border border-slate-200 flex items-center gap-1">
                            📞 {data.phoneNumber}
                          </span>
                        )}
                        {data.address && (
                          <span className="px-2.5 py-1 bg-slate-50 text-slate-700 rounded-lg font-bold border border-slate-200 flex items-center gap-1 max-w-[200px] truncate">
                            📍 {data.address}
                          </span>
                        )}
                        {data.qualification && (
                          <span className="px-2.5 py-1 bg-slate-50 text-slate-700 rounded-lg font-bold border border-slate-200 flex items-center gap-1">
                            🎓 {data.qualification}
                          </span>
                        )}
                        {data.timing && (
                          <span className="px-2.5 py-1 bg-slate-50 text-slate-700 rounded-lg font-bold border border-slate-200 flex items-center gap-1">
                            ⏰ {data.timing}
                          </span>
                        )}
                        {data.weeklyOff && (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg font-bold border border-amber-200 flex items-center gap-1">
                            🗓️ Off: {data.weeklyOff}
                          </span>
                        )}
                      </div>

                      {/* Sewa Days & Chosen Departments */}
                      {(data.sewaDays?.length || data.selectedOptions?.length) ? (
                        <div className="space-y-1.5 pt-1">
                          {data.sewaDays && data.sewaDays.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-black uppercase text-slate-400">Sewa Days:</span>
                              {data.sewaDays.map(d => (
                                <span key={d} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-md">
                                  {d.slice(0, 3)}
                                </span>
                              ))}
                            </div>
                          )}

                          {data.selectedOptions && data.selectedOptions.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-black uppercase text-slate-400">Categories:</span>
                              {data.selectedOptions.map(opt => (
                                <span key={opt} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-black rounded-md border border-emerald-100">
                                  {opt}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
