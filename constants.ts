
import { Sewadar, GentsGroup, Volunteer } from './types';

export const GENTS_GROUPS: GentsGroup[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export const LOCATIONS_LIST = [
  'Kirpal Bagh', 
  'Kirpal Ashram', 
  'Sawan Ashram', 
  'Sant Darshan Singh Ji Dham'
];

/**
 * List of activities available for awarding points in the workshop.
 */
export const GAMES = [
  'Daily Attendance',
  'Quiz',
  'Field Drill',
  'Discipline',
  'Security Awareness',
  'Uniform Check'
];

const SUNDAY_LIST = ["Amar Nath", "Ganpat Bhatia", "Manish Munjal", "Surinder Raheja", "Parvesh Bhatia", "Ajit Singh", "Vinod Gaba", "Abhishek Chawla", "Anand Sharma", "Anil Kapoor", "Ankush Malik", "Arshit Raheja", "Ashish Rathore", "Ashok Harjai", "Ashok Kapoor", "Ashok Saini", "Ashok Sharma", "Atul Bansal", "B.B Khanna", "Baldev Gandhi", "Chaman Lal", "Dashrath Parsad", "Fakir Chand", "Gulshan Arora", "Harender Singh", "Harish Kumar", "Harvansh Verma", "Hemant", "Jai Kishan Arora", "Janak Raj Sharma", "Joginder Lal", "Kapil Budhiraja", "Kapil Mehndru", "Laxmi Chand", "Maange Ram", "Madan Gopal Sharma", "Madhuker Bhanot", "Madhusudan Malik", "Manmohan Arora", "Miras", "Mohak Bahel", "Parvesh Kumar", "Prem Gandhi", "Purshotam Gulati", "Rahul Gandhi", "Rajnish Kumar", "Rakesh Gulati", "Rakshit Gupta", "Ram Chander", "Ramesh Chand", "Sachin Arora", "Sachin Budhiraja", "Sachin Verma", "Sahil Malik", "Sahil Tiwari", "Sailesh", "Sandeep Ahuja", "Sandeep Manocha", "Satish Saini", "Saurav", "Sheetal Parsad", "Shyam Murari", "Suraj Parkash", "Tarun Bhudiraja", "Tilak Raj", "Upender Parsad", "Ved Dua", "Vinod Kumar", "Vipin Khanna", "Vishal Dawar", "Yogesh Madan"];
const MONDAY_LIST = ["Anil Gulati", "Dinesh Kapoor", "Angad Soni", "Aman Chauhan", "Ajit Singh", "Vinod Gaba", "Aakash Kumar", "Abhisekh Tyagi", "Abhishek Kumar", "Ajay Arora", "Aman Kapoor", "Aman Sharma", "Amit Kumar", "Anil Kumar", "Anil Verma", "Ankit Ahuja", "Ankit Gulati", "Ankit Rana", "Ankit Saluja", "Ankush Lamba", "Anmol Agrawal", "Anuj Soni", "Arun Kumar", "Aseem Kapoor", "Ashok Kumar", "Ashu", "Ashwani", "Bharti Chugh", "Bobby Narang", "Brijmohan", "Chaman Lal", "Deepak Takkar", "Devan Kathuria", "Devisharan", "Devki Nandan", "Dimple(Sushil)", "Dinesh Salgotra", "Dr. Ravi Shastri", "D.L Kapoor", "Gagan", "Gagan (Montu)", "Gagan Arora", "Gagan Saluja", "Gurmeet Singh", "Gurvinder Singh", "Happy Bhutani", "Harish Dhingra", "Harish Malhotra(Rohtak)", "Inder Prakash", "Inderpal Singh", "Ishwar Lal", "Jagdish Saddana", "Jay Aprakash", "Kamal", "Karan Pal Singh", "Kartik Takkar", "Kastury Lal", "Kunal", "Lalman Pal", "Lekhraj", "Lokinder Singh", "Madan Baira", "Madan Gopal", "Mahender Kumar", "Mahender Bora", "Mahesh Aneja", "Man Singh", "Manish Sharma", "Manish Sharma(Rohtak)", "Manmohan Khurana", "Manoj Kumar", "Manoj Pal", "Mewa Ram", "Mohan Soni", "Monu", "Mukesh Kumar", "Narender Punyani", "Naresh Saini", "Naveen Kumar", "Naveen Sapra", "Nitender Kumar", "Om Prakash", "Om Prakesh (Vishwas Nag)", "Paras", "Paras Arora", "Paritosh Pal", "Pawan Khasa", "Pawan Sharma", "Pradeep Kumar", "Prem Chawala", "Prem Kumar", "Prem Singh", "Raj Kholi", "Rajan", "Rajender Bhati", "Rajender Chawla", "Rajender Singh", "Rajesh Manchanda", "Rajesh Pawar", "Rajesh Verma", "Rajinder Gandhi", "Rajkumar Dashturiya", "Rajkumar Malik", "Raju Gaba", "Raju Verma", "Rakesh Kumar", "Rakesh Madan", "Ram", "Ram Nivash", "Ramesh Chawla", "Rampal", "Randhir Singh", "Ranjeet Singh", "Rattan Dheeraj", "Ravinder", "Rohit Pal", "Ruchir Sharma", "Sachin Arora", "Sachin Wadhwa", "Sachin Yadav", "Sajjan Jain", "Sandeep Khanna", "Sanjay", "Sanjay Goutam", "Sanny Mittal", "Satish Sarma", "Shakti Kapoor", "Shivam Gandhi", "Shivam Singh", "Shwet Rathor", "Shyam Madan", "Shyam Sunder Chhabra", "S.N. Ojha", "Sonu Soni", "Sourav Takkar", "Subhash Dhingra", "Subhash Nandwani", "Sumit Chawla", "Sumit Sachdeva", "Sumit Sethi", "Sunder Singh", "Suneel Chawla", "Sunil Chawla", "Sunil Kumar", "Sunil Makhija", "Sunil Makkar", "Sunil Verma", "Sunny", "Suresh Pnp", "Sushil Chawla", "Sushil Garg", "Tarun", "Varun Verma", "Vicky", "Vikram Pal", "Vikram Singh Saini", "Vimal Singh", "Vinay Saini", "Vinod Khanna", "Vinod Khattar", "Vishnu Soni"];
const TUESDAY_LIST = ["S K Gaba", "Narinder Chopra", "Surinder Chugh", "Ajit Singh", "Vinod Gaba", "Aman Sharma", "Amar Singh Rathore", "Anand Thakur", "Anil Mahajan", "Ankur Mittal", "Anmol Bhatia", "Anmol Chopra", "Arvind Solanki", "Ashok Khera", "Ashok Kumar", "Baljeet Singh", "Bhola Shankar", "Bhoop Singh", "Chaman Lal", "Chander Pal", "Chetan Kumar Verma", "D L Kapoor", "D.V. Singh", "Devendar", "Devendra Garg", "Devi Sarann", "Devki Nandan", "Gulshan Nagpal", "Gurmeet Singh", "Gurpreet Singh Vohra", "Hari Chand Bajaj", "Hari Prakash", "Harpreet Singh", "Hemant", "Hutesh Kumar", "Jai Prakash Singh", "Kamal Gurnani", "Karan Rajput", "Kasturi Lal", "Krishana Kumar Sharma", "Manmohan Khurana", "Miras", "Naresh Kumar", "Naveen Gupta", "Nishant Puri", "Parveen Kumar", "Pawan Kumar Sharma", "Pooran Chand", "Pradeep Gangwani", "Pradeep Kaushik", "Pradeep Kumar", "Pranit Kalucha", "Prem Kalucha", "Prince", "Prince Batra", "Pritam Batra", "Puneet Kumar", "R P Singh", "R V Shastri", "R.A Pal", "Rahul Juneja", "Raj Kumar Gupta", "Rajender Malik", "Rajender Singh", "Rajendra Singh Gzb.", "Rajesh Gupta", "Rajneesh", "Raju Saini", "Rahul Garg", "Ram Avtar", "Ram Kumar", "Rati Bhan Singh", "Rattan Singh", "Roshan Lal", "S N Ojha", "S S Manoj", "Sahil Babbar", "Sahil Bansal", "Sandeep Bhandari", "Sanjay Khurana", "Sanjeev Kumar", "Satinder K Bhatnagar", "Shakti Singh", "Shyam Sundar", "Sukhdev Singh", "Sunil Sachdeva", "Surinder Kumar Knl.", "Suresh Kumar", "Susheel Verma", "Tilak Raj Arora", "Tarun Sharma", "Vinay Kumar", "Yogesh Madan"];
const WEDNESDAY_LIST = ["Surjit Singh", "Gautam Kapoor", "Jatin Batra", "Ajit Singh", "Vinod Gaba", "Aalok Khurana", "Akash", "Akshay Verma", "Aman Arora", "Amit Sachdeva", "Anil Kumar", "Anil Pandit", "Ankur Minocha", "Ankush Wadhwa", "Anmol", "Anmol Thakur", "Arshdeep Singh", "Arun", "Arun Saini", "Arun Varma", "Ashish Kumar Yadav", "Ashok Arora", "Ashok Chawla", "Ashok Kumar", "Badal Manchanda", "B.C.Kandpal", "Brijesh", "Chander Chhokra", "Davinder Singh", "Deepak Miglani", "Deepak Panchal", "Deepak Seelam Pur", "Devinder Singh Panesar", "Dharam Singh Fbd", "Dr R.V Shastri", "Gagan Deep", "Gaurav Babbar", "Gaurav Batra", "Gaurav Bhati", "Ghanshyam", "Gulshan Gaba", "Gulshan Makkar", "Harbans Lal", "Harish Malik", "Harkesh", "Harsh Sethi", "Inderjeet Singh", "Indrajeet", "Ishan Khurana", "J.K Chawla", "J.K. Bajaj", "Jaipal", "Jasvinder Singh", "Kalp Nath", "Kanhya Lal", "Kapil Arora", "Kapil Dhawan", "Kartik Kohli", "Kaushal Kumar", "Khemchand Solanki", "Krishan Khurana", "Kuldeep Kumar", "Laxman", "Lokesh Kohli", "Lovekush", "Mahender Puniani", "Mahendra Walia", "Manish Bhati", "Mali Ram", "Manoj Anand", "Manoj Narula", "Manoj Sharma", "Mohit Chawla", "Naresh Singh", "Narsingh Sharma", "Neeraj Nagar", "Om Prakash", "Pankaj Gaba", "Paras Gulati", "Parkash Arora", "Parkash Sachdeva", "Partaap", "Parvesh Kumar", "Phoolchand", "Pradeep Kumar", "Praveen Bhutani", "Praveen Sachdeva", "Praveen Sharma", "Praveen(Rohtak)", "Prem Prakash", "Rajan", "Rajeev", "Rajesh Nayak", "Rajesh Thakur", "Rajesh Verma", "Rajesh(Rohtak)", "Rajinder Bajaj", "Rajinder Manocha", "Rajiv Arora", "Rajpal Arora", "Raju Babbar", "Rakesh Kohli", "Rakesh Munjal", "Ram Swaroop", "Ram Swaroop Solanki", "Ramesh Chand", "Ramesh Mittal", "Ramesh Virmani", "Rameshwar Solanki", "Ramji Das Khurana", "Ramswaroop Solanki", "Ritik Kaushik", "Rohit Gaba", "Roshan Lal", "Sagar Kumar", "Saksham Chawla", "Sandeep Malhotra", "Sanjeev Kumar Saini", "Sanjeev Sharma", "Santosh Kumar", "Sat Narain", "Satish (D.P)", "Satish Kumar", "Satyavir Solanki", "Satyawan", "Shiv Kumar", "Shiv Ram", "Shiv Ratan", "Shiv Shanker", "Shivam Gulati", "Shivam Khurana", "Sita Ram", "Som Nath", "Subhash Khetrpal", "Sumit Bhatti", "Sumit Bhatia", "Sunder Lal", "Sunil Baweja", "Sunil Kalra", "Sunil Khurana", "Sunny Ahuja", "Suresh Aneja", "Suresh Kajal", "Surinder Khurana", "Surinder Singh", "Sushil Bansal", "Sushil Narang", "Tejvir Singh", "Umesh Kumar", "Ved Chawla", "Vijay Kumar", "Vinod Gupta", "Vinod Khattar", "Vinod Tuli", "Yogesh Khattar", "Yugam Ganotra"];
const THURSDAY_LIST = ["Gaurav Gaba", "Sanjay Grover", "Satish Aggarwal", "Gurdas Kalucha", "Adarsh Verma", "Akash Babbar", "Aakash Munjal", "Akshay Dhingra", "Akshay Puniyani", "Anil", "Anilkumar", "Anil Pal -Ii", "Ankit Arora", "Ankush Gandhi", "Ankush Grover", "Ankush Shishodia", "Anmol Nagpal", "Anuj Arora", "Anuj Giri", "Ashok Ji", "Bhagwan Singh", "Bijender Singh", "Brij Bhushangiri", "D.L Kapoor", "Deepak Ahuja", "Deepak Khatri", "Dev Malhotra", "Dev Narayan Gaur", "Dharmbir Singh", "Dr. R V Shastri", "Dr. Satyapal Singh", "Dwarka Parsad Rai", "Gulab Singh", "Gulshan Nagpal", "Hari Chand", "Hari Prakash", "Hat Ram Singh", "Hemant Pahwa", "Hemant Yadav", "Inder Malik", "Jagjeevan Yadav", "Jaipal Singh Rana", "Jeevan Lal", "Jitender Kumar", "Jitender Purthi", "Karan Mujal", "Kartik Goswami", "Ketan Gandhi", "Kishore Dhingra", "Lakhpat Raj", "Lokesh Sharma", "Lokman Singh", "Lucky Malhotra", "Mahender Arora", "Manish Agarwal", "Manoj Punyani", "Narayan Kushwaha", "Narendra Kumar", "Naresh Nagpal", "Nav Bahar Singh", "Naveen Gupta", "Ohm Raj Singh", "Pankaj Batra", "Partap Singh", "Parvinder Singh (Manni)", "Pawan Arora", "Pawan Kumar", "Pradeep Kumar Gupta", "Prem Kalucha", "Puneet Giri", "R.L. Soni", "Raj Kumar Sharma", "Rajat Uppal", "Rajeev", "Rajesh Sharma", "Rajesh Verma", "Rakesh Arora", "Rakesh Babber", "Rakesh Kumar", "Ram Kishore", "Ramesh Arora", "Rhitik", "Rohtash", "Sahil Gandhi", "Sahil Punyani", "Satish Saini", "Satish Suryavanshi", "Satnam Sarna", "Satpal", "Satya Prakash", "Shiva", "Shyam Sunder", "Shyam Sunder - Ii", "Sita Ram", "S.N.导", "Sukhdev Singh", "Sumit Suneja", "Surinder Gandhi", "Surinder Sethi", "Tarun Goel", "Tarun Takkar", "Umesh Sharma", "Vicky Verma", "Vijay Popli", "Virender Khurana", "Vikram Kumar", "Yash Pal Ratra", "Yogendra Kumar Rana", "Yogesh Sharma"];
const FRIDAY_LIST = ["Sushil Ahuja", "Mukesh Seghal", "Rahul Girdhar", "Ajit Singh", "Vinod Gaba", "Ajay Malik", "Akash Kumar", "Amar Singh", "Amit Verma", "Anil Bhutani", "Anil Sehgal", "Ashish K Sardana", "Ashok Kr Sharma", "Balwant Kumar", "Bhagwat Prasad", "Bhola Shankar", "Bijender Singh", "Darshan Lal", "Deepak Seghal", "Devender", "Devender Kumar", "D L Kapoor", "H.S.Rana", "Hardeep Malhotra", "Hari Chand Bajaj", "Harish Sethi", "Himanshu Sachdeva", "Ish Kumar Anand", "Jeet Singh Juneja", "Jintender Arora", "Jitender Solanki", "Kamal Narula", "Krishan Kumar", "Kunal Gandhi", "Lakshaya Saraswat", "Lalit Kumar", "Lokesh Kumar", "Madan Lal Manni", "Madan Lal", "Mohan Lal", "Mohan Lal Gumber", "Nanak Chand", "Neeraj Saini", "Neeraj Sachdeva", "Netra Pal", "Pawan Kumar", "Pawan Mehta", "Pradeep Kumar", "Prem Lal", "Puneet Chachra", "Puneet Oberoi", "Rahul Gandhi", "Raj Kumar", "Raj Kumar Sharma", "Rajender Singh", "Rajesh Malhotra", "Rajinder Jindal", "Rajinder Khurana", "Rajiv Arora", "Raju Saini", "Rakesh Arora", "Ram Kishan", "Ram Kumar", "Ram Nivas", "Ram Yash", "Ramesh Dua", "Ravi Arora", "Ravi Tyagi", "Sachin Ahuja", "Sachin Kumar", "Sahil Gupta", "Sandeep Saraswat", "Sanjay Arora", "Sanjay Khera", "Sanjay Kumar", "Sarabjeet Singh Bedi", "Satyapal Singh", "Shambhu Kumar", "Sonu Kumar", "Subhash Dhingra", "Sudershan Sachdeva", "Sudhir Bhutani", "Sumbh Dutt", "Sunder Lal", "Sunder Saini", "Sunil Nagpal", "Surender Kumar", "Suresh Gandhi", "Surinder Dhingra", "Surinder Narula", "Surjit Kumar", "Umesh Kumar", "Vijender Solanki", "Virender Kumar"];
const SATURDAY_LIST = ["Harbans Lal Gumber", "Rajan Nagpal", "Naresh Chhabra", "O.P.Batra", "Ajit Singh", "Akash Kheterpal", "Amar Singh", "Amar Singh Yadav", "Amit Bhutani", "Amrit Lal", "Anil Chawla", "Anil Kumar", "Ankit Khetarpal", "Ankur Bhutani", "Arjun Singh", "Arun Kumar", "Ashok Kumar Sharma", "Ashok Sindal", "Avinash Madan", "Bhushan Lal Thukral", "Dara Singh", "Deepak Chhabra", "Deepak Saini", "Devki Nandan", "Dharam Pal", "Dharamveer Gupta", "Dilip Singh", "Gajender Chauhan", "Gulshan Rajpal", "Gurdarshan", "Gurmeet Singh", "H.L Batra", "Harish", "Hemant", "Himanshu Ahuja", "Hitesh Bhatia", "Jatin Batia", "Jitender Kr", "Jitender Singh", "Joginder Pal", "Joginder Singh", "K.K. Kalra", "K P Singh", "K.R Bhatia", "Kapil Khetarpal", "Kishan Lal Ahuja", "Kunal Bhatia", "L K Nagpal", "Madan Mohan", "Manish Kumar", "Manmohan Ahuja", "Naresh Kumar", "Nirmal Kumar Singh", "Pitamber", "Piyush Anand", "Praveen Malik", "Prem Saluja", "Puneet Ahuja", "Rajesh Gandhi", "Raj Bhadur Singh", "Raj Kumar Sikka", "Rajender Kumar", "Rajinder Gulati", "Rakesh Munjal", "Ram Kumar", "Ram Niwas", "Ramesh Chand", "Ramesh Sharma", "Ranjeet Singh", "Ravinder Singh", "Rishikesh", "Roshan Lal", "Sachin Arora", "Sahil Arora", "Sanjeev Dhawan", "Satish Kr", "Shankar Lal Bhatia", "Shri Krishan", "Shubham Virmani", "Shunty Nagpal", "Som Datt", "Subhash Rathor", "Sudesh Yadav", "Sumit Gambhir", "Surender Singh (Ii)", "Surender Verma", "Surinder Singh", "Sushil Malik", "Tara Chand", "Umed Singh", "Vijay Kumar", "Vijay Singh", "Vipul Bhatia", "Yadvinder Singh", "Yogesh Kumar", "Yogesh Matta"];
const LADIES_LIST = ["KANTA RANI", "JYOTI KHERA", "SUMAN SETHI", "AARTI KOHLI", "ALKA VERMA", "ANITA AHUJA", "ANITA BHARDWAJ", "ANITA SETHI", "ANITA MAKKAR", "ASHA KAPOOR", "BHARTI UDAR", "BHAGWATI SHARMA", "BIMAL KHARBANDA", "BIMLA DHINGRA", "BIMLA DUTT", "BIMLESH SISODIA", "CHANDER ARORA", "CHANCHAL HARJAI", "CHANDRA NAILWAL", "DARSHNA DUA", "DINESH DEVI", "GEETA OHRI", "GEETA PANIPAT", "JYOTI MALHOTRA", "JOLLY JOHAR", "KAMLESH ARORA", "KAMLESH BHARDWAJ", "KAMLESH DEVI", "KAMLESH SAINI", "KAMLESH VERMA", "KANTA ARORA", "KANTA GUPTA", "KANTA SHARMA", "KARMAWALI", "KIRAN BALA", "KRISHNA DEVI", "KUNTI DEVI", "KOSHAL BHUTANI", "KUSUM LATA", "KUSUM LATA RAJPUT", "LALITA GANDHI", "LAJYA WANTI", "LAXMI SOLANKI", "MAMTA AHUJA", "MAMTA SAINI", "MAMTA SHARMA", "MANJU CHAUHAN", "MAYA KAJAL", "MEENAKSHI", "MEHAK CHAWLA", "NEELAM CHOKRA", "NEELAM CHAWLA", "NEELAM GANDHI", "NEELAM NARULA", "NEELAM MIGLANI", "NEELAM VERMA", "NEENA KHARBANDA", "NEERU BHALLA", "NEERU BUDHIRAJA", "NEERU CHOPRA", "NEERU SAINI", "NIRMAL RANA", "NIRMLA DEVI", "NISHA RANI", "OM WATI", "PAWAN KUMARI", "PHOOL WATI", "POONAM KHANDAN", "PINKI CHOPRA", "PUSHPA HANS", "PUSHPA SINGH", "PUSHPA SHARMA", "PUSHPA TANEJA", "RACHNA", "RAJ CHHABRA", "RAM WATI", "RAMA ARORA", "RAMA CHAUHAN", "RANI (NANGLOI)", "RANI GUMBER", "RANI RAJKUMARI", "RANU SINGHLA", "RAVI KANTA", "RENU MALIK", "RESHMA YADAV", "RUCHIKA SONI", "SANTOSH BHANOT", "SANTOSH DEVI", "SANTOSH DUHAN", "SANTOSH MEHRA", "SANTOSH NANDA", "SANTOSH SAHRAWAT", "SANTOSH VERMA", "SANYOGITA AHUJA", "SATYA MANOCHA", "SAVITRI (PALWAL)", "SHAKUNTLA BABBAR", "SHAKUNTLA SINGH", "SHASHI GAMBHIR", "SHASHI MANOCHA", "SHEEL CHAWLA", "SHEEL KHERA", "SHEELA GABA", "SHIKHA AHUJA", "SHRUTI", "SNEH CHUGH", "SUDESH BATRA", "SUDESH ROHILLA", "SUDESH SINGH", "SUMAN BHATIA", "SUMAN SHARMA", "SUNITA DUA", "SUNITA VERMA", "SUNITA MEHRA", "SUNITA SAINI", "SUNITA SAINI MONDAY", "SUMITRA YADAV", "SUSHILA CHAWLA", "SUSHILA SHARMA", "SUSHMA BHUTANI", "SWARNA GANDHI", "TARUNA SETH", "USHA (TIMARPUR)", "USHA ARORA", "USHA DHINGRA", "USHA RANI", "VANISHA GROVER", "VEENA CHAUHAN", "VEENA GHERA", "VEENA MUNJAL", "VIJAY LAXMI", "VISHO DEVI"];

/**
 * Mapping of the first 3 names of each group to act as Incharges
 */
const GROUP_INCHARGES: Record<string, string[]> = {
  'Monday': MONDAY_LIST.slice(0, 3),
  'Tuesday': TUESDAY_LIST.slice(0, 3),
  'Wednesday': WEDNESDAY_LIST.slice(0, 3),
  'Thursday': THURSDAY_LIST.slice(0, 3),
  'Friday': FRIDAY_LIST.slice(0, 3),
  'Saturday': SATURDAY_LIST.slice(0, 3),
  'Sunday': SUNDAY_LIST.slice(0, 3),
  'Ladies': LADIES_LIST.slice(0, 3)
};

const generateVolunteers = (): Volunteer[] => {
  const vols: Volunteer[] = [];
  
  // Gents Group Incharges
  GENTS_GROUPS.forEach(day => {
    const inchargeNames = GROUP_INCHARGES[day] || [`${day} Incharge 1`, `${day} Incharge 2`, `${day} Incharge 3`];
    inchargeNames.forEach((name, i) => {
      vols.push({
        id: `v_${day.toLowerCase().substring(0, 3)}_${i + 1}`,
        name: name,
        role: 'Gents Admin',
        password: '111',
        assignedGroup: day
      });
    });
  });

  // Ladies Incharges
  const ladiesInchargeNames = GROUP_INCHARGES['Ladies'] || ['Ladies Incharge 1', 'Ladies Incharge 2', 'Ladies Incharge 3'];
  ladiesInchargeNames.forEach((name, i) => {
    vols.push({
      id: `v_ladies_${i + 1}`,
      name: name,
      role: 'Ladies Admin',
      password: '222',
      assignedGroup: 'Ladies'
    });
  });

  // Super Admin
  vols.push({ id: 'sa', name: 'Super Admin', role: 'Super Admin', password: '000' });
  
  return vols;
};

export const VOLUNTEERS: Volunteer[] = generateVolunteers();

const generateInitialSewadars = (): Sewadar[] => {
  const sewadars: Sewadar[] = [];
  const addList = (list: string[], group: GentsGroup) => {
    list.forEach((name, i) => {
      sewadars.push({ id: `G-${group}-${i}`, name: name, gender: 'Gents', group: group });
    });
  };
  addList(MONDAY_LIST, 'Monday');
  addList(TUESDAY_LIST, 'Tuesday');
  addList(WEDNESDAY_LIST, 'Wednesday');
  addList(THURSDAY_LIST, 'Thursday');
  addList(FRIDAY_LIST, 'Friday');
  addList(SATURDAY_LIST, 'Saturday');
  addList(SUNDAY_LIST, 'Sunday');
  LADIES_LIST.forEach((name, i) => {
    sewadars.push({ id: `L-Ladies-${i}`, name: name, gender: 'Ladies', group: 'Ladies' });
  });
  return sewadars;
};

export const INITIAL_SEWADARS = generateInitialSewadars();
