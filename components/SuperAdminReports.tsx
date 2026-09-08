import React, { useMemo, useState } from 'react';
import { Sewadar, SewadarDetails } from '../types';
import { GENTS_GROUPS } from '../constants';
import {
  getUniqueLadiesList,
  getUniqueGentsList,
  getGroupWiseGents,
  getGroupWiseLadies,
  generateLadiesMasterPDF,
  generateGentsTotalMasterPDF,
  generateGentsGroupWiseMasterPDF,
  generateSingleGroupPDF,
  exportLadiesMasterCSV,
  exportGentsTotalMasterCSV,
  exportGentsGroupWiseCSV
} from '../utils/deduplicatedReports';

interface SuperAdminReportsProps {
  sewadars: Sewadar[];
  allSewadars?: Sewadar[];
  details: Record<string, SewadarDetails>;
}

export const SuperAdminReports: React.FC<SuperAdminReportsProps> = ({
  sewadars,
  allSewadars,
  details
}) => {
  const [downloadingAction, setDownloadingAction] = useState<string | null>(null);

  // Pool of all sewadars
  const sourceSewadars = useMemo(() => {
    return allSewadars && allSewadars.length > 0 ? allSewadars : sewadars;
  }, [allSewadars, sewadars]);

  // Master unique lists (each name appears only once)
  const uniqueLadies = useMemo(() => {
    return getUniqueLadiesList(sourceSewadars, details);
  }, [sourceSewadars, details]);

  const uniqueGents = useMemo(() => {
    return getUniqueGentsList(sourceSewadars, details);
  }, [sourceSewadars, details]);

  // Group-wise unique lists
  const groupWiseGents = useMemo(() => {
    return getGroupWiseGents(sourceSewadars, details);
  }, [sourceSewadars, details]);

  const groupWiseLadies = useMemo(() => {
    return getGroupWiseLadies(sourceSewadars, details);
  }, [sourceSewadars, details]);

  const handleAction = async (actionKey: string, fn: () => void | Promise<void>) => {
    try {
      setDownloadingAction(actionKey);
      await fn();
    } catch (err) {
      console.error(`Download failed for ${actionKey}:`, err);
      alert(`Error generating download: ${err}`);
    } finally {
      setDownloadingAction(null);
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-[2.5rem] border border-emerald-500/25 text-white shadow-2xl relative overflow-hidden space-y-7">
      <div className="relative z-10 space-y-6">
        {/* Header Badge & Title */}
        <div>
          <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-block mb-3">
            Super Admin • Unique Count & Roster Reports
          </div>
          <h3 className="text-2xl font-black tracking-tight text-white mb-1.5 flex items-center gap-2 flex-wrap">
            <span>Deduplicated Volunteer Reports</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
              Duplicates Removed
            </span>
          </h3>
          <p className="text-slate-300 text-xs font-normal max-w-2xl leading-relaxed">
            Download official master reports and group-wise counts with duplicate names removed so each person appears only once in rosters.
          </p>
        </div>

        {/* Master Reports Hub (3 Primary Actions) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Ladies Master (1 Single Report) */}
          <div className="bg-white/5 border border-pink-500/20 hover:border-pink-500/40 rounded-3xl p-5 flex flex-col justify-between transition-all group backdrop-blur-sm">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded-md border border-pink-500/20">
                  Ladies • 1 Single Report
                </span>
                <span className="text-lg">🌸</span>
              </div>
              <h4 className="text-base font-black text-white leading-tight mb-1">
                All Ladies Master Report
              </h4>
              <p className="text-[11px] text-slate-300 mb-3 leading-snug">
                Total count and names of all ladies with serial number. Duplicates removed (each name only once).
              </p>
              <div className="bg-pink-950/40 border border-pink-500/30 px-3 py-2 rounded-xl mb-4">
                <span className="text-[10px] font-black text-pink-300 uppercase block tracking-wider">Total Unique Ladies</span>
                <span className="text-2xl font-black text-white">{uniqueLadies.length}</span>
                <span className="text-[10px] text-pink-200/70 ml-1.5 font-bold">unique names</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleAction('ladies_pdf', () => generateLadiesMasterPDF(uniqueLadies))}
                disabled={downloadingAction === 'ladies_pdf'}
                className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-xs py-2.5 px-3 rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>{downloadingAction === 'ladies_pdf' ? 'Generating...' : 'Download PDF 📥'}</span>
              </button>
              <button
                onClick={() => handleAction('ladies_csv', () => exportLadiesMasterCSV(uniqueLadies))}
                title="Export as CSV for Excel"
                className="bg-white/10 hover:bg-white/20 border border-white/15 text-pink-200 font-black text-xs px-3 rounded-xl active:scale-95 transition-all"
              >
                CSV 📊
              </button>
            </div>
          </div>

          {/* Card 2: Gents Option 1 (Total Report) */}
          <div className="bg-white/5 border border-indigo-500/20 hover:border-indigo-500/40 rounded-3xl p-5 flex flex-col justify-between transition-all group backdrop-blur-sm">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                  Gents • Option 1
                </span>
                <span className="text-lg">👔</span>
              </div>
              <h4 className="text-base font-black text-white leading-tight mb-1">
                Total Gents Master Report
              </h4>
              <p className="text-[11px] text-slate-300 mb-3 leading-snug">
                Total count of unique gents across all groups and their names (duplicates removed, only added once).
              </p>
              <div className="bg-indigo-950/40 border border-indigo-500/30 px-3 py-2 rounded-xl mb-4">
                <span className="text-[10px] font-black text-indigo-300 uppercase block tracking-wider">Total Unique Gents</span>
                <span className="text-2xl font-black text-white">{uniqueGents.length}</span>
                <span className="text-[10px] text-indigo-200/70 ml-1.5 font-bold">unique names</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleAction('gents_total_pdf', () => generateGentsTotalMasterPDF(uniqueGents))}
                disabled={downloadingAction === 'gents_total_pdf'}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs py-2.5 px-3 rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>{downloadingAction === 'gents_total_pdf' ? 'Generating...' : 'Download PDF 📥'}</span>
              </button>
              <button
                onClick={() => handleAction('gents_total_csv', () => exportGentsTotalMasterCSV(uniqueGents))}
                title="Export as CSV for Excel"
                className="bg-white/10 hover:bg-white/20 border border-white/15 text-indigo-200 font-black text-xs px-3 rounded-xl active:scale-95 transition-all"
              >
                CSV 📊
              </button>
            </div>
          </div>

          {/* Card 3: Gents Option 2 (Group-Wise Report) */}
          <div className="bg-white/5 border border-emerald-500/20 hover:border-emerald-500/40 rounded-3xl p-5 flex flex-col justify-between transition-all group backdrop-blur-sm">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Gents • Option 2
                </span>
                <span className="text-lg">📋</span>
              </div>
              <h4 className="text-base font-black text-white leading-tight mb-1">
                Group-Wise Counts & Names
              </h4>
              <p className="text-[11px] text-slate-300 mb-3 leading-snug">
                Consolidated master report with count for every single group and complete group-wise names lists.
              </p>
              <div className="bg-emerald-950/40 border border-emerald-500/30 px-3 py-2 rounded-xl mb-4">
                <span className="text-[10px] font-black text-emerald-300 uppercase block tracking-wider">All Groups Included</span>
                <span className="text-2xl font-black text-white">{GENTS_GROUPS.length}</span>
                <span className="text-[10px] text-emerald-200/70 ml-1.5 font-bold">duty groups</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  handleAction('gents_group_pdf', () =>
                    generateGentsGroupWiseMasterPDF(groupWiseGents, uniqueGents.length)
                  )
                }
                disabled={downloadingAction === 'gents_group_pdf'}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs py-2.5 px-3 rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>{downloadingAction === 'gents_group_pdf' ? 'Generating...' : 'Group-Wise PDF 📥'}</span>
              </button>
              <button
                onClick={() => handleAction('gents_group_csv', () => exportGentsGroupWiseCSV(groupWiseGents))}
                title="Export as CSV for Excel"
                className="bg-white/10 hover:bg-white/20 border border-white/15 text-emerald-200 font-black text-xs px-3 rounded-xl active:scale-95 transition-all"
              >
                CSV 📊
              </button>
            </div>
          </div>
        </div>

        {/* Group-Wise Quick Download Grid (Similar to Volunteer Tracker) */}
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                Group-Wise Roster Downloads (Duplicates Removed)
              </h4>
              <p className="text-[11px] text-slate-400">
                Click any group to download its official unique count & volunteer names report:
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
              15 Groups Available
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {GENTS_GROUPS.map(grp => {
              const grpGents = groupWiseGents[grp] || [];
              const grpLadies = groupWiseLadies[grp] || [];

              return (
                <div
                  key={grp}
                  className="bg-white/5 border border-white/10 hover:border-emerald-400/40 p-3.5 rounded-2xl text-left transition-all group flex flex-col justify-between min-h-[115px] shadow-sm hover:bg-white/10"
                >
                  <div>
                    <p className="text-xs font-black tracking-tight text-slate-100">{grp}</p>
                    <p className="text-[7.5px] font-bold text-emerald-300 uppercase mt-0.5 leading-none">
                      {grpGents.length} Gents | {grpLadies.length} Ladies
                    </p>
                  </div>

                  <div className="flex gap-1 mt-2.5">
                    <button
                      onClick={() =>
                        handleAction(`single_${grp}_gents`, () =>
                          generateSingleGroupPDF(grp, 'Gents', grpGents)
                        )
                      }
                      title={`Download unique gents in ${grp}`}
                      className="flex-1 bg-white/10 hover:bg-emerald-600 border border-white/10 hover:border-transparent py-1 rounded-xl text-[8px] font-black text-center transition-all active:scale-95 text-emerald-300 hover:text-white"
                    >
                      Gents 📥
                    </button>
                    <button
                      onClick={() =>
                        handleAction(`single_${grp}_ladies`, () =>
                          generateSingleGroupPDF(grp, 'Ladies', grpLadies)
                        )
                      }
                      title={`Download unique ladies in ${grp}`}
                      className="flex-1 bg-white/10 hover:bg-pink-600 border border-white/10 hover:border-transparent py-1 rounded-xl text-[8px] font-black text-center transition-all active:scale-95 text-pink-300 hover:text-white"
                    >
                      Ladies 📥
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
};
