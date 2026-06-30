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

async function run() {
  const attSnap = await getDocs(collection(db, 'attendance'));
  console.log("Total attendance docs:", attSnap.docs.length);
  
  const allKeys = new Set<string>();
  const statuses = new Set<any>();
  let countWithFinalized = 0;
  let countWithStatus = 0;
  
  attSnap.docs.slice(0, 100).forEach(d => {
    const data = d.data();
    Object.keys(data).forEach(k => allKeys.add(k));
    if ('finalized' in data) countWithFinalized++;
    if ('status' in data) {
      countWithStatus++;
      statuses.add(data.status);
    }
  });
  
  console.log("Keys found in first 100 docs:", Array.from(allKeys));
  console.log("Docs with 'finalized':", countWithFinalized);
  console.log("Docs with 'status':", countWithStatus);
  console.log("Unique statuses:", Array.from(statuses));
  
  // Let's also check daily_settings
  const settingsSnap = await getDocs(collection(db, 'daily_settings'));
  console.log("Total daily_settings docs:", settingsSnap.docs.length);
  if (settingsSnap.docs.length > 0) {
    console.log("Sample daily_settings data:", settingsSnap.docs[0].data());
    const keys = new Set<string>();
    settingsSnap.docs.forEach(d => {
      Object.keys(d.data()).forEach(k => keys.add(k));
    });
    console.log("All daily_settings keys:", Array.from(keys));
  }
}

run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
