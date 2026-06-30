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

const normalizeDateStr = (dateVal: any): string => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    if (dateVal.includes('-')) {
      const parts = dateVal.split('-');
      if (parts[0].length === 4) return dateVal;
      return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
    }
    return dateVal;
  }
  if (dateVal.toDate) {
    try { return dateVal.toDate().toISOString().split('T')[0]; } catch { return ''; }
  }
  if (dateVal.seconds) {
    return new Date(dateVal.seconds * 1000).toISOString().split('T')[0];
  }
  return '';
};

async function computeAveragesLadies() {
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

  const logicalGroups = ['Monday Ladies', 'Tuesday Ladies', 'Wednesday Ladies', 'Thursday Ladies', 'Friday Ladies', 'Saturday Ladies', 'Sunday Ladies'];
  const locationsList = ['Kirpal Bagh', 'Kirpal Ashram', 'Sawan Ashram', 'Sant Darshan Singh Ji Dham'];

  const idLookup = new Map();
  const nameLookup = new Map();
  mergedRoster.forEach(s => {
    idLookup.set(s.id, s);
    const norm = normalizeName(s.name);
    if (!nameLookup.has(norm)) nameLookup.set(norm, s);
  });

  const datesByGroupLocation: Record<string, Record<string, Set<string>>> = {};
  const shiftDistribution: Record<string, Record<string, { morning: number; day: number; evening: number; night: number }>> = {};

  logicalGroups.forEach(g => {
    datesByGroupLocation[g] = {};
    shiftDistribution[g] = {};
    locationsList.forEach(loc => {
      datesByGroupLocation[g][loc] = new Set();
      shiftDistribution[g][loc] = { morning: 0, day: 0, evening: 0, night: 0 };
    });
  });

  rawAttendance.forEach(r => {
    const name = r.name || r.sewadarName || '';
    const sId = r.sewadarId || r.sewadar_id || '';
    const rawGroup = r.group || '';
    const gender = r.gender || 'Gents';

    if (!name) return;
    const normName = normalizeName(name);

    let matchedSewadar = sId ? idLookup.get(String(sId)) : null;
    if (!matchedSewadar) matchedSewadar = nameLookup.get(normName);

    let mappedGroup = '';
    if (matchedSewadar) {
      if (matchedSewadar.gender === 'Ladies') {
        mappedGroup = `${matchedSewadar.group} Ladies`;
      }
    } else if (gender === 'Ladies') {
      const day = rawGroup.replace(` Ladies`, '').replace('Ladies-', '').trim();
      mappedGroup = `${day} Ladies`;
    }

    if (!logicalGroups.includes(mappedGroup)) return;

    const rawDateStr = normalizeDateStr(r.date);
    if (!rawDateStr) return;

    const loc = r.workshop_location || 'Kirpal Bagh';
    if (!locationsList.includes(loc)) return;

    datesByGroupLocation[mappedGroup][loc].add(rawDateStr);

    const inTime = r.in_time || '07:00';
    const [hh] = inTime.split(':').map(Number);
    let shiftKey: 'morning' | 'day' | 'evening' | 'night' = 'morning';
    if (hh >= 7 && hh < 13) shiftKey = 'morning';
    else if (hh >= 13 && hh < 19) shiftKey = 'day';
    else if (hh >= 19 || hh < 2) shiftKey = 'evening';
    else shiftKey = 'night';

    shiftDistribution[mappedGroup][loc][shiftKey]++;
  });

  locationsList.forEach(loc => {
    console.log(`\n=== LOCATION: ${loc} ===`);
    const g = 'Friday Ladies';
    const uniqueDates = datesByGroupLocation[g][loc].size;
    const dist = shiftDistribution[g][loc];
    const avgM = dist.morning / Math.max(uniqueDates, 1);
    const avgD = dist.day / Math.max(uniqueDates, 1);
    const avgE = dist.evening / Math.max(uniqueDates, 1);
    const avgN = dist.night / Math.max(uniqueDates, 1);
    const totalAvg = avgM + avgD + avgE + avgN;
    console.log(`${g} -> Unique active dates: ${uniqueDates}`);
    console.log(`Raw distribution:`, dist);
    console.log(`Averages: Morning: ${avgM.toFixed(1)}, Day: ${avgD.toFixed(1)}, Evening: ${avgE.toFixed(1)}, Night: ${avgN.toFixed(1)}, TotalAvg (Active Manpower): ${totalAvg.toFixed(1)}`);
  });
}

computeAveragesLadies().then(() => process.exit(0));
