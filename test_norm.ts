
function normalizeName(name: string): string {
  if (!name) return "";
  let n = name.toUpperCase();
  // Remove "JI" at the end
  n = n.replace(/\s+JI$/g, '');
  // Remove non-alphanumeric
  n = n.replace(/[^A-Z0-9]/g, '');
  return n;
}

const testNames = ["D.L.KAPOOR", "D L KAPOOR", "D.L.KAPOOR JI", "D L KAPOOR JI"];
testNames.forEach(tn => console.log(`${tn} -> ${normalizeName(tn)}`));
