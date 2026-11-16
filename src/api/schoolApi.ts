import type {
  AttendanceRecord,
  ExamSchedule,
  ExpenseRecord,
  GradeRecord,
  Invoice,
  LibraryItem,
  LibraryLoan,
  NotificationLog,
  PaymentMethod,
  Program,
  SchoolClass,
  SchoolDatabase,
  StaffAttendanceLog,
  Student,
  TeacherStaff,
} from '../types/school.ts';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const schoolApi = {
  bootstrap: () => request<SchoolDatabase>('/api/bootstrap'),
  resetDemo: () => request<SchoolDatabase>('/api/reset', { method: 'POST' }),

  createStudent: (payload: Partial<Student> & { generateInvoice?: boolean }) =>
    request<{ student: Student; invoice: Invoice | null; grade: GradeRecord }>('/api/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateStudent: (id: string, payload: Partial<Student>) =>
    request<Student>(`/api/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  saveAttendanceBulk: (payload: {
    date: string;
    classId: string;
    records: Array<{ studentId: string; status: AttendanceRecord['status']; note?: string }>;
    notifyAbsent?: boolean;
  }) =>
    request<{ saved: number; notifications: NotificationLog[] }>('/api/attendance/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createTeacher: (payload: Partial<TeacherStaff>) =>
    request<TeacherStaff>('/api/teachers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateTeacher: (id: string, payload: Partial<TeacherStaff>) =>
    request<TeacherStaff>(`/api/teachers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  logStaffAttendance: (payload: Omit<StaffAttendanceLog, 'id'>) =>
    request<{ log: StaffAttendanceLog; teacher?: TeacherStaff }>('/api/staff-attendance', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createClass: (payload: Partial<SchoolClass>) =>
    request<SchoolClass>('/api/classes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateClass: (id: string, payload: Partial<SchoolClass>) =>
    request<SchoolClass>(`/api/classes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  createProgram: (payload: Partial<Program>) =>
    request<Program>('/api/programs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createExam: (payload: Partial<ExamSchedule>) =>
    request<ExamSchedule>('/api/exams', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  saveGrade: (payload: GradeRecord) =>
    request<GradeRecord>('/api/grades', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createInvoice: (payload: {
    studentId: string;
    term: string;
    description: string;
    tuitionAmount: number;
    bookFee: number;
    discountPercent: number;
    dueDate: string;
  }) =>
    request<Invoice>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  payInvoice: (id: string, payload: { amount: number; method: PaymentMethod; receivedBy?: string; reference?: string }) =>
    request<Invoice>(`/api/invoices/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  payPayroll: (id: string, payload: { bonus?: number; deductions?: number }) =>
    request<{ payroll: SchoolDatabase['payroll'][number]; expenses: ExpenseRecord[] }>(`/api/payroll/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createExpense: (payload: Partial<ExpenseRecord>) =>
    request<ExpenseRecord>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  sendNotification: (payload: Partial<NotificationLog>) =>
    request<NotificationLog>('/api/notifications', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createLibraryItem: (payload: Partial<LibraryItem>) =>
    request<LibraryItem>('/api/library/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createLibraryLoan: (payload: Partial<LibraryLoan>) =>
    request<{ loan: LibraryLoan; item: LibraryItem }>('/api/library/loans', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  returnLibraryLoan: (id: string) =>
    request<{ loan: LibraryLoan; item: LibraryItem }>(`/api/library/loans/${id}/return`, {
      method: 'POST',
    }),
};
