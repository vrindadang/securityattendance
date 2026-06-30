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

async function checkFridayRosterAttendance() {
  const fridayGentsRoster = INITIAL_SEWADARS.filter(s => s.group === 'Friday' && s.gender === 'Gents');
  const rosterNames = new Set(fridayGentsRoster.map(s => normalizeName(s.name)));
  const rosterIds = new Set(fridayGentsRoster.map(s => String(s.id)));

  console.log(`Friday Gents Roster Size: ${fridayGentsRoster.length}`);

  const start = Timestamp.fromDate(new Date(2026, 3, 1, 0, 0, 0));
  const end = Timestamp.fromDate(new Date(2026, 4, 31, 23, 59, 59));

  const attQ = query(collection(db, 'attendance'), where('date', '>=', start), where('date', '<=', end));
  const attSnap = await getDocs(attQ);
  const rawAttendance = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

  let matchById = 0;
  let matchByName = 0;

  const matchedRecords: any[] = [];
  const groupsObserved = new Map();
  const locsObserved = new Map();

  rawAttendance.forEach(r => {
    const sId = r.sewadarId || r.sewadar_id || '';
    const name = r.name || r.sewadarName || '';
    const normName = normalizeName(name);

    let isMatch = false;
    if (sId && rosterIds.has(String(sId))) {
      matchById++;
      isMatch = true;
    } else if (normName && rosterNames.has(normName)) {
      matchByName++;
      isMatch = true;
    }

    if (isMatch) {
      matchedRecords.push(r);
      const gp = r.group || 'None';
      const loc = r.workshop_location || 'Kirpal Bagh';
      groupsObserved.set(gp, (groupsObserved.get(gp) || 0) + 1);
      locsObserved.set(loc, (locsObserved.get(loc) || 0) + 1);
    }
  });

  console.log(`Matched by ID: ${matchById}, Matched by Name: ${matchByName}, Total: ${matchedRecords.length}`);
  console.log("Groups of their actual attendance records:", Object.fromEntries(groupsObserved));
  console.log("Locations of their actual attendance records:", Object.fromEntries(locsObserved));
}

checkFridayRosterAttendance().then(() => process.exit(0));
