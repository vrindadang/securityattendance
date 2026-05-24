
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

async function findOjha() {
  const snapshot = await getDocs(collection(db, 'attendance'));
  const matches = snapshot.docs.filter(d => d.data().name?.toUpperCase().includes("OJHA"));
  console.log("Ojha matches:");
  matches.forEach(m => console.log(`- ${m.data().name} (${m.data().group})`));
}

findOjha().then(() => process.exit(0));
