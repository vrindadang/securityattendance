
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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

async function findPartial(partial: string) {
  const q = query(collection(db, 'attendance'), where('gender', '==', 'Gents'));
  const snap = await getDocs(q);
  const matches = snap.docs.filter(d => d.data().name?.toUpperCase().includes(partial.toUpperCase()));
  console.log(`Results for ${partial}:`);
  matches.forEach(m => {
    const d = m.data();
    console.log(`- ${d.name} (${d.group}) on ${d.date}`);
  });
}

findPartial("SUNIL KUMAR").then(() => process.exit(0));
