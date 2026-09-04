import React, { useState, useMemo } from 'react';
import { Sewadar, SewadarDetails, DutyGroup, Volunteer } from '../types';
import { INITIAL_SEWADAR_DETAILS } from '../constants';

interface PunjabZoneStructureProps {
  allSewadars: Sewadar[];
  details: Record<string, SewadarDetails>;
  activeVolunteer?: Volunteer | null;
  onAddSewadar?: (name: string, gender: 'Gents' | 'Ladies', group: DutyGroup, shift?: 'DAY' | 'NIGHT', details?: { dob: string; phone: string; address: string }, isRestored?: boolean) => Promise<void>;
  onBackToPortal?: () => void;
  onNavigateToAttendance?: () => void;
}

interface OrgMember {
  sewadar: Sewadar;
  district: string;
  phone: string;
  age?: number;
  dob?: string;
}

const COMMON_DISTRICTS = [
  'Pathankot',
  'Gurdaspur',
  'Ludhiana',
  'Jagraon',
  'Moga',
  'Jalandhar',
  'Hoshiyar Pur',
  'Nava Shahar',
  'Udham Singh Nagar'
];

export const PunjabZoneStructure: React.FC<PunjabZoneStructureProps> = ({
  allSewadars,
  details,
  activeVolunteer,
  onAddSewadar,
  onBackToPortal,
  onNavigateToAttendance
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<'ALL' | 'PATHANKOT_GENTS' | 'LUDHIANA_GENTS' | 'JAGRAON_LADIES' | 'LUDHIANA_LADIES'>('ALL');
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  
  // Track which coordinator branches have their sewadar lists expanded
  // By default, ALL are collapsed ("The list of sewadars should only be expanded when that area coordinator name is clicked. Otherwise dont show.")
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({
    PATHANKOT_GENTS: false,
    LUDHIANA_GENTS: false,
    JAGRAON_LADIES: false,
    LUDHIANA_LADIES: false,
  });

  const toggleBranch = (branchKey: string) => {
    setExpandedBranches(prev => ({
      ...prev,
      [branchKey]: !prev[branchKey]
    }));
  };

  const areAllExpanded = Object.values(expandedBranches).some(Boolean);
  const toggleAllBranches = () => {
    const next = !areAllExpanded;
    setExpandedBranches({
      PATHANKOT_GENTS: next,
      LUDHIANA_GENTS: next,
      JAGRAON_LADIES: next,
      LUDHIANA_LADIES: next,
    });
  };

  // Mobile Scale / Zoom state for hierarchy view
  const [mobileScale, setMobileScale] = useState<'fit' | '75' | '100'>('fit');

  // Modal for adding a sewadar directly to Punjab Zone
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSewadarName, setNewSewadarName] = useState('');
  const [newSewadarGender, setNewSewadarGender] = useState<'Gents' | 'Ladies'>('Gents');
  const [newSewadarBranch, setNewSewadarBranch] = useState<'PATHANKOT_GENTS' | 'LUDHIANA_GENTS' | 'JAGRAON_LADIES' | 'LUDHIANA_LADIES'>('LUDHIANA_GENTS');
  const [newSewadarDistrict, setNewSewadarDistrict] = useState('Ludhiana');
  const [newSewadarPhone, setNewSewadarPhone] = useState('');
  const [newSewadarDob, setNewSewadarDob] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Filter Punjab sewadars and enrich them with district & details
  const punjabSewadarsEnriched = useMemo(() => {
    return allSewadars
      .filter(s => {
        const grp = (s.group || '').toLowerCase();
        return grp === 'punjab' || grp.includes('punjab') || s.id.startsWith('PZ-G-');
      })
      .map(s => {
        const detail = details[s.id] || INITIAL_SEWADAR_DETAILS[s.id] || {
          sewadar_id: s.id,
          address: '',
          dob: '',
          phone: ''
        };

        let districtRaw = (detail.district || detail.address || '').trim();
        if (districtRaw.toLowerCase() === 'ludhiyana') {
          districtRaw = 'Ludhiana';
        }
        // Fallback for known IDs in PZ-G-1 to 22 if district not explicitly entered
        let finalDistrict = districtRaw;
        if (!finalDistrict && s.id.startsWith('PZ-G-')) {
          const idx = parseInt(s.id.replace('PZ-G-', ''), 10);
          if (idx <= 22) finalDistrict = 'Pathankot';
          else finalDistrict = 'Ludhiana';
        } else if (!finalDistrict) {
          finalDistrict = 'Ludhiana';
        } else if (finalDistrict.toLowerCase() === 'ludhiyana') {
          finalDistrict = 'Ludhiana';
        }

        return {
          sewadar: s,
          district: finalDistrict,
          phone: detail.phone || '',
          age: detail.age,
          dob: detail.dob || ''
        } as OrgMember;
      });
  }, [allSewadars, details]);

  // Branch categorization
  const pathankotGentsMembers = useMemo(() => {
    return punjabSewadarsEnriched.filter(m => {
      if (m.sewadar.gender !== 'Gents') return false;
      const d = m.district.toLowerCase();
      if (m.sewadar.id.startsWith('PZ-G-')) {
        const idx = parseInt(m.sewadar.id.replace('PZ-G-', ''), 10);
        if (idx <= 22) return true;
      }
      return d.includes('pathankot') || d.includes('gurdaspur');
    });
  }, [punjabSewadarsEnriched]);

  const ludhianaGentsMembers = useMemo(() => {
    return punjabSewadarsEnriched.filter(m => {
      if (m.sewadar.gender !== 'Gents') return false;
      const d = m.district.toLowerCase();
      if (m.sewadar.id.startsWith('PZ-G-')) {
        const idx = parseInt(m.sewadar.id.replace('PZ-G-', ''), 10);
        if (idx > 22) return true;
        if (idx <= 22) return false;
      }
      // For custom added gents, if not pathankot/gurdaspur -> ludhiana branch
      return !(d.includes('pathankot') || d.includes('gurdaspur'));
    });
  }, [punjabSewadarsEnriched]);

  const jagraonLadiesMembers = useMemo(() => {
    return punjabSewadarsEnriched.filter(m => {
      if (m.sewadar.gender !== 'Ladies') return false;
      const d = m.district.toLowerCase();
      return d.includes('jagraon');
    });
  }, [punjabSewadarsEnriched]);

  const ludhianaLadiesMembers = useMemo(() => {
    return punjabSewadarsEnriched.filter(m => {
      if (m.sewadar.gender !== 'Ladies') return false;
      const d = m.district.toLowerCase();
      return !d.includes('jagraon');
    });
  }, [punjabSewadarsEnriched]);

  // All unique districts found in data
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    punjabSewadarsEnriched.forEach(m => {
      if (m.district) set.add(m.district);
    });
    return Array.from(set).sort();
  }, [punjabSewadarsEnriched]);

  // Filter members by query and district
  const filterMembers = (members: OrgMember[]) => {
    return members.filter(m => {
      const matchDistrict = districtFilter === 'ALL' || m.district.toLowerCase() === districtFilter.toLowerCase();
      if (!matchDistrict) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.sewadar.name.toLowerCase().includes(q) ||
        m.district.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.sewadar.id.toLowerCase().includes(q)
      );
    });
  };

  const handleCreateSewadar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSewadarName.trim() || !onAddSewadar) return;

    setIsSubmitting(true);
    try {
      const targetGroup = newSewadarGender === 'Ladies' ? 'Punjab Zone Ladies' : 'Punjab';
      await onAddSewadar(
        newSewadarName.trim(),
        newSewadarGender,
        targetGroup,
        'DAY',
        {
          dob: newSewadarDob,
          phone: newSewadarPhone.trim(),
          address: newSewadarDistrict.trim()
        }
      );

      setFeedbackMsg(`✓ Added ${newSewadarName.trim()} to Punjab Zone Structure!`);
      setNewSewadarName('');
      setNewSewadarPhone('');
      setNewSewadarDob('');
      setIsAddModalOpen(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      console.error("Failed to add sewadar:", err);
      alert("Could not add sewadar. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPathankotGents = filterMembers(pathankotGentsMembers);
  const filteredLudhianaGents = filterMembers(ludhianaGentsMembers);
  const filteredJagraonLadies = filterMembers(jagraonLadiesMembers);
  const filteredLudhianaLadies = filterMembers(ludhianaLadiesMembers);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in pb-16">
      {/* Top Header Banner */}
      <div className="bg-slate-900 text-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[11px] font-black uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Punjab Zone Structure • Security Wing
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Organizational Hierarchy Chart
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Official command hierarchy and sewadar roster for Punjab Zone Security. All Gents and Ladies sewadars are automatically organized under their designated Area Coordinators.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onAddSewadar && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                </svg>
                Add Sewadar
              </button>
            )}

            {onNavigateToAttendance && (
              <button
                onClick={onNavigateToAttendance}
                className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-wider border border-white/15 active:scale-95 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                </svg>
                Zone Attendance
              </button>
            )}

            {onBackToPortal && (
              <button
                onClick={onBackToPortal}
                className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-black text-xs uppercase tracking-wider border border-white/10 active:scale-95 transition-all"
              >
                Return to Portal
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 text-left">
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Sewadars</p>
            <p className="text-xl font-black text-white mt-0.5">{punjabSewadarsEnriched.length}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Gents Sewadars</p>
            <p className="text-xl font-black text-indigo-300 mt-0.5">
              {pathankotGentsMembers.length + ludhianaGentsMembers.length}
            </p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ladies Sewadars</p>
            <p className="text-xl font-black text-rose-300 mt-0.5">
              {jagraonLadiesMembers.length + ludhianaLadiesMembers.length}
            </p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Area Branches</p>
            <p className="text-xl font-black text-amber-300 mt-0.5">4 Branches</p>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-200 text-emerald-800 rounded-2xl font-bold text-sm text-center shadow-sm animate-in fade-in">
          {feedbackMsg}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-100 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1 w-full">
          <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search sewadars by name, phone, or district..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs bg-slate-200 w-5 h-5 rounded-full flex items-center justify-center">
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={districtFilter}
            onChange={e => setDistrictFilter(e.target.value)}
            className="flex-1 sm:flex-initial px-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-700 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          >
            <option value="ALL">All Districts ({punjabSewadarsEnriched.length})</option>
            {availableDistricts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Quick Expand / Collapse All */}
          <button
            type="button"
            onClick={toggleAllBranches}
            className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap min-h-[44px] transition-all"
          >
            {areAllExpanded ? 'Collapse All' : 'Expand All'}
          </button>

          {/* Print Tree Button */}
          <button
            onClick={() => window.print()}
            className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all min-h-[44px]"
            title="Print Org Chart"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ORGANISATION CHART TREE VISUALIZATION (Hierarchical View) */}
      {/* ========================================================= */}

      <div className="space-y-4">
        {/* Mobile View Scale & Zoom Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100/90 rounded-2xl border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Tree View Scale:
            </span>
            <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setMobileScale('fit')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  mobileScale === 'fit'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Scale tree so all 4 branches fit on mobile screen at once"
              >
                📱 Fit Screen
              </button>
              <button
                type="button"
                onClick={() => setMobileScale('75')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  mobileScale === '75'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="75% Zoom"
              >
                75%
              </button>
              <button
                type="button"
                onClick={() => setMobileScale('100')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  mobileScale === '100'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="100% Full Size (Swipe horizontally)"
              >
                100%
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
            <span className="hidden sm:inline">💡</span>
            <span>Tap any Area Coordinator to expand/collapse their sewadars list</span>
          </div>
        </div>

        {/* Outer Scrollable Container for Mobile Pan */}
        <div className="w-full overflow-x-auto pb-6 scrollbar-thin rounded-3xl bg-slate-50/50 p-2 sm:p-4 border border-slate-200/60">
          {/* Inner Scaled Canvas */}
          <div
            className={`w-full min-w-[640px] md:min-w-0 transition-transform duration-200 origin-top flex flex-col items-center ${
              mobileScale === 'fit'
                ? 'scale-[0.52] xs:scale-[0.58] sm:scale-[0.78] md:scale-100'
                : mobileScale === '75'
                ? 'scale-[0.75] md:scale-100'
                : 'scale-100'
            }`}
          >
            {/* Top Level 1: Punjab Security Coordinator (Ashwani Kashyap) */}
            {/* Styled like the Orange CEO Node in the reference org chart */}
            <div className="flex flex-col items-center">
              <div className="bg-[#e66a1f] hover:bg-[#d65f17] text-white rounded-xl px-6 py-3.5 sm:px-8 sm:py-4 text-center shadow-lg border-2 border-amber-300/40 relative z-20 w-64 sm:w-72 transition-all hover:scale-[1.01]">
                <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-100">
                  PUNJAB SECURITY COORDINATOR
                </div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mt-0.5">
                  Ashwani Kashyap
                </h2>
                <div className="mt-1 pt-1 border-t border-white/20 flex items-center justify-center gap-2 text-[9px] font-bold text-amber-100 uppercase tracking-widest">
                  <span>Level 1</span>
                  <span>•</span>
                  <span>State Command</span>
                  <span>•</span>
                  <span>4 Branches</span>
                </div>
              </div>

              {/* Vertical Stem from Ashwani Kashyap down to the horizontal branch bar */}
              <div className="w-0.5 h-6 bg-slate-400"></div>
            </div>

            {/* Tree Branching Lines across the 4 Columns */}
            <div className="relative w-full h-6">
              {/* Horizontal Crossbar from Column 1 Center (12.5%) to Column 4 Center (87.5%) */}
              <div className="absolute top-0 left-[12.5%] right-[12.5%] h-0.5 bg-slate-400"></div>

              {/* 4 Vertical Drop Lines into each of the 4 Coordinator nodes */}
              <div className="absolute top-0 left-[12.5%] -translate-x-1/2 w-0.5 h-6 bg-slate-400"></div>
              <div className="absolute top-0 left-[37.5%] -translate-x-1/2 w-0.5 h-6 bg-slate-400"></div>
              <div className="absolute top-0 left-[62.5%] -translate-x-1/2 w-0.5 h-6 bg-slate-400"></div>
              <div className="absolute top-0 left-[87.5%] -translate-x-1/2 w-0.5 h-6 bg-slate-400"></div>
            </div>

            {/* Level 2: The 4 Branches (4 Columns Side-by-Side as in the reference screenshot) */}
            <div className="grid grid-cols-4 gap-2.5 sm:gap-4 w-full items-start">
              
              {/* ==================================================== */}
              {/* Branch 1: Ashok Kumar (Gents Pathankot) */}
              {/* ==================================================== */}
              <div className="w-full flex flex-col items-center">
                {/* Dark Blue Coordinator Box (Like reference screenshot) */}
                <button
                  type="button"
                  onClick={() => toggleBranch('PATHANKOT_GENTS')}
                  className={`w-full rounded-xl p-2.5 sm:p-3 text-center shadow-md border transition-all cursor-pointer ${
                    expandedBranches.PATHANKOT_GENTS
                      ? 'bg-[#152538] border-indigo-400 ring-2 ring-indigo-400/20 text-white'
                      : 'bg-[#1e2e42] hover:bg-[#253952] border-slate-700 text-white'
                  }`}
                >
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-300 truncate">
                    Gents Area Coordinator
                  </div>
                  <div className="text-xs sm:text-sm font-black text-white mt-0.5 truncate">
                    Ashok Kumar
                  </div>
                  <div className="text-[8px] sm:text-[9px] font-bold text-indigo-300 mt-0.5 uppercase tracking-wider truncate">
                    Pathankot & Gurdaspur
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-700/80 flex items-center justify-between text-[9px] font-bold">
                    <span className="text-indigo-200">{filteredPathankotGents.length} Sewadars</span>
                    <span className="text-amber-300 text-[8px] uppercase">
                      {expandedBranches.PATHANKOT_GENTS ? '▲ Collapse' : '▼ View'}
                    </span>
                  </div>
                </button>

                {/* Subordinates Roster: Light-blue stacked boxes (Expanded on Click) */}
                {expandedBranches.PATHANKOT_GENTS && (
                  <div className="w-full flex flex-col items-center animate-in fade-in duration-200 mt-0.5">
                    {/* Vertical Connecting Stem */}
                    <div className="w-0.5 h-4 bg-slate-400"></div>

                    <div className="w-full space-y-1.5 max-h-[500px] overflow-y-auto pr-0.5 scrollbar-thin">
                      {filteredPathankotGents.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 text-[10px] font-bold bg-white rounded-lg border border-dashed border-slate-200">
                          No sewadars match search
                        </div>
                      ) : (
                        filteredPathankotGents.map((item, idx) => (
                          <div
                            key={item.sewadar.id}
                            className="w-full bg-[#dbeafe] hover:bg-[#bfdbfe] border border-blue-200 rounded-lg p-2 text-left shadow-2xs transition-all"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[9px] font-black text-blue-900 bg-blue-200/80 px-1.5 py-0.5 rounded">
                                #{idx + 1}
                              </span>
                              <span className="text-[8px] font-black uppercase text-blue-800 bg-white/80 px-1.5 py-0.5 rounded border border-blue-200 truncate">
                                {item.district || 'Pathankot'}
                              </span>
                            </div>
                            <div className="text-[11px] font-black text-slate-900 mt-1 truncate">
                              {item.sewadar.name}
                            </div>
                            <div className="mt-1 pt-1 border-t border-blue-200/60 flex items-center justify-between text-[9px] text-blue-950 font-bold">
                              {item.phone ? (
                                <a href={`tel:${item.phone}`} className="text-blue-700 hover:underline flex items-center gap-0.5">
                                  <span>📞</span> {item.phone}
                                </a>
                              ) : (
                                <span className="text-blue-400 text-[8px]">No phone</span>
                              )}
                              {item.age ? <span className="text-[8px]">Age {item.age}</span> : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ==================================================== */}
              {/* Branch 2: Pritam Singh (Gents Ludhiana) */}
              {/* ==================================================== */}
              <div className="w-full flex flex-col items-center">
                {/* Dark Blue Coordinator Box */}
                <button
                  type="button"
                  onClick={() => toggleBranch('LUDHIANA_GENTS')}
                  className={`w-full rounded-xl p-2.5 sm:p-3 text-center shadow-md border transition-all cursor-pointer ${
                    expandedBranches.LUDHIANA_GENTS
                      ? 'bg-[#152538] border-blue-400 ring-2 ring-blue-400/20 text-white'
                      : 'bg-[#1e2e42] hover:bg-[#253952] border-slate-700 text-white'
                  }`}
                >
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-300 truncate">
                    Gents Area Coordinator
                  </div>
                  <div className="text-xs sm:text-sm font-black text-white mt-0.5 truncate">
                    Pritam Singh
                  </div>
                  <div className="text-[8px] sm:text-[9px] font-bold text-blue-300 mt-0.5 uppercase tracking-wider truncate">
                    Ludhiana & Others
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-700/80 flex items-center justify-between text-[9px] font-bold">
                    <span className="text-blue-200">{filteredLudhianaGents.length} Sewadars</span>
                    <span className="text-amber-300 text-[8px] uppercase">
                      {expandedBranches.LUDHIANA_GENTS ? '▲ Collapse' : '▼ View'}
                    </span>
                  </div>
                </button>

                {/* Subordinates Roster: Light-blue stacked boxes */}
                {expandedBranches.LUDHIANA_GENTS && (
                  <div className="w-full flex flex-col items-center animate-in fade-in duration-200 mt-0.5">
                    {/* Vertical Connecting Stem */}
                    <div className="w-0.5 h-4 bg-slate-400"></div>

                    <div className="w-full space-y-1.5 max-h-[500px] overflow-y-auto pr-0.5 scrollbar-thin">
                      {filteredLudhianaGents.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 text-[10px] font-bold bg-white rounded-lg border border-dashed border-slate-200">
                          No sewadars match search
                        </div>
                      ) : (
                        filteredLudhianaGents.map((item, idx) => (
                          <div
                            key={item.sewadar.id}
                            className="w-full bg-[#dbeafe] hover:bg-[#bfdbfe] border border-blue-200 rounded-lg p-2 text-left shadow-2xs transition-all"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[9px] font-black text-blue-900 bg-blue-200/80 px-1.5 py-0.5 rounded">
                                #{idx + 1}
                              </span>
                              <span className="text-[8px] font-black uppercase text-blue-800 bg-white/80 px-1.5 py-0.5 rounded border border-blue-200 truncate">
                                {item.district || 'Ludhiana'}
                              </span>
                            </div>
                            <div className="text-[11px] font-black text-slate-900 mt-1 truncate">
                              {item.sewadar.name}
                            </div>
                            <div className="mt-1 pt-1 border-t border-blue-200/60 flex items-center justify-between text-[9px] text-blue-950 font-bold">
                              {item.phone ? (
                                <a href={`tel:${item.phone}`} className="text-blue-700 hover:underline flex items-center gap-0.5">
                                  <span>📞</span> {item.phone}
                                </a>
                              ) : (
                                <span className="text-blue-400 text-[8px]">No phone</span>
                              )}
                              {item.age ? <span className="text-[8px]">Age {item.age}</span> : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ==================================================== */}
              {/* Branch 3: Smt Swarna (Ladies Jagraon) */}
              {/* ==================================================== */}
              <div className="w-full flex flex-col items-center">
                {/* Dark Blue Coordinator Box */}
                <button
                  type="button"
                  onClick={() => toggleBranch('JAGRAON_LADIES')}
                  className={`w-full rounded-xl p-2.5 sm:p-3 text-center shadow-md border transition-all cursor-pointer ${
                    expandedBranches.JAGRAON_LADIES
                      ? 'bg-[#152538] border-rose-400 ring-2 ring-rose-400/20 text-white'
                      : 'bg-[#1e2e42] hover:bg-[#253952] border-slate-700 text-white'
                  }`}
                >
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-300 truncate">
                    Ladies Area Coordinator
                  </div>
                  <div className="text-xs sm:text-sm font-black text-white mt-0.5 truncate">
                    Smt Swarna
                  </div>
                  <div className="text-[8px] sm:text-[9px] font-bold text-rose-300 mt-0.5 uppercase tracking-wider truncate">
                    Jagraon Area
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-700/80 flex items-center justify-between text-[9px] font-bold">
                    <span className="text-rose-200">{filteredJagraonLadies.length} Sewadars</span>
                    <span className="text-amber-300 text-[8px] uppercase">
                      {expandedBranches.JAGRAON_LADIES ? '▲ Collapse' : '▼ View'}
                    </span>
                  </div>
                </button>

                {/* Subordinates Roster */}
                {expandedBranches.JAGRAON_LADIES && (
                  <div className="w-full flex flex-col items-center animate-in fade-in duration-200 mt-0.5">
                    {/* Vertical Connecting Stem */}
                    <div className="w-0.5 h-4 bg-slate-400"></div>

                    <div className="w-full space-y-1.5 max-h-[500px] overflow-y-auto pr-0.5 scrollbar-thin">
                      {filteredJagraonLadies.length === 0 ? (
                        <div className="p-3 text-center space-y-2 bg-[#dbeafe]/70 rounded-lg border border-dashed border-blue-300">
                          <p className="text-[10px] font-bold text-blue-900">
                            No Ladies Sewadars listed yet.
                          </p>
                          {onAddSewadar && (
                            <button
                              onClick={() => {
                                setNewSewadarGender('Ladies');
                                setNewSewadarBranch('JAGRAON_LADIES');
                                setNewSewadarDistrict('Jagraon');
                                setIsAddModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[9px] font-black uppercase tracking-wider transition-all"
                            >
                              + Add Sewadar
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredJagraonLadies.map((item, idx) => (
                          <div
                            key={item.sewadar.id}
                            className="w-full bg-[#dbeafe] hover:bg-[#bfdbfe] border border-blue-200 rounded-lg p-2 text-left shadow-2xs transition-all"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[9px] font-black text-rose-900 bg-rose-200/80 px-1.5 py-0.5 rounded">
                                #{idx + 1}
                              </span>
                              <span className="text-[8px] font-black uppercase text-rose-800 bg-white/80 px-1.5 py-0.5 rounded border border-rose-200 truncate">
                                {item.district || 'Jagraon'}
                              </span>
                            </div>
                            <div className="text-[11px] font-black text-slate-900 mt-1 truncate">
                              {item.sewadar.name}
                            </div>
                            <div className="mt-1 pt-1 border-t border-blue-200/60 flex items-center justify-between text-[9px] text-blue-950 font-bold">
                              {item.phone ? (
                                <a href={`tel:${item.phone}`} className="text-rose-700 hover:underline flex items-center gap-0.5">
                                  <span>📞</span> {item.phone}
                                </a>
                              ) : (
                                <span className="text-blue-400 text-[8px]">No phone</span>
                              )}
                              {item.age ? <span className="text-[8px]">Age {item.age}</span> : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ==================================================== */}
              {/* Branch 4: Smt Meena (Ladies Ludhiana) */}
              {/* ==================================================== */}
              <div className="w-full flex flex-col items-center">
                {/* Dark Blue Coordinator Box */}
                <button
                  type="button"
                  onClick={() => toggleBranch('LUDHIANA_LADIES')}
                  className={`w-full rounded-xl p-2.5 sm:p-3 text-center shadow-md border transition-all cursor-pointer ${
                    expandedBranches.LUDHIANA_LADIES
                      ? 'bg-[#152538] border-pink-400 ring-2 ring-pink-400/20 text-white'
                      : 'bg-[#1e2e42] hover:bg-[#253952] border-slate-700 text-white'
                  }`}
                >
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-300 truncate">
                    Ladies Area Coordinator
                  </div>
                  <div className="text-xs sm:text-sm font-black text-white mt-0.5 truncate">
                    Smt Meena
                  </div>
                  <div className="text-[8px] sm:text-[9px] font-bold text-pink-300 mt-0.5 uppercase tracking-wider truncate">
                    Ludhiana Region
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-700/80 flex items-center justify-between text-[9px] font-bold">
                    <span className="text-pink-200">{filteredLudhianaLadies.length} Sewadars</span>
                    <span className="text-amber-300 text-[8px] uppercase">
                      {expandedBranches.LUDHIANA_LADIES ? '▲ Collapse' : '▼ View'}
                    </span>
                  </div>
                </button>

                {/* Subordinates Roster */}
                {expandedBranches.LUDHIANA_LADIES && (
                  <div className="w-full flex flex-col items-center animate-in fade-in duration-200 mt-0.5">
                    {/* Vertical Connecting Stem */}
                    <div className="w-0.5 h-4 bg-slate-400"></div>

                    <div className="w-full space-y-1.5 max-h-[500px] overflow-y-auto pr-0.5 scrollbar-thin">
                      {filteredLudhianaLadies.length === 0 ? (
                        <div className="p-3 text-center space-y-2 bg-[#dbeafe]/70 rounded-lg border border-dashed border-blue-300">
                          <p className="text-[10px] font-bold text-blue-900">
                            No Ladies Sewadars listed yet.
                          </p>
                          {onAddSewadar && (
                            <button
                              onClick={() => {
                                setNewSewadarGender('Ladies');
                                setNewSewadarBranch('LUDHIANA_LADIES');
                                setNewSewadarDistrict('Ludhiana');
                                setIsAddModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-md text-[9px] font-black uppercase tracking-wider transition-all"
                            >
                              + Add Sewadar
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredLudhianaLadies.map((item, idx) => (
                          <div
                            key={item.sewadar.id}
                            className="w-full bg-[#dbeafe] hover:bg-[#bfdbfe] border border-blue-200 rounded-lg p-2 text-left shadow-2xs transition-all"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[9px] font-black text-pink-900 bg-pink-200/80 px-1.5 py-0.5 rounded">
                                #{idx + 1}
                              </span>
                              <span className="text-[8px] font-black uppercase text-pink-800 bg-white/80 px-1.5 py-0.5 rounded border border-pink-200 truncate">
                                {item.district || 'Ludhiana'}
                              </span>
                            </div>
                            <div className="text-[11px] font-black text-slate-900 mt-1 truncate">
                              {item.sewadar.name}
                            </div>
                            <div className="mt-1 pt-1 border-t border-blue-200/60 flex items-center justify-between text-[9px] text-blue-950 font-bold">
                              {item.phone ? (
                                <a href={`tel:${item.phone}`} className="text-pink-700 hover:underline flex items-center gap-0.5">
                                  <span>📞</span> {item.phone}
                                </a>
                              ) : (
                                <span className="text-blue-400 text-[8px]">No phone</span>
                              )}
                              {item.age ? <span className="text-[8px]">Age {item.age}</span> : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: Add New Sewadar to Punjab Zone Structure */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full flex items-center justify-center text-lg font-bold transition-all"
            >
              ✕
            </button>

            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider mb-2">
                Punjab Zone Structure
              </div>
              <h3 className="text-2xl font-black text-slate-900">
                Add Sewadar to Hierarchy
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-1">
                New sewadar will be automatically assigned to their designated Area Coordinator.
              </p>
            </div>

            <form onSubmit={handleCreateSewadar} className="space-y-4 text-left">
              {/* Gender Selection */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                  Gender
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNewSewadarGender('Gents');
                      if (newSewadarBranch === 'JAGRAON_LADIES' || newSewadarBranch === 'LUDHIANA_LADIES') {
                        setNewSewadarBranch('LUDHIANA_GENTS');
                      }
                    }}
                    className={`py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider border-2 transition-all ${
                      newSewadarGender === 'Gents'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    👮‍♂️ Gents
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSewadarGender('Ladies');
                      setNewSewadarBranch('LUDHIANA_LADIES');
                    }}
                    className={`py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider border-2 transition-all ${
                      newSewadarGender === 'Ladies'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    👩 Ladies
                  </button>
                </div>
              </div>

              {/* Coordinator Branch Allocation */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                  Assigned Area Branch
                </label>
                <select
                  value={newSewadarBranch}
                  onChange={e => {
                    const b = e.target.value as any;
                    setNewSewadarBranch(b);
                    if (b === 'PATHANKOT_GENTS') setNewSewadarDistrict('Pathankot');
                    else if (b === 'JAGRAON_LADIES') setNewSewadarDistrict('Jagraon');
                    else setNewSewadarDistrict('Ludhiana');
                  }}
                  className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-black text-slate-800 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {newSewadarGender === 'Gents' ? (
                    <>
                      <option value="PATHANKOT_GENTS">Ashok Kumar (Pathankot Gents)</option>
                      <option value="LUDHIANA_GENTS">Pritam Singh (Ludhiana Gents)</option>
                    </>
                  ) : (
                    <>
                      <option value="JAGRAON_LADIES">Smt Swarna (Jagraon Ladies)</option>
                      <option value="LUDHIANA_LADIES">Smt Meena (Ludhiana Ladies)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Sewadar Name */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jaswant Singh"
                  value={newSewadarName}
                  onChange={e => setNewSewadarName(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* District */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                  District / City *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pathankot, Ludhiana, Jagraon..."
                  value={newSewadarDistrict}
                  onChange={e => setNewSewadarDistrict(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {COMMON_DISTRICTS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setNewSewadarDistrict(d)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-black uppercase text-slate-600"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone and DOB */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={newSewadarPhone}
                    onChange={e => setNewSewadarPhone(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={newSewadarDob}
                    onChange={e => setNewSewadarDob(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !newSewadarName.trim()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50 mt-2"
              >
                {isSubmitting ? 'Adding to Hierarchy...' : 'Save to Organization Chart'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
