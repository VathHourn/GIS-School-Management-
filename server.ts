import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { loadDatabase, resetDatabase, saveDatabase } from './server/db.ts';
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
  StaffAttendanceLog,
  Student,
  TeacherStaff,
} from './src/types/school.ts';

function computeGradeLetter(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '4mb' }));

  // Bootstrap full database
  app.get('/api/bootstrap', (_req, res) => {
    const db = loadDatabase();
    res.json(db);
  });

  app.post('/api/reset', (_req, res) => {
    const fresh = resetDatabase();
    res.json(fresh);
  });

  // Students
  app.post('/api/students', (req, res) => {
    const db = loadDatabase();
    const payload = req.body as Partial<Student> & { generateInvoice?: boolean };
    const nextNum = db.students.length + 1;
    const year = new Date().toISOString().slice(0, 4);
    const today = new Date().toISOString().slice(0, 10);
    const cls = db.classes.find((c) => c.id === payload.classId) ?? db.classes[0];
    const prog = db.programs.find((p) => p.id === (payload.programId || cls.programId)) ?? db.programs[0];

    const newStudent: Student = {
      id: `stu-${Date.now()}`,
      studentCode: `GIS-${year}-${String(nextNum).padStart(3, '0')}`,
      nameKh: payload.nameKh?.trim() || 'សិស្សថ្មី',
      nameEn: payload.nameEn?.trim() || 'New Student',
      gender: payload.gender || 'Male',
      dob: payload.dob || '2012-05-15',
      phone: payload.phone || payload.guardianPhone || '012 000 000',
      guardianName: payload.guardianName?.trim() || 'អាណាព្យាបាល',
      guardianPhone: payload.guardianPhone?.trim() || '012 000 000',
      telegramUsername: payload.telegramUsername?.trim() || '',
      programId: prog.id,
      classId: cls.id,
      level: payload.level || cls.level,
      shift: payload.shift || cls.shift,
      scholarshipPercent: Number(payload.scholarshipPercent ?? 0),
      enrollmentDate: today,
      status: 'Active',
      notes: payload.notes,
    };

    db.students.unshift(newStudent);

    // Initialize grade entry
    const newGrade: GradeRecord = {
      id: `grd-${newStudent.id}`,
      studentId: newStudent.id,
      classId: cls.id,
      term: db.schoolProfile.currentTerm,
      listening: 75,
      speaking: 75,
      reading: 75,
      writing: 75,
      midterm: 75,
      final: 75,
      totalScore: 75,
      gradeLetter: 'C',
      teacherComment: 'សិស្សទើបចុះឈ្មោះចូលរៀនថ្មី។',
    };
    db.grades.unshift(newGrade);

    let createdInvoice: Invoice | null = null;
    if (payload.generateInvoice !== false) {
      const discount = newStudent.scholarshipPercent;
      const netAmount = Math.round((prog.termTuitionUsd * (1 - discount / 100) + prog.bookFeeUsd) * 100) / 100;
      const due = new Date();
      due.setDate(due.getDate() + 7);
      createdInvoice = {
        id: `inv-${Date.now()}`,
        invoiceNo: `INV-${year}-${1000 + db.invoices.length + 1}`,
        studentId: newStudent.id,
        term: db.schoolProfile.currentTerm,
        description: `${prog.code} (${newStudent.level}) — ថ្លៃសិក្សា និងសៀវភៅ`,
        tuitionAmount: prog.termTuitionUsd,
        bookFee: prog.bookFeeUsd,
        discountPercent: discount,
        netAmount,
        paidAmount: 0,
        issueDate: today,
        dueDate: due.toISOString().slice(0, 10),
        status: 'Unpaid',
        payments: [],
      };
      db.invoices.unshift(createdInvoice);
    }

    saveDatabase(db);
    res.json({ student: newStudent, invoice: createdInvoice, grade: newGrade });
  });

  app.patch('/api/students/:id', (req, res) => {
    const db = loadDatabase();
    const idx = db.students.findIndex((s) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Student not found' });
    db.students[idx] = { ...db.students[idx], ...req.body };
    saveDatabase(db);
    res.json(db.students[idx]);
  });

  // Bulk Attendance Roll-Call
  app.post('/api/attendance/bulk', (req, res) => {
    const db = loadDatabase();
    const { date, classId, records, notifyAbsent } = req.body as {
      date: string;
      classId: string;
      records: Array<{ studentId: string; status: AttendanceRecord['status']; note?: string }>;
      notifyAbsent?: boolean;
    };

    const incomingMap = new Map(records.map((r) => [r.studentId, r]));
    db.attendance = db.attendance.filter((a) => !(a.date === date && a.classId === classId));

    const newRows: AttendanceRecord[] = records.map((r) => ({
      id: `att-${date}-${r.studentId}`,
      date,
      classId,
      studentId: r.studentId,
      status: r.status,
      note: r.note,
    }));
    db.attendance.push(...newRows);

    const addedNotifications: NotificationLog[] = [];
    if (notifyAbsent) {
      const cls = db.classes.find((c) => c.id === classId);
      const absentStudents = db.students.filter((s) => incomingMap.get(s.id)?.status === 'Absent');
      if (absentStudents.length > 0) {
        const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
        const log: NotificationLog = {
          id: `notif-${Date.now()}`,
          date: nowStr,
          channel: 'Telegram',
          recipientType: 'Individual',
          recipientLabel: `${absentStudents.length} អាណាព្យាបាល (${cls?.name || classId})`,
          title: `ជូនដំណឹងអវត្តមានសិស្ស ថ្ងៃទី ${date}`,
          message: `សាលា ជី អាយ អេស សូមជូនដំណឹងដល់អាណាព្យាបាលរបស់សិស្ស ${absentStudents.map((s) => s.nameKh).join(', ')} ថាសិស្សអវត្តមានក្នុងថ្នាក់ ${cls?.name || ''}។`,
          status: 'Delivered',
        };
        db.notifications.unshift(log);
        addedNotifications.push(log);
      }
    }

    saveDatabase(db);
    res.json({ saved: newRows.length, notifications: addedNotifications });
  });

  // Teachers & Staff
  app.post('/api/teachers', (req, res) => {
    const db = loadDatabase();
    const payload = req.body as Partial<TeacherStaff>;
    const nextNum = db.teachers.length + 1;
    const teacher: TeacherStaff = {
      id: `t-${Date.now()}`,
      staffCode: `GIS-T${String(nextNum).padStart(3, '0')}`,
      nameKh: payload.nameKh?.trim() || 'គ្រូបង្រៀនថ្មី',
      nameEn: payload.nameEn?.trim() || 'New Teacher',
      role: payload.role?.trim() || 'Language Instructor',
      department: payload.department || 'Academic',
      nationality: payload.nationality || 'Cambodian',
      country: payload.country || 'Cambodia',
      contractType: payload.contractType || 'Full-Time',
      contractEnd: payload.contractEnd || '2027-06-30',
      visaExpiry: payload.nationality === 'Foreign' ? payload.visaExpiry || '2027-02-01' : undefined,
      phone: payload.phone || '012 000 000',
      email: payload.email || 'staff@gis-school.edu.kh',
      baseSalaryUsd: Number(payload.baseSalaryUsd ?? 600),
      hourlyRateUsd: Number(payload.hourlyRateUsd ?? 12),
      loggedHoursMonth: Number(payload.loggedHoursMonth ?? 0),
      status: 'Active',
    };
    db.teachers.push(teacher);
    const currentMonth = new Date().toISOString().slice(0, 7);
    db.payroll.push({
      id: `pr-${currentMonth}-${teacher.id}`,
      staffId: teacher.id,
      month: currentMonth,
      baseSalary: teacher.baseSalaryUsd,
      teachingHours: teacher.loggedHoursMonth,
      hourlyRate: teacher.hourlyRateUsd,
      bonus: 0,
      deductions: 0,
      netPay: teacher.baseSalaryUsd,
      status: 'Pending',
    });
    saveDatabase(db);
    res.json(teacher);
  });

  app.patch('/api/teachers/:id', (req, res) => {
    const db = loadDatabase();
    const idx = db.teachers.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Staff not found' });
    db.teachers[idx] = { ...db.teachers[idx], ...req.body };
    saveDatabase(db);
    res.json(db.teachers[idx]);
  });

  app.post('/api/staff-attendance', (req, res) => {
    const db = loadDatabase();
    const payload = req.body as Omit<StaffAttendanceLog, 'id'>;
    const log: StaffAttendanceLog = {
      id: `sa-${Date.now()}`,
      ...payload,
      teachingHours: Number(payload.teachingHours || 0),
    };
    db.staffAttendance.unshift(log);

    const staff = db.teachers.find((t) => t.id === payload.staffId);
    if (staff) {
      staff.loggedHoursMonth = Math.round((staff.loggedHoursMonth + log.teachingHours) * 10) / 10;
      const pendingPayroll = db.payroll.find((p) => p.staffId === staff.id && p.status === 'Pending');
      if (pendingPayroll) {
        pendingPayroll.teachingHours = staff.loggedHoursMonth;
        const variablePay = staff.department === 'Academic' ? Math.round(staff.loggedHoursMonth * staff.hourlyRateUsd * 0.25) : 0;
        pendingPayroll.netPay = pendingPayroll.baseSalary + variablePay + pendingPayroll.bonus - pendingPayroll.deductions;
      }
    }

    saveDatabase(db);
    res.json({ log, teacher: staff });
  });

  // Classes / Timetable
  app.post('/api/classes', (req, res) => {
    const db = loadDatabase();
    const payload = req.body as Partial<SchoolClass>;
    const cls: SchoolClass = {
      id: `cls-${Date.now()}`,
      name: payload.name || 'New Class',
      programId: payload.programId || db.programs[0].id,
      level: payload.level || 'Level 1',
      shift: payload.shift || 'Morning',
      timeSlot: payload.timeSlot || '08:00 - 10:00',
      days: payload.days || 'Mon - Fri',
      room: payload.room || 'Room 101',
      teacherId: payload.teacherId || db.teachers[0].id,
      capacity: Number(payload.capacity ?? 28),
    };
    db.classes.push(cls);
    saveDatabase(db);
    res.json(cls);
  });

  app.patch('/api/classes/:id', (req, res) => {
    const db = loadDatabase();
    const idx = db.classes.findIndex((c) => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Class not found' });
    db.classes[idx] = { ...db.classes[idx], ...req.body };
    saveDatabase(db);
    res.json(db.classes[idx]);
  });

  // Programs
  app.post('/api/programs', (req, res) => {
    const db = loadDatabase();
    const payload = req.body as Partial<Program>;
    const prog: Program = {
      id: `prog-${Date.now()}`,
      code: payload.code?.toUpperCase() || 'NEW',
      nameKh: payload.nameKh || 'កម្មវិធីសិក្សាថ្មី',
      nameEn: payload.nameEn || 'New Language Program',
      levels: payload.levels && payload.levels.length > 0 ? payload.levels : ['Level 1', 'Level 2'],
      termTuitionUsd: Number(payload.termTuitionUsd ?? 150),
      bookFeeUsd: Number(payload.bookFeeUsd ?? 20),
      durationWeeks: Number(payload.durationWeeks ?? 12),
      modules: payload.modules && payload.modules.length > 0 ? payload.modules : ['Speaking', 'Listening', 'Reading', 'Writing'],
    };
    db.programs.push(prog);
    saveDatabase(db);
    res.json(prog);
  });

  // Exams & Grades
  app.post('/api/exams', (req, res) => {
    const db = loadDatabase();
    const payload = req.body as Partial<ExamSchedule>;
    const exam: ExamSchedule = {
      id: `ex-${Date.now()}`,
      title: payload.title || 'Term Examination',
      programId: payload.programId || db.programs[0].id,
      classId: payload.classId || db.classes[0].id,
      examType: payload.examType || 'Midterm',
      date: payload.date || new Date().toISOString().slice(0, 10),
      time: payload.time || '08:00 - 10:00',
      room: payload.room || 'Room 101',
      proctorId: payload.proctorId || db.teachers[0].id,
    };
    db.exams.unshift(exam);
    saveDatabase(db);
    res.json(exam);
  });

  app.post('/api/grades', (req, res) => {
    const db = loadDatabase();
    const payload = req.body as GradeRecord;
    const midterm = Math.round((Number(payload.listening) + Number(payload.speaking) + Number(payload.reading) + Number(payload.writing)) / 4);
    const finalScore = Number(payload.final);
    const totalScore = Math.round(midterm * 0.4 + finalScore * 0.6);
    const gradeLetter = computeGradeLetter(totalScore);

    const idx = db.grades.findIndex((g) => g.id === payload.id || (g.studentId === payload.studentId && g.classId === payload.classId));
    const updated: GradeRecord = {
      ...payload,
      id: idx !== -1 ? db.grades[idx].id : `grd-${Date.now()}`,
      midterm,
      totalScore,
      gradeLetter,
    };

    if (idx !== -1) {
      db.grades[idx] = updated;
    } else {
      db.grades.unshift(updated);
    }
    saveDatabase(db);
    res.json(updated);
  });

  // Invoices & Payments
  app.post('/api/invoices', (req, res) => {
    const db = loadDatabase();
    const { studentId, term, description, tuitionAmount, bookFee, discountPercent, dueDate } = req.body as {
      studentId: string;
      term: string;
      description: string;
      tuitionAmount: number;
      bookFee: number;
      discountPercent: number;
      dueDate: string;
    };
    const year = new Date().toISOString().slice(0, 4);
    const today = new Date().toISOString().slice(0, 10);
    const netAmount = Math.round((Number(tuitionAmount) * (1 - Number(discountPercent || 0) / 100) + Number(bookFee || 0)) * 100) / 100;

    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNo: `INV-${year}-${1000 + db.invoices.length + 1}`,
      studentId,
      term: term || db.schoolProfile.currentTerm,
      description: description || 'ថ្លៃសិក្សាប្រចាំវគ្គ',
      tuitionAmount: Number(tuitionAmount),
      bookFee: Number(bookFee || 0),
      discountPercent: Number(discountPercent || 0),
      netAmount,
      paidAmount: 0,
      issueDate: today,
      dueDate: dueDate || today,
      status: 'Unpaid',
      payments: [],
    };
    db.invoices.unshift(invoice);
    saveDatabase(db);
    res.json(invoice);
  });

  app.post('/api/invoices/:id/pay', (req, res) => {
    const db = loadDatabase();
    const inv = db.invoices.find((i) => i.id === req.params.id);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    const { amount, method, receivedBy, reference } = req.body as {
      amount: number;
      method: PaymentMethod;
      receivedBy?: string;
      reference?: string;
    };

    const payAmt = Math.min(Number(amount), Math.max(0, inv.netAmount - inv.paidAmount));
    if (payAmt <= 0) return res.status(400).json({ error: 'Invalid payment amount' });

    const today = new Date().toISOString().slice(0, 10);
    inv.payments.push({
      id: `pay-${Date.now()}`,
      date: today,
      amount: payAmt,
      method: method || 'Cash',
      receivedBy: receivedBy || 'Heng Bopha',
      reference: reference || `${(method || 'CSH').slice(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`,
    });
    inv.paidAmount = Math.round((inv.paidAmount + payAmt) * 100) / 100;
    inv.status = inv.paidAmount >= inv.netAmount - 0.01 ? 'Paid' : 'Partial';

    saveDatabase(db);
    res.json(inv);
  });

  // Payroll
  app.post('/api/payroll/:id/pay', (req, res) => {
    const db = loadDatabase();
    const item = db.payroll.find((p) => p.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Payroll record not found' });

    const { bonus, deductions } = req.body as { bonus?: number; deductions?: number };
    if (bonus !== undefined) item.bonus = Number(bonus);
    if (deductions !== undefined) item.deductions = Number(deductions);

    const staff = db.teachers.find((t) => t.id === item.staffId);
    const variablePay = staff?.department === 'Academic' ? Math.round(item.teachingHours * item.hourlyRate * 0.25) : 0;
    item.netPay = Math.round((item.baseSalary + variablePay + item.bonus - item.deductions) * 100) / 100;

    if (item.status !== 'Paid') {
      const today = new Date().toISOString().slice(0, 10);
      item.status = 'Paid';
      item.paidDate = today;
      db.expenses.unshift({
        id: `exp-${Date.now()}`,
        date: today,
        category: 'Payroll',
        description: `ទូទាត់បៀវត្សរ៍ ${staff?.nameKh || staff?.nameEn || item.staffId} (${item.month})`,
        amount: item.netPay,
        paidBy: 'Heng Bopha',
      });
    }

    saveDatabase(db);
    res.json({ payroll: item, expenses: db.expenses });
  });

  // Expenses
  app.post('/api/expenses', (req, res) => {
    const db = loadDatabase();
    const payload = req.body as Partial<ExpenseRecord>;
    const exp: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      date: payload.date || new Date().toISOString().slice(0, 10),
      category: payload.category || 'Utilities',
      description: payload.description || 'ចំណាយប្រតិបត្តិការ',
      amount: Number(payload.amount || 0),
      paidBy: payload.paidBy || 'Heng Bopha',
    };
    db.expenses.unshift(exp);
    saveDatabase(db);
    res.json(exp);
  });

  // Notifications
  app.post('/api/notifications', (req, res) => {
    const db = loadDatabase();
    const payload = req.body as Partial<NotificationLog>;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const notif: NotificationLog = {
      id: `notif-${Date.now()}`,
      date: nowStr,
      channel: payload.channel || 'Telegram',
      recipientType: payload.recipientType || 'All Parents',
      recipientLabel: payload.recipientLabel || 'មាតាបិតាសិស្សទាំងអស់',
      title: payload.title || 'សេចក្ដីជូនដំណឹង',
      message: payload.message || '',
      status: 'Delivered',
    };
    db.notifications.unshift(notif);
    saveDatabase(db);
    res.json(notif);
  });

  // Library / Assets
  app.post('/api/library/items', (req, res) => {
    const db = loadDatabase();
    const payload = req.body as Partial<LibraryItem>;
    const qty = Number(payload.totalStock ?? 20);
    const item: LibraryItem = {
      id: `lib-${Date.now()}`,
      sku: payload.sku || `BK-${Math.floor(100 + Math.random() * 899)}`,
      title: payload.title || 'New Learning Material',
      programId: payload.programId || db.programs[0].id,
      category: payload.category || 'Textbook',
      totalStock: qty,
      availableStock: qty,
      unitPriceUsd: Number(payload.unitPriceUsd ?? 20),
    };
    db.libraryItems.unshift(item);
    saveDatabase(db);
    res.json(item);
  });

  app.post('/api/library/loans', (req, res) => {
    const db = loadDatabase();
    const payload = req.body as Partial<LibraryLoan>;
    const item = db.libraryItems.find((i) => i.id === payload.itemId);
    if (!item || item.availableStock <= 0) {
      return res.status(400).json({ error: 'Item out of stock' });
    }
    item.availableStock -= 1;
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date();
    due.setDate(due.getDate() + 14);
    const loan: LibraryLoan = {
      id: `loan-${Date.now()}`,
      itemId: item.id,
      borrowerName: payload.borrowerName || 'Student',
      borrowerCode: payload.borrowerCode || 'GIS',
      borrowerType: payload.borrowerType || 'Student',
      borrowDate: today,
      dueDate: payload.dueDate || due.toISOString().slice(0, 10),
      returned: false,
    };
    db.libraryLoans.unshift(loan);
    saveDatabase(db);
    res.json({ loan, item });
  });

  app.post('/api/library/loans/:id/return', (req, res) => {
    const db = loadDatabase();
    const loan = db.libraryLoans.find((l) => l.id === req.params.id);
    if (!loan || loan.returned) return res.status(404).json({ error: 'Active loan not found' });
    loan.returned = true;
    loan.returnDate = new Date().toISOString().slice(0, 10);
    const item = db.libraryItems.find((i) => i.id === loan.itemId);
    if (item) {
      item.availableStock = Math.min(item.totalStock, item.availableStock + 1);
    }
    saveDatabase(db);
    res.json({ loan, item });
  });

  // Vite middleware in dev, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GIS International Language School Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
