import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { INITIAL_SEWADARS } from './constants';

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

async function checkGentsFridayDetails() {
  const start = Timestamp.fromDate(new Date(2026, 3, 1, 0, 0, 0));
  const end = Timestamp.fromDate(new Date(2026, 4, 31, 23, 59, 59));
  
  const attQ = query(collection(db, 'attendance'), where('date', '>=', start), where('date', '<=', end));
  const attSnap = await getDocs(attQ);
  const rawAttendance = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

  const idLookup = new Map();
  const nameLookup = new Map();
  INITIAL_SEWADARS.forEach(s => {
    idLookup.set(s.id, s);
    const norm = normalizeName(s.name);
    if (!nameLookup.has(norm)) nameLookup.set(norm, s);
  });

  const fridayMismatches: any[] = [];

  rawAttendance.forEach(r => {
    if (r.gender !== 'Gents') return;
    
    let dVal = r.date;
    if (dVal && dVal.toDate) dVal = dVal.toDate();
    else if (dVal && dVal.seconds) dVal = new Date(dVal.seconds * 1000);
    else return;

    if (dVal.getDay() === 5) { // actual Friday
      const rawGroup = r.group || '';
      const name = r.name || r.sewadarName || '';
      const sId = r.sewadarId || r.sewadar_id || '';
      const normName = normalizeName(name);

      let matchedSewadar = sId ? idLookup.get(String(sId)) : null;
      if (!matchedSewadar) matchedSewadar = nameLookup.get(normName);

      if (matchedSewadar) {
        if (matchedSewadar.group !== 'Friday') {
          fridayMismatches.push({
            name,
            matchedGroup: matchedSewadar.group,
            recordGroup: rawGroup,
            date: dVal.toISOString().split('T')[0],
            location: r.workshop_location || 'Kirpal Bagh'
          });
        }
      } else {
        fridayMismatches.push({
          name,
          matchedGroup: 'None',
          recordGroup: rawGroup,
          date: dVal.toISOString().split('T')[0],
          location: r.workshop_location || 'Kirpal Bagh'
        });
      }
    }
  });

  console.log(`Total mismatch/none records on Fridays: ${fridayMismatches.length}`);
  console.log("Sample mismatch/none records on Fridays:", fridayMismatches.slice(0, 10));
}

checkGentsFridayDetails().then(() => process.exit(0));
