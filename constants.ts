
import { Sewadar, DutyGroup, Volunteer, SewadarDetails } from './types';

export const GENTS_GROUPS: DutyGroup[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'HR Department', 'Lost and Found', 'PR Department', 'Langar Department', 'CCTV Vision Team', 'CCTV Maintenance'
];

export const LADIES_GROUPS: DutyGroup[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'HR Department', 'Lost and Found', 'PR Department', 'Langar Department', 'CCTV Vision Team', 'CCTV Maintenance'
];

export const LOCATIONS_LIST = [
  'Kirpal Bagh', 
  'Kirpal Ashram', 
  'Sawan Ashram', 
  'Sant Darshan Singh Ji Dham'
];

export const KIRPAL_BAGH_POINTS = [
  'Gate No.1',
  'Gents toilet',
  'Gathri godam',
  'Canteen',
  'Langar',
  'Darshan academy',
  'Bhajan Sthal',
  'Dispensary',
  'Food Supply',
  'Stage',
  'Back Stage',
  'VIP Reception Gate',
  'Gate No. 4',
  'Traffic',
  'Gate No. 3',
  'VIP Washroom',
  'Gate No. 2',
  'Sewa',
  'Piao',
  'Round',
  'Gate No. 2 Terrace',
  'Joda Ghar',
  'Parking',
  'Airport Duty'
];

export const KIRPAL_ASHRAM_POINTS = [
  'Gate No. 1',
  'Gate No. 2',
  'Canteen',
  'Langar',
  'Dispensary',
  'Guest house',
  'Guest house roof',
  'Food Supply',
  'Meditation Hall roof',
  'Kothi Back Side washroom',
  'Kothi Gate',
  'Sewa',
  'Stage',
  'Traffic',
  'Canteen Roof',
  'Photo Section Roof',
  'Front of Banni',
  'Round',
  'Small Gate of Kothi',
  'Airport Duty'
];

export const SAWAN_ASHRAM_POINTS = [
  'Main Gate',
  'Round',
  'Kothi',
  'Airport Duty'
];

export const SDS_DHAM_POINTS = [
  'Gate No.1',
  'Gol Chakkar',
  'Gate No.2',
  'VIP Garden',
  'Green room',
  'Stage',
  'Washroom',
  'Food Supply',
  'Sewa',
  'Piao', 
  'Canteen',
  'Stalls', 
  'Langar',
  'Gate No.3',
  'Gate No.4',
  'Gate No.5',
  'Gate No.6',
  'Dispensary', 
  'Parking',
  'Machhan',
  'VIP washroom',
  'Green room washroom',
  'Pandal',
  'Round',
  'Mechanical Store',
  'Airport Duty'
];

export const GAMES = [
  'Daily Attendance',
  'Quiz',
  'Field Drill',
  'Discipline',
  'Security Awareness',
  'Uniform Check'
];

const SUNDAY_LIST = ["Manish Munjal", "Surinder Raheja", "Parvesh Bhatia", "Amar Nath", "Ganpat Bhatia", "Ajit Singh", "Vinod Gaba", "Abhishek Chawla", "Anand Sharma", "Anil Kapoor", "Ankush Malik", "Arshit Raheja", "Ashish Rathore", "Ashok Harjai", "Ashok Kapoor", "Ashok Saini", "Ashok Sharma", "Atul Bansal", "B.B Khanna", "Baldev Gandhi", "Chaman Lal", "Dashrath Parsad", "Fakir Chand", "Gulshan Arora", "Harender Singh", "Harish Kumar", "Harvansh Verma", "Hemant", "Jai Kishan Arora", "Janak Raj Sharma", "Joginder Lal", "Kapil Budhiraja", "Kapil Mehndru", "Laxmi Chand", "Maange Ram", "Madan Gopal Sharma", "Madhuker Bhanot", "Madhusudan Malik", "Manmohan Arora", "Miras", "Mohak Bahel", "Parvesh Kumar", "Prem Gandhi", "Purshotam Gulati", "Rahul Gandhi", "Rajnish Kumar", "Rakesh Gulati", "Rakshit Gupta", "Ram Chander", "Ramesh Chand", "Sachin Arora", "Sachin Budhiraja", "Sachin Verma", "Sahil Malik", "Sahil Tiwari", "Sailesh", "Sandeep Ahuja", "Sandeep Manocha", "Satish Saini", "Saurav", "Sheetal Parsad", "Shyam Murari", "Suraj Parkash", "Tarun Bhudiraja", "Tilak Raj", "Upender Parsad", "Ved Dua", "Vinod Kumar", "Vinod Kumar", "Vipin Khanna", "Vishal Dawar", "Yogesh Madan"];
const MONDAY_LIST = ["Anil Gulati", "Dinesh Kapoor", "Angad Soni", "Aman Chauhan", "Ajit Singh", "Vinod Gaba", "Aakash Kumar", "Abhisekh Tyagi", "Abhishek Kumar", "Ajay Arora", "Aman Kapoor", "Aman Sharma", "Amit Kumar", "Anil Kumar", "Anil Verma", "Ankit Ahuja", "Ankit Gulati", "Ankit Rana", "Ankit Saluja", "Ankush Lamba", "Anmol Agrawal", "Anuj Soni", "Arun Kumar", "Aseem Kapoor", "Ashok Kumar", "Ashu", "Ashwani Narang", "Bharti Chugh", "Bobby Narang", "Brijmohan", "Chaman Lal", "Deepak Takkar", "Devan Kathuria", "Devisharan", "Devki Nandan", "Dimple(Sushil)", "Dinesh Salgotra", "Dr. Ravi Shastri", "D.L Kapoor", "Gagan", "Gagan (Montu)", "Gagan Arora", "Gagan Saluja", "Gurmeet Singh", "Gurvinder Singh", "Happy Bhutani", "Harish Dhingra", "Harish Malhotra(Rohtak)", "Inder Prakash", "Inderpal Singh", "Ishwar Lal", "Jagdish Saddana", "Jay Aprakash", "Kamal", "Karan Pal Singh", "Kartik Takkar", "Kastury Lal", "Kunal", "Lalman Pal", "Lekhraj", "Lokinder Singh", "Madan Baira", "Madan Gopal", "Mahender Kumar", "Mahender Bora", "Mahesh Aneja", "Man Singh", "Manish Sharma", "Manish Sharma(Rohtak)", "Manmohan Khurana", "Manoj Kumar", "Manoj Pal", "Mewa Ram", "Mohan Soni", "Monu", "Mukesh Kumar", "Narender Punyani", "Naresh Saini", "Naveen Kumar", "Naveen Sapra", "Nitender Kumar", "Om Prakash", "Om Prakesh (Vishwas Nag)", "Paras", "Paras Arora", "Paritosh Pal", "Pawan Khasa", "Pawan Sharma", "Pradeep Kumar", "Prem Chawala", "Prem Kumar", "Prem Singh", "Raj Kholi", "Rajan", "Rajender Bhati", "Rajender Singh", "Rajender Chawla", "Rajesh Manchanda", "Rajesh Pawar", "Rajesh Verma", "Rajinder Gandhi", "Rajkumar Dashturiya", "Rajkumar Malik", "Raju Gaba", "Raju Verma", "Rakesh Kumar", "Rakesh Madan", "Ram", "Ram Nivash", "Ramesh Chawla", "Rampal", "Randhir Singh", "Ranjeet Singh", "Rattan Dheeraj", "Ravinder", "Rohit Pal", "Ruchir Sharma", "Sachin Arora", "Sachin Wadhwa", "Sachin Yadav", "Sajjan Jain", "Sandeep Khanna", "Sanjay", "Sanjay Goutam", "Sanny Mittal", "Satish Sarma", "Shakti Kapoor", "Shivam Gandhi", "Shivam Singh", "Shwet Rathor", "Shyam Madan", "Shyam Sunder Chhabra", "S.N. Ojha", "Sonu Soni", "Sourav Takkar", "Subhash Dhingra", "Subhash Nandwani", "Sumit Chawla", "Sumit Sachdeva", "Sumit Sethi", "Sunder Singh", "Suneel Chawla", "Sunil Chawla", "Sunil Makhija", "Sunil Makkar", "Sunil Shadra", "Sunil Verma", "Sunny", "Suresh Pnp", "Sushil Chawla", "Sushil Garg", "Tarun", "Varun Verma", "Vicky", "Vikram Pal", "Vikram Singh Saini", "Vimal Singh", "Vinay Saini", "Vinod Khanna", "Vinod Khattar", "Vishnu Soni"];
const TUESDAY_LIST = ["S K Gaba", "Narinder Chopra", "Surinder Chugh", "Ajit Singh", "Vinod Gaba", "Aman Sharma", "Amar Singh Rathore", "Anand Thakur", "Anil Mahajan", "Ankur Mittal", "Anmol Bhatia", "Anmol Chopra", "Arvind Solanki", "Ashok Khera", "Ashok Kumar", "Baljeet Singh", "Bhola Shankar", "Bhoop Singh", "Chaman Lal", "Chander Pal", "Chetan Kumar Verma", "D L Kapoor", "D.V. Singh", "Devendar", "Devendra Garg", "Devi Sarann", "Devki Nandan", "Gulshan Nagpal", "Gurmeet Singh", "Gurpreet Singh Vohra", "Hari Chand Bajaj", "Hari Prakash", "Harpreet Singh", "Hemant", "Hutesh Kumar", "Jai Prakash Singh", "Kamal Gurnani", "Karan Rajput", "Kasturi Lal", "Krishana Kumar Sharma", "Manmohan Khurana", "Miras", "Naresh Kumar", "Naveen Gupta", "Nishant Puri", "Parveen Kumar", "Pawan Kumar Sharma", "Pooran Chand", "Pradeep Gangwani", "Pradeep Kaushik", "Pradeep Kumar", "Pranit Kalucha", "Prem Kalucha", "Prince", "Prince Batra", "Pritam Batra", "Puneet Kumar", "R P Singh", "R V Shastri", "R.A Pal", "Rahul Juneja", "Raj Kumar Gupta", "Rajender Malik", "Rajender Singh", "Rajendra Singh Gzb.", "Rajesh Gupta", "Rajneesh", "Raju Saini", "Rahul Garg", "Ram Avtar", "Ram Kumar", "Rati Bhan Singh", "Rattan Singh", "Roshan Lal", "S N Ojha", "S S Manoj", "Sahil Babbar", "Sahil Bansal", "Sandeep Bhandari", "Sanjay Khurana", "Sanjeev Kumar", "Satinder K Bhatnagar", "Shakti Singh", "Shyam Sundar", "Sukhdev Singh", "Sunil Sachdeva", "Surinder Kumar Knl.", "Suresh Kumar", "Susheel Verma", "Tilak Raj Arora", "Tarun Sharma", "Vinay Kumar", "Yogesh Madan"];
const WEDNESDAY_LIST = ["Surjit Singh", "Gautam Kapoor", "Jatin Batra", "Ajit Singh", "Vinod Gaba", "Aalok Khurana", "Akash", "Akshay Verma", "Aman Arora", "Amit Sachdeva", "Anil Kumar", "Anil Pandit", "Ankur Minocha", "Ankush Wadhwa", "Anmol", "Anmol Thakur", "Arshdeep Singh", "Arun", "Arun Saini", "Arun Varma", "Ashish Kumar Yadav", "Ashok Arora", "Ashok Chawla", "Ashok Kumar", "Ashwani Narang", "Badal Manchanda", "B.C.Kandpal", "Brijesh", "Chander Chhokra", "Davinder Singh", "Deepak Miglani", "Deepak Panchal", "Deepak Seelam Pur", "Devinder Singh Panesar", "Dharam Singh Fbd", "Dinesh Salgotra", "Dr R.V Shastri", "Gagan Deep", "Gaurav Babbar", "Gaurav Batra", "Gaurav Bhati", "Ghanshyam", "Gulshan Gaba", "Gulshan Makkar", "Harbans Lal", "Harish Malik", "Harkesh", "Harsh Sethi", "Inderjeet Singh", "Indrajeet", "Ishan Khurana", "J.K Chawla", "J.K. Bajaj", "Jaipal", "Jasvinder Singh", "Kalp Nath", "Kanhya Lal", "Kapil Arora", "Kapil Dhawan", "Kartik Kohli", "Kaushal Kumar", "Khemchand Solanki", "Krishan Khurana", "Kuldeep Kumar", "Laxman", "Lokesh Kohli", "Lovekush", "Mahender Puniani", "Mahendra Walia", "Manish Bhati", "Mali Ram", "Manoj Anand", "Manoj Narula", "Manoj Sharma", "Mohit Chawla", "Naresh Singh", "Narsingh Sharma", "Neeraj Nagar", "Om Prakash", "Pankaj Gaba", "Paras Gulati", "Parkash Arora", "Parkash Sachdeva", "Partaap", "Parvesh Kumar", "Phoolchand", "Pradeep Kumar", "Praveen Bhutani", "Praveen Sachdeva", "Praveen Sharma", "Praveen(Rohtak)", "Prem Prakash", "Rajan", "Rajeev", "Rajesh Nayak", "Rajesh Thakur", "Rajesh Verma", "Rajesh(Rohtak)", "Rajinder Bajaj", "Rajinder Manocha", "Rajiv Arora", "Rajpal Arora", "Raju Babbar", "Rakesh Kohli", "Rakesh Munjal", "Ram Swaroop", "Ram Swaroop Solanki", "Ramesh Chand", "Ramesh Mittal", "Ramesh Virmani", "Rameshwar Solanki", "Ramji Das Khurana", "Ramswaroop Solanki", "Ritik Kaushik", "Rohit Gaba", "Roshan Lal", "Sagar Kumar", "Saksham Chawla", "Sandeep Malhotra", "Sanjeev Kumar Saini", "Sanjeev Sharma", "Santosh Kumar", "Sat Narain", "Satish (D.P)", "Satish Kumar", "Satyavir Solanki", "Satyawan", "Shiv Kumar", "Shiv Ram", "Shiv Shanker", "Shivam Gulati", "Shivam Khurana", "Sita Ram", "Som Nath", "Subhash Khetrpal", "Sumit Bhatti", "Sumit Bhatia", "Sunder Lal", "Sunil Baweja", "Sunil Kalra", "Sunil Khurana", "Sunil Shadra", "Sunny Ahuja", "Suresh Aneja", "Suresh Kajal", "Surinder Khurana", "Surinder Singh", "Sushil Bansal", "Sushil Narang", "Tejvir Singh", "Umesh Kumar", "Ved Chawla", "Vijay Kumar", "Vinod Gupta", "Vinod Khattar", "Vinod Tuli", "Yogesh Khattar", "Yugam Ganotra"];
const THURSDAY_LIST = ["Gaurav Gaba", "Sanjay Grover", "Satish Aggarwal", "Gurdas Kalucha", "Adarsh Verma", "Akash Babbar", "Aakash Munjal", "Akshay Dhingra", "Akshay Puniyani", "Anil", "Anilkumar", "Anil Pal -Ii", "Ankit Arora", "Ankush Gandhi", "Ankush Grover", "Ankush Shishodia", "Anmol Nagpal", "Anuj Arora", "Anuj Giri", "Ashok Ji", "Bhagwan Singh", "Bijender Singh", "Brij Bhushangiri", "D.L Kapoor", "Deepak Ahuja", "Deepak Khatri", "Dev Malhotra", "Dev Narayan Gaur", "Dharmbir Singh", "Dr. R V Shastri", "Dr. Satyapal Singh", "Dwarka Parsad Rai", "Gulab Singh", "Gulab Prasad", "Hari Chand", "Hari Prakash", "Hat Ram Singh", "Hemant Pahwa", "Hemant Yadav", "Inder Malik", "Jagjeevan Yadav", "Jaipal Singh Rana", "Jitender Kumar", "Jitender Purthi", "Karan Mujal", "Kartik Goswami", "Ketan Gandhi", "Kishore Dhingra", "Lakhpat Raj", "Lokesh Sharma", "Lokman Singh", "Lucky Malhotra", "Mahender Arora", "Manish Agarwal", "Manoj Punyani", "Narayan Kushwaha", "Narendra Kumar", "Naresh Nagpal", "Nav Bahar Singh", "Naveen Gupta", "Ohm Raj Singh", "Pankaj Batra", "Partap Singh", "Parvinder Singh (Manni)", "Pawan Arora", "Pawan Kumar", "Pradeep Kumar Gupta", "Prem Kalucha", "Puneet Giri", "R.L. Soni", "Raj Kumar Sharma", "Rajat Uppal", "Rajeev", "Rajesh Sharma", "Rajesh Verma", "Rakesh Arora", "Rakesh Babber", "Rakesh Kumar", "Ram Kishore", "Ramesh Arora", "Rhitik", "Rohtash", "Sahil Gandhi", "Sahil Punyani", "Satish Saini", "Satish Suryavanshi", "Satnam Sarna", "Satpal", "Satya Prakash", "Shiva", "Shyam Sunder", "Shyam Sunder - Ii", "Sita Ram", "S.N.导", "Sukhdev Singh", "Sumit Suneja", "Surinder Gandhi", "Surinder Sethi", "Tarun Goel", "Tarun Takkar", "Umesh Sharma", "Vicky Verma", "Vijay Popli", "Virender Khurana", "Vikram Kumar", "Yash Pal Ratra", "Yogendra Kumar Rana", "Yogesh Sharma"];

export const FRIDAY_LIST = [
  "Sushil Ahuja", "Mukesh Sehgal", "Rahul Girdhar", "Bijender Singh", "Deepak Seghal", "Sachin Kumar", "Rajender Singh", "Akash Thakral", "Anil Sehgal", "Ashish K Sardana", "Ashok Kr Sharma", "Bhola Shankar", "Devender Kumar", "Hari Chand Bajaj", "Himanshu Sachdeva", "Jeet Singh Juneja", "Neeraj Sachdeva", "Puneet Chachra", "Rajesh Malhotra", "Rajinder Jindal", "Rakesh Arora", 
  "Sarabjeet Singh Bedi", "Rampal", "Shyam Sunder", "Sunil Kumar", "Vijender Solanki", "Krishan Kumar", "H.S.Rana", "Ram Nivas", "Sonu Kumar", "Gurjot Singh", 
  "Umesh Kumar", "Ajay Malik", "Rajiv Arora", "Lokesh Kumar", "Raj Kumar Sharma", "Lakshaya Saraswat", "D L Kapoor", "S संदीप सरस्वती", "Sandeep Saraswat", "Bhagwat Prasad", "Harish Sethi", 
  "Jitender Arora", "Nanak Chand", "Rajinder Khurana", "Gulab Prasad", "Prem Lal", "Jitender Solanki", "Shiv Ram", "Anil Kumar", "Amit Verma", "Mohan Lal Gumber", "Sunil Nagpal"
];
const ORIGINAL_SATURDAY_LIST = ["Harbans Lal Gumber", "Rajan Nagpal", "O.P.Batra", "Ajit Singh", "Akash Kheterpal", "Amar Singh", "Amar Singh Yadav", "Amit Bhutani", "Amrit Lal", "Anil Chawla", "Anil Kumar", "Ankit Khetarpal", "Ankur Bhutani", "Arjun Singh", "Arun Kumar", "Ashok Kumar Sharma", "Ashok Sindal", "Avinash Madan", "Bhushan Lal Thukral", "Dara Singh", "Deepak Chhabra", "Deepak Saini", "Devki Nandan", "Dharam Pal", "Dharamveer Gupta", "Dilip Singh", "Gajender Chauhan", "Gulshan Rajpal", "Gurdarshan", "Gurmeet Singh", "H.L Batra", "Harish", "Hemant", "Himanshu Ahuja", "Hitesh Bhatia", "Jatin Batia", "Jitender Kr", "Jitender Singh", "Joginder Pal", "Joginder Singh", "K.K. Kalra", "K P Singh", "K.R Bhatia", "Kapil Khetarpal", "Kishan Lal Ahuja", "Kunal Bhatia", "L K Nagpal", "Madan Mohan", "Manish Kumar", "Manmohan Ahuja", "Naresh Kumar", "Nirmal Kumar Singh", "Pitamber", "Piyush Anand", "Praveen Malik", "Prem Saluja", "Puneet Ahuja", "Rajesh Gandhi", "Raj Bhadur Singh", "Raj Kumar Sikka", "Rajender Kumar", "Rajinder Gulati", "Rakesh Munjal", "Ram Kumar", "Ram Niwas", "Ramesh Chand", "Ramesh Sharma", "Ranjeet Singh", "Ravinder Singh", "Rishikesh", "Roshan Lal", "Sachin Arora", "Sahil Arora", "Sanjeev Dhawan", "Satish Kr", "Shankar Lal Bhatia", "Shri Krishan", "Shubham Virmani", "Shunty Nagpal", "Som Datt", "Subhash Rathor", "Sudesh Yadav", "Sumit Gambhir", "Surender Singh (Ii)", "Surender Verma", "Surinder Singh", "Sushil Malik", "Tara Chand", "Umed Singh", "Vijay Kumar", "Vijay Singh", "Vipul Bhatia", "Yadvinder Singh", "Yogesh Kumar", "Yogesh Matta"];

export const SATURDAY_REMOVED_NAMES = [
  "Ajun Bhala",
  "Ajun Bhalla",
  "Amar Div Singh",
  "Bhim Singh",
  "Bihan Singh",
  "Darshan Kapoor",
  "Dashrath Singh",
  "Dolat Singh",
  "Gurdarshan",
  "Harpal Singh",
  "Hemant",
  "Kripal Singh",
  "Kunal Bhatia",
  "Lal Babu Yadav",
  "Lala Babu Yadav",
  "Lala Ram",
  "Maanchand Ji",
  "Madan Lal",
  "Mannu Singh",
  "Naveen Kumar",
  "Nirmal Kumar Singh",
  "Jitendra Kumar",
  "Pawan Sharma",
  "Prem Saluja",
  "Raghunath Singh",
  "Rahul Talwar",
  "Raj Pal",
  "Rajan Arora",
  "Rajan Kumar",
  "Rajinder Kumar",
  "Ram Kumar",
  "Rohit Kapur",
  "Santokh Singh",
  "Sat Pal Singh",
  "Shankar Lal Bhatia",
  "Surender",
  "Dilip Singh",
  "Harbans Lala Batra"
];

export function normalizeName(name: string): string {
  if (!name) return "";
  let n = name.toUpperCase().trim();
  n = n.replace(/\s+JI$/g, '');
  n = n.replace(/^DR\s+/g, '');
  n = n.replace(/^MR\s+/g, '');
  n = n.replace(/[^A-Z]/g, '');
  return n;
}

export const SATURDAY_REMOVED_NORMS = new Set(SATURDAY_REMOVED_NAMES.map(normalizeName));

export function isRemovedSaturday(name: string): boolean {
  return SATURDAY_REMOVED_NORMS.has(normalizeName(name));
}

const SATURDAY_LIST = ORIGINAL_SATURDAY_LIST.filter(name => !isRemovedSaturday(name));
const LADIES_MONDAY_DAY_LIST = [
  "KANTA RANI", "JYOTI KHERA", "SUMAN SETHI", "ANITA BHARDWAJ", "CHANCHAL UPPAL (R)", "DAYA SHARMA", "KAMLA RANI (R)", "KAMLESH BHARDWAJ", "KAMLESH DEVI", "KANTA GUPTA", "KIRAN BALA", "KIRAN RAWAL (R)", "KUSUM LATA", "LAXMI GIRI", "MADHU GULATI", "NEELAM CHAWLA", "NEELAM MIGLANI", "NEENA KAUSHIK", "PREM BAJAJ (R)", "PUSHPA TANEJA", "RENU MALIK", "SANTOSH DEVI", "SANTOSH MEHRA", "SAROJ ARORA (R)", "SHAKUNTLA BABBAR", "SHAKUNTLA KHATER(R)", "SHAKUNTLA BAHAL (R)", "SHEELA GABA", "SUDESH ROHILLA", "SUNITA SAINI MONDAY", "SUMAN MIGLANI", "SURESH KUMARI", "SUSHILA CHAWLA", "USHA (TIMARPUR)", "VEENA MUNJAL"
];

const LADIES_MONDAY_NIGHT_LIST = [
  "KANTA RANI", "JYOTI KHERA", "SUMAN SETHI", "CHANCHAL HARJAI", "JOLLY JOHAR", "KAMLESH BHARDWAJ", "KAMLESH VERMA", "KIRAN BALA", "KOSHAL BHUTANI", "MANJU CHAUHAN", "MEENAKSHI", "NEERU BHALLA", "PUSHPA TANEJA", "PUSHPA SINGH", "RENU MALIK", "RESHMA YADAV", "SANTOSH MEHRA", "SHAKUNTLA BABBAR", "SHASHI GAMBHIR", "SUDESH BATRA", "SUDESH ROHILLA", "SUNITA VERMA", "USHA (TIMARPUR)"
];

const LADIES_TUESDAY_DAY_LIST = [
  "GEETA OHRI", "ANITA SETHI", "ANITA MAKKAR", "BABLI", "CHANDER NAINWALL", "DARSHNA DUA", "JOLLY JOHAR", "JYOTI MALHOTRA", "KAMLESH ARORA", "KANTA GUPTA", "MAHAK CHAWLA", "NEERU CHOPRA", "RENU MANGLAI", "RAM WATI", "RESHMA YADAV"
];

const LADIES_TUESDAY_NIGHT_LIST = [
  "SHIKHA", "SUNITA VERMA", "USHA ARORA", "SATYA MANOCHA", "RANI GUMBER", "JYOTI KHERA", "TARUNA", "SANTOSH DUHAN", "PUSHPA SINGH", "NEERU BHALLA", "SANTOSH SEHRAWAT"
];

const LADIES_WEDNESDAY_DAY_LIST = [
  "SUMAN SETHI", "KAMLESH VERMA", "PINKI CHOPRA", "RAMA ARORA", "KANTA GUPTA", "SANTOSH MEHRA", "SNEH CHUGH", "KANTA ARORA", "SUMAN SHARMA", "ANITA BHARDWAJ", "KRISHNA DEVI", "BIMLA DATTA", "NEERU CHOPRA", "NIRMALA", "SURESH RANI", "KAMLESH BHARDWAJ", "SUNITA SAINI", "RAJESWARI", "RACHNA", "VIJAY LAXMI", "GEETA OHRI", "SHASHI TULLY", "PUSHPA HANS", "SANTOSH DUHAN", "KOSHAL BUTANI", "SUDESH BATRA"
];

const LADIES_WEDNESDAY_NIGHT_LIST = [
  "SUMAN SETHI", "ARATI KOHLI", "PUSHPA SINGH", "MANJU CHAUHAN", "JOLLY", "GEETA OHRI", "RESHMA YADAV", "SUDESH BATRA", "ANITA MAKKAR", "SHASHI MANOCHA", "NEERU CHOPRA", "KAMLESH VERMA", "SANTOSH MEHRA", "NEELAM CHOKRA", "NEELAM VERMA", "SANTOSH DUHAN", "RENU SINGLA", "SUMITRA YADAV", "MEENAKSHI", "PINKI", "JYOTI MALHOTRA", "SHIKHA AHUJA", "SATYA MANOCHA", "VIJAY LAXMI"
];

const LADIES_THURSDAY_DAY_LIST = [
  "ASHA KAPOOR", "BHARTI UDAR", "CHANDA GUPTA", "JOLLY JOHAR", "KAMLESH BHARDWAJ",
  "KANTA SHARMA", "KUSUM LATA RAJPUT", "KANTA GUPTA", "DAYA SHARMA", "BIMLA DHINGRA",
  "KUNTI DEVI", "MADHU GULATI", "NEELAM MIGLANI", "NIRMLA DEVI", "PUSHPA TANEJA",
  "RANI GUMBER", "RANI NANGLOI", "RENU MALIK", "RENU GUPTA", "RESHMA YADAV",
  "SANTOSH DEVI", "SANTOSH DUHAN", "SHASHI GAMBHIR", "SHEELA GABA", "SUMITRA ATRI",
  "SUSHMA BHUTANI", "VEENA GHERA", "PUSHPA SIKKA", "LAXMI DEVI", "RAJ VEER",
  "RAJESHWARI", "SAKSHI LUTHRA", "ASHA DEVI", "VIJAY LAXMI", "MEENA",
  "NEEMA", "KUSUM", "ANJALI", "SUMAN", "PINKI ANSHU"
];

const LADIES_THURSDAY_NIGHT_LIST = [
  "PUSHPA TANEJA", "ANITA MAKKAR", "ANITA SETHI", "GEETA OHRI", "SUDESH BATHRA",
  "SATYA MANOCHA", "SUMAN SETHI", "SANTOSH MEHRA", "SAMITRA YADAV", "CHANDRA NAILWAL",
  "PUSHPA SINGH", "MANJU CHAUHAN", "SUNITA VERMA", "RASHMA YADAV", "SANTOSH DUHAN",
  "JYOTI MALHOTRA", "BHUMIKA", "KAMLESH VERMA", "MEENAKSHI", "JOLLY",
  "YOGITA CHAWLA"
];

const LADIES_FRIDAY_DAY_LIST = [
  "Bimla Dutta", "Darshna Dua", "Kamesh Arora", "Kanta Gupta", "Kamesh Saini", 
  "Kanta Sharma", "Neelam Verma", "Pooja Kheterpal", "Pushpa Singh", "Pushpa Taneja", 
  "Rani Gumber", "Raj Chabra", "Santosh Duhan", "Shashi Manocha", "Sunita Saini", 
  "Usha (Timarpur)", "Usha Dhingra", "Usha Arora", "Asha Narang", "Renu Sharma", 
  "Laxmi", "Neema", "Meena", "Harjeet Kaur", "Suman Sharma"
];

const LADIES_SATURDAY_DAY_LIST = [
  "Alka Verma", "Anju Grover", "Babli", "Daya Sharma", "Geeta Ohri", 
  "Jyoti Malhotra", "Kamlesh Bhardwaj", "Kanta Gupta", "Kusum Lata", "Manju Chauhan", 
  "Meenakshi", "Meenu Chopra", "Neelam Verma", "Neema", "Neeru Saini", 
  "Pooja", "Pooja Khetrapal", "Rachna", "Rajeshwari", "Rama Chhabra", 
  "Ramvati", "Rani Grover", "Rani Raj Kumari", "Reshma Yadav", "Ritu Saluja", 
  "Sarda Rana", "Santosh", "Santosh Malik", "Satya Manocha", "Shashi Manocha", 
  "Sudesh Batra", "Suman Sharma", "Sumitra Atri", "Sunita Mehta", "Sunita Verma", 
  "Sushila Sharma", "Veena Chauhan", "Vimla Datta", "Visho Devi"
];

const LADIES_SUNDAY_DAY_LIST = [
  "Jyoti khera", "Anita makkar", "Mamta sharma", "Mehak chawla", "Nee na kharbanda", 
  "Nisha rani", "Neeru Bhalla", "Rachna kapoor", "Ruchika soni", "Sheel Khera", 
  "Taruna Seth", "Suman Bhatia", "Neelam Narula", "Asha Rani.", "Preeti Arora", 
  "Chanderma."
];

const LADIES_LIST = ["AARTI KOHLI", "ALKA VERMA", "ANITA AHUJA", "ANITA SETHI", "ANITA MAKKAR", "ASHA KAPOOR", "BHARTI UDAR", "BHAGWATI SHARMA", "BIMAL KHARBANDA", "BIMLA DHINGRA", "BIMLA DUTT", "BIMLESH SISODIA", "CHANDER ARORA", "CHANDRA NAILWAL", "DARSHNA DUA", "DINESH DEVI", "GEETA PANIPAT", "JYOTI MALHOTRA", "KAMLESH ARORA", "KAMLESH SAINI", "KANTA ARORA", "KANTA SHARMA", "KARMAWALI", "KRISHNA DEVI", "KUNTI DEVI", "KUSUM LATA RAJPUT", "LALITA GANDHI", "LAJYA WANTI", "LAXMI SOLANKI", "MAMTA AHUJA", "MAMTA SAINI", "MAMTA SHARMA", "MAYA KAJAL", "NEELAM CHOKRA", "NEELAM GANDHI", "NEELAM NARULA", "NEELAM VERMA", "NEENA KHARBANDA", "NEERU BUDHIRAJA", "NEERU CHOPRA", "NEERU SAINI", "NIRMAL RANA", "NIRMLA DEVI", "NISHA RANI", "OM WATI", "PAWAN KUMARI", "PHOOL WATI", "POONAM KHANDAN", "PINKI CHOPRA", "PUSHPA HANS", "PUSHPA SHARMA", "RACHNA", "RAJ CHHABRA", "RAM WATI", "RAMA ARORA", "RAMA CHAUHAN", "RANI (NANGLOI)", "RANI RAJKUMARI", "RANU SINGHLA", "RAVI KANTA", "RUCHIKA SONI", "SANTOSH BHANOT", "SANTOSH DUHAN", "SANTOSH NANDA", "SANTOSH SAHRAWAT", "SANTOSH VERMA", "SANYOGITA AHUJA", "SATYA MANOCHA", "SAVITRI (PALWAL)", "SHAKUNTLA SINGH", "SHASHI MANOCHA", "SHEEL CHAWLA", "SHEEL KHERA", "SHIKHA AHUJA", "SHRUTI", "SNEH CHUGH", "SUDESH SINGH", "SUMAN BHATIA", "SUMAN SHARMA", "SUNITA DUA", "SUNITA MEHRA", "SUNITA SAINI", "SUMITRA YADAV", "SUSHILA SHARMA", "SUSHMA BHUTANI", "SWARNA GANDHI", "TARUNA SETH", "USHA ARORA", "USHA DHINGRA", "USHA RANI", "VANISHA GROVER", "VEENA CHAUHAN", "VEENA GHERA", "VIJAY LAXMI", "VISHO DEVI"];

const GROUP_INCHARGES: Record<string, string[]> = {
  'Monday': MONDAY_LIST.slice(0, 3),
  'Tuesday': TUESDAY_LIST.slice(0, 3),
  'Wednesday': WEDNESDAY_LIST.slice(0, 3),
  'Thursday': THURSDAY_LIST.slice(0, 3),
  'Friday': FRIDAY_LIST.slice(0, 3),
  'Saturday': SATURDAY_LIST.slice(0, 3),
  'Sunday': SUNDAY_LIST.slice(0, 3),
  'Ladies': ['KIRAN BALA']
};

const LADIES_GROUP_INCHARGES: Record<string, string[]> = {
  'Monday': ['Kanta Rani', 'Kiran Bala', 'Sudesh Rohila'],
  'Tuesday': ['Kanta Rani', 'Geeta Ohri', 'Anita Sethi'],
  'Wednesday': ['Kanta Rani', 'Suman Sethi', 'Kamlesh Verma'],
  'Thursday': ['Kanta Rani', 'Pushpa Taneja', 'Jolly'],
  'Friday': ['Kanta Rani', 'Rani Gumber', 'Pushpa Singh', 'Jyoti Khera'],
  'Saturday': ['Kanta Rani', 'Rani Gumber', 'Manju Chauhan', 'Sunita Verma'],
  'Sunday': ['Kanta Rani', 'Jyoti Khera', 'Mehak Chawla']
};

const generateVolunteers = (): Volunteer[] => {
  const vols: Volunteer[] = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Ladies'];
  
  GENTS_GROUPS.forEach(day => {
    const inchargeNames = GROUP_INCHARGES[day] || [`${day} Incharge 1`, `${day} Incharge 2`, `${day} Incharge 3`];
    const prefix = days.includes(day) 
      ? day.toLowerCase().substring(0, 3) 
      : day.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8);
      
    inchargeNames.forEach((name, i) => {
      vols.push({
        id: `v_${prefix}_${i + 1}`,
        name: name,
        role: 'Gents Admin',
        password: '111',
        assignedGroup: day
      });
    });
  });
  
  LADIES_GROUPS.forEach(day => {
    const inchargeNames = LADIES_GROUP_INCHARGES[day] || [`Ladies ${day} Incharge 1`];
    const prefix = days.includes(day) 
      ? day.toLowerCase().substring(0, 3) 
      : day.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8);
      
    inchargeNames.forEach((name, i) => {
      vols.push({
        id: `v_ladies_${prefix}_${i + 1}`,
        name: name,
        role: 'Ladies Admin',
        password: '222',
        assignedGroup: day
      });
    });
  });

  // Keep the original generic Ladies group for compatibility if needed
  vols.push({
    id: `v_ladies_generic`,
    name: 'Ladies Incharge',
    role: 'Ladies Admin',
    password: '222',
    assignedGroup: 'Ladies'
  });

  vols.push({ id: 'sa', name: 'Super Admin', role: 'Super Admin', password: '000' });
  vols.push({ id: 'admin', name: 'Admin', role: 'Super Admin', password: '123' });
  return vols;
};

export const VOLUNTEERS: Volunteer[] = generateVolunteers();

const generateInitialSewadars = (): Sewadar[] => {
  const sewadars: Sewadar[] = [];
  const addList = (list: string[], group: DutyGroup) => {
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

  // Monday Ladies Day Shift
  LADIES_MONDAY_DAY_LIST.forEach((name, i) => {
    sewadars.push({ id: `L-Monday-Day-${i}`, name: name, gender: 'Ladies', group: 'Monday', shift: 'DAY' });
  });
  // Monday Ladies Night Shift
  LADIES_MONDAY_NIGHT_LIST.forEach((name, i) => {
    // Check if already added in Day shift to avoid duplicate IDs if name is same, 
    // but they are different shifts so they should be separate entries if they can work both,
    // or we just use a unique ID.
    sewadars.push({ id: `L-Monday-Night-${i}`, name: name, gender: 'Ladies', group: 'Monday', shift: 'NIGHT' });
  });

  // Tuesday Ladies Day Shift
  LADIES_TUESDAY_DAY_LIST.forEach((name, i) => {
    sewadars.push({ id: `L-Tuesday-Day-${i}`, name: name, gender: 'Ladies', group: 'Tuesday', shift: 'DAY' });
  });
  // Tuesday Ladies Night Shift
  LADIES_TUESDAY_NIGHT_LIST.forEach((name, i) => {
    sewadars.push({ id: `L-Tuesday-Night-${i}`, name: name, gender: 'Ladies', group: 'Tuesday', shift: 'NIGHT' });
  });

  // Wednesday Ladies Day Shift
  LADIES_WEDNESDAY_DAY_LIST.forEach((name, i) => {
    sewadars.push({ id: `L-Wednesday-Day-${i}`, name: name, gender: 'Ladies', group: 'Wednesday', shift: 'DAY' });
  });
  // Wednesday Ladies Night Shift
  LADIES_WEDNESDAY_NIGHT_LIST.forEach((name, i) => {
    sewadars.push({ id: `L-Wednesday-Night-${i}`, name: name, gender: 'Ladies', group: 'Wednesday', shift: 'NIGHT' });
  });

  // Thursday Ladies Day Shift
  LADIES_THURSDAY_DAY_LIST.forEach((name, i) => {
    sewadars.push({ id: `L-Thursday-Day-${i}`, name: name, gender: 'Ladies', group: 'Thursday', shift: 'DAY' });
  });
  // Thursday Ladies Night Shift
  LADIES_THURSDAY_NIGHT_LIST.forEach((name, i) => {
    sewadars.push({ id: `L-Thursday-Night-${i}`, name: name, gender: 'Ladies', group: 'Thursday', shift: 'NIGHT' });
  });
  
  // Friday Ladies Day Shift
  LADIES_FRIDAY_DAY_LIST.forEach((name, i) => {
    sewadars.push({ id: `L-Friday-Day-${i}`, name: name, gender: 'Ladies', group: 'Friday', shift: 'DAY' });
  });

  // Saturday Ladies Day Shift
  LADIES_SATURDAY_DAY_LIST.forEach((name, i) => {
    sewadars.push({ id: `L-Saturday-Day-${i}`, name: name, gender: 'Ladies', group: 'Saturday', shift: 'DAY' });
  });

  // Sunday Ladies Day Shift
  LADIES_SUNDAY_DAY_LIST.forEach((name, i) => {
    sewadars.push({ id: `L-Sunday-Day-${i}`, name: name, gender: 'Ladies', group: 'Sunday', shift: 'DAY' });
  });

  LADIES_LIST.forEach((name, i) => {
    sewadars.push({ id: `L-Ladies-${i}`, name: name, gender: 'Ladies', group: 'Ladies' });
  });

  // Back Office Departments
  HR_DEPARTMENT_SEWADARS.forEach((s, i) => {
    sewadars.push({ id: `BO-HR-${i}`, name: s.name, gender: s.gender, group: 'HR Department' });
  });
  LOST_AND_FOUND_SEWADARS.forEach((s, i) => {
    sewadars.push({ id: `BO-LF-${i}`, name: s.name, gender: s.gender, group: 'Lost and Found' });
  });
  PR_DEPARTMENT_SEWADARS.forEach((s, i) => {
    sewadars.push({ id: `BO-PR-${i}`, name: s.name, gender: s.gender, group: 'PR Department' });
  });
  LANGAR_DEPARTMENT_SEWADARS.forEach((s, i) => {
    sewadars.push({ id: `BO-LD-${i}`, name: s.name, gender: s.gender, group: 'Langar Department' });
  });
  CCTV_VISION_TEAM_SEWADARS.forEach((s, i) => {
    sewadars.push({ id: `BO-CV-${i}`, name: s.name, gender: s.gender, group: 'CCTV Vision Team' });
  });
  CCTV_MAINTENANCE_SEWADARS.forEach((s, i) => {
    sewadars.push({ id: `BO-CM-${i}`, name: s.name, gender: s.gender, group: 'CCTV Maintenance' });
  });

  return sewadars;
};

interface RawDetail {
  name: string;
  phone: string;
  dob?: string;
}

interface RawSewadar {
  name: string;
  gender: 'Gents' | 'Ladies';
}

const HR_DEPARTMENT_RAW: RawDetail[] = [
  { name: "Aastha", phone: "9911056336", dob: "1985-07-09" },
  { name: "Karuna", phone: "8630035012", dob: "1987-03-10" },
  { name: "Neha", phone: "8076281164", dob: "1975-05-09" },
  { name: "Sonal Gaba", phone: "7015643384", dob: "1975-05-06" }
];

const LOST_AND_FOUND_RAW: RawDetail[] = [
  { name: "Gurdas Kalucha", phone: "991013663" },
  { name: "Prem Kalucha", phone: "9315290633" },
  { name: "Vinod Gaba", phone: "9250318917" }
];

const PR_DEPARTMENT_RAW: RawDetail[] = [
  { name: "Astha Gaba", phone: "9911056336" },
  { name: "Karuna", phone: "8630035012" },
  { name: "Rekha Jangra", phone: "9971346781" }
];

const LANGAR_DEPARTMENT_RAW: RawDetail[] = [
  { name: "Devesh", phone: "9268761510" },
  { name: "Rekha", phone: "9971346781" },
  { name: "Tanish", phone: "8076078080" }
];

const CCTV_VISION_TEAM_RAW: RawDetail[] = [
  { name: "Aman Ahuja", phone: "7982069243" },
  { name: "Aneesha", phone: "9996992313" },
  { name: "Ankur", phone: "7060116665" },
  { name: "Arun", phone: "9990603117" },
  { name: "Arushi Malhotra", phone: "8459343372" },
  { name: "Bharti", phone: "9818198952" },
  { name: "Chandan", phone: "7322957609" },
  { name: "Garima", phone: "7988697504" },
  { name: "Gitesh", phone: "8800431669" },
  { name: "Kamiya", phone: "9873022151" },
  { name: "Kuldeep", phone: "9990803480" },
  { name: "Lakshay", phone: "8700891382" },
  { name: "Meera", phone: "9891120340" },
  { name: "Nipun", phone: "9205291008" },
  { name: "Parvati", phone: "8588809815" },
  { name: "Pency", phone: "9996169757" },
  { name: "Piyush", phone: "7404205154" },
  { name: "Prahbjot", phone: "9877129970" },
  { name: "Ravinder", phone: "9315449243" },
  { name: "Sumit Bhatia", phone: "8527950443" },
  { name: "Yogita", phone: "8527461433" }
];

const CCTV_MAINTENANCE_RAW: RawDetail[] = [
  { name: "Arun", phone: "9355520022" },
  { name: "Gagan Arora", phone: "9958791791" },
  { name: "Manish", phone: "9876151831" },
  { name: "Naresh", phone: "6367924328" },
  { name: "Ramesh Chawla", phone: "9996092274" },
  { name: "Sachin", phone: "9996060550" },
  { name: "Sahil", phone: "7827530356" },
  { name: "Sitaram", phone: "8130485736" },
  { name: "Sunil", phone: "9953350947" },
  { name: "Sunny", phone: "8570891415" },
  { name: "Sushil", phone: "9017222930" },
  { name: "Vikram Saini", phone: "9212718904" },
  { name: "Vinod", phone: "9215552877" }
];

const HR_DEPARTMENT_SEWADARS: RawSewadar[] = [
  { name: "Aastha", gender: "Ladies" },
  { name: "Karuna", gender: "Ladies" },
  { name: "Neha", gender: "Ladies" },
  { name: "Sonal Gaba", gender: "Ladies" }
];

const LOST_AND_FOUND_SEWADARS: RawSewadar[] = [
  { name: "Gurdas Kalucha", gender: "Gents" },
  { name: "Prem Kalucha", gender: "Gents" },
  { name: "Vinod Gaba", gender: "Gents" }
];

const PR_DEPARTMENT_SEWADARS: RawSewadar[] = [
  { name: "Astha Gaba", gender: "Ladies" },
  { name: "Karuna", gender: "Ladies" },
  { name: "Rekha Jangra", gender: "Ladies" }
];

const LANGAR_DEPARTMENT_SEWADARS: RawSewadar[] = [
  { name: "Devesh", gender: "Gents" },
  { name: "Rekha", gender: "Ladies" },
  { name: "Tanish", gender: "Gents" }
];

const CCTV_VISION_TEAM_SEWADARS: RawSewadar[] = [
  { name: "Aman Ahuja", gender: "Gents" },
  { name: "Aneesha", gender: "Ladies" },
  { name: "Ankur", gender: "Gents" },
  { name: "Arun", gender: "Gents" },
  { name: "Arushi Malhotra", gender: "Ladies" },
  { name: "Bharti", gender: "Ladies" },
  { name: "Chandan", gender: "Gents" },
  { name: "Garima", gender: "Ladies" },
  { name: "Gitesh", gender: "Gents" },
  { name: "Kamiya", gender: "Ladies" },
  { name: "Kuldeep", gender: "Gents" },
  { name: "Lakshay", gender: "Gents" },
  { name: "Meera", gender: "Ladies" },
  { name: "Nipun", gender: "Gents" },
  { name: "Parvati", gender: "Ladies" },
  { name: "Pency", gender: "Ladies" },
  { name: "Piyush", gender: "Gents" },
  { name: "Prahbjot", gender: "Gents" },
  { name: "Ravinder", gender: "Gents" },
  { name: "Sumit Bhatia", gender: "Gents" },
  { name: "Yogita", gender: "Ladies" }
];

const CCTV_MAINTENANCE_SEWADARS: RawSewadar[] = [
  { name: "Arun", gender: "Gents" },
  { name: "Gagan Arora", gender: "Gents" },
  { name: "Manish", gender: "Gents" },
  { name: "Naresh", gender: "Gents" },
  { name: "Ramesh Chawla", gender: "Gents" },
  { name: "Sachin", gender: "Gents" },
  { name: "Sahil", gender: "Gents" },
  { name: "Sitaram", gender: "Gents" },
  { name: "Sunil", gender: "Gents" },
  { name: "Sunny", gender: "Gents" },
  { name: "Sushil", gender: "Gents" },
  { name: "Vikram Saini", gender: "Gents" },
  { name: "Vinod", gender: "Gents" }
];

export const INITIAL_SEWADARS = generateInitialSewadars();

export const INITIAL_SEWADAR_DETAILS: Record<string, SewadarDetails> = {};

HR_DEPARTMENT_RAW.forEach((r, i) => {
  INITIAL_SEWADAR_DETAILS[`BO-HR-${i}`] = { sewadar_id: `BO-HR-${i}`, address: '', dob: r.dob || '', phone: r.phone };
});
LOST_AND_FOUND_RAW.forEach((r, i) => {
  INITIAL_SEWADAR_DETAILS[`BO-LF-${i}`] = { sewadar_id: `BO-LF-${i}`, address: '', dob: r.dob || '', phone: r.phone };
});
PR_DEPARTMENT_RAW.forEach((r, i) => {
  INITIAL_SEWADAR_DETAILS[`BO-PR-${i}`] = { sewadar_id: `BO-PR-${i}`, address: '', dob: r.dob || '', phone: r.phone };
});
LANGAR_DEPARTMENT_RAW.forEach((r, i) => {
  INITIAL_SEWADAR_DETAILS[`BO-LD-${i}`] = { sewadar_id: `BO-LD-${i}`, address: '', dob: r.dob || '', phone: r.phone };
});
CCTV_VISION_TEAM_RAW.forEach((r, i) => {
  INITIAL_SEWADAR_DETAILS[`BO-CV-${i}`] = { sewadar_id: `BO-CV-${i}`, address: '', dob: r.dob || '', phone: r.phone };
});
CCTV_MAINTENANCE_RAW.forEach((r, i) => {
  INITIAL_SEWADAR_DETAILS[`BO-CM-${i}`] = { sewadar_id: `BO-CM-${i}`, address: '', dob: r.dob || '', phone: r.phone };
});
