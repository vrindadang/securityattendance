
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

const userNames = [
  "SUNIL KUMAR JI", "DINESH SALGOTRA JI", "ASHWANI NARANG JI", "PAWAN JI", "RAJ KOHLI JI",
  "MANMOHAN KHURANA JI", "D.L.KAPOOR JI", "S.N.OJHA JI", "PREM KALUCHA JI", "SUKHDEV SINGH JI",
  "ASHOK KUMAR JI", "R.V.SHASTRI JI", "PUNEET KUMAR JI", "PRINCE JI", "AMAN SHARMA JI",
  "ARUN JI", "RAJESH NAYAK JI", "MEVA RAM JI", "RAVI SHASTRI JI", "MAHENDER PUNIYANI JI [SONU]",
  "SHIV RAM JI", "NAVEEN GUPTA JI", "HARI PRAKASH JI", "GULSHAN GABA JI", "GURDAS KALUCHA JI",
  "BHOLA SHANKAR JI", "H.C.BAJAJ JI", "RAVI TYAGI JI", "DAVENDER KUMAR JI", "KRISHAN KUMAR JI",
  "VIJENDER SOLANKI JI", "RAJINDER MALIK JI", "RAJU SAINI JI", "DEVKI NANDAN JI", "HEMANT JI",
  "MIRAS JI", "RAJNISH JI", "CHAMAN LAL JI", "YOGESH MADAAN JI"
];

function normalizeName(name: string): string {
  if (!name) return "";
  let normalized = name.toUpperCase().trim();
  if (normalized.endsWith(" JI")) normalized = normalized.substring(0, normalized.length - 3).trim();
  normalized = normalized.replace(/\[.*?\]/g, '').trim();
  normalized = normalized.replace(/\s+/g, ' ');
  return normalized;
}

async function checkNames() {
  const q = query(collection(db, 'attendance'), where('gender', '==', 'Gents'));
  const snapshot = await getDocs(q);
  const records = snapshot.docs.map(doc => doc.data());
  const validRecords = records.filter((r: any) => r.group && r.group !== 'Global');

  const sewadarData: Record<string, Set<string>> = {};
  validRecords.forEach((r: any) => {
    const norm = normalizeName(r.name);
    if (!sewadarData[norm]) sewadarData[norm] = new Set();
    sewadarData[norm].add(r.group);
  });

  console.log("--- Check Results for User List ---");
  userNames.forEach(un => {
    const norm = normalizeName(un);
    const groups = sewadarData[norm];
    if (groups) {
      if (groups.size > 1) {
        console.log(`[FOUND - MULTI] ${un}: Found in groups ${Array.from(groups).join(", ")}`);
      } else {
        console.log(`[FOUND - SINGLE] ${un}: Only found in group ${Array.from(groups)[0]}`);
      }
    } else {
      console.log(`[NOT FOUND] ${un}`);
    }
  });
}

checkNames().then(() => process.exit(0));
