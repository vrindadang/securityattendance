
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

async function testSessionCounting() {
  const q = query(collection(db, 'attendance'), where('gender', '==', 'Gents'));
  const snap = await getDocs(q);
  const records = snap.docs.map(d => d.data());
  
  const groupActiveDates: Record<string, Set<string>> = {};
  
  records.forEach((r: any) => {
    const group = r.group;
    if (!group || group === 'Global') return;
    
    let dateValue = r.date;
    if (dateValue && typeof dateValue !== 'string' && (dateValue as any).toDate) {
      dateValue = (dateValue as any).toDate().toISOString().split('T')[0];
    }
    const dateStr = String(dateValue || 'Unknown Date');
    
    if (!groupActiveDates[group]) {
      groupActiveDates[group] = new Set();
    }
    groupActiveDates[group].add(dateStr);
  });
  
  console.log("--- Unique Active Days Per Group ---");
  Object.entries(groupActiveDates).forEach(([group, dates]) => {
    console.log(`${group}: ${dates.size} sessions/days`);
  });
}

testSessionCounting().then(() => process.exit(0));
