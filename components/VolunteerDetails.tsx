
import React, { useState, useMemo } from 'react';
import { Sewadar, Volunteer, SewadarDetails } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GENTS_GROUPS } from '../constants';

interface Props {
  sewadars: Sewadar[];
  allSewadars?: Sewadar[];
  details: Record<string, SewadarDetails>;
  activeVolunteer: Volunteer;
  onSaveDetails: (details: SewadarDetails) => Promise<void>;
  onDeleteSewadar?: (id: string) => void;
  onEditSewadar?: (id: string, newName: string) => void;
}

const VolunteerDetails: React.FC<Props> = ({ sewadars, allSewadars, details, activeVolunteer, onSaveDetails, onDeleteSewadar, onEditSewadar }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const isSuperAdmin = activeVolunteer.role === 'Super Admin';
  const canManageBothGenders = isSuperAdmin || activeVolunteer.role === 'Back Office Admin';
  const [editingSewadar, setEditingSewadar] = useState<Sewadar | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', dob: '', phone: '', age: '', district: '' });
  const [isSaving, setIsSaving] = useState(false);

  const filtered = useMemo(() => {
    return sewadars.filter(s => {
      const isSuperAdmin = activeVolunteer.role === 'Super Admin';
      const isLadies = activeVolunteer.role.includes('Ladies');
      const isGlobalAdmin = isSuperAdmin || !activeVolunteer.assignedGroup;
      const assignedLower = activeVolunteer.assignedGroup?.toLowerCase() || '';
      const sGroupLower = s.group.toLowerCase();
      const matchGroup = isGlobalAdmin || isLadies || 
        sGroupLower === assignedLower || 
        sGroupLower === `ladies-${assignedLower}` || 
        sGroupLower.includes(assignedLower);
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchGroup && matchSearch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [sewadars, activeVolunteer, searchTerm]);

  const handleEdit = (s: Sewadar) => {
    const sDetails = details[s.id] || { address: '', dob: '', phone: '', age: undefined, district: '' };
    setFormData({
      name: s.name,
      address: sDetails.address,
      dob: sDetails.dob,
      phone: sDetails.phone,
      age: sDetails.age !== undefined && sDetails.age !== null ? String(sDetails.age) : '',
      district: (sDetails.district || '').replace(/ludhiyana/gi, 'Ludhiana')
    });
    setEditingSewadar(s);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSewadar) return;
    setIsSaving(true);
    try {
      if (isSuperAdmin && onEditSewadar && formData.name.trim() && formData.name.trim() !== editingSewadar.name) {
        await onEditSewadar(editingSewadar.id, formData.name.trim());
      }
      await onSaveDetails({
        sewadar_id: editingSewadar.id,
        address: formData.address,
        dob: formData.dob,
        phone: formData.phone,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        district: formData.district
      });
      setEditingSewadar(null);
    } catch (err) {
      alert("Error saving details. Please check connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const toProperCase = (str: string): string => {
    if (!str) return "";
    // First, replace common word boundary symbols like underscore or hyphen with a space
    let cleaned = str.replace(/[_\-–]/g, ' ');
    // Remove other non-alphabetic, non-space special characters like backticks
    cleaned = cleaned.replace(/[^a-zA-Z\s]/g, '');
    return cleaned
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const visibleDaysToDownload = useMemo(() => {
    if (activeVolunteer.role === 'Super Admin' || activeVolunteer.assignedGroup === 'Ladies' || !activeVolunteer.assignedGroup) {
      return GENTS_GROUPS;
    }
    const assigned = activeVolunteer.assignedGroup;
    if (assigned) {
      const matched = GENTS_GROUPS.filter(g => assigned.toLowerCase() === g.toLowerCase() || assigned.toLowerCase().includes(g.toLowerCase()));
      if (matched.length > 0) {
        return matched;
      }
      return [assigned];
    }
    return [];
  }, [activeVolunteer]);

  const handleDownloadGroupPDF = (groupName: string, gender: 'Gents' | 'Ladies') => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const targetSewadars = (allSewadars || sewadars)
        .filter(s => {
          const sGroupLower = s.group.toLowerCase();
          const targetLower = groupName.toLowerCase();
          const belongsToGroup = sGroupLower === targetLower || sGroupLower === `ladies-${targetLower}`;
          const matchesGender = s.gender === gender;
          return belongsToGroup && matchesGender;
        })
        .map(s => ({
          ...s,
          properName: toProperCase(s.name)
        }))
        .sort((a, b) => a.properName.localeCompare(b.properName));

      const tableBody: any[] = [];
      targetSewadars.forEach((s, index) => {
        const sDetail = details[s.id] || {};
        let formattedDob = "";
        if (sDetail.dob) {
          try {
            const dateParts = sDetail.dob.split('-');
            if (dateParts.length === 3) {
              formattedDob = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`; // DD/MM/YYYY
            } else {
              formattedDob = new Date(sDetail.dob).toLocaleDateString('en-GB');
            }
          } catch {
            formattedDob = sDetail.dob;
          }
        }
        tableBody.push([
          index + 1,
          s.properName,
          "", // Checklist drawn square
          formattedDob || "",
          sDetail.phone || "",
          sDetail.address || "",
          "" // Remove checklist drawn square
        ]);
      });

      // Add exactly 10 empty blank rows
      const prefilledCount = targetSewadars.length;
      for (let i = 0; i < 10; i++) {
        tableBody.push([
          prefilledCount + i + 1,
          "", // blank name
          "",
          "", // blank DOB
          "", // blank phone
          "", // blank address
          ""
        ]);
      }

      autoTable(doc, {
        startY: 25,
        margin: { top: 22, bottom: 15, left: 10, right: 10 },
        theme: 'grid',
        head: [[
          'SNo',
          'Name',
          'Name Complete / Correct?',
          'DOB',
          'Mobile Number',
          'Address (with PIN code and City Name)',
          'Remove Name from List?'
        ]],
        body: tableBody,
        styles: {
          font: 'helvetica',
          fontSize: 8,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          textColor: [40, 40, 40],
          cellPadding: 2
        },
        headStyles: {
          fillColor: [53, 83, 140], // Deep corporate blue
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10, fontStyle: 'bold' }, // SNo
          1: { halign: 'left', cellWidth: 42 }, // Name
          2: { halign: 'center', cellWidth: 20 }, // Checklist
          3: { halign: 'center', cellWidth: 22 }, // DOB
          4: { halign: 'center', cellWidth: 28 }, // Mobile
          5: { halign: 'left', cellWidth: 48 }, // Address
          6: { halign: 'center', cellWidth: 20 }  // Remove Checklist
        },
        didDrawCell: function (data) {
          // Draw checkboxes in column index 2 and column index 6 for body rows
          if ((data.column.index === 2 || data.column.index === 6) && data.cell.section === 'body') {
            const size = 3; // 3mm square
            const x = data.cell.x + (data.cell.width - size) / 2;
            const y = data.cell.y + (data.cell.height - size) / 2;
            
            doc.setDrawColor(53, 83, 140);
            doc.setLineWidth(0.25);
            doc.rect(x, y, size, size); // Draw empty square outline
          }
        },
        didDrawPage: function (data) {
          // Draw header
          doc.setFont("helvetica", "bold");
          doc.setFontSize(15);
          doc.setTextColor(43, 76, 126);
          doc.text("Volunteer Details Tracker", 10, 15);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(50, 50, 50);
          const displayGroup = `${groupName} (${gender})`;
          doc.text(`Group: ${displayGroup}`, 148, 15);

          // Draw the underline
          doc.setDrawColor(120, 120, 120);
          doc.setLineWidth(0.3);
          doc.line(160, 16.5, 200, 16.5);

          doc.setFont("helvetica", "italic");
          doc.setFontSize(7.5);
          doc.setTextColor(150, 150, 150);
          doc.text(`Printed for SKRM Security Sewa - Page ${data.pageNumber}`, 10, 288);
        }
      });

      doc.save(`Volunteer_Details_Tracker_${groupName}_${gender}.pdf`);
    } catch (err) {
      console.error("PDF download failed:", err);
      alert("Error generating PDF: " + err);
    }
  };

  return (
    <>
      <div className="space-y-6 max-w-2xl mx-auto animate-fade-in pb-12">
        <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-black mb-1">Member Directory</h2>
            <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">
              {activeVolunteer.role === 'Super Admin' || !activeVolunteer.assignedGroup ? 'Master Records' : `${activeVolunteer.assignedGroup} Group Profiles`}
            </p>
          </div>
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
        </div>

        {/* Printable Volunteer Trackers Collection */}
        {visibleDaysToDownload.length > 0 && (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-[2.5rem] border border-indigo-500/15 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-block mb-3">Verification Tools</div>
              <h3 className="text-xl font-black mb-1">Printable Volunteer Trackers</h3>
              <p className="text-slate-300 text-xs font-normal max-w-xl leading-relaxed mb-5">
                Generate and download pre-filled tracker sheets in the official paper log format. These forms are used to audit and fill in missing Date of Birth, Mobile, and Address records on active duty.
              </p>
              
              <div className={`grid gap-2 ${visibleDaysToDownload.length > 1 ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-7' : 'grid-cols-1 max-w-xs'}`}>
                {visibleDaysToDownload.map((day) => {
                  const countGents = (allSewadars || sewadars).filter(s => {
                    const sGroupLower = s.group.toLowerCase();
                    const dayLower = day.toLowerCase();
                    return (sGroupLower === dayLower || sGroupLower === `ladies-${dayLower}`) && s.gender === 'Gents';
                  }).length;

                  const countLadies = (allSewadars || sewadars).filter(s => {
                    const sGroupLower = s.group.toLowerCase();
                    const dayLower = day.toLowerCase();
                    return (sGroupLower === dayLower || sGroupLower === `ladies-${dayLower}`) && s.gender === 'Ladies';
                  }).length;

                  return (
                    <div
                      key={day}
                      className="bg-white/5 border border-white/10 p-3.5 rounded-2xl text-left transition-all group flex flex-col justify-between min-h-[110px]"
                    >
                      <div>
                        <p className="text-xs font-black tracking-tight text-slate-100">{day}</p>
                        {canManageBothGenders ? (
                          <p className="text-[7.5px] font-bold text-indigo-300 uppercase mt-0.5 leading-none">
                            {countGents} Gents | {countLadies} Ladies
                          </p>
                        ) : (
                          <p className="text-[7.5px] font-bold text-indigo-300 uppercase mt-0.5 leading-none">
                            {activeVolunteer.role.includes('Ladies') ? `${countLadies} Ladies` : `${countGents} Gents`}
                          </p>
                        )}
                      </div>
                      
                      {canManageBothGenders ? (
                        <div className="flex gap-1 mt-2.5">
                          <button
                            onClick={() => handleDownloadGroupPDF(day, 'Gents')}
                            className="flex-1 bg-white/10 hover:bg-emerald-600 border border-white/10 hover:border-transparent py-1 rounded-xl text-[8px] font-black text-center transition-all active:scale-95 text-emerald-300 hover:text-white"
                          >
                            Gents 📥
                          </button>
                          <button
                            onClick={() => handleDownloadGroupPDF(day, 'Ladies')}
                            className="flex-1 bg-white/10 hover:bg-pink-600 border border-white/10 hover:border-transparent py-1 rounded-xl text-[8px] font-black text-center transition-all active:scale-95 text-pink-300 hover:text-white"
                          >
                            Ladies 📥
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDownloadGroupPDF(day, activeVolunteer.role.includes('Ladies') ? 'Ladies' : 'Gents')}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 py-1.5 rounded-xl text-[8px] font-black text-center transition-all active:scale-95 text-white mt-2.5"
                        >
                          Download 📥
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
          </div>
        )}

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
            const hasDetails = sDetails && (sDetails.address || sDetails.dob || sDetails.phone || sDetails.age || sDetails.district);

            return (
              <div key={s.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-indigo-100 transition-all">
                <div className="flex items-center gap-5">
                  <div className="text-[10px] font-black text-slate-200 w-6 text-center">{idx + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-slate-900 text-base">{s.name}</h3>
                      {s.routedByHrTable && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[9px] font-black uppercase tracking-wider shadow-xs">
                          Routed by HR table
                        </span>
                      )}
                      {(s.tag === 'Punjab Zone' || s.originZone === 'Punjab Zone' || s.routedByZone) && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[9px] font-black uppercase tracking-wider shadow-xs">
                          Punjab Zone
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {s.group} • {s.gender}
                      {s.hrTableData?.handoverIncharge ? ` • Handover: ${s.hrTableData.handoverIncharge}` : ''}
                    </p>
                    
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
                        {sDetails.age !== undefined && sDetails.age !== null && (
                          <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-lg text-[8px] font-black flex items-center gap-1 shadow-sm">
                            👤 Age: {sDetails.age}
                          </span>
                        )}
                        {sDetails.district && (
                          <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-lg text-[8px] font-black flex items-center gap-1 shadow-sm">
                            📍 {sDetails.district.replace(/ludhiyana/gi, 'Ludhiana')}
                          </span>
                        )}
                        {sDetails.address && sDetails.address !== sDetails.district && (
                          <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-[8px] font-black flex items-center gap-1 max-w-[150px] truncate shadow-sm">
                            🏠 {sDetails.address}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => handleEdit(s)}
                    className="px-6 py-3 bg-slate-50 border rounded-xl text-[9px] font-black uppercase text-slate-600 hover:bg-indigo-600 hover:text-white transition-all whitespace-nowrap shadow-sm active:scale-95"
                  >
                    {hasDetails ? 'Edit Info' : '+ Add Info'}
                  </button>
                  {isSuperAdmin && onDeleteSewadar && (
                    <button 
                      onClick={() => onDeleteSewadar(s.id)}
                      className="px-6 py-3 bg-red-50 border border-red-100 rounded-xl text-[9px] font-black uppercase text-red-500 hover:bg-red-500 hover:text-white transition-all whitespace-nowrap shadow-sm active:scale-95"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No matching members found</p>
            </div>
          )}
        </div>
      </div>

      {editingSewadar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => setEditingSewadar(null)} className="absolute top-6 right-6 w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="text-center">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Update Member Profile</p>
              <h2 className="text-2xl font-black text-slate-900 leading-tight">{editingSewadar.name}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{editingSewadar.group} Group</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSuperAdmin && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-black outline-none focus:border-indigo-500 transition-all shadow-inner" 
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                  />
                </div>
              )}
              
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
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Age</label>
                  <input 
                    type="number" 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-black outline-none focus:border-indigo-500 transition-all shadow-inner" 
                    placeholder="e.g. 45"
                    value={formData.age}
                    onChange={e => setFormData(p => ({...p, age: e.target.value}))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">District</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-black outline-none focus:border-indigo-500 transition-all shadow-inner" 
                    placeholder="e.g. Pathankot"
                    value={formData.district}
                    onChange={e => setFormData(p => ({...p, district: e.target.value}))}
                  />
                </div>
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
    </>
  );
};

export default VolunteerDetails;
