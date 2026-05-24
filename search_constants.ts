
import { readFileSync } from 'fs';

const content = readFileSync('constants.ts', 'utf8');

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

console.log("Checking constants.ts for matching occurrences of the 33 names:");
removeList.forEach(name => {
  const norm = normalizeName(name);
  const regex = new RegExp(`"[^"]*${norm.split('').join('.*')}[^"]*"`, 'gi');
  const matches = content.match(regex);
  if (matches) {
    console.log(`- "${name}" matched:`, matches);
  } else {
    // try standard substring search
    const cleanWord = name.replace(/\s+/g, '');
    if (content.toLowerCase().includes(name.toLowerCase())) {
      console.log(`- "${name}" found by simple substring`);
    } else {
      console.log(`- "${name}" NOT found in constants.ts`);
    }
  }
});
