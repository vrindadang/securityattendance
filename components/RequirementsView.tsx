
import React, { useState, useMemo } from 'react';
import { Requirement, Volunteer } from '../types';

interface Props {
  requirements: Requirement[];
  activeVolunteer: Volunteer;
  onAddRequirement: (desc: string) => void;
  onUpdateRequirementStatus: (id: string, status: Requirement['status'], comment?: string) => void;
}

const RequirementsView: React.FC<Props> = ({ requirements, activeVolunteer, onAddRequirement, onUpdateRequirementStatus }) => {
  const [showReqModal, setShowReqModal] = useState(false);
  const [reqDesc, setReqDesc] = useState('');
  const [statusUpdateModal, setStatusUpdateModal] = useState<{id: string, status: Requirement['status']} | null>(null);
  const [adminComment, setAdminComment] = useState('');
  
  const isSuperAdmin = activeVolunteer.role === 'Super Admin';
  const groupName = activeVolunteer.assignedGroup || 'Global';

  const filteredRequirements = useMemo(() => {
    if (isSuperAdmin) return requirements;
    return requirements.filter(r => r.group_name === groupName);
  }, [requirements, isSuperAdmin, groupName]);

  const formatDateTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${date} ${time}`;
  };

  const handleRequirementSubmit = () => {
    if (!reqDesc.trim()) return;
    onAddRequirement(reqDesc);
    setReqDesc('');
    setShowReqModal(false);
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in pb-12">
        <div className="bg-amber-600 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-black mb-1">Requirements</h2>
            <p className="text-amber-100 text-[10px] font-black uppercase tracking-widest">
              {isSuperAdmin ? 'Central Management' : `${groupName} Group Requests`}
            </p>
          </div>
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {!isSuperAdmin && (
          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-amber-50 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner">📦</div>
              <div className="text-left">
                <h3 className="font-black text-slate-800">New Request</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ask for supplies or assistance</p>
              </div>
            </div>
            <button 
              onClick={() => setShowReqModal(true)} 
              className="w-full md:w-auto bg-amber-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all active:scale-95"
            >
              Create Request
            </button>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {isSuperAdmin ? 'All System Requests' : 'Your Group Requests'}
            </h3>
            <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
              {filteredRequirements.length} Total
            </span>
          </div>

          {filteredRequirements.length > 0 ? (
            filteredRequirements.map(req => (
              <div key={req.id} className={`bg-white rounded-[2.2rem] border-2 shadow-sm flex flex-col gap-4 group transition-all p-6 ${
                req.status === 'Closed' ? 'border-green-100 bg-green-50/20' : 
                req.status === 'Not Required' ? 'border-sky-100 bg-sky-50/20' : 
                'border-yellow-100 bg-yellow-50/20'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="flex items-center gap-3">
                      <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider">{req.group_name} Group</span>
                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tight">{formatDateTime(req.timestamp)}</span>
                    </div>
                    <p className={`font-black text-lg mt-3 leading-tight ${
                      req.status === 'Closed' ? 'text-green-900 opacity-60' : 
                      req.status === 'Not Required' ? 'text-sky-900 opacity-60' : 
                      'text-slate-900'
                    }`}>
                      {req.description}
                    </p>
                    {req.adminComment && (
                      <div className="mt-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                        <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Admin Response</p>
                        <p className="text-xs font-medium text-indigo-900">{req.adminComment}</p>
                      </div>
                    )}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-sm ${
                    req.status === 'Closed' ? 'bg-green-100 text-green-700 border-green-200' :
                    req.status === 'Not Required' ? 'bg-sky-100 text-sky-700 border-sky-200' :
                    'bg-yellow-100 text-yellow-700 border-yellow-200'
                  }`}>
                    {req.status}
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100/50">
                    <button 
                      onClick={() => {
                        setAdminComment(req.adminComment || '');
                        setStatusUpdateModal({ id: req.id, status: 'Pending' });
                      }}
                      className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${req.status === 'Pending' ? 'bg-yellow-400 text-yellow-900 shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-yellow-50'}`}
                    >
                      Pending
                    </button>
                    <button 
                      onClick={() => {
                        setAdminComment(req.adminComment || '');
                        setStatusUpdateModal({ id: req.id, status: 'Closed' });
                      }}
                      className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${req.status === 'Closed' ? 'bg-green-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-green-50'}`}
                    >
                      Mark Closed
                    </button>
                    <button 
                      onClick={() => {
                        setAdminComment(req.adminComment || '');
                        setStatusUpdateModal({ id: req.id, status: 'Not Required' });
                      }}
                      className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${req.status === 'Not Required' ? 'bg-sky-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-sky-50'}`}
                    >
                      Not Required
                    </button>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100/30 flex items-center gap-2">
                  <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px]">👤</div>
                  <div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Submitted By</p>
                    <p className="text-[10px] font-black text-slate-600 uppercase mt-0.5">{req.volunteer_name}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-24 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl opacity-40">📭</div>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">No requirements found</p>
            </div>
          )}
        </div>
      </div>

      {showReqModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative overflow-y-auto max-h-[90vh]">
            <div className="relative z-10">
              <h3 className="text-2xl font-black text-slate-900 mb-2">New Request</h3>
              <p className="text-slate-500 text-xs font-medium leading-relaxed">Describe what you need in the field. This goes directly to the Back Office team.</p>
              
              <div className="mt-8 space-y-4">
                <textarea 
                  className="w-full p-6 bg-slate-50 border-2 border-slate-50 rounded-2xl font-medium text-slate-800 outline-none focus:border-amber-500 transition-all shadow-inner" 
                  rows={4} 
                  placeholder="e.g. Need 5 more torches, Langar water shortage, extra badges..." 
                  value={reqDesc} 
                  onChange={(e) => setReqDesc(e.target.value)} 
                />
                
                <div className="flex gap-3">
                  <button onClick={() => setShowReqModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200">Cancel</button>
                  <button 
                    onClick={handleRequirementSubmit} 
                    disabled={!reqDesc.trim()}
                    className="flex-1 py-4 bg-amber-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-amber-200 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    Send Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {statusUpdateModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 leading-tight">Update Status</h3>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Changing to {statusUpdateModal.status}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Comment (Optional)</label>
              <textarea 
                className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-medium text-slate-800 outline-none focus:border-indigo-500 transition-all"
                placeholder="Add a note about this update..."
                rows={3}
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setStatusUpdateModal(null); setAdminComment(''); }} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
              <button 
                onClick={() => {
                  onUpdateRequirementStatus(statusUpdateModal.id, statusUpdateModal.status, adminComment);
                  setStatusUpdateModal(null);
                  setAdminComment('');
                }}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RequirementsView;
