import React, { useState } from 'react';
import { Notice } from '../types';

interface Props {
  photo?: string;
  externalShowModal?: boolean;
  onOpenExternal?: () => void;
  onCloseExternal?: () => void;
  hideBottomBar?: boolean;
  notices?: Notice[];
}

const ImportantInfoBanner: React.FC<Props> = ({ photo, externalShowModal, onOpenExternal, onCloseExternal, hideBottomBar, notices = [] }) => {
  const [internalShowModal, setInternalShowModal] = useState(false);
  const [previewItem, setPreviewItem] = useState<{ type: 'photo' | 'pdf', src: string, title: string } | null>(null);

  const showModal = externalShowModal !== undefined ? externalShowModal : internalShowModal;
  const setShowModal = (val: boolean) => {
    if (val) {
      onOpenExternal?.();
      setInternalShowModal(true);
    } else {
      onCloseExternal?.();
      setInternalShowModal(false);
    }
  };

  const openInNewTab = (type: 'photo' | 'pdf', dataUrl: string) => {
    try {
      if (!dataUrl.startsWith('data:')) {
        window.open(dataUrl, '_blank');
        return;
      }
      const base64Parts = dataUrl.split(',');
      if (base64Parts.length < 2) return;
      const byteCharacters = atob(base64Parts[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const mime = type === 'pdf' ? 'application/pdf' : 'image/png';
      const file = new Blob([byteArray], { type: mime });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, '_blank');
    } catch (err) {
      console.error("Failed to open file in new tab:", err);
      const w = window.open();
      if (w) w.location.href = dataUrl;
    }
  };

  const latestNotice = notices.length > 0 ? notices[0] : null;
  const displayTitle = latestNotice ? latestNotice.title : "Entry of Mr. Ron Filewich (6-March-2026)";

  return (
    <>
      {!showModal && !hideBottomBar && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-[110] bg-emerald-600 text-white px-6 py-3 cursor-pointer shadow-[0_-4px_20px_rgba(0,0,0,0.1)] hover:bg-emerald-700 transition-all active:scale-[0.99]"
          onClick={() => setShowModal(true)}
        >
          <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-0.5">Important Notice</p>
            <p className="text-sm font-black tracking-tight">{displayTitle}</p>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-emerald-600 px-8 py-6 flex items-center justify-between text-white shrink-0">
              <h2 className="text-xl font-black uppercase tracking-tight">Security Notices</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
             <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 no-scrollbar">
              {notices.length > 0 ? (
                notices.map((notice, idx) => (
                  <div key={notice.id} className={`flex flex-col md:flex-row gap-8 items-start ${idx !== 0 ? 'pt-8 border-t border-slate-300' : ''}`}>
                    {notice.photo ? (
                      <div className="w-full md:w-48 shrink-0">
                        <button
                          type="button"
                          onClick={() => openInNewTab('photo', notice.photo!)}
                          className="w-full h-40 md:h-64 bg-slate-100 rounded-2xl overflow-hidden border-4 border-slate-50 shadow-xl transition-all hover:scale-[1.02] active:scale-95 block cursor-pointer relative group"
                          title="Click to view image directly"
                        >
                          <img 
                            src={notice.photo} 
                            alt={notice.title} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-black tracking-widest uppercase gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View Image
                          </div>
                        </button>
                      </div>
                    ) : notice.pdf ? (
                      <div className="w-full md:w-48 shrink-0">
                        <button 
                          type="button"
                          onClick={() => openInNewTab('pdf', notice.pdf!)}
                          className="w-full h-24 md:h-64 bg-red-50 hover:bg-red-100 rounded-2xl overflow-hidden border-4 border-red-200 shadow-xl relative transition-all group active:scale-95 block cursor-pointer text-left"
                          title="Click to view PDF document directly"
                        >
                          <div className="absolute inset-0 flex flex-row md:flex-col items-center justify-center p-4 text-center md:space-y-2 gap-3 md:gap-2">
                            <svg className="w-8 h-8 md:w-12 md:h-12 text-red-500 group-hover:scale-110 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h1.5m1 0H13m-3 4h3m-6-4h.01M9 17h6" />
                            </svg>
                            <div className="flex flex-col items-start md:items-center">
                              <span className="text-[10px] md:text-xs font-black text-red-700 tracking-wider uppercase">PDF DOCUMENT</span>
                              <span className="text-[8px] md:text-[9px] font-black text-red-500 bg-red-100 px-2 py-0.5 rounded-full mt-1">
                                Open PDF
                              </span>
                            </div>
                          </div>
                        </button>
                      </div>
                    ) : null}
                    
                    <div className="flex-1 space-y-4 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h3 className="text-2xl font-black text-slate-900 leading-tight">
                          <span className="text-emerald-600 mr-2">{idx + 1}.</span>
                          {notice.title}
                        </h3>
                        <span className="self-start sm:self-auto text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">
                          {new Date(notice.timestamp).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <div className="text-slate-600 leading-relaxed font-medium text-base whitespace-pre-wrap">
                        {notice.content}
                      </div>

                      {notice.pdf && (
                        <div className="pt-2 flex flex-wrap gap-2">
                          <button 
                            type="button"
                            onClick={() => openInNewTab('pdf', notice.pdf!)}
                            className="inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 px-4 py-2 rounded-xl border border-indigo-200 font-bold text-xs transition-colors shadow-sm cursor-pointer"
                          >
                            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View PDF directly
                          </button>
                          <a 
                            href={notice.pdf} 
                            download={`${notice.title.replace(/[^a-zA-Z0-9]/g, '_')}_document.pdf`}
                            className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 px-4 py-2 rounded-xl border border-emerald-200 font-bold text-xs transition-colors shadow-sm cursor-pointer"
                          >
                            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download PDF Attachment
                          </a>
                        </div>
                      )}

                      <div className="pt-4 flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs">👤</div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Posted By</p>
                          <p className="text-sm font-bold text-slate-700">{notice.authorName}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="w-32 md:w-56 mx-auto md:mx-0 shrink-0">
                    <div className="aspect-[3/4] bg-slate-100 rounded-2xl overflow-hidden border-4 border-slate-50 shadow-xl relative">
                      <img 
                        src={photo || "https://ais-pre-2snntgklnesvtcldmdlnzp-89530588459.asia-southeast1.run.app/api/images/man.png"} 
                        alt="Mr Ron Filewich" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/ron/300/400';
                        }}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-white/90 backdrop-blur-sm py-2 border-t border-slate-100">
                        <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Mr Ron Filewich</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-6">
                    <div className="space-y-4">
                      <p className="font-black text-slate-900 text-lg">Dear All,</p>
                      <p className="text-slate-600 leading-relaxed font-medium text-base">
                        Entry of <span className="text-red-600 font-black">Mr Ron Filewich</span> as per photo attached, is strictly restricted in <span className="font-black text-slate-900 underline decoration-emerald-500 underline-offset-4">KIRPAL Ashram</span> and <span className="font-black text-slate-900 underline decoration-emerald-500 underline-offset-4">Sawan Ashram</span>. Please ensure he is not allowed in both the Ashrams.
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
              )}
            </div>
            
            <div className="p-6 bg-slate-50 border-t flex justify-end shrink-0">
              <button 
                onClick={() => setShowModal(false)}
                className="px-12 py-4 bg-[#0f172a] text-white rounded-xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

       {previewItem && (
        <div 
          onClick={() => setPreviewItem(null)}
          className="fixed inset-0 z-[130] flex flex-col items-center justify-center p-4 bg-black/95 animate-in fade-in cursor-pointer"
        >
          {/* Floating High-Contrast Top-Right Close Cross Button */}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewItem(null);
            }}
            className="absolute top-4 right-4 z-[150] w-12 h-12 bg-white text-slate-900 hover:bg-slate-100 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 cursor-pointer"
            title="Close Preview (ESC)"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden max-h-[90vh] cursor-default"
          >
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-widest text-indigo-400 bg-indigo-950/50 px-3 py-1 rounded-full">
                  {previewItem.type === 'pdf' ? '📄 PDF Document' : '🖼️ Image Document'}
                </span>
                <h4 className="font-bold text-sm truncate max-w-xs md:max-w-md">{previewItem.title}</h4>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => openInNewTab(previewItem.type, previewItem.src)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in New Tab
                </button>
                <button 
                  onClick={() => setPreviewItem(null)}
                  className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center bg-slate-950/50 min-h-0">
              {previewItem.type === 'pdf' ? (
                <div className="w-full h-full flex flex-col items-center justify-center min-h-[50vh]">
                  <iframe 
                    src={previewItem.src} 
                    className="w-full h-[60vh] rounded-2xl border-0 bg-white"
                    title="PDF Viewer"
                  />
                  <p className="mt-4 text-xs font-medium text-slate-400 text-center">
                    If the document does not display above, click 
                    <button 
                      onClick={() => openInNewTab('pdf', previewItem.src)}
                      className="text-emerald-400 hover:underline mx-1 font-bold inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      Open in New Tab
                    </button> 
                    to view or download it directly.
                  </p>
                </div>
              ) : (
                <div className="max-w-full max-h-[70vh] flex items-center justify-center">
                  <img 
                    src={previewItem.src} 
                    alt={previewItem.title} 
                    className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-slate-800"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImportantInfoBanner;
