
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

const removeList = [
  "Ajun Bhala", "Amar Div Singh", "Bhim Singh", "Bihan Singh", "Dashrath Singh",
  "Dolat Singh", "Harpal Singh", "Hemant", "Lal Babu Yadav", "Lala Babu Yadav",
  "Lala Ram", "Maanchand Ji", "Madan Lal", "Mannu Singh", "Naveen Kumar",
  "Nirmal Kumar Singh", "Jitendra Kumar", "Pawan Sharma", "Prem Saluja",
  "Raghunath Singh", "Rahul Talwar", "Raj Pal", "Rajan Arora", "Rajan Kumar",
  "Rajinder Kumar", "Ram Kumar", "Rohit Kapur", "Santokh Singh", "Sat Pal Singh",
  "Shankar Lal Bhatia", "Surender", "Dilip Singh", "Harbans Lala Batra"
];

function normalizeName(name: string): string {
  if (!name) return "";
  let n = name.toUpperCase().trim();
  n = n.replace(/\s+JI$/g, '');
  n = n.replace(/^DR\s+/g, '');
  n = n.replace(/^MR\s+/g, '');
  n = n.replace(/[^A-Z]/g, '');
  return n;
}

const removeListNorms = new Set(removeList.map(normalizeName));

async function checkSaturdayRecords() {
  const q = query(collection(db, 'attendance'), where('gender', '==', 'Gents'), where('group', '==', 'Saturday'));
  const snap = await getDocs(q);
  const records = snap.docs.map(d => d.data());
  
  console.log(`Total Saturday Gents attendance records: ${records.length}`);
  
  const presentInSaturdays = new Set<string>();
  records.forEach((r: any) => {
    const rawName = r.name || 'Unknown';
    const norm = normalizeName(rawName);
    if (removeListNorms.has(norm)) {
      presentInSaturdays.add(rawName);
    }
  });

  console.log("--- Match Results in Saturday Group ---");
  console.log("Total matched in Saturday database records:", presentInSaturdays.size);
  Array.from(presentInSaturdays).forEach(name => {
    console.log(`- ${name}`);
  });
}

checkSaturdayRecords().then(() => process.exit(0));
