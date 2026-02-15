
import React, { useState, useMemo } from 'react';
import { Sewadar, Volunteer, SewadarDetails } from '../types';

interface Props {
  sewadars: Sewadar[];
  details: Record<string, SewadarDetails>;
  activeVolunteer: Volunteer;
  onSaveDetails: (details: SewadarDetails) => Promise<void>;
}

const VolunteerDetails: React.FC<Props> = ({ sewadars, details, activeVolunteer, onSaveDetails }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSewadar, setEditingSewadar] = useState<Sewadar | null>(null);
  const [formData, setFormData] = useState({ address: '', dob: '', phone: '' });
  const [isSaving, setIsSaving] = useState(false);

  const filtered = useMemo(() => {
    return sewadars.filter(s => {
      const isSuperAdmin = activeVolunteer.role === 'Super Admin';
      const matchGroup = isSuperAdmin || s.group === activeVolunteer.assignedGroup;
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchGroup && matchSearch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [sewadars, activeVolunteer, searchTerm]);

  const handleEdit = (s: Sewadar) => {
    const sDetails = details[s.id] || { address: '', dob: '', phone: '' };
    setFormData({
      address: sDetails.address,
      dob: sDetails.dob,
      phone: sDetails.phone
    });
    setEditingSewadar(s);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSewadar) return;
    setIsSaving(true);
    try {
      await onSaveDetails({
        sewadar_id: editingSewadar.id,
        address: formData.address,
        dob: formData.dob,
        phone: formData.phone
      });
      setEditingSewadar(null);
    } catch (err) {
      alert("Error saving details. Please check connection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in pb-12">
      <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-black mb-1">Member Directory</h2>
          <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">
            {activeVolunteer.role === 'Super Admin' ? 'Master Records' : `${activeVolunteer.assignedGroup} Group Profiles`}
          </p>
        </div>
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <div className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-sm pb-4 pt-2">
        <input 
          type="text" 
          placeholder="Search by name..." 
          className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none shadow-sm font-black text-slate-800 focus:border-indigo-500 transition-all text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.map((s, idx) => {
          const sDetails = details[s.id];
          const hasDetails = sDetails && (sDetails.address || sDetails.dob || sDetails.phone);

          return (
            <div key={s.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-indigo-100 transition-all">
              <div className="flex items-center gap-5">
                <div className="text-[10px] font-black text-slate-200 w-6 text-center">{idx + 1}</div>
                <div className="flex-1">
                  <h3 className="font-black text-slate-900 text-base">{s.name}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.group} • {s.gender}</p>
                  
                  {hasDetails && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {sDetails.phone && (
                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[8px] font-black flex items-center gap-1 shadow-sm">
                          📞 {sDetails.phone}
                        </span>
                      )}
                      {sDetails.dob && (
                        <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[8px] font-black flex items-center gap-1 shadow-sm">
                          🎂 {new Date(sDetails.dob).toLocaleDateString('en-GB')}
                        </span>
                      )}
                      {sDetails.address && (
                        <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-lg text-[8px] font-black flex items-center gap-1 max-w-[150px] truncate shadow-sm">
                          🏠 {sDetails.address}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={() => handleEdit(s)}
                className="px-6 py-3 bg-slate-50 border rounded-xl text-[9px] font-black uppercase text-slate-600 hover:bg-indigo-600 hover:text-white transition-all whitespace-nowrap shadow-sm active:scale-95"
              >
                {hasDetails ? 'Edit Info' : '+ Add Info'}
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No matching members found</p>
          </div>
        )}
      </div>

      {editingSewadar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative">
            <button onClick={() => setEditingSewadar(null)} className="absolute top-6 right-6 w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="text-center">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Update Member Profile</p>
              <h2 className="text-2xl font-black text-slate-900 leading-tight">{editingSewadar.name}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{editingSewadar.group} Group</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Phone Number</label>
                <input 
                  type="tel" 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-black outline-none focus:border-indigo-500 transition-all shadow-inner" 
                  placeholder="e.g. 9810012345"
                  value={formData.phone}
                  onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Date of Birth</label>
                <input 
                  type="date" 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-black outline-none focus:border-indigo-500 transition-all shadow-inner" 
                  value={formData.dob}
                  onChange={e => setFormData(p => ({...p, dob: e.target.value}))}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Full Address</label>
                <textarea 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-medium outline-none focus:border-indigo-500 transition-all shadow-inner" 
                  placeholder="House No, Sector, City..."
                  rows={3}
                  value={formData.address}
                  onChange={e => setFormData(p => ({...p, address: e.target.value}))}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setEditingSewadar(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="flex-2 py-4 px-8 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 disabled:opacity-50 transition-all"
                >
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerDetails;
