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

async function checkAllGentsFridays() {
  const start = Timestamp.fromDate(new Date(2026, 3, 1, 0, 0, 0));
  const end = Timestamp.fromDate(new Date(2026, 4, 31, 23, 59, 59));
  
  const attQ = query(collection(db, 'attendance'), where('date', '>=', start), where('date', '<=', end));
  const attSnap = await getDocs(attQ);
  const rawAttendance = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

  const gentsFridaysGroupDist = new Map();
  const gentsFridaysDateDist = new Map();

  rawAttendance.forEach(r => {
    if (r.gender !== 'Gents') return;
    
    let dVal = r.date;
    if (dVal && dVal.toDate) dVal = dVal.toDate();
    else if (dVal && dVal.seconds) dVal = new Date(dVal.seconds * 1000);
    else return;

    const dayOfWeek = dVal.getDay(); // 0 = Sunday, 5 = Friday
    if (dayOfWeek === 5) {
      // It is a Friday!
      const gp = r.group || 'None';
      const dStr = dVal.toISOString().split('T')[0];
      gentsFridaysGroupDist.set(gp, (gentsFridaysGroupDist.get(gp) || 0) + 1);
      gentsFridaysDateDist.set(dStr, (gentsFridaysDateDist.get(dStr) || 0) + 1);
    }
  });

  console.log("All Gents Friday dates and counts (on actual Fridays):", Object.fromEntries(gentsFridaysDateDist));
  console.log("All Gents groups serving on actual Fridays:", Object.fromEntries(gentsFridaysGroupDist));
}

checkAllGentsFridays().then(() => process.exit(0));
