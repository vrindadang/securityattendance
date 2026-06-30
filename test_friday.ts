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

async function checkFriday() {
  const start = Timestamp.fromDate(new Date(2026, 3, 1, 0, 0, 0)); // April 1, 2026
  const end = Timestamp.fromDate(new Date(2026, 4, 31, 23, 59, 59)); // May 31, 2026

  const q = query(
    collection(db, 'attendance'),
    where('date', '>=', start),
    where('date', '<=', end)
  );
  const snap = await getDocs(q);
  const rawAttendance = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

  console.log(`Total April-May records: ${rawAttendance.length}`);

  // Let's analyze where Friday Gents records are
  const locDistribution = new Map();
  const dateDistribution = new Map();

  rawAttendance.forEach((r: any) => {
    const rawGroup = r.group || '';
    const gender = r.gender || 'Gents';
    const loc = r.workshop_location || 'Kirpal Bagh';
    
    if ((rawGroup === 'Friday' || rawGroup === 'Friday Gents') && gender === 'Gents') {
      locDistribution.set(loc, (locDistribution.get(loc) || 0) + 1);
      
      let dateValue = r.date;
      if (dateValue && typeof dateValue !== 'string' && dateValue.toDate) {
        dateValue = dateValue.toDate().toISOString().split('T')[0];
      }
      dateDistribution.set(dateValue, (dateDistribution.get(dateValue) || 0) + 1);
    }
  });

  console.log("Friday Gents location distribution:", Object.fromEntries(locDistribution));
  console.log("Friday Gents date distribution:", Object.fromEntries(dateDistribution));
}

checkFriday().then(() => process.exit(0));
