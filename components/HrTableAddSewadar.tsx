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
      phoneNumber?: string | null;
      address?: string | null;
      qualification?: string | null;
      timing?: string | null;
      weeklyOff?: string | null;
      sewaDays?: string[];
      selectedOptions?: string[];
      interestedGroups?: string[];
      securityGentsGroups?: string[];
      securityLadiesGroups?: string[];
      handoverDayGroup?: string | null;
      handoverIncharge?: string | null;
      handoverDate?: string | null;
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
  // Tabs: 'form' (Add Sewadar), 'sewadars' (All Sewadars), 'routed' (Routed Sewadars)
  const [activeTab, setActiveTab] = useState<'form' | 'sewadars' | 'routed'>('form');

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
  const [interestedGroups, setInterestedGroups] = useState<string[]>([]);
  const [securityGentsGroups, setSecurityGentsGroups] = useState<string[]>([]);
  const [securityLadiesGroups, setSecurityLadiesGroups] = useState<string[]>([]);

  // Action states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // List Handover state (Zone Attendance pattern)
  const [activeHandoverId, setActiveHandoverId] = useState<string | null>(null);
  const [handoverDay, setHandoverDay] = useState<string | null>(null);
  const [isHandingOver, setIsHandingOver] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'Gents' | 'Ladies'>('ALL');
  const [dayFilter, setDayFilter] = useState<string>('ALL');

  // All Sewadars created/managed by HR Table
  const allSewadars = useMemo(() => {
    return customSewadars.filter(s => 
      s.group === 'HR Table' || 
      s.routedByHrTable || 
      s.routedByZone || 
      s.tag === 'Punjab Zone' || 
      s.originZone === 'Punjab Zone' || 
      Boolean(s.hrTableData)
    );
  }, [customSewadars]);

  // Routed Sewadars: ONLY those who have been handed over to a group and incharge
  const routedSewadars = useMemo(() => {
    return allSewadars.filter(s => 
      Boolean(s.hrTableData?.handoverIncharge && (s.hrTableData?.handoverDayGroup || (s.group && s.group !== 'HR Table')))
    );
  }, [allSewadars]);

  // Filtered list for "Sewadars" tab (All sewadars)
  const filteredAllSewadars = useMemo(() => {
    return allSewadars.filter(s => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.hrTableData?.phoneNumber && s.hrTableData.phoneNumber.includes(searchTerm)) ||
        (s.hrTableData?.handoverIncharge && s.hrTableData.handoverIncharge.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.group.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.hrTableData?.handoverDayGroup && s.hrTableData.handoverDayGroup.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesGender = genderFilter === 'ALL' || s.gender === genderFilter;
      const matchesDay = 
        dayFilter === 'ALL' || 
        s.group === dayFilter || 
        s.hrTableData?.handoverDayGroup === dayFilter ||
        (dayFilter === 'HR Table' && (!s.hrTableData?.handoverIncharge || s.group === 'HR Table'));

      return matchesSearch && matchesGender && matchesDay;
    });
  }, [allSewadars, searchTerm, genderFilter, dayFilter]);

  // Filtered list for "Routed Sewadars" tab (Only handed over)
  const filteredRoutedSewadars = useMemo(() => {
    return routedSewadars.filter(s => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.hrTableData?.phoneNumber && s.hrTableData.phoneNumber.includes(searchTerm)) ||
        (s.hrTableData?.handoverIncharge && s.hrTableData.handoverIncharge.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.group.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.hrTableData?.handoverDayGroup && s.hrTableData.handoverDayGroup.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesGender = genderFilter === 'ALL' || s.gender === genderFilter;
      const matchesDay = 
        dayFilter === 'ALL' || 
        s.group === dayFilter || 
        s.hrTableData?.handoverDayGroup === dayFilter;

      return matchesSearch && matchesGender && matchesDay;
    });
  }, [routedSewadars, searchTerm, genderFilter, dayFilter]);

  const toggleOption = (opt: string) => {
    setSelectedOptions(prev => {
      const isChecked = prev.includes(opt);
      if (isChecked) {
        if (opt === 'Security gents') setSecurityGentsGroups([]);
        if (opt === 'Security ladies') setSecurityLadiesGroups([]);
        return prev.filter(o => o !== opt);
      } else {
        return [...prev, opt];
      }
    });
  };

  const toggleSecurityGentsGroup = (day: string) => {
    setSecurityGentsGroups(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleSecurityLadiesGroup = (day: string) => {
    setSecurityLadiesGroups(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
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
    setInterestedGroups([]);
    setSecurityGentsGroups([]);
    setSecurityLadiesGroups([]);
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

    const gentsGrp = s.hrTableData?.securityGentsGroups || [];
    const ladiesGrp = s.hrTableData?.securityLadiesGroups || [];
    const legacyGrp = s.hrTableData?.interestedGroups || [];
    setSecurityGentsGroups(gentsGrp.length > 0 ? gentsGrp : (s.gender === 'Gents' ? legacyGrp : []));
    setSecurityLadiesGroups(ladiesGrp.length > 0 ? ladiesGrp : (s.gender === 'Ladies' ? legacyGrp : []));
    setInterestedGroups(legacyGrp);

    setActiveTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save sewadar directly from form (preserves existing group & handover data if editing)
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
      const targetDay = existing?.group || 'HR Table';
      const keepIncharge = existing?.hrTableData?.handoverIncharge || null;
      const keepHandoverGroup = existing?.hrTableData?.handoverDayGroup || (targetDay !== 'HR Table' ? targetDay : null);
      const keepHandoverDate = existing?.hrTableData?.handoverDate || null;

      const combinedInterestedGroups = Array.from(new Set([...securityGentsGroups, ...securityLadiesGroups]));

      await onSaveSewadar({
        id: editingId || undefined,
        name: name.trim(),
        gender,
        group: targetDay,
        hrTableData: {
          phoneNumber: phoneNumber.trim() || null,
          address: address.trim() || null,
          qualification: qualification.trim() || null,
          timing: timing.trim() || null,
          weeklyOff: weeklyOff || null,
          sewaDays: sewaDays.length > 0 ? sewaDays : [],
          selectedOptions: selectedOptions.length > 0 ? selectedOptions : [],
          interestedGroups: combinedInterestedGroups,
          securityGentsGroups: securityGentsGroups,
          securityLadiesGroups: securityLadiesGroups,
          handoverDayGroup: keepHandoverGroup,
          handoverIncharge: keepIncharge,
          handoverDate: keepHandoverDate,
          createdAt: existing?.hrTableData?.createdAt || Date.now(),
          updatedAt: Date.now()
        }
      });

      const actionText = editingId ? 'updated' : 'saved';
      setFeedback({
        type: 'success',
        message: `Sewadar "${name.trim()}" successfully ${actionText}!`
      });

      resetForm();
      setActiveTab('sewadars');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Save Error:', err);
      setFeedback({ type: 'error', message: err?.message || 'Failed to save sewadar. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handover directly from list view (Zone Attendance pattern)
  const handleListHandover = async (sewadar: Sewadar, targetDay: string, inchargeName: string) => {
    setIsHandingOver(true);
    setFeedback(null);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await onSaveSewadar({
        id: sewadar.id,
        name: sewadar.name,
        gender: sewadar.gender,
        group: targetDay as DutyGroup,
        hrTableData: {
          phoneNumber: sewadar.hrTableData?.phoneNumber || null,
          address: sewadar.hrTableData?.address || null,
          qualification: sewadar.hrTableData?.qualification || null,
          timing: sewadar.hrTableData?.timing || null,
          weeklyOff: sewadar.hrTableData?.weeklyOff || null,
          sewaDays: sewadar.hrTableData?.sewaDays || [],
          selectedOptions: sewadar.hrTableData?.selectedOptions || [],
          interestedGroups: sewadar.hrTableData?.interestedGroups || [],
          securityGentsGroups: sewadar.hrTableData?.securityGentsGroups || [],
          securityLadiesGroups: sewadar.hrTableData?.securityLadiesGroups || [],
          handoverDayGroup: targetDay,
          handoverIncharge: inchargeName,
          handoverDate: todayStr,
          createdAt: sewadar.hrTableData?.createdAt || Date.now(),
          updatedAt: Date.now()
        }
      });

      setFeedback({
        type: 'success',
        message: `✓ Handed over "${sewadar.name}" to ${inchargeName} in ${targetDay} ${sewadar.gender} group!`
      });

      setActiveHandoverId(null);
      setHandoverDay(null);
    } catch (err: any) {
      console.error('Handover Error:', err);
      setFeedback({ type: 'error', message: err?.message || 'Failed to handover sewadar. Please try again.' });
    } finally {
      setIsHandingOver(false);
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

        {/* View Switcher Tabs: ADD SEWADAR | SEWADARS | ROUTED SEWADARS */}
        <div className="max-w-2xl mx-auto mt-4 flex bg-slate-100 p-1 rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'form'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="truncate">{editingId ? 'Edit Sewadar' : 'Add Sewadar'}</span>
          </button>

          <button
            onClick={() => setActiveTab('sewadars')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'sewadars'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="truncate">Sewadars ({allSewadars.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('routed')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'routed'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="truncate">Routed Sewadars ({routedSewadars.length})</span>
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
                    onClick={() => setGender('Gents')}
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
                    onClick={() => setGender('Ladies')}
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
                    const isSecurityGents = option === 'Security gents';
                    const isSecurityLadies = option === 'Security ladies';
                    const hasSubOptions = (isSecurityGents || isSecurityLadies) && isChecked;
                    const currentSubGroups = isSecurityGents ? securityGentsGroups : securityLadiesGroups;

                    return (
                      <div
                        key={option}
                        className={`rounded-2xl border-2 transition-all overflow-hidden ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-600 text-emerald-950 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        } ${hasSubOptions ? 'sm:col-span-2' : ''}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleOption(option)}
                          className="w-full p-3.5 text-left font-bold text-xs flex items-center justify-between active:scale-[0.99] transition-all"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="truncate">{option}</span>
                            {hasSubOptions && currentSubGroups.length > 0 && (
                              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-black shrink-0">
                                {currentSubGroups.length} group{currentSubGroups.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <div
                            className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
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

                        {/* Sub-options for Groups (Monday - Sunday) */}
                        {hasSubOptions && (
                          <div className="px-3.5 pb-3.5 pt-2 border-t border-emerald-200/80 space-y-2.5 bg-white/60">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                                  <span>🗓️</span> Interested Group(s) for {option}
                                </span>
                                <p className="text-[10px] text-emerald-700/80 font-semibold mt-0.5">
                                  Select which day group they are interested in (separate from handover)
                                </p>
                              </div>
                              {currentSubGroups.length > 0 && (
                                <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100/90 text-emerald-800 rounded-lg border border-emerald-200">
                                  {currentSubGroups.join(', ')}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {DAYS_LIST.map(day => {
                                const isGroupSelected = currentSubGroups.includes(day);
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isSecurityGents) {
                                        toggleSecurityGentsGroup(day);
                                      } else {
                                        toggleSecurityLadiesGroup(day);
                                      }
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border active:scale-95 ${
                                      isGroupSelected
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                        : 'bg-white text-slate-700 border-emerald-200/90 hover:border-emerald-400 hover:bg-emerald-50'
                                    }`}
                                  >
                                    {day}
                                  </button>
                                );
                              })}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (currentSubGroups.length === DAYS_LIST.length) {
                                    if (isSecurityGents) setSecurityGentsGroups([]);
                                    else setSecurityLadiesGroups([]);
                                  } else {
                                    if (isSecurityGents) setSecurityGentsGroups([...DAYS_LIST]);
                                    else setSecurityLadiesGroups([...DAYS_LIST]);
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-black border border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-100/60 transition-all"
                              >
                                {currentSubGroups.length === DAYS_LIST.length ? 'Clear' : 'All Days'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={isSubmitting || !name.trim()}
                  onClick={handleSaveOnly}
                  className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-md shadow-emerald-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  Save sewadar
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: ALL SEWADARS ("SEWADARS") ===================== */}
        {activeTab === 'sewadars' && (
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
                {filteredAllSewadars.length} {filteredAllSewadars.length === 1 ? 'Sewadar' : 'Sewadars'}
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
            {filteredAllSewadars.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-sm space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center text-2xl">
                  📋
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">No Sewadars Found</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {allSewadars.length === 0
                      ? 'No sewadars have been registered yet. Fill the registration form to add sewadars.'
                      : 'No sewadars match your search or filter criteria.'}
                  </p>
                </div>
                {allSewadars.length === 0 && (
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
              /* All Sewadars Cards */
              <div className="space-y-3">
                {filteredAllSewadars.map((s, idx) => {
                  const data = s.hrTableData || {};
                  const isHandedOver = Boolean(data.handoverIncharge && (data.handoverDayGroup || s.group !== 'HR Table'));
                  return (
                    <div
                      key={s.id}
                      className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-sm hover:border-indigo-200 transition-all space-y-4"
                    >
                      {/* Top Row: Name, Status & Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black text-slate-300 w-5">#{idx + 1}</span>
                            <h3 className="text-base font-black text-slate-900 leading-tight">
                              {s.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                s.gender === 'Gents'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                  : 'bg-pink-50 text-pink-700 border border-pink-100'
                              }`}
                            >
                              {s.gender}
                            </span>
                            {isHandedOver && (
                              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-black flex items-center gap-1">
                                <span>🤝 Handed over:</span>
                                <span>{data.handoverDayGroup || s.group} ({data.handoverIncharge})</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Handover Button */}
                        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                          {isHandedOver ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (activeHandoverId === s.id) {
                                  setActiveHandoverId(null);
                                  setHandoverDay(null);
                                } else {
                                  setActiveHandoverId(s.id);
                                  setHandoverDay(data.handoverDayGroup || (s.group !== 'HR Table' ? s.group : null));
                                }
                              }}
                              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs active:scale-95 transition-all"
                            >
                              <span>{activeHandoverId === s.id ? 'Close' : 'Reassign ↗'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (activeHandoverId === s.id) {
                                  setActiveHandoverId(null);
                                  setHandoverDay(null);
                                } else {
                                  setActiveHandoverId(s.id);
                                  setHandoverDay(null);
                                }
                              }}
                              className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md shadow-indigo-100 active:scale-95 transition-all"
                            >
                              <span>{activeHandoverId === s.id ? 'Close' : 'Handover To →'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Handover To Section - Exactly like Zone Attendance */}
                      {activeHandoverId === s.id && (
                        <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/40 rounded-3xl p-5 border-2 border-indigo-100 space-y-4 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                                <span>🤝</span> Handover To Group
                              </h4>
                              <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                                {isHandedOver
                                  ? `Assigned to ${data.handoverDayGroup || s.group} ${s.gender} (${data.handoverIncharge})`
                                  : `Route and assign this ${s.gender} sewadar to a specific day group & incharge`}
                              </p>
                            </div>
                            {isHandedOver && (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase rounded-lg border border-emerald-300 shadow-xs">
                                ✓ Assigned to {data.handoverDayGroup || s.group}
                              </span>
                            )}
                          </div>

                          {/* 1. Choose Day ({s.gender} Groups) */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                              1. Choose Day ({s.gender} Groups)
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {DAYS_LIST.map(day => {
                                const isSelected = handoverDay === day;
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => setHandoverDay(day)}
                                    className={`p-2.5 rounded-xl text-center font-black text-xs border transition-all active:scale-95 ${
                                      isSelected
                                        ? s.gender === 'Gents'
                                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                          : 'bg-pink-600 text-white border-pink-600 shadow-sm'
                                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                                    }`}
                                  >
                                    <div className="text-[9px] uppercase font-bold opacity-75">{s.gender}</div>
                                    <div className="text-xs font-black">{day}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 2. Select Incharge */}
                          {handoverDay && (
                            <div className="bg-white rounded-2xl p-4 border border-indigo-100 space-y-3">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                2. Select Group Incharge for {handoverDay} {s.gender}
                              </span>
                              {s.gender === 'Gents' ? (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                  <div>
                                    <p className="text-sm font-black text-slate-800">
                                      {GENTS_INCHARGES[handoverDay] || 'Incharge'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400">
                                      {handoverDay} Gents Security Incharge
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={isHandingOver}
                                    onClick={() => handleListHandover(s, handoverDay, GENTS_INCHARGES[handoverDay] || 'Incharge')}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                  >
                                    <span>{isHandingOver ? 'Assigning...' : `Handover to ${GENTS_INCHARGES[handoverDay]}`}</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {(LADIES_INCHARGES[handoverDay] || []).map((incName, iIdx) => (
                                    <div key={iIdx} className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                      <div>
                                        <p className="text-sm font-black text-slate-800">{incName}</p>
                                        <p className="text-[10px] font-bold text-slate-400">{handoverDay} Ladies Incharge</p>
                                      </div>
                                      <button
                                        type="button"
                                        disabled={isHandingOver}
                                        onClick={() => handleListHandover(s, handoverDay, incName)}
                                        className="w-full sm:w-auto px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                      >
                                        <span>{isHandingOver ? 'Assigning...' : `Handover to ${incName}`}</span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 3: ROUTED SEWADARS (HANDED OVER ONLY) ===================== */}
        {activeTab === 'routed' && (
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
                  placeholder="Search routed sewadar by name, incharge, or group..."
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
                  {DAYS_LIST.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List Header */}
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                {filteredRoutedSewadars.length} {filteredRoutedSewadars.length === 1 ? 'Sewadar' : 'Sewadars'} Handed Over
              </span>
            </div>

            {/* Empty State */}
            {filteredRoutedSewadars.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-sm space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center text-2xl">
                  🤝
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">No Handed Over Sewadars Found</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {routedSewadars.length === 0
                      ? 'No sewadars have been handed over to a group and incharge yet. Switch to the "Sewadars" tab to handover sewadars.'
                      : 'No routed sewadars match your search or filter criteria.'}
                  </p>
                </div>
                {routedSewadars.length === 0 && (
                  <button
                    onClick={() => setActiveTab('sewadars')}
                    className="px-6 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md shadow-indigo-200 active:scale-95 transition-all"
                  >
                    Go to Sewadars Tab
                  </button>
                )}
              </div>
            ) : (
              /* Routed Sewadars Cards - STRICTLY clean without edit/delete, without ready for handover, without chips */
              <div className="space-y-3">
                {filteredRoutedSewadars.map((s, idx) => {
                  const data = s.hrTableData || {};
                  return (
                    <div
                      key={s.id}
                      className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-sm hover:border-indigo-200 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3">
                          <span className="text-[10px] font-black text-slate-300 w-5 pt-0.5 sm:pt-0">#{idx + 1}</span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-black text-slate-900 leading-tight">
                                {s.name}
                              </h3>
                              <span
                                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                  s.gender === 'Gents'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                    : 'bg-pink-50 text-pink-700 border border-pink-100'
                                }`}
                              >
                                {s.gender}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-black flex items-center gap-1.5 shadow-xs">
                                <span className="text-emerald-600">✓</span>
                                <span>Handed over to:</span>
                                <span className="font-extrabold">{data.handoverDayGroup || s.group} {s.gender}</span>
                              </span>

                              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-black flex items-center gap-1.5 shadow-xs">
                                <span>👤</span>
                                <span>Incharge:</span>
                                <span className="font-extrabold">{data.handoverIncharge}</span>
                              </span>

                              {data.handoverDate && (
                                <span className="px-2.5 py-1 bg-slate-50 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-bold">
                                  🗓️ {data.handoverDate}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Reassign action if they need to change group/incharge */}
                        <div className="self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (activeHandoverId === s.id) {
                                setActiveHandoverId(null);
                                setHandoverDay(null);
                              } else {
                                setActiveHandoverId(s.id);
                                setHandoverDay(data.handoverDayGroup || (s.group !== 'HR Table' ? s.group : null));
                              }
                            }}
                            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs active:scale-95 transition-all"
                          >
                            <span>{activeHandoverId === s.id ? 'Close' : 'Reassign ↗'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Reassign Handover Drawer */}
                      {activeHandoverId === s.id && (
                        <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/40 rounded-3xl p-5 border-2 border-indigo-100 space-y-4 animate-in fade-in duration-200 mt-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                                <span>🤝</span> Reassign Handover
                              </h4>
                              <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                                Reassign {s.name} to another group and incharge
                              </p>
                            </div>
                          </div>

                          {/* 1. Choose Day */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                              1. Choose Day ({s.gender} Groups)
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {DAYS_LIST.map(day => {
                                const isSelected = handoverDay === day;
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => setHandoverDay(day)}
                                    className={`p-2.5 rounded-xl text-center font-black text-xs border transition-all active:scale-95 ${
                                      isSelected
                                        ? s.gender === 'Gents'
                                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                          : 'bg-pink-600 text-white border-pink-600 shadow-sm'
                                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                                    }`}
                                  >
                                    <div className="text-[9px] uppercase font-bold opacity-75">{s.gender}</div>
                                    <div className="text-xs font-black">{day}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 2. Select Incharge */}
                          {handoverDay && (
                            <div className="bg-white rounded-2xl p-4 border border-indigo-100 space-y-3">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                2. Select Group Incharge for {handoverDay} {s.gender}
                              </span>
                              {s.gender === 'Gents' ? (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                  <div>
                                    <p className="text-sm font-black text-slate-800">
                                      {GENTS_INCHARGES[handoverDay] || 'Incharge'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400">
                                      {handoverDay} Gents Security Incharge
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={isHandingOver}
                                    onClick={() => handleListHandover(s, handoverDay, GENTS_INCHARGES[handoverDay] || 'Incharge')}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                  >
                                    <span>{isHandingOver ? 'Assigning...' : `Handover to ${GENTS_INCHARGES[handoverDay]}`}</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {(LADIES_INCHARGES[handoverDay] || []).map((incName, iIdx) => (
                                    <div key={iIdx} className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                      <div>
                                        <p className="text-sm font-black text-slate-800">{incName}</p>
                                        <p className="text-[10px] font-bold text-slate-400">{handoverDay} Ladies Incharge</p>
                                      </div>
                                      <button
                                        type="button"
                                        disabled={isHandingOver}
                                        onClick={() => handleListHandover(s, handoverDay, incName)}
                                        className="w-full sm:w-auto px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                      >
                                        <span>{isHandingOver ? 'Assigning...' : `Handover to ${incName}`}</span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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
