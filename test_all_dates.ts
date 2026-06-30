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

async function checkAllDocDates() {
  const snapshot = await getDocs(collection(db, 'attendance'));
  console.log(`Total documents in attendance collection: ${snapshot.docs.length}`);

  let timestampCount = 0;
  let stringCount = 0;
  let otherCount = 0;
  const stringFormats = new Set<string>();

  snapshot.docs.forEach(doc => {
    const data = doc.data() as any;
    const dateVal = data.date;
    if (dateVal === undefined || dateVal === null) {
      otherCount++;
    } else if (typeof dateVal === 'string') {
      stringCount++;
      stringFormats.add(dateVal);
    } else if (dateVal.toDate) {
      timestampCount++;
    } else {
      otherCount++;
    }
  });

  console.log(`Timestamps: ${timestampCount}`);
  console.log(`Strings: ${stringCount}`);
  console.log(`Others: ${otherCount}`);
  if (stringCount > 0) {
    console.log("Sample string formats:", Array.from(stringFormats).slice(0, 10));
  }
}

checkAllDocDates().then(() => process.exit(0));
