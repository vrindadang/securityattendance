
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
    console.log("Fetching attendance records for Gents...");
    const q = query(collection(db, 'attendance'), where('gender', '==', 'Gents'));
    const snapshot = await getDocs(q);
    const allRecords = snapshot.docs.map(doc => doc.data());
    
    // Filter out 'Global' entries
    const records = allRecords.filter((r: any) => r.group && r.group !== 'Global');
    
    interface GroupStats {
      days: Set<string>;
      totalMinutes: number;
      recordCount: number;
    }
    
    const sewadarData: Record<string, Record<string, GroupStats>> = {};
    const sewadarOverallDates: Record<string, Set<string>> = {};
    
    records.forEach((r: any) => {
      const name = r.name;
      const group = r.group;
      
      // Use Firestore field names: in_time, out_time, date
      let dateValue = r.date;
      if (dateValue && typeof dateValue !== 'string' && (dateValue as Timestamp).toDate) {
        dateValue = (dateValue as Timestamp).toDate().toISOString().split('T')[0];
      }
      const dateStr = String(dateValue || 'Unknown Date');
      
      const minutes = calculateMinutes(r.in_time, r.out_time);
      
      if (!sewadarData[name]) {
        sewadarData[name] = {};
        sewadarOverallDates[name] = new Set();
      }
      if (!sewadarData[name][group]) {
        sewadarData[name][group] = {
          days: new Set(),
          totalMinutes: 0,
          recordCount: 0
        };
      }
      
      sewadarData[name][group].days.add(dateStr);
      sewadarData[name][group].totalMinutes += minutes;
      sewadarData[name][group].recordCount++;
      sewadarOverallDates[name].add(dateStr);
    });
    
    const multiple = Object.entries(sewadarData)
      .filter(([name, groups]) => Object.keys(groups).length > 1)
      .map(([name, groups]) => {
        const groupBreakdown = Object.entries(groups).map(([groupName, stats]) => {
          return {
            name: groupName,
            days: stats.days.size,
            hours: formatMinutes(stats.totalMinutes),
            totalRecords: stats.recordCount
          };
        }).sort((a, b) => b.days - a.days);
        
        const totalUniqueGroups = Object.keys(groups).length;
        const totalOverallMinutes = Object.values(groups).reduce((acc, curr) => acc + curr.totalMinutes, 0);
        const totalUniqueDays = sewadarOverallDates[name].size;
        
        return {
          name,
          groupCount: totalUniqueGroups,
          overallSummary: `${totalUniqueDays} Days\n(${formatMinutes(totalOverallMinutes)})`,
          breakdown: groupBreakdown
        };
      })
      .sort((a, b) => b.groupCount - a.groupCount);

    const doc = new jsPDF('p', 'mm', 'a4');
    let currentY = 15;

    // Header Intro
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const introText = `With the blessings of H.H. Sant Rajinder Singh Ji Maharaj, Gents Security Group presents the Multi-Group Attendance Analysis Report with Detailed Breakdown.`;
    doc.text(introText, 14, currentY);

    // Title
    currentY += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(50, 60, 120);
    doc.text("Multiple Group Attendance Detailed Report", 14, currentY);
    
    // Subtitle
    currentY += 7;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Analysis of sewadars serving in more than one group, including volunteering days and total sewa hours.", 14, currentY);
    
    // Horizontal Divider
    currentY += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(14, currentY, 196, currentY);

    // Summary section
    currentY += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Report Summary", 14, currentY);
    
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Total multi-group sewadars: ${multiple.length}`, 14, currentY);
    currentY += 5;
    doc.text(`Generated on: ${new Date().toLocaleString('en-GB')}`, 14, currentY);

    // Table
    const tableData = multiple.map((s, index) => {
      const breakdownText = s.breakdown.map(b => 
        `${b.name}: ${b.days} days (${b.hours})`
      ).join('\n');
      
      return [
        (index + 1).toString(),
        s.name, 
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
    
    console.log("PDF Report updated with correct hours and summary: Multiple_Group_Attendance_Report.pdf");
  } catch (error) {
    console.error("Error generating PDF:", error);
  } finally {
    process.exit(0);
  }
}

generateReport();
