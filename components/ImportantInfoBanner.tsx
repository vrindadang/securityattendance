import React, { useState } from 'react';

interface Props {
  photo?: string;
}

const ImportantInfoBanner: React.FC<Props> = ({ photo }) => {
  const [showModal, setShowModal] = useState(false);

  const displayPhoto = photo || "https://ais-pre-2snntgklnesvtcldmdlnzp-89530588459.asia-southeast1.run.app/api/images/man.png";

  return (
    <>
      <div 
        className="fixed bottom-0 left-0 right-0 z-[110] bg-emerald-600 text-white px-6 py-3 cursor-pointer shadow-[0_-4px_20px_rgba(0,0,0,0.1)] hover:bg-emerald-700 transition-all active:scale-[0.99]"
        onClick={() => setShowModal(true)}
      >
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-0.5">Important Notice</p>
          <p className="text-sm font-black tracking-tight">Entry of Mr. Ron Flewich (6-March-2026)</p>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-emerald-600 px-8 py-6 flex items-center justify-between text-white">
              <h2 className="text-xl font-black uppercase tracking-tight">Important Security Notice</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="w-full md:w-56 shrink-0">
                  <div className="aspect-[3/4] bg-slate-100 rounded-2xl overflow-hidden border-4 border-slate-50 shadow-xl relative">
                    <img 
                      src={displayPhoto} 
                      alt="Mr Ron Flewich" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/ron/300/400';
                      }}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-white/90 backdrop-blur-sm py-2 border-t border-slate-100">
                      <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Mr Ron Flewich</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 space-y-6">
                  <div className="space-y-4">
                    <p className="font-black text-slate-900 text-lg">Dear All,</p>
                    <p className="text-slate-600 leading-relaxed font-medium text-base">
                      Entry of <span className="text-red-600 font-black">Mr Ron Flewich</span> as per photo attached, is strictly restricted in <span className="font-black text-slate-900 underline decoration-emerald-500 underline-offset-4">KIRPAL Ashram</span> and <span className="font-black text-slate-900 underline decoration-emerald-500 underline-offset-4">Sawan Ashram</span>. Please ensure he is not allowed in both the Ashrams.
                    </p>
                    <p className="text-slate-600 leading-relaxed font-medium text-base">
                      He is allowed at <span className="font-black text-slate-900">Kirpal Bagh</span> only but Security has to be vigilent to monitor his activities from distance and to report to Admin Controller in case anything he is doing which is not as per SKRM rules.
                    </p>
                    <p className="text-slate-600 leading-relaxed font-medium italic text-base">
                      Please communicate this message in your groups and ensure it is implemented strictly.
                    </p>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-100">
                    <p className="text-base font-black text-slate-900">Regards,</p>
                    <p className="text-base font-bold text-emerald-600 uppercase tracking-widest">L K Nagpal</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t flex justify-end">
              <button 
                onClick={() => setShowModal(false)}
                className="px-12 py-4 bg-[#0f172a] text-white rounded-xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all shadow-lg active:scale-95"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImportantInfoBanner;
