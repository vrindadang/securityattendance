
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

async function listMonday() {
  const q = query(collection(db, 'attendance'), where('group', '==', 'Monday'));
  const snap = await getDocs(q);
  const names = Array.from(new Set(snap.docs.map(d => d.data().name)));
  console.log("Names in Monday group:");
  names.sort().forEach(n => console.log(`- ${n}`));
}

listMonday().then(() => process.exit(0));
