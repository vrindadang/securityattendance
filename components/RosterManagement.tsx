import React, { useState, useMemo } from 'react';
import { Sewadar, Volunteer, SewadarDetails, Gender, DutyGroup } from '../types';
import { GENTS_GROUPS, LADIES_GROUPS } from '../constants';

interface Props {
  sewadars: Sewadar[];
  details: Record<string, SewadarDetails>;
  activeVolunteer: Volunteer;
  onAddSewadar: (name: string, gender: Gender, group: DutyGroup, shift?: 'DAY' | 'NIGHT', details?: Partial<SewadarDetails>) => Promise<void>;
  onDeleteSewadar: (id: string) => Promise<void>;
  onSaveDetails: (details: SewadarDetails) => Promise<void>;
}

export const RosterManagement: React.FC<Props> = ({
  sewadars,
  details,
  activeVolunteer,
  onAddSewadar,
  onDeleteSewadar,
  onSaveDetails
}) => {
  const [selectedGender, setSelectedGender] = useState<Gender>('Gents');
  const [selectedGroup, setSelectedGroup] = useState<DutyGroup>('Monday');
  const [searchQuery, setSearchQuery] = useState('');

  // Add volunteer form states
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDob, setNewDob] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newShift, setNewShift] = useState<'DAY' | 'NIGHT' | ''>('');
  const [isAdding, setIsAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isSuperAdmin = activeVolunteer?.role === 'Super Admin';

  const groupOptions = useMemo(() => {
    return selectedGender === 'Gents' ? GENTS_GROUPS : LADIES_GROUPS;
  }, [selectedGender]);

  // If group is not in options when gender changes, reset it
  React.useEffect(() => {
    if (!groupOptions.includes(selectedGroup)) {
      setSelectedGroup(groupOptions[0] || 'Monday');
    }
  }, [selectedGender, groupOptions, selectedGroup]);

  // Filter sewadars in the current gender + group
  const groupSewadars = useMemo(() => {
    return sewadars.filter(s => {
      const matchGender = s.gender === selectedGender;
      const matchGroup = s.group.toLowerCase().trim() === selectedGroup.toLowerCase().trim();
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGender && matchGroup && matchSearch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [sewadars, selectedGender, selectedGroup, searchQuery]);

  const handleAddVolunteerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    setErrorMsg('');
    setSuccessMsg('');

    if (!newName.trim()) {
      setErrorMsg('Name is required');
      return;
    }

    setIsAdding(true);
    try {
      const sewadarDetails: Partial<SewadarDetails> = {
        phone: newPhone.trim(),
        dob: newDob,
        address: newAddress.trim()
      };

      await onAddSewadar(
        newName.trim(),
        selectedGender,
        selectedGroup,
        newShift ? (newShift as 'DAY' | 'NIGHT') : undefined,
        sewadarDetails
      );

      setSuccessMsg(`Successfully added ${newName.trim()} to ${selectedGroup}!`);
      setNewName('');
      setNewPhone('');
      setNewDob('');
      setNewAddress('');
      setNewShift('');
      
      // Auto clear success message
      setTimeout(() => {
        setSuccessMsg('');
      }, 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to add volunteer. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteClick = async (sewadar: Sewadar) => {
    if (!isSuperAdmin) return;
    try {
      await onDeleteSewadar(sewadar.id);
    } catch (err) {
      console.error(err);
      alert('Failed to delete member');
    }
  };

  const toProperCase = (str: string): string => {
    if (!str) return "";
    let cleaned = str.replace(/[_\-–]/g, ' ');
    cleaned = cleaned.replace(/[^a-zA-Z\s]/g, '');
    return cleaned
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div id="roster-management-root" className="space-y-8 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header Section */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Super Admin Roster Manager
        </h2>
        <p className="text-slate-500 text-xs mt-2 leading-relaxed max-w-3xl">
          Complete, authoritative cohort and shift management. You can select any daily group to view the active roster, delete existing members, or register new volunteers with persistent database overrides.
        </p>
      </div>

      {/* Grid: Left Column (Add Volunteer), Right Column (View & Delete Volunteers) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Add Volunteer Form */}
        <div className="lg:col-span-5 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col h-fit">
          <h3 className="text-lg font-black text-slate-900 tracking-tight mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Add New Member
          </h3>

          <form onSubmit={handleAddVolunteerSubmit} className="space-y-4">
            {/* Gender Switch */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Gender Category</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedGender('Gents')}
                  className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${selectedGender === 'Gents' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Gents
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGender('Ladies')}
                  className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${selectedGender === 'Ladies' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Ladies
                </button>
              </div>
            </div>

            {/* Target Group Selector */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Target Duty Group</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                {groupOptions.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Volunteer Name */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Full Name</label>
              <input
                type="text"
                placeholder="Enter volunteer name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-medium text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Phone Number (Optional)</label>
              <input
                type="tel"
                placeholder="e.g. 9812345678"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-medium text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Shift Choice for Ladies Group (DAY/NIGHT) */}
            {selectedGender === 'Ladies' && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Shift Duty (Optional)</label>
                <select
                  value={newShift}
                  onChange={(e) => setNewShift(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="">No specific shift (Full Day)</option>
                  <option value="DAY">DAY Shift</option>
                  <option value="NIGHT">NIGHT Shift</option>
                </select>
              </div>
            )}

            {/* Date of Birth */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Date of Birth (Optional)</label>
              <input
                type="date"
                value={newDob}
                onChange={(e) => setNewDob(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-medium text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Residential Address (Optional)</label>
              <textarea
                placeholder="Enter postal address..."
                rows={2}
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-medium text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
              />
            </div>

            {/* Notifications */}
            {errorMsg && (
              <p className="text-red-500 text-xs font-bold font-mono bg-red-50 p-3 rounded-xl border border-red-100">{errorMsg}</p>
            )}
            {successMsg && (
              <p className="text-emerald-600 text-xs font-bold font-mono bg-emerald-50 p-3 rounded-xl border border-emerald-100 animate-pulse">{successMsg}</p>
            )}

            <button
              type="submit"
              disabled={isAdding || !isSuperAdmin}
              className={`w-full py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-md transition-all active:scale-95 ${!isSuperAdmin ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
            >
              {isAdding ? 'Adding Member...' : 'Register Volunteer'}
            </button>
          </form>
        </div>

        {/* Right: View & Delete Volunteers List */}
        <div className="lg:col-span-7 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col">
          {/* Filters header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-5 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {selectedGroup} Group ({selectedGender})
              </h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                Active Cohort: {groupSewadars.length} Volunteers listed
              </p>
            </div>

            <div className="w-full sm:w-64 relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search within group..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl font-medium text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Selector bar on the right side for group selection */}
          <div className="flex flex-wrap gap-2 mb-6">
            {groupOptions.map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGroup(g)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedGroup === g ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Roster Listing */}
          <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 no-scrollbar">
            {groupSewadars.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <svg className="w-12 h-12 text-slate-300 stroke-1 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">No volunteers found</p>
                <p className="text-slate-400 text-xs mt-1">Try refining your search query or add a member to this group above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {groupSewadars.map((sewadar) => {
                  const sDetails = details[sewadar.id] || {};
                  return (
                    <div
                      key={sewadar.id}
                      className="group flex justify-between items-center bg-slate-50/50 hover:bg-slate-50 p-4 rounded-2xl border border-slate-100/70 hover:border-slate-200/80 transition-all duration-200"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {toProperCase(sewadar.name)}
                          </span>
                          {sewadar.shift && (
                            <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border border-indigo-100">
                              {sewadar.shift} Shift
                            </span>
                          )}
                          {sewadar.isCustom ? (
                            <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border border-emerald-100">
                              Added
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">
                              Rostered
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-[11px] text-slate-400">
                          <span className="font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">
                            ID: {sewadar.id}
                          </span>
                          {sDetails.phone ? (
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {sDetails.phone}
                            </span>
                          ) : (
                            <span className="italic text-slate-300">No phone number</span>
                          )}
                        </div>
                      </div>

                      {/* Delete Button */}
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleDeleteClick(sewadar)}
                          title="Delete member from roster"
                          className="p-2.5 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 border border-red-100 hover:border-red-200 rounded-xl transition-all active:scale-95"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
