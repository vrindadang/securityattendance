
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

/**
 * Normalization function to ensure robust matching across variations.
 * Merges "D.L. Kapoor", "DL Kapoor JI", etc.
 */
function normalizeName(name: string): string {
  if (!name) return "";
  let n = name.toUpperCase().trim();
  // Remove " JI" suffix (case insensitive here since we uppered it)
  n = n.replace(/\s+JI$/g, '');
  // Remove common titles
  n = n.replace(/^DR\s+/g, '');
  n = n.replace(/^MR\s+/g, '');
  // Remove all non-alphabetical characters (dots, spaces, brackets)
  n = n.replace(/[^A-Z]/g, '');
  return n;
}

/**
 * Specifically removes "Ji" or "JI" from display names
 */
function stripJi(name: string): string {
  if (!name) return "";
  // Handles "Name Ji", "Name JI", "NameJi" at the end of string
  return name.replace(/\s*[Jj][Ii]\b/g, '').trim();
}

// Whitelist of names provided by the user
const whitelistedNamesRaw = [
  "SUNIL KUMAR JI", "DINESH SALGOTRA JI", "ASHWANI NARANG JI", "PAWAN JI", "RAJ KOHLI JI",
  "MANMOHAN KHURANA JI", "D.L.KAPOOR JI", "S.N.OJHA JI", "PREM KALUCHA JI", "SUKHDEV SINGH JI",
  "ASHOK KUMAR JI", "R.V.SHASTRI JI", "PUNEET KUMAR JI", "PRINCE JI", "AMAN SHARMA JI",
  "ARUN JI", "RAJESH NAYAK JI", "MEVA RAM JI", "RAVI SHASTRI JI", "MAHENDER PUNIYANI JI [SONU]",
  "SHIV RAM JI", "NAVEEN GUPTA JI", "HARI PRAKASH JI", "GULSHAN GABA JI", "GURDAS KALUCHA JI",
  "BHOLA SHANKAR JI", "H.C.BAJAJ JI", "RAVI TYAGI JI", "DAVENDER KUMAR JI", "KRISHAN KUMAR JI",
  "VIJENDER SOLANKI JI", "RAJINDER MALIK JI", "RAJU SAINI JI", "DEVKI NANDAN JI", "HEMANT JI",
  "MIRAS JI", "RAJNISH JI", "CHAMAN LAL JI", "YOGESH MADAAN JI"
];

const whitelistedNorms = new Set(whitelistedNamesRaw.map(normalizeName));

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
    
    console.log(`Analyzing ${allRecords.length} records for targeted list (cleaning 'Ji' from names)...`);

    // Only include day-groups (ignore Global)
    const validGroupRecords = allRecords.filter((r: any) => r.group && r.group !== 'Global');
    
    interface GroupStats {
      days: Set<string>;
      totalMinutes: number;
    }
    
    const sewadarData: Record<string, Record<string, GroupStats>> = {};
    const sewadarOverallDates: Record<string, Set<string>> = {};
    const sewadarDisplayNames: Record<string, string> = {}; 
    
    validGroupRecords.forEach((r: any) => {
      const rawName = (r.name || 'Unknown').trim();
      const normName = normalizeName(rawName);
      
      // Mandatory Whitelist Filter
      if (!whitelistedNorms.has(normName)) return;

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
        
        // Determine initial display name from whitelist or raw data
        const userProvided = whitelistedNamesRaw.find(un => normalizeName(un) === normName);
        let finalDisplayName = userProvided || rawName;
        
        // REMOVE "JI" FROM DISPLAY NAME
        sewadarDisplayNames[normName] = stripJi(finalDisplayName);
      }
      if (!sewadarData[normName][group]) {
        sewadarData[normName][group] = {
          days: new Set(),
          totalMinutes: 0
        };
      }
      
      sewadarData[normName][group].days.add(dateStr);
      sewadarData[normName][group].totalMinutes += minutes;
      sewadarOverallDates[normName].add(dateStr);
    });
    
    const finalData = Object.entries(sewadarData)
      .map(([normName, groups]) => {
        const groupCount = Object.keys(groups).length;
        const totalUniqueDays = sewadarOverallDates[normName].size;
        const totalOverallMinutes = Object.values(groups).reduce((acc, curr) => acc + curr.totalMinutes, 0);
        
        const groupBreakdown = Object.entries(groups).map(([groupName, stats]) => {
          return {
            name: groupName,
            days: stats.days.size,
            hours: formatMinutes(stats.totalMinutes),
            minutes: stats.totalMinutes
          };
        }).sort((a, b) => b.days - a.days || b.minutes - a.minutes);

        return {
          displayName: sewadarDisplayNames[normName],
          groupCount,
          totalDays: totalUniqueDays,
          totalHours: formatMinutes(totalOverallMinutes),
          breakdown: groupBreakdown
        };
      })
      .sort((a, b) => b.groupCount - a.groupCount || a.displayName.localeCompare(b.displayName));

    const doc = new jsPDF('p', 'mm', 'a4');
    let currentY = 15;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const introText = `With the blessings of H.H. Sant Rajinder Singh Ji Maharaj, Targeted Gents Security Group Attendance Analysis Report (Names Cleaned).`;
    doc.text(introText, 14, currentY);

    currentY += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(50, 60, 120);
    doc.text("Multiple Group Attendance Report (Filtered)", 14, currentY);
    
    currentY += 7;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Restricted to specific sewadars as requested (merging name variations and removing 'Ji').", 14, currentY);
    
    currentY += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(14, currentY, 196, currentY);

    currentY += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Filtered Analysis Summary", 14, currentY);
    
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Identified sewadars from targeted list: ${finalData.length}`, 14, currentY);
    currentY += 5;
    doc.text(`Report Period: Full Project History to ${new Date().toLocaleString('en-GB')}`, 14, currentY);

    const tableData = finalData.map((s, index) => {
      const breakdownText = s.breakdown.map(b => 
        `${b.name}: ${b.days} days (${b.hours})`
      ).join('\n');
      
      return [
        (index + 1).toString(),
        s.displayName, 
        s.groupCount.toString(), 
        breakdownText,
        `${s.totalDays} Days\n(${s.totalHours})`
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
    
    console.log("PDF Report updated (removed 'Ji'): Multiple_Group_Attendance_Report.pdf");
  } catch (error) {
    console.error("Error generating PDF:", error);
  } finally {
    process.exit(0);
  }
}

generateReport();
