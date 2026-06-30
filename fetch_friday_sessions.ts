import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function run() {
  const snap = await getDocs(collection(db, 'daily_settings'));
  const sessions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

  console.log("Total daily_settings docs:", sessions.length);

  const fridaySessions = sessions.filter(s => {
    let dVal = s.date;
    if (dVal && dVal.toDate) dVal = dVal.toDate();
    else if (dVal && dVal.seconds) dVal = new Date(dVal.seconds * 1000);
    else return false;

    const dayOfWeek = dVal.getDay(); // 5 is Friday
    return dVal.getMonth() >= 3 && dVal.getMonth() <= 4; // April or May
  });

  console.log("Friday sessions in April/May 2026:", fridaySessions.length);
  fridaySessions.forEach(s => {
    let dVal = s.date;
    if (dVal && dVal.toDate) dVal = dVal.toDate();
    else if (dVal && dVal.seconds) dVal = new Date(dVal.seconds * 1000);
    const dStr = dVal.toISOString().split('T')[0];
    console.log(`- ID: ${s.id}, Date: ${dStr}, Group: ${s.group}, Location: ${s.location}, Completed: ${s.completed}`);
  });
}

run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
