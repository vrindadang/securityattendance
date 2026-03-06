import React, { useState, useEffect } from 'react';

interface Props {
  photo?: string;
}

const ImportantInfoBanner: React.FC<Props> = ({ photo }) => {
  const [showModal, setShowModal] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const message = "Entry of Mr Ron Flewich is strictly restricted in KIRPAL Ashram and Sawan Ashram. He is allowed at Kirpal Bagh only with strict monitoring. Click for more details.";

  const displayPhoto = photo || "https://ais-pre-2snntgklnesvtcldmdlnzp-89530588459.asia-southeast1.run.app/api/images/man.png";

  return (
    <>
      <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 relative overflow-hidden group cursor-pointer" onClick={() => setShowModal(true)}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1 overflow-hidden relative h-6">
            <div 
              className={`whitespace-nowrap absolute flex items-center gap-8 ${isPaused ? '' : 'animate-marquee'}`}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <span className="text-emerald-800 text-sm font-bold flex items-center gap-2">
                <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-black">IMPORTANT</span>
                {message}
              </span>
              <span className="text-emerald-800 text-sm font-bold flex items-center gap-2">
                <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-black">IMPORTANT</span>
                {message}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-emerald-600">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsPaused(!isPaused); }}
              className="p-1 hover:bg-emerald-100 rounded-full transition-colors"
            >
              {isPaused ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              )}
            </button>
            <div className="flex flex-col gap-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
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

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </>
  );
};

export default ImportantInfoBanner;
