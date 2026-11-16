export type ShiftType = 'Morning' | 'Afternoon' | 'Evening';
export type StudentStatus = 'Active' | 'Suspended' | 'Graduated';
export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'Excused';
export type InvoiceStatus = 'Paid' | 'Partial' | 'Unpaid' | 'Overdue';
export type PaymentMethod = 'Cash' | 'ABA Bank' | 'ACLEDA' | 'Wing';
export type NationalityType = 'Cambodian' | 'Foreign';
export type ContractType = 'Full-Time' | 'Part-Time';
export type NotificationChannel = 'Telegram' | 'SMS' | 'Portal';
export type ExpenseCategory = 'Payroll' | 'Rent' | 'Utilities' | 'Books & Supplies' | 'Marketing' | 'Maintenance';

export interface SchoolProfile {
  nameKh: string;
  nameEn: string;
  branchName: string;
  address: string;
  phone: string;
  email: string;
  currentTerm: string;
  targetCapacity: number;
}

export interface Program {
  id: string;
  code: string;
  nameKh: string;
  nameEn: string;
  levels: string[];
  termTuitionUsd: number;
  bookFeeUsd: number;
  durationWeeks: number;
  modules: string[];
}

export interface SchoolClass {
  id: string;
  name: string;
  programId: string;
  level: string;
  shift: ShiftType;
  timeSlot: string;
  days: string;
  room: string;
  teacherId: string;
  capacity: number;
}

export interface Student {
  id: string;
  studentCode: string;
  nameKh: string;
  nameEn: string;
  gender: 'Male' | 'Female';
  dob: string;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  telegramUsername: string;
  programId: string;
  classId: string;
  level: string;
  shift: ShiftType;
  scholarshipPercent: number;
  enrollmentDate: string;
  status: StudentStatus;
  notes?: string;
}

export interface TeacherStaff {
  id: string;
  staffCode: string;
  nameKh: string;
  nameEn: string;
  role: string;
  department: 'Academic' | 'Administration' | 'Finance';
  nationality: NationalityType;
  country: string;
  contractType: ContractType;
  contractEnd: string;
  visaExpiry?: string;
  phone: string;
  email: string;
  baseSalaryUsd: number;
  hourlyRateUsd: number;
  loggedHoursMonth: number;
  status: 'Active' | 'On Leave';
  avatarUrl?: string;
}

export interface StaffAttendanceLog {
  id: string;
  staffId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  teachingHours: number;
  status: 'Present' | 'Late' | 'Leave';
  note?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  classId: string;
  studentId: string;
  status: AttendanceStatus;
  note?: string;
}

export interface ExamSchedule {
  id: string;
  title: string;
  programId: string;
  classId: string;
  examType: 'Midterm' | 'Final' | 'Placement';
  date: string;
  time: string;
  room: string;
  proctorId: string;
}

export interface GradeRecord {
  id: string;
  studentId: string;
  classId: string;
  term: string;
  listening: number;
  speaking: number;
  reading: number;
  writing: number;
  midterm: number;
  final: number;
  totalScore: number;
  gradeLetter: string;
  teacherComment: string;
}

export interface PaymentEntry {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  receivedBy: string;
  reference: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  studentId: string;
  term: string;
  description: string;
  tuitionAmount: number;
  bookFee: number;
  discountPercent: number;
  netAmount: number;
  paidAmount: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  payments: PaymentEntry[];
}

export interface PayrollRecord {
  id: string;
  staffId: string;
  month: string;
  baseSalary: number;
  teachingHours: number;
  hourlyRate: number;
  bonus: number;
  deductions: number;
  netPay: number;
  status: 'Paid' | 'Pending';
  paidDate?: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paidBy: string;
}

export interface NotificationLog {
  id: string;
  date: string;
  channel: NotificationChannel;
  recipientType: 'All Parents' | 'Class' | 'Individual';
  recipientLabel: string;
  title: string;
  message: string;
  status: 'Sent' | 'Delivered';
}

export interface LibraryItem {
  id: string;
  sku: string;
  title: string;
  programId: string;
  category: 'Textbook' | 'Workbook' | 'Audio/Kit' | 'Reference';
  totalStock: number;
  availableStock: number;
  unitPriceUsd: number;
}

export interface LibraryLoan {
  id: string;
  itemId: string;
  borrowerName: string;
  borrowerCode: string;
  borrowerType: 'Student' | 'Teacher';
  borrowDate: string;
  dueDate: string;
  returned: boolean;
  returnDate?: string;
}

export interface SchoolDatabase {
  schoolProfile: SchoolProfile;
  programs: Program[];
  classes: SchoolClass[];
  students: Student[];
  teachers: TeacherStaff[];
  staffAttendance: StaffAttendanceLog[];
  attendance: AttendanceRecord[];
  exams: ExamSchedule[];
  grades: GradeRecord[];
  invoices: Invoice[];
  payroll: PayrollRecord[];
  expenses: ExpenseRecord[];
  notifications: NotificationLog[];
  libraryItems: LibraryItem[];
  libraryLoans: LibraryLoan[];
}
