
import React, { useState, useMemo } from 'react';
import { Sewadar, Volunteer, SewadarDetails } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GENTS_GROUPS, DAYS_LIST } from '../constants';

interface Props {
  sewadars: Sewadar[];
  allSewadars?: Sewadar[];
  details: Record<string, SewadarDetails>;
  activeVolunteer: Volunteer;
  onSaveDetails: (details: SewadarDetails) => Promise<void>;
  onDeleteSewadar?: (id: string) => void;
  onEditSewadar?: (id: string, newName: string) => void;
  onSaveHrTableSewadar?: (data: any) => Promise<void>;
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

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const VolunteerDetails: React.FC<Props> = ({ sewadars, allSewadars, details, activeVolunteer, onSaveDetails, onDeleteSewadar, onEditSewadar, onSaveHrTableSewadar }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const isSuperAdmin = activeVolunteer.role === 'Super Admin';
  const isHrTable = activeVolunteer.role === 'HR Table' || activeVolunteer.assignedGroup === 'HR Table';
  const canManageBothGenders = isSuperAdmin || activeVolunteer.role === 'Back Office Admin';
  const [editingSewadar, setEditingSewadar] = useState<Sewadar | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', dob: '', phone: '', age: '', district: '' });
  const [isSaving, setIsSaving] = useState(false);

  // HR Table specific edit modal and expanded card state
  const [expandedSewadarId, setExpandedSewadarId] = useState<string | null>(null);
  const [editingHrSewadar, setEditingHrSewadar] = useState<Sewadar | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    gender: 'Gents' as 'Gents' | 'Ladies',
    phoneNumber: '',
    address: '',
    qualification: '',
    timing: '',
    weeklyOff: '',
    sewaDays: [] as string[],
    selectedOptions: [] as string[],
    interestedGroups: [] as string[],
    securityGentsGroups: [] as string[],
    securityLadiesGroups: [] as string[]
  });
  const [isSavingHr, setIsSavingHr] = useState(false);

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
    if (isHrTable || s.hrTableData || s.routedByHrTable) {
      const gentsGrp = s.hrTableData?.securityGentsGroups || [];
      const ladiesGrp = s.hrTableData?.securityLadiesGroups || [];
      const legacyGrp = s.hrTableData?.interestedGroups || [];

      setEditFormData({
        name: s.name,
        gender: (s.gender as 'Gents' | 'Ladies') || 'Gents',
        phoneNumber: s.hrTableData?.phoneNumber || details[s.id]?.phone || '',
        address: s.hrTableData?.address || details[s.id]?.address || details[s.id]?.district || '',
        qualification: s.hrTableData?.qualification || '',
        timing: s.hrTableData?.timing || '',
        weeklyOff: s.hrTableData?.weeklyOff || '',
        sewaDays: s.hrTableData?.sewaDays || [],
        selectedOptions: s.hrTableData?.selectedOptions || [],
        interestedGroups: legacyGrp,
        securityGentsGroups: gentsGrp.length > 0 ? gentsGrp : (s.gender === 'Gents' ? legacyGrp : []),
        securityLadiesGroups: ladiesGrp.length > 0 ? ladiesGrp : (s.gender === 'Ladies' ? legacyGrp : [])
      });
      setEditingHrSewadar(s);
      return;
    }

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

  const handleDelete = (s: Sewadar) => {
    if (!onDeleteSewadar) return;
    if (window.confirm(`Are you sure you want to delete sewadar "${s.name}"?`)) {
      onDeleteSewadar(s.id);
    }
  };

  const handleSaveHrSewadar = async () => {
    if (!editingHrSewadar || !editFormData.name.trim()) return;
    setIsSavingHr(true);
    try {
      if (onSaveHrTableSewadar) {
        const combinedInterested = Array.from(new Set([
          ...editFormData.securityGentsGroups,
          ...editFormData.securityLadiesGroups
        ]));

        await onSaveHrTableSewadar({
          id: editingHrSewadar.id,
          name: editFormData.name.trim(),
          gender: editFormData.gender,
          group: editingHrSewadar.group || 'HR Table',
          hrTableData: {
            phoneNumber: editFormData.phoneNumber.trim() || null,
            address: editFormData.address.trim() || null,
            qualification: editFormData.qualification.trim() || null,
            timing: editFormData.timing.trim() || null,
            weeklyOff: editFormData.weeklyOff || null,
            sewaDays: editFormData.sewaDays,
            selectedOptions: editFormData.selectedOptions,
            interestedGroups: combinedInterested,
            securityGentsGroups: editFormData.securityGentsGroups,
            securityLadiesGroups: editFormData.securityLadiesGroups,
            handoverDayGroup: editingHrSewadar.hrTableData?.handoverDayGroup || null,
            handoverIncharge: editingHrSewadar.hrTableData?.handoverIncharge || null,
            handoverDate: editingHrSewadar.hrTableData?.handoverDate || null,
            createdAt: editingHrSewadar.hrTableData?.createdAt || Date.now(),
            updatedAt: Date.now()
          }
        });
      }
      if (isSuperAdmin && onEditSewadar && editFormData.name.trim() !== editingHrSewadar.name) {
        await onEditSewadar(editingHrSewadar.id, editFormData.name.trim());
      }
      await onSaveDetails({
        sewadar_id: editingHrSewadar.id,
        phone: editFormData.phoneNumber.trim(),
        address: editFormData.address.trim(),
        district: editFormData.address.trim()
      });
      setEditingHrSewadar(null);
    } catch (err) {
      console.error("Save HR sewadar error:", err);
      alert("Error saving sewadar details. Please try again.");
    } finally {
      setIsSavingHr(false);
    }
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
            const isExpanded = expandedSewadarId === s.id;
            const mobileNumber = s.hrTableData?.phoneNumber || sDetails?.phone;
            const locationAddress = s.hrTableData?.address || sDetails?.address || sDetails?.district;

            return (
              <div 
                key={s.id} 
                onClick={() => setExpandedSewadarId(prev => prev === s.id ? null : s.id)}
                className={`bg-white p-5 sm:p-6 rounded-[2rem] border-2 shadow-sm flex flex-col transition-all cursor-pointer ${
                  isExpanded ? 'border-indigo-300 ring-2 ring-indigo-50 shadow-md' : 'border-slate-100 hover:border-indigo-100'
                }`}
              >
                {/* Main Card Header / Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4 flex-1">
                    <div className="text-[10px] font-black text-slate-300 w-6 text-center pt-1 sm:pt-0">{idx + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                          {s.name}
                          <svg 
                            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-indigo-600' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </h3>
                        {/* Only show "Routed by HR table" in other groups to differentiate, never inside HR Table tab */}
                        {s.routedByHrTable && !isHrTable && (
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
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {isHrTable || s.group === 'HR Table'
                          ? (s.hrTableData?.handoverDayGroup ? `${s.hrTableData.handoverDayGroup} • ${s.gender}` : s.gender)
                          : `${s.group} • ${s.gender}`
                        }
                        {s.hrTableData?.handoverIncharge ? ` • Handover: ${s.hrTableData.handoverIncharge}` : ''}
                      </p>
                      
                      {/* Compact Badges */}
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {mobileNumber && (
                          <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 shadow-2xs">
                            📞 {mobileNumber}
                          </span>
                        )}
                        {locationAddress && (
                          <span className="bg-amber-50 text-amber-800 px-3 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 max-w-[190px] truncate shadow-2xs">
                            📍 {locationAddress.replace(/ludhiyana/gi, 'Ludhiana')}
                          </span>
                        )}
                        {sDetails?.dob && (
                          <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 shadow-2xs">
                            🎂 {new Date(sDetails.dob).toLocaleDateString('en-GB')}
                          </span>
                        )}
                        {sDetails?.age !== undefined && sDetails?.age !== null && (
                          <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 shadow-2xs">
                            👤 Age: {sDetails.age}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Edit Info & Delete side-by-side) */}
                  <div className="flex items-center gap-2 self-end md:self-auto flex-wrap pt-2 md:pt-0" onClick={e => e.stopPropagation()}>
                    <button 
                      type="button"
                      onClick={() => handleEdit(s)}
                      className="px-4 py-2.5 bg-slate-50 hover:bg-indigo-600 hover:text-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-700 transition-all whitespace-nowrap shadow-xs active:scale-95 flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span>{hasDetails || s.hrTableData ? 'Edit Info' : '+ Add Info'}</span>
                    </button>
                    {(isSuperAdmin || isHrTable) && onDeleteSewadar && (
                      <button 
                        type="button"
                        onClick={() => handleDelete(s)}
                        className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 rounded-xl text-[10px] font-black uppercase text-rose-600 transition-all whitespace-nowrap shadow-xs active:scale-95 flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">📞 Mobile Number</span>
                        <span className="text-xs font-bold text-slate-800">{mobileNumber || 'Not specified'}</span>
                      </div>
                      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">📍 Location / Address</span>
                        <span className="text-xs font-bold text-slate-800">{locationAddress || 'Not specified'}</span>
                      </div>
                      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">🎓 Qualification</span>
                        <span className="text-xs font-bold text-slate-800">{s.hrTableData?.qualification || 'Not specified'}</span>
                      </div>
                      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">⏰ Duty Timing</span>
                        <span className="text-xs font-bold text-slate-800">{s.hrTableData?.timing || 'Not specified'}</span>
                      </div>
                      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">🗓️ Weekly Off</span>
                        <span className="text-xs font-bold text-slate-800">{s.hrTableData?.weeklyOff || 'None / Flexible'}</span>
                      </div>
                      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">📅 Sewa Days</span>
                        <span className="text-xs font-bold text-slate-800">
                          {s.hrTableData?.sewaDays && s.hrTableData.sewaDays.length > 0 
                            ? s.hrTableData.sewaDays.join(', ') 
                            : 'All Days / Flexible'}
                        </span>
                      </div>
                      {s.hrTableData?.handoverIncharge && (
                        <div className="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100 sm:col-span-2">
                          <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500 block mb-0.5">🤝 Handover Assignment</span>
                          <span className="text-xs font-black text-indigo-900">
                            Handed over to {s.hrTableData.handoverDayGroup || s.group} {s.gender} ({s.hrTableData.handoverIncharge})
                          </span>
                        </div>
                      )}
                      {s.hrTableData?.selectedOptions && s.hrTableData.selectedOptions.length > 0 && (
                        <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 sm:col-span-2 md:col-span-3">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">🏷️ Options to Choose From</span>
                          <div className="flex flex-wrap gap-1.5">
                            {s.hrTableData.selectedOptions.map(opt => (
                              <span key={opt} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg shadow-2xs">
                                {opt}
                              </span>
                            ))}
                          </div>
                          {s.hrTableData.interestedGroups && s.hrTableData.interestedGroups.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-500">Interested Group(s):</span>
                              {s.hrTableData.interestedGroups.map(g => (
                                <span key={g} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[9px] font-black">
                                  {g}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
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

      {/* HR Table Sewadar Edit Modal (Matching Add Sewadar Edit Flow exactly) */}
      {editingHrSewadar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Editing Header Banner - Exactly like SS */}
            <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
              <div>
                <div className="text-xs font-black text-amber-900 uppercase tracking-wide">
                  Editing Sewadar Mode
                </div>
                <div className="text-sm font-bold text-amber-800">
                  Modifying selections & group for <span className="font-black text-black">"{editFormData.name}"</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingHrSewadar(null)}
                className="px-3.5 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-2xs"
              >
                Cancel Edit
              </button>
            </div>

            {/* Sewadar Information Form */}
            <div className="bg-white rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
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
                  value={editFormData.name}
                  onChange={e => setEditFormData(p => ({ ...p, name: e.target.value }))}
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
                    onClick={() => setEditFormData(p => ({ ...p, gender: 'Gents' }))}
                    className={`py-3 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all border-2 ${
                      editFormData.gender === 'Gents'
                        ? 'bg-blue-50 border-blue-600 text-blue-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>👨</span> Gents
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFormData(p => ({ ...p, gender: 'Ladies' }))}
                    className={`py-3 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all border-2 ${
                      editFormData.gender === 'Ladies'
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
                    value={editFormData.phoneNumber}
                    onChange={e => setEditFormData(p => ({ ...p, phoneNumber: e.target.value.replace(/[^0-9]/g, '') }))}
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
                  value={editFormData.address}
                  onChange={e => setEditFormData(p => ({ ...p, address: e.target.value }))}
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
                  value={editFormData.qualification}
                  onChange={e => setEditFormData(p => ({ ...p, qualification: e.target.value }))}
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
                  value={editFormData.timing}
                  onChange={e => setEditFormData(p => ({ ...p, timing: e.target.value }))}
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
                  value={editFormData.weeklyOff}
                  onChange={e => setEditFormData(p => ({ ...p, weeklyOff: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
                >
                  <option value="">Select Weekly Off Day</option>
                  {DAYS_OF_WEEK.map(day => (
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
                    {editFormData.sewaDays.length > 0 ? `${editFormData.sewaDays.length} selected` : 'Select available days'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => {
                    const isSelected = editFormData.sewaDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setEditFormData(p => ({
                            ...p,
                            sewaDays: isSelected ? p.sewaDays.filter(d => d !== day) : [...p.sewaDays, day]
                          }));
                        }}
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
                      if (editFormData.sewaDays.length === DAYS_OF_WEEK.length) {
                        setEditFormData(p => ({ ...p, sewaDays: [] }));
                      } else {
                        setEditFormData(p => ({ ...p, sewaDays: [...DAYS_OF_WEEK] }));
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-black border border-dashed border-slate-300 text-slate-500 hover:text-slate-800 hover:border-slate-400 transition-all"
                  >
                    {editFormData.sewaDays.length === DAYS_OF_WEEK.length ? 'Clear All' : 'All Days'}
                  </button>
                </div>
              </div>

              {/* Options to choose from */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Options to choose from
                    </label>
                    <p className="text-[11px] text-slate-400 font-medium">Select departments or sewa categories</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {editFormData.selectedOptions.length} chosen
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SEWA_OPTIONS.map(option => {
                    const isChecked = editFormData.selectedOptions.includes(option);
                    const isSecurityGents = option === 'Security gents';
                    const isSecurityLadies = option === 'Security ladies';
                    const hasSubOptions = (isSecurityGents || isSecurityLadies) && isChecked;
                    const currentSubGroups = isSecurityGents ? editFormData.securityGentsGroups : editFormData.securityLadiesGroups;

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
                          onClick={() => {
                            setEditFormData(p => {
                              const willBeChecked = !isChecked;
                              return {
                                ...p,
                                selectedOptions: isChecked
                                  ? p.selectedOptions.filter(o => o !== option)
                                  : [...p.selectedOptions, option],
                                securityGentsGroups: (option === 'Security gents' && !willBeChecked) ? [] : p.securityGentsGroups,
                                securityLadiesGroups: (option === 'Security ladies' && !willBeChecked) ? [] : p.securityLadiesGroups
                              };
                            });
                          }}
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
                                      setEditFormData(p => {
                                        const targetKey = isSecurityGents ? 'securityGentsGroups' : 'securityLadiesGroups';
                                        const currentList = p[targetKey];
                                        const updatedList = currentList.includes(day)
                                          ? currentList.filter(d => d !== day)
                                          : [...currentList, day];
                                        return { ...p, [targetKey]: updatedList };
                                      });
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
                                  setEditFormData(p => {
                                    const targetKey = isSecurityGents ? 'securityGentsGroups' : 'securityLadiesGroups';
                                    const currentList = p[targetKey];
                                    return {
                                      ...p,
                                      [targetKey]: currentList.length === DAYS_LIST.length ? [] : [...DAYS_LIST]
                                    };
                                  });
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

                {/* Save Sewadar Button */}
                <button
                  type="button"
                  disabled={isSavingHr || !editFormData.name.trim()}
                  onClick={handleSaveHrSewadar}
                  className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-md shadow-emerald-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {isSavingHr ? 'Saving...' : 'Save sewadar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
