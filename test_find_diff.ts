import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { INITIAL_SEWADARS } from './constants';

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

function normalizeName(name: string): string {
  if (!name) return "";
  let n = name.toUpperCase().trim();
  n = n.replace(/\s+JI$/g, '');
  n = n.replace(/^DR\s+/g, '');
  n = n.replace(/^MR\s+/g, '');
  n = n.replace(/[^A-Z]/g, '');
  return n;
}

async function findDiff() {
  const start = Timestamp.fromDate(new Date(2026, 3, 1, 0, 0, 0));
  const end = Timestamp.fromDate(new Date(2026, 4, 31, 23, 59, 59));
  
  const attQ = query(collection(db, 'attendance'), where('date', '>=', start), where('date', '<=', end));
  const attSnap = await getDocs(attQ);
  const rawAttendance = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

  const customSnapshot = await getDocs(collection(db, 'custom_sewadars'));
  const customSewadars = customSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as any);

  const mergedRoster = [...INITIAL_SEWADARS];
  customSewadars.forEach(cs => {
    if (!mergedRoster.some(r => r.id === String(cs.id))) {
      mergedRoster.push({
        id: String(cs.id),
        name: cs.name,
        gender: cs.gender,
        group: cs.group,
        isCustom: true
      } as any);
    }
  });

  const idLookup = new Map();
  const nameLookup = new Map();
  mergedRoster.forEach(s => {
    idLookup.set(s.id, s);
    const norm = normalizeName(s.name);
    if (!nameLookup.has(norm)) nameLookup.set(norm, s);
  });

  let countMappedToFridayGents = 0;
  const skippedMatchedGents: any[] = [];

  rawAttendance.forEach(r => {
    const sId = r.sewadarId || r.sewadar_id || '';
    const name = r.name || r.sewadarName || '';
    const normName = normalizeName(name);
    const gender = r.gender || 'Gents';

    let matchedSewadar = sId ? idLookup.get(String(sId)) : null;
    if (!matchedSewadar) matchedSewadar = nameLookup.get(normName);

    let mappedGroup = '';
    if (matchedSewadar) {
      if (matchedSewadar.gender === 'Gents') {
        mappedGroup = `${matchedSewadar.group} Gents`;
      }
    } else if (gender === 'Gents') {
      const day = r.group ? r.group.replace(` Gents`, '').replace('Ladies-', '').trim() : '';
      mappedGroup = `${day} Gents`;
    }

    if (mappedGroup === 'Friday Gents') {
      countMappedToFridayGents++;
    } else {
      // Check if this sewadar is actually in Friday Gents roster but got mapped elsewhere
      if (matchedSewadar && matchedSewadar.group === 'Friday' && matchedSewadar.gender === 'Gents') {
        skippedMatchedGents.push({ r, mappedGroup, matchedSewadar });
      }
    }
  });

  console.log(`countMappedToFridayGents: ${countMappedToFridayGents}`);
  console.log(`skippedMatchedGents: ${skippedMatchedGents.length}`);
  if (skippedMatchedGents.length > 0) {
    console.log("Sample skipped:", skippedMatchedGents.slice(0, 5));
  }
}

findDiff().then(() => process.exit(0));
