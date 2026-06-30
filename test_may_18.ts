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

async function checkSpecificDate() {
  const q = query(collection(db, 'attendance'), where('group', '==', 'Friday'), where('gender', '==', 'Gents'));
  const snap = await getDocs(q);
  const records = snap.docs.map(doc => doc.data() as any);
  
  records.forEach((r: any) => {
    let dVal = r.date;
    if (dVal && dVal.toDate) dVal = dVal.toDate().toISOString().split('T')[0];
    if (dVal === '2026-05-18') {
      console.log(`May 18 Record: Name: ${r.name}, Loc: ${r.workshop_location}, Time: ${r.in_time}-${r.out_time}`);
    }
  });
}

checkSpecificDate().then(() => process.exit(0));
