import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

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

// Name normalization matching the main app
function normalizeName(name: string): string {
  if (!name) return "";
  let n = name.toUpperCase().trim();
  n = n.replace(/\s*[Jj][Ii]$/g, '');
  n = n.replace(/\s+JI\b/g, '');
  n = n.replace(/^DR\s+/g, '');
  n = n.replace(/^MR\s+/g, '');
  n = n.replace(/[^A-Z]/g, '');
  return n;
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

const TARGET_LIST = [
  { name: "SUNIL KUMAR JI", home: "Monday", group2: "Wednesday" },
  { name: "DINESH SALGOTRA JI", home: "Monday", group2: "Wednesday" },
  { name: "ASHWANI NARANG JI", home: "Monday", group2: "Wednesday" },
  { name: "PAWAN JI", home: "Monday", group2: "Wednesday" },
  { name: "NARESH SAINI JI", home: "Monday", group2: "Wednesday" },
  { name: "RAJ KOHLI JI", home: "Monday", group2: "Wednesday" },
  { name: "MANMOHAN KHURANA JI", home: "Monday", group2: "Tuesday" },
  
  { name: "D.L.KAPOOR JI", home: "Tuesday", group2: "Multiple" },
  { name: "S.N.OJHA JI", home: "Tuesday", group2: "None" },
  { name: "PREM KALUCHA JI", home: "Tuesday", group2: "Multiple" },
  { name: "NAVEEN GUPTA JI", home: "Tuesday", group2: "Multiple" },
  { name: "SUKHDEV SINGH JI", home: "Tuesday", group2: "Multiple" },
  { name: "ASHOK KUMAR JI", home: "Tuesday", group2: "Multiple" },
  { name: "R.V.SHASTRI JI", home: "Tuesday", group2: "None" },
  { name: "PUNEET KUMAR JI", home: "Tuesday", group2: "None" },
  { name: "PRINCE JI", home: "Tuesday", group2: "Multiple" },
  { name: "AMAN SHARMA JI", home: "Tuesday", group2: "Multiple" },

  { name: "ARUN JI", home: "Wednesday", group2: "Monday" },
  { name: "RAJESH NAYAK JI", home: "Wednesday", group2: "Monday" },
  { name: "MEVA RAM JI", home: "Wednesday", group2: "Monday" },
  { name: "RAVI SHASTRI JI", home: "Wednesday", group2: "Tuesday" },
  { name: "MAHENDER PUNIYANI JI {SONU}", home: "Wednesday", group2: "Monday" },
  { name: "SHIV RAM JI", home: "Wednesday", group2: "Friday" },

  { name: "NAVEEN GUPTA JI", home: "Thursday", group2: "Multiple" },
  { name: "HARI PRAKASH JI", home: "Thursday", group2: "Multiple" },
  { name: "GULSHAN GABA JI", home: "Thursday", group2: "None" },
  { name: "GURDAS KALUCHA JI", home: "Thursday", group2: "None" },
  { name: "PREM KALUCHA JI", home: "Thursday", group2: "Multiple" },
  { name: "SUKHDEV SINGH JI", home: "Thursday", group2: "Multiple" },

  { name: "BHOLA SHANKAR JI", home: "Friday", group2: "Tuesday" },
  { name: "H.C.BAJAJ JI", home: "Friday", group2: "Tuesday" },
  { name: "RAVI TYAGI JI", home: "Friday", group2: "Tuesday" },
  { name: "DAVENDER KUMAR JI", home: "Friday", group2: "Tuesday" },
  { name: "KRISHAN KUMAR JI", home: "Friday", group2: "Tuesday" },
  { name: "VIJENDER SOLANKI JI", home: "Friday", group2: "Tuesday" },
  { name: "RAJINDER MALIK JI", home: "Friday", group2: "Tuesday" },
  { name: "RAJU SAINI JI", home: "Friday", group2: "Tuesday" },

  { name: "DEVKI NANDAN JI", home: "Saturday", group2: "Tuesday" },

  { name: "HEMANT JI", home: "Sunday", group2: "Tuesday" },
  { name: "MIRAS JI", home: "Sunday", group2: "Tuesday" },
  { name: "S.L. AHUJA JI", home: "Sunday", group2: "Tuesday" },
  { name: "PRINCE JI", home: "Sunday", group2: "Tuesday" },
  { name: "RAJNISH JI", home: "Sunday", group2: "Tuesday" },
  { name: "CHAMAN LAL JI", home: "Sunday", group2: "Tuesday" },
  { name: "YOGESH MADAAN JI", home: "Sunday", group2: "Tuesday" }
];

async function run() {
  console.log("Fetching attendance data...");
  const q = query(collection(db, 'attendance'), where('gender', '==', 'Gents'));
  const snapshot = await getDocs(q);
  const records = snapshot.docs.map(doc => doc.data() as any);
  
  // Exclude "Global" group if any
  const filteredRecords = records.filter(r => r.group && r.group !== 'Global');

  // Let's index attendance per normalized name
  const statsByName: Record<string, Record<string, { days: Set<string>, mins: number }>> = {};

  filteredRecords.forEach(r => {
    const rawName = (r.name || r.sewadarName || "").trim();
    const norm = normalizeName(rawName);
    if (!norm) return;

    let dateVal = r.date;
    if (dateVal && typeof dateVal !== 'string' && (dateVal as Timestamp).toDate) {
      dateVal = (dateVal as Timestamp).toDate().toISOString().split('T')[0];
    }
    const dateStr = String(dateVal || 'Unknown Date');
    const mins = calculateMinutes(r.in_time, r.out_time);
    const group = r.group;

    if (!statsByName[norm]) {
      statsByName[norm] = {};
    }
    if (!statsByName[norm][group]) {
      statsByName[norm][group] = { days: new Set(), mins: 0 };
    }
    statsByName[norm][group].days.add(dateStr);
    statsByName[norm][group].mins += mins;
  });

  console.log("Compiling crossover report...");

  const results = TARGET_LIST.map((target, idx) => {
    const norm = normalizeName(target.name);
    const userGroups = statsByName[norm] || {};
    
    // Sort groups by attendance days to present them cleanly
    const attendedInfo = Object.entries(userGroups)
      .map(([g, info]) => {
        const days = info.days.size;
        const hrs = Math.round(info.mins / 60);
        return { group: g, days, hrs };
      })
      .filter(item => item.days > 0)
      .sort((a, b) => b.days - a.days);

    const totalGroups = attendedInfo.length;
    
    // Build breakdown string
    // e.g. "TUESDAY 31 DAYS (443 HOURS), MONDAY 9 DAYS (71 HOURS)"
    const breakdown = attendedInfo.map(item => `${item.group.toUpperCase()} ${item.days} DAYS (${item.hrs} HOURS)`).join(', ');

    return {
      sNo: idx + 1,
      group1: target.home.toUpperCase(),
      name: target.name,
      group2: target.group2.toUpperCase(),
      noOfGroups: totalGroups,
      breakdown: breakdown || "NO DUTY RECORDS IN DATABASE YET"
    };
  });

  // Print as a markdown table
  console.log("\n## MULTIPLE GROUP SEWADAR ATTENDANCE REPORT\n");
  console.log("| S. NO. | 1ST GROUP NAME | SEWADAR NAME | 2ND GROUP NAME | NO OF GROUP | SEWA BREAKDOWN (ALL HISTORICAL DATA) |");
  console.log("|---|---|---|---|---|---|");
  results.forEach(r => {
    console.log(`| ${r.sNo} | ${r.group1} | ${r.name} | ${r.group2} | ${r.noOfGroups > 0 ? r.noOfGroups : ''} | ${r.breakdown} |`);
  });
}

run().catch(err => {
  console.error("Error executing report:", err);
});
