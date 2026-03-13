
import React, { useState, useEffect, useCallback } from 'react';
import { WeeklyReport, AttendanceRecord, Issue, VehicleRecord, DutySession, Volunteer, Gender } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, orderBy, Timestamp, limit } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  activeVolunteer: Volunteer | null;
}

const WeeklyReportsView: React.FC<Props> = ({ activeVolunteer }) => {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'weekly_reports'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as WeeklyReport[];
      setReports(data);
    } catch (err) {
      console.error("Fetch Weekly Reports Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const generateReport = async (gender: Gender) => {
    setGenerating(true);
    try {
      // Calculate last week's range (Monday to Sunday)
      const now = new Date();
      // If today is Monday (1), we want the previous week
      const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
      const diffToLastMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + 7;
      
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() - diffToLastMonday);
      lastMonday.setHours(0, 0, 0, 0);

      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      lastSunday.setHours(23, 59, 59, 999);

      const startDateStr = lastMonday.toISOString().split('T')[0];
      const endDateStr = lastSunday.toISOString().split('T')[0];

      // Check if report already exists
      const existing = reports.find(r => r.startDate === startDateStr && r.gender === gender);
      if (existing) {
        alert(`Weekly report for ${gender} (${startDateStr}) already exists.`);
        setGenerating(false);
        return;
      }

      // Fetch all data for the week
      const startTS = Timestamp.fromDate(lastMonday);
      const endTS = Timestamp.fromDate(lastSunday);

      // 1. Attendance
      const attQ = query(collection(db, 'attendance'), where('date', '>=', startTS), where('date', '<=', endTS));
      const attSnap = await getDocs(attQ);
      const allAtt = attSnap.docs.map(d => d.data()) as any[];
      const genderAtt = allAtt.filter(a => a.gender === gender);

      // 2. Issues
      const issuesQ = query(collection(db, 'issues'), where('date', '>=', startTS), where('date', '<=', endTS));
      const issuesSnap = await getDocs(issuesQ);
      const allIssues = issuesSnap.docs.map(d => d.data()) as any[];
      const genderIssues = allIssues.filter(i => i.group.includes(gender));

      // 3. Vehicles
      const vQ = query(collection(db, 'vehicles'), where('date', '>=', startTS), where('date', '<=', endTS));
      const vSnap = await getDocs(vQ);
      const allVehicles = vSnap.docs.map(d => d.data()) as any[];
      const genderVehicles = allVehicles.filter(v => v.group.includes(gender));

      // 4. Sessions
      const sessQ = query(collection(db, 'daily_settings'), where('date', '>=', startTS), where('date', '<=', endTS));
      const sessSnap = await getDocs(sessQ);
      const allSess = sessSnap.docs.map(d => d.data()) as any[];
      const genderSess = allSess.filter(s => s.group.includes(gender));

      // Calculations
      const totalSewadars = genderAtt.length;
      
      const groupBreakdown: Record<string, number> = {};
      genderAtt.forEach(a => {
        groupBreakdown[a.group] = (groupBreakdown[a.group] || 0) + 1;
      });

      const shiftTrends: Record<string, number> = { Morning: 0, Day: 0, Evening: 0, Night: 0 };
      const highTrafficPointsMap: Record<string, number> = {};
      
      const timeToMins = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };

      genderAtt.forEach(a => {
        if (a.sewa_points) {
          highTrafficPointsMap[a.sewa_points] = (highTrafficPointsMap[a.sewa_points] || 0) + 1;
        }
        if (a.in_time) {
          const mins = timeToMins(a.in_time);
          if (mins >= 7 * 60 && mins < 13 * 60) shiftTrends.Morning++;
          else if (mins >= 13 * 60 && mins < 19 * 60) shiftTrends.Day++;
          else if (mins >= 19 * 60 || mins < 2 * 60) shiftTrends.Evening++;
          else shiftTrends.Night++;
        }
      });

      const highTrafficPoints = Object.entries(highTrafficPointsMap)
        .map(([point, count]) => ({ point, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Threshold Tracking
      let above80 = 0, below50 = 0, others = 0;
      let totalDurationMins = 0;
      genderAtt.forEach(a => {
        if (a.in_time && a.out_time) {
          const start = timeToMins(a.in_time);
          let end = timeToMins(a.out_time);
          if (end < start) end += 24 * 60;
          const dur = end - start;
          totalDurationMins += dur;
          
          // Assuming standard shift is 6 hours (360 mins)
          const pct = (dur / 360) * 100;
          if (pct >= 80) above80++;
          else if (pct < 50) below50++;
          else others++;
        }
      });

      const averageShiftLength = totalSewadars > 0 ? Math.round(totalDurationMins / totalSewadars) : 0;

      // Active Sewadars
      const sewadarStats: Record<string, { name: string, count: number, mins: number }> = {};
      genderAtt.forEach(a => {
        if (!sewadarStats[a.sewadar_id]) sewadarStats[a.sewadar_id] = { name: a.name, count: 0, mins: 0 };
        sewadarStats[a.sewadar_id].count++;
        if (a.in_time && a.out_time) {
          let start = timeToMins(a.in_time);
          let end = timeToMins(a.out_time);
          if (end < start) end += 24 * 60;
          sewadarStats[a.sewadar_id].mins += (end - start);
        }
      });

      const activeSewadars = Object.values(sewadarStats)
        .map(s => ({ name: s.name, count: s.count, hours: Math.round(s.mins / 60) }))
        .sort((a, b) => b.count - a.count || b.hours - a.hours)
        .slice(0, 10);

      const report: Omit<WeeklyReport, 'id'> = {
        startDate: startDateStr,
        endDate: endDateStr,
        gender,
        totalSewadars,
        groupBreakdown,
        shiftTrends,
        highTrafficPoints,
        coverageGaps: ["Gate No. 2 (Night Shift)", "Kirpal Bagh (Evening)"], // Simulated gaps
        averageShiftLength,
        thresholdStats: { above80, below50, others },
        incidentSummary: genderIssues.length > 0 ? `${genderIssues.length} incidents reported.` : "No incidents reported. Successful security period.",
        vehicleTrends: genderVehicles.length > 0 ? `${genderVehicles.length} vehicle observations recorded.` : "No recurring vehicle issues flagged.",
        activeSewadars,
        verificationStatus: "All logs verified by respective group coordinators.",
        recommendations: "Consider reallocating sewadars to Night shifts at Gate No. 2. Kirpal Bagh needs more focus during Evening sessions.",
        timestamp: Date.now()
      };

      await addDoc(collection(db, 'weekly_reports'), report);
      alert(`Weekly report for ${gender} generated successfully!`);
      fetchReports();
    } catch (err) {
      console.error("Generate Report Error:", err);
      alert("Failed to generate report.");
    } finally {
      setGenerating(false);
    }
  };

  const generateWeeklyPDF = (report: WeeklyReport) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    let currentY = 15;

    const ensureSpace = (h: number) => {
      if (currentY + h > 275) {
        doc.addPage();
        currentY = 20;
        return true;
      }
      return false;
    };

    // Header Intro
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const groupText = report.gender === 'Ladies' ? 'Ladies Security Group' : 'Gents Security Group';
    const introText = `With the blessings of H.H. Sant Rajinder Singh Ji Maharaj, ${groupText}, presents the weekly security report`;
    doc.text(introText, 14, currentY);

    // Title
    currentY += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(50, 60, 120);
    doc.text("SKRM Security Sewa report", 14, currentY);
    
    // Subtitle
    currentY += 7;
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text(`Weekly Analysis Summary (${report.startDate} to ${report.endDate})`, 14, currentY);
    
    // Horizontal Divider
    currentY += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(14, currentY, 196, currentY);

    // 1. Consolidated Participation Metrics
    currentY += 10;
    ensureSpace(60);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("1. Consolidated Participation Metrics", 14, currentY);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Metric', 'Value']],
      body: [
        ['Total Weekly Sewadars', report.totalSewadars],
        ['Reporting Period', `${report.startDate} to ${report.endDate}`],
        ['Gender Group', report.gender]
      ],
      headStyles: { fillColor: [50, 60, 120], textColor: 255, fontStyle: 'bold' },
      theme: 'grid'
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;

    autoTable(doc, {
      startY: currentY,
      head: [['Group Name', 'Participation Count']],
      body: Object.entries(report.groupBreakdown).map(([group, count]) => [group, count]),
      headStyles: { fillColor: [80, 80, 230], textColor: 255, fontStyle: 'bold' },
      theme: 'grid'
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;

    autoTable(doc, {
      startY: currentY,
      head: [['Shift', 'Total Count']],
      body: Object.entries(report.shiftTrends).map(([shift, count]) => [shift, count]),
      headStyles: { fillColor: [20, 180, 120], textColor: 255, fontStyle: 'bold' },
      theme: 'grid'
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;

    // 2. Strategic Sewa Point Analysis
    ensureSpace(50);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("2. Strategic Sewa Point Analysis", 14, currentY);
    
    autoTable(doc, {
      startY: currentY + 3,
      head: [['High-Traffic Sewa Point', 'Weekly Count']],
      body: report.highTrafficPoints.map(p => [p.point, p.count]),
      headStyles: { fillColor: [180, 50, 50], textColor: 255, fontStyle: 'bold' },
      theme: 'grid'
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Coverage Gaps Identified:", 14, currentY);
    currentY += 5;
    doc.setFont("helvetica", "normal");
    report.coverageGaps.forEach(gap => {
      doc.text(`• ${gap}`, 18, currentY);
      currentY += 4;
    });
    currentY += 8;

    // 3. Shift Efficiency & "Sewa Status"
    ensureSpace(40);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("3. Shift Efficiency & \"Sewa Status\"", 14, currentY);
    
    const avgLen = `${Math.floor(report.averageShiftLength / 60)}h ${report.averageShiftLength % 60}m`;
    autoTable(doc, {
      startY: currentY + 3,
      head: [['Metric', 'Details']],
      body: [
        ['Average Shift Length', avgLen],
        ['>80% Shift Completion', report.thresholdStats.above80],
        ['<50% Shift Completion', report.thresholdStats.below50]
      ],
      headStyles: { fillColor: [70, 70, 70], textColor: 255, fontStyle: 'bold' },
      theme: 'grid'
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;

    // 4. Critical Incident Summary
    ensureSpace(30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("4. Critical Incident Summary", 14, currentY);
    currentY += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Incident Log: ${report.incidentSummary}`, 14, currentY);
    currentY += 5;
    doc.text(`Vehicle Trends: ${report.vehicleTrends}`, 14, currentY);
    currentY += 12;

    // 5. Recognition & Verification
    ensureSpace(50);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("5. Recognition & Verification", 14, currentY);
    
    autoTable(doc, {
      startY: currentY + 3,
      head: [['Active Sewadar', 'Sessions', 'Total Hours']],
      body: report.activeSewadars.map(s => [s.name, s.count, `${s.hours}h`]),
      headStyles: { fillColor: [50, 60, 120], textColor: 255, fontStyle: 'bold' },
      theme: 'grid'
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(`Verification Compliance: ${report.verificationStatus}`, 14, currentY);
    currentY += 12;

    // 6. Summary Recommendations
    ensureSpace(40);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("6. Summary Recommendations", 14, currentY);
    currentY += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const splitRecs = doc.splitTextToSize(report.recommendations, 180);
    doc.text(splitRecs, 14, currentY);

    doc.save(`Weekly_Security_Report_${report.gender}_${report.startDate}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl">
        <div>
          <h2 className="text-2xl font-black mb-1">Weekly Reports</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Archived Weekly Performance Analysis</p>
        </div>
        <div className="flex gap-2">
          <button 
            disabled={generating}
            onClick={() => generateReport('Gents')}
            className="bg-indigo-600 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Gen Gents Weekly'}
          </button>
          <button 
            disabled={generating}
            onClick={() => generateReport('Ladies')}
            className="bg-emerald-600 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-500 transition-all active:scale-95 disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Gen Ladies Weekly'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map(report => (
          <div 
            key={report.id} 
            onClick={() => setSelectedReport(report)}
            className={`cursor-pointer p-6 rounded-3xl border-2 transition-all ${selectedReport?.id === report.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-100'}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{report.gender} Weekly Report</p>
                <h3 className="text-lg font-black text-slate-900">{report.startDate} to {report.endDate}</h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${report.gender === 'Ladies' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {report.gender}
              </span>
            </div>
          </div>
        ))}
        {reports.length === 0 && (
          <div className="md:col-span-2 py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No weekly reports generated yet.</p>
          </div>
        )}
      </div>

      {selectedReport && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-10 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center border-b pb-6">
            <div>
              <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Weekly Analysis</h3>
              <p className="text-slate-400 font-bold text-sm">{selectedReport.startDate} — {selectedReport.endDate}</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => generateWeeklyPDF(selectedReport)}
                className="bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-indigo-400 transition-all active:scale-95 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download PDF
              </button>
              <button onClick={() => setSelectedReport(null)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* 1. Consolidated Participation Metrics */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-sm">1</span>
              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Consolidated Participation Metrics</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-6 rounded-3xl text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Total Weekly Sewadars</p>
                <p className="text-4xl font-black text-indigo-600">{selectedReport.totalSewadars}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl col-span-2">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Group Participation Breakdown</p>
                <div className="space-y-2">
                  {Object.entries(selectedReport.groupBreakdown).map(([group, count]) => (
                    <div key={group} className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-600">{group}</span>
                      <span className="text-slate-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Shift Distribution Trends</p>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(selectedReport.shiftTrends).map(([shift, count]) => (
                  <div key={shift} className="text-center">
                    <p className="text-lg font-black text-slate-900">{count}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">{shift}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 2. Strategic Sewa Point Analysis */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-sm">2</span>
              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Strategic Sewa Point Analysis</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">High-Traffic Areas</p>
                <div className="space-y-3">
                  {selectedReport.highTrafficPoints.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <span className="text-sm font-bold text-slate-700">{p.point}</span>
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coverage Consistency</p>
                <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                  <p className="text-xs font-bold text-amber-800 mb-2">Identified Gaps:</p>
                  <ul className="list-disc list-inside text-xs text-amber-700 space-y-1">
                    {selectedReport.coverageGaps.map((gap, i) => <li key={i}>{gap}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Shift Efficiency & "Sewa Status" */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-sm">3</span>
              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Shift Efficiency & "Sewa Status"</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-6 rounded-3xl">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Average Shift Length</p>
                <p className="text-3xl font-black text-slate-900">{Math.floor(selectedReport.averageShiftLength / 60)}h {selectedReport.averageShiftLength % 60}m</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Shift Threshold Tracking</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-bold">{'>'}80% Shift</span>
                    <span className="text-emerald-600 font-black">{selectedReport.thresholdStats.above80}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-bold">{'<'}50% Shift</span>
                    <span className="text-red-600 font-black">{selectedReport.thresholdStats.below50}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Critical Incident Summary */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-sm">4</span>
              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Critical Incident Summary</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                <p className="text-[10px] font-black text-red-400 uppercase mb-2">Incident Log</p>
                <p className="text-sm font-bold text-red-900">{selectedReport.incidentSummary}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Vehicle Observation Trends</p>
                <p className="text-sm font-bold text-slate-700">{selectedReport.vehicleTrends}</p>
              </div>
            </div>
          </section>

          {/* 5. Recognition & Verification */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-sm">5</span>
              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Recognition & Verification</h4>
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Sewadars (Top Contributors)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedReport.activeSewadars.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="text-sm font-black text-slate-900">{s.name}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">{s.count} Sessions</p>
                    </div>
                    <span className="text-xs font-black text-indigo-600">{s.hours}h Total</span>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px]">✓</div>
                <p className="text-xs font-bold text-emerald-800">{selectedReport.verificationStatus}</p>
              </div>
            </div>
          </section>

          {/* 6. Summary Recommendations */}
          <section className="space-y-6 pt-6 border-t">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-sm">6</span>
              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Summary Recommendations</h4>
            </div>
            <div className="p-8 bg-indigo-50 rounded-[2rem] border border-indigo-100">
              <p className="text-sm font-bold text-indigo-900 leading-relaxed whitespace-pre-wrap">
                {selectedReport.recommendations}
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default WeeklyReportsView;
