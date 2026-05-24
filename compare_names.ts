
const SATURDAY_LIST = ["Harbans Lal Gumber", "Rajan Nagpal", "O.P.Batra", "Ajit Singh", "Akash Kheterpal", "Amar Singh", "Amar Singh Yadav", "Amit Bhutani", "Amrit Lal", "Anil Chawla", "Anil Kumar", "Ankit Khetarpal", "Ankur Bhutani", "Arjun Singh", "Arun Kumar", "Ashok Kumar Sharma", "Ashok Sindal", "Avinash Madan", "Bhushan Lal Thukral", "Dara Singh", "Deepak Chhabra", "Deepak Saini", "Devki Nandan", "Dharam Pal", "Dharamveer Gupta", "Dilip Singh", "Gajender Chauhan", "Gulshan Rajpal", "Gurdarshan", "Gurmeet Singh", "H.L Batra", "Harish", "Hemant", "Himanshu Ahuja", "Hitesh Bhatia", "Jatin Batia", "Jitender Kr", "Jitender Singh", "Joginder Pal", "Joginder Singh", "K.K. Kalra", "K P Singh", "K.R Bhatia", "Kapil Khetarpal", "Kishan Lal Ahuja", "Kunal Bhatia", "L K Nagpal", "Madan Mohan", "Manish Kumar", "Manmohan Ahuja", "Naresh Kumar", "Nirmal Kumar Singh", "Pitamber", "Piyush Anand", "Praveen Malik", "Prem Saluja", "Puneet Ahuja", "Rajesh Gandhi", "Raj Bhadur Singh", "Raj Kumar Sikka", "Rajender Kumar", "Rajinder Gulati", "Rakesh Munjal", "Ram Kumar", "Ram Niwas", "Ramesh Chand", "Ramesh Sharma", "Ranjeet Singh", "Ravinder Singh", "Rishikesh", "Roshan Lal", "Sachin Arora", "Sahil Arora", "Sanjeev Dhawan", "Satish Kr", "Shankar Lal Bhatia", "Shri Krishan", "Shubham Virmani", "Shunty Nagpal", "Som Datt", "Subhash Rathor", "Sudesh Yadav", "Sumit Gambhir", "Surender Singh (Ii)", "Surender Verma", "Surinder Singh", "Sushil Malik", "Tara Chand", "Umed Singh", "Vijay Kumar", "Vijay Singh", "Vipul Bhatia", "Yadvinder Singh", "Yogesh Kumar", "Yogesh Matta"];

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

console.log("Normalized check:");
const satNorms = SATURDAY_LIST.map(n => ({ original: n, norm: normalizeName(n) }));
removeList.forEach(name => {
  const rn = normalizeName(name);
  const matches = satNorms.filter(s => s.norm === rn || s.norm.includes(rn) || rn.includes(s.norm) || s.original.toUpperCase().includes(rn));
  console.log(`User name: "${name}" [${rn}]`);
  if (matches.length > 0) {
    matches.forEach(m => console.log(`  -> Match: "${m.original}" [${m.norm}]`));
  } else {
    console.log(`  -> NO MATCH`);
  }
});
