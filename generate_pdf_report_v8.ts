
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
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
  // Convert to uppercase, trim spaces, and remove " JI" suffix
  let normalized = name.toUpperCase().trim();
  if (normalized.endsWith(" JI")) {
    normalized = normalized.substring(0, normalized.length - 3).trim();
  }
  // Remove brackets and content inside them (e.g. "[SONU]")
  normalized = normalized.replace(/\[.*?\]/g, '').trim();
  // Remove extra spaces
  normalized = normalized.replace(/\s+/g, ' ');
  return normalized;
}

function calculateMinutes(inTime?: string, outTime?: string): number {
  if (!inTime || !outTime) return 0;
  try {
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;
    let diff = (outH * 60 + outM) - (inH * 60 + inM);
    if (diff < 0) diff += 24 * 60;
    return diff;
  } catch { return 0; }
}

function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

async function generateReport() {
  try {
    console.log("Fetching historical records for Gents...");
    const q = query(collection(db, 'attendance'), where('gender', '==', 'Gents'));
    const snapshot = await getDocs(q);
    const allRecords = snapshot.docs.map(doc => doc.data());
    
    console.log(`Processing ${allRecords.length} total records...`);

    // Filter out 'Global' entries
    const records = allRecords.filter((r: any) => r.group && r.group !== 'Global');
    
    interface GroupStats {
      days: Set<string>;
      totalMinutes: number;
      originalNames: Set<string>;
    }
    
    const sewadarData: Record<string, Record<string, GroupStats>> = {};
    const sewadarOverallDates: Record<string, Set<string>> = {};
    const sewadarDisplayName: Record<string, string> = {}; // Keep the most common or professional looking name
    
    records.forEach((r: any) => {
      const rawName = r.name || 'Unknown';
      const normName = normalizeName(rawName);
      const group = r.group;
      
      let dateValue = r.date;
      if (dateValue && typeof dateValue !== 'string' && (dateValue as Timestamp).toDate) {
        dateValue = (dateValue as Timestamp).toDate().toISOString().split('T')[0];
      }
      const dateStr = String(dateValue || 'Unknown Date');
      const minutes = calculateMinutes(r.in_time, r.out_time);
      
      if (!sewadarData[normName]) {
        sewadarData[normName] = {};
        sewadarOverallDates[normName] = new Set();
        sewadarDisplayName[normName] = rawName;
      }
      if (!sewadarData[normName][group]) {
        sewadarData[normName][group] = {
          days: new Set(),
          totalMinutes: 0,
          originalNames: new Set()
        };
      }
      
      sewadarData[normName][group].days.add(dateStr);
      sewadarData[normName][group].totalMinutes += minutes;
      sewadarData[normName][group].originalNames.add(rawName);
      sewadarOverallDates[normName].add(dateStr);
    });
    
    const multiple = Object.entries(sewadarData)
      .filter(([normName, groups]) => Object.keys(groups).length > 1)
      .map(([normName, groups]) => {
        const groupBreakdown = Object.entries(groups).map(([groupName, stats]) => {
          return {
            name: groupName,
            days: stats.days.size,
            hours: formatMinutes(stats.totalMinutes)
          };
        }).sort((a, b) => b.days - a.days);
        
        const totalUniqueGroups = Object.keys(groups).length;
        const totalOverallMinutes = Object.values(groups).reduce((acc, curr) => acc + curr.totalMinutes, 0);
        const totalUniqueDays = sewadarOverallDates[normName].size;
        
        return {
          displayName: sewadarDisplayName[normName],
          normName: normName,
          groupCount: totalUniqueGroups,
          overallSummary: `${totalUniqueDays} Days\n(${formatMinutes(totalOverallMinutes)})`,
          breakdown: groupBreakdown
        };
      })
      .sort((a, b) => b.groupCount - a.groupCount || b.displayName.localeCompare(a.displayName));

    const doc = new jsPDF('p', 'mm', 'a4');
    let currentY = 15;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const introText = `With the blessings of H.H. Sant Rajinder Singh Ji Maharaj, Gents Security Group presents the Historical Multi-Group Attendance Analysis Report.`;
    doc.text(introText, 14, currentY);

    currentY += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(50, 60, 120);
    doc.text("Historical Multiple Group Attendance Report", 14, currentY);
    
    currentY += 7;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Consolidated breakdown of volunteering days and sewa hours from inception to date (names normalized).", 14, currentY);
    
    currentY += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(14, currentY, 196, currentY);

    currentY += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Project History Summary", 14, currentY);
    
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Total multi-group sewadars identified: ${multiple.length}`, 14, currentY);
    currentY += 5;
    doc.text(`Generated on: ${new Date().toLocaleString('en-GB')}`, 14, currentY);

    const tableData = multiple.map((s, index) => {
      const breakdownText = s.breakdown.map(b => 
        `${b.name}: ${b.days} days (${b.hours})`
      ).join('\n');
      
      return [
        (index + 1).toString(),
        s.displayName, 
        s.groupCount.toString(), 
        breakdownText,
        s.overallSummary
      ];
    });
    
    (doc as any).autoTable({
      startY: currentY + 10,
      head: [['S.No', 'Sewadar Name', 'Groups', 'Detailed Breakdown (Group: Days & Hours)', 'Total Days & Hours']],
      body: tableData,
      headStyles: { fillColor: [50, 60, 120], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 248, 252] },
      margin: { left: 14, right: 14 },
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, valign: 'middle', overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 35, fontStyle: 'bold' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 30, halign: 'center' }
      }
    });

    const pdfBuffer = doc.output('arraybuffer');
    fs.writeFileSync('Multiple_Group_Attendance_Report.pdf', Buffer.from(pdfBuffer));
    
    console.log("PDF Report updated with full historical data and name normalization: Multiple_Group_Attendance_Report.pdf");
  } catch (error) {
    console.error("Error generating PDF:", error);
  } finally {
    process.exit(0);
  }
}

generateReport();
