import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, Timestamp } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as fs from 'fs';

const firebaseConfig = {
  apiKey: "AIzaSyAMj5b5sqCO0gcgRCPbeMbfip9okcucIYs",
  authDomain: "securityattendancedb.firebaseapp.com",
  projectId: "securityattendancedb",
  storageBucket: "securityattendancedb.firebasestorage.app",
  messagingSenderId: "953358063704",
  appId: "1:953358063704:web:76317c768a84f1877fd22d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function normalizeName(name: string): string {
  if (!name) return "";
  let n = name.toUpperCase().trim();
  n = n.replace(/\s+JI$/g, '');
  n = n.replace(/^DR\s+/g, '');
  n = n.replace(/^MR\s+/g, '');
  n = n.replace(/[^A-Z]/g, '');
  return n;
}

// Target Volunteers matching normalized mapping:
const targetMapping = [
  {
    displayName: "Ashwani Narang",
    aliases: ["ASHWANINARANG", "ASHWANIKUMAR", "ASHWANI"]
  },
  {
    displayName: "Sunil Shadra",
    aliases: ["SUNILSHADRA", "SUNILKUMAR", "SUNILSHAHDRA", "SUNIL"]
  },
  {
    displayName: "Dinesh Salgotra",
    aliases: ["DINESHSALGOTRA", "DINESH"]
  },
  {
    displayName: "Manmohan Khurana",
    aliases: ["MANMOHANKHURANA"]
  }
];

function findTargetVolunteer(rawName: string): string | null {
  const norm = normalizeName(rawName);
  for (const t of targetMapping) {
    if (t.aliases.includes(norm)) {
      return t.displayName;
    }
  }
  return null;
}

function calculateMinutes(inTime?: string, outTime?: string): number {
  if (!inTime || !outTime) return 0;
  try {
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;
    let diff = (outH * 60 + outM) - (inH * 60 + inM);
    if (diff < 0) diff += 24 * 60; // handle cross-midnight
    return diff;
  } catch { return 0; }
}

function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

async function runPDFGeneration() {
  try {
    console.log("Fetching attendance records for March, April, and May...");
    const snap = await getDocs(collection(db, 'attendance'));
    const allRecords = snap.docs.map(doc => doc.data());
    
    console.log(`Processing ${allRecords.length} historical database records...`);
    
    // Filter records by date and volunteer
    interface FormattedRecord {
      id: string;
      rawName: string;
      resolvedName: string;
      group: string;
      date: string;
      inTime: string;
      outTime: string;
      durationMinutes: number;
      shift: string;
    }

    const filtered: FormattedRecord[] = [];
    
    allRecords.forEach((r: any) => {
      const resolvedName = findTargetVolunteer(r.name || r.sewadarName || '');
      if (!resolvedName) return;
      
      let dateStr = "";
      if (r.date) {
        if (typeof r.date === 'string') {
          dateStr = r.date;
        } else if (r.date.seconds) {
          const d = new Date(r.date.seconds * 1000);
          dateStr = d.toISOString().split('T')[0];
        }
      }
      
      const year = dateStr.split('-')[0];
      const month = dateStr.split('-')[1]; // '03', '04', '05'
      
      // Confirm the month is March, April, or May in 2026
      if (year === '2026' && ['03', '04', '05'].includes(month)) {
        const mins = calculateMinutes(r.in_time, r.out_time);
        filtered.push({
          id: r.id || '',
          rawName: r.name || '',
          resolvedName,
          group: r.group || 'Gents',
          date: dateStr,
          inTime: r.in_time || '-',
          outTime: r.out_time || '-',
          durationMinutes: mins,
          shift: r.shift || '-'
        });
      }
    });
    
    // Sort chronologically
    filtered.sort((a, b) => a.date.localeCompare(b.date));
    
    console.log(`Found ${filtered.length} matching attendance entries.`);
    
    // Set up PDF
    const doc = new jsPDF('p', 'mm', 'a4');
    let currentY = 15;
    
    // 1. BLESSINGS BANNER & HEADER INFO
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text("With the blessings of H.H. Sant Rajinder Singh Ji Maharaj", 14, currentY);
    
    currentY += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(40, 50, 110);
    doc.text("Targeted Volunteer Attendance Report", 14, currentY);
    
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Project Report Period: March, April & May 2026", 14, currentY);
    
    currentY += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, currentY, 196, currentY);
    
    // 2. MAIN EXECUTIVE SUMMARY SECTION
    currentY += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text("1. Attendance Dashboard Summary", 14, currentY);
    
    // Calculate summaries per target
    const summaries = targetMapping.map(t => {
      const vRecords = filtered.filter(f => f.resolvedName === t.displayName);
      const totalMinutes = vRecords.reduce((sum, r) => sum + r.durationMinutes, 0);
      const uniqueDays = new Set(vRecords.map(r => r.date)).size;
      const groups = Array.from(new Set(vRecords.map(r => r.group))).join(', ');
      
      return {
        name: t.displayName,
        totalShifts: vRecords.length,
        uniqueDays,
        totalHours: formatMinutes(totalMinutes),
        groups: groups || 'Monday'
      };
    });
    
    const summaryRows = summaries.map((s, idx) => [
      (idx + 1).toString(),
      s.name,
      s.groups,
      s.uniqueDays.toString(),
      s.totalShifts.toString(),
      s.totalHours
    ]);
    
    (doc as any).autoTable({
      startY: currentY + 4,
      head: [['S.No', 'Volunteer Name', 'Active Groups', 'Unique Days', 'Total Shifts', 'Total Duration']],
      body: summaryRows,
      headStyles: { fillColor: [40, 50, 110], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [247, 248, 252] },
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { fontStyle: 'bold' },
        2: { cellWidth: 40 },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }
      }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;
    
    // 3. INDIVIDUAL VOLUNTEER DETAIL TABLES
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("2. Detailed Attendance Sheets", 14, currentY);
    currentY += 2;
    
    for (const volunteer of targetMapping) {
      const vRecords = filtered.filter(f => f.resolvedName === volunteer.displayName);
      
      // Page safety check
      if (currentY + 40 > 280) {
        doc.addPage();
        currentY = 20;
      } else {
        currentY += 6;
      }
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(50, 60, 120);
      doc.text(`${volunteer.displayName} - Log Sheet`, 14, currentY);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const uniqueDatesCount = new Set(vRecords.map(r => r.date)).size;
      const totalMinutes = vRecords.reduce((sum, r) => sum + r.durationMinutes, 0);
      doc.text(`Total Shifts Marked: ${vRecords.length} | Unique Days: ${uniqueDatesCount} | Accumulated Hours: ${formatMinutes(totalMinutes)}`, 14, currentY + 4);
      
      currentY += 6;
      
      const tableBody = vRecords.map((r, sNo) => {
        const formattedDate = r.date.split('-').reverse().join('/');
        return [
          (sNo + 1).toString(),
          formattedDate,
          r.group,
          r.inTime,
          r.outTime,
          formatMinutes(r.durationMinutes)
        ];
      });
      
      if (tableBody.length === 0) {
        tableBody.push(['-', 'No records found for March, April, or May 2026', '-', '-', '-', '-']);
      }
      
      (doc as any).autoTable({
        startY: currentY,
        head: [['S.No', 'Date (DD/MM/YYYY)', 'Group Name', 'In Time', 'Out Time', 'Duration']],
        body: tableBody,
        headStyles: { fillColor: [70, 80, 140], textColor: [255, 255, 255] },
        theme: 'striped',
        styles: { fontSize: 8.5, cellPadding: 2, valign: 'middle' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 35, halign: 'center' },
          2: { cellWidth: 35, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 30, halign: 'center' }
        }
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 8;
    }
    
    // Footer with page formatting on each sheet
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, 196, 287, { align: 'right' });
      doc.text("SKRM Security Attendance Verification System", 14, 287);
    }
    
    const buffer = doc.output('arraybuffer');
    fs.writeFileSync('March_April_May_Attendance_Report.pdf', Buffer.from(buffer));
    console.log("PDF Report compiled matches criteria perfectly: March_April_May_Attendance_Report.pdf");
  } catch (error) {
    console.error("Failed to generate PDF Report:", error);
  } finally {
    process.exit(0);
  }
}

runPDFGeneration();
