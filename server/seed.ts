import type {
  AttendanceRecord,
  AttendanceStatus,
  ExpenseRecord,
  ExamSchedule,
  GradeRecord,
  Invoice,
  LibraryItem,
  LibraryLoan,
  NotificationLog,
  PayrollRecord,
  Program,
  SchoolClass,
  SchoolDatabase,
  StaffAttendanceLog,
  Student,
  TeacherStaff,
} from '../src/types/school.ts';

function computeGradeLetter(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function createSeedDatabase(): SchoolDatabase {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const year = today.slice(0, 4);

  const dayOffset = (days: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const programs: Program[] = [
    {
      id: 'prog-gep',
      code: 'GEP',
      nameKh: 'កម្មវិធីភាសាអង់គ្លេសទូទៅ (GEP)',
      nameEn: 'General English Program (GEP)',
      levels: ['Starters', 'Movers', 'Flyers', 'GEP Level 1', 'GEP Level 2', 'GEP Level 3', 'GEP Level 4', 'GEP Level 5', 'GEP Level 6'],
      termTuitionUsd: 165,
      bookFeeUsd: 25,
      durationWeeks: 12,
      modules: ['Grammar & Usage', 'Speaking & Pronunciation', 'Listening Lab', 'Academic Reading', 'Guided Writing'],
    },
    {
      id: 'prog-chn',
      code: 'HSK',
      nameKh: 'កម្មវិធីភាសាចិន (Chinese HSK)',
      nameEn: 'Chinese Language Program (HSK 1–6)',
      levels: ['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6'],
      termTuitionUsd: 145,
      bookFeeUsd: 20,
      durationWeeks: 12,
      modules: ['Pinyin & Tones', 'Character Stroke Order', 'Daily Conversation', 'HSK Mock Exam', 'Business Mandarin'],
    },
    {
      id: 'prog-ielts',
      code: 'IELTS',
      nameKh: 'កម្មវិធីត្រៀមប្រឡង IELTS',
      nameEn: 'IELTS Academic Preparation',
      levels: ['Pre-IELTS 5.0', 'IELTS Target 6.5', 'IELTS Intensive 7.5+'],
      termTuitionUsd: 240,
      bookFeeUsd: 35,
      durationWeeks: 10,
      modules: ['Task 1 & 2 Academic Writing', 'Speaking Mock Interviews', 'Skimming & Scanning', 'Listening Section 1–4'],
    },
    {
      id: 'prog-khm',
      code: 'KHM',
      nameKh: 'កម្មវិធីអក្សរសាស្ត្រខ្មែរ (Khmer Academic)',
      nameEn: 'Khmer Academic & Literacy Program',
      levels: ['Khmer Foundation', 'Khmer Intermediate', 'Khmer Rhetoric & Writing'],
      termTuitionUsd: 110,
      bookFeeUsd: 15,
      durationWeeks: 12,
      modules: ['អក្ខរាវិរុទ្ធ និងវេយ្យាករណ៍', 'តែងសេចក្ដី និងសំណេរ', 'ការអាន និងអត្ថបទវិភាគ'],
    },
  ];

  const teachers: TeacherStaff[] = [
    {
      id: 't-01',
      staffCode: 'GIS-T001',
      nameKh: 'លោក ចេមស៍ ខាធើរ',
      nameEn: 'James Carter',
      role: 'Senior IELTS & GEP Instructor',
      department: 'Academic',
      nationality: 'Foreign',
      country: 'United Kingdom',
      contractType: 'Full-Time',
      contractEnd: dayOffset(210),
      visaExpiry: dayOffset(42),
      phone: '012 884 310',
      email: 'james.carter@gis-school.edu.kh',
      baseSalaryUsd: 1450,
      hourlyRateUsd: 22,
      loggedHoursMonth: 88,
      status: 'Active',
      avatarUrl: '/src/assets/images/avatar_teacher_foreign_1794839259601.jpg',
    },
    {
      id: 't-02',
      staffCode: 'GIS-T002',
      nameKh: 'អ្នកនាង អេឡេណា វ៉ែនស៍',
      nameEn: 'Elena Vance',
      role: 'Native English Teacher (GEP)',
      department: 'Academic',
      nationality: 'Foreign',
      country: 'United States',
      contractType: 'Full-Time',
      contractEnd: dayOffset(165),
      visaExpiry: dayOffset(19),
      phone: '017 920 441',
      email: 'elena.vance@gis-school.edu.kh',
      baseSalaryUsd: 1350,
      hourlyRateUsd: 20,
      loggedHoursMonth: 84,
      status: 'Active',
      avatarUrl: '/src/assets/images/avatar_teacher_foreign_1794839259601.jpg',
    },
    {
      id: 't-03',
      staffCode: 'GIS-T003',
      nameKh: 'លោកគ្រូ សុខ វិបុល',
      nameEn: 'Sok Vibol',
      role: 'Cambodian GEP Lead Teacher',
      department: 'Academic',
      nationality: 'Cambodian',
      country: 'Cambodia',
      contractType: 'Full-Time',
      contractEnd: dayOffset(320),
      phone: '012 451 228',
      email: 'sok.vibol@gis-school.edu.kh',
      baseSalaryUsd: 680,
      hourlyRateUsd: 12,
      loggedHoursMonth: 96,
      status: 'Active',
    },
    {
      id: 't-04',
      staffCode: 'GIS-T004',
      nameKh: 'អ្នកគ្រូ ចាន់ ស្រីល័ក្ខ',
      nameEn: 'Chan Sreyleak',
      role: 'Chinese Program Coordinator (HSK)',
      department: 'Academic',
      nationality: 'Cambodian',
      country: 'Cambodia',
      contractType: 'Full-Time',
      contractEnd: dayOffset(280),
      phone: '092 612 889',
      email: 'chan.sreyleak@gis-school.edu.kh',
      baseSalaryUsd: 720,
      hourlyRateUsd: 13,
      loggedHoursMonth: 92,
      status: 'Active',
    },
    {
      id: 't-05',
      staffCode: 'GIS-T005',
      nameKh: 'លោកគ្រូ លី ម៉េងហ៊ួរ',
      nameEn: 'Ly Menghour',
      role: 'Chinese HSK Instructor',
      department: 'Academic',
      nationality: 'Cambodian',
      country: 'Cambodia',
      contractType: 'Part-Time',
      contractEnd: dayOffset(140),
      phone: '089 331 745',
      email: 'ly.menghour@gis-school.edu.kh',
      baseSalaryUsd: 250,
      hourlyRateUsd: 14,
      loggedHoursMonth: 54,
      status: 'Active',
    },
    {
      id: 't-06',
      staffCode: 'GIS-T006',
      nameKh: 'អ្នកគ្រូ កែវ ម៉ាលីស',
      nameEn: 'Keo Malis',
      role: 'Young Learners English Teacher',
      department: 'Academic',
      nationality: 'Cambodian',
      country: 'Cambodia',
      contractType: 'Full-Time',
      contractEnd: dayOffset(245),
      phone: '077 509 112',
      email: 'keo.malis@gis-school.edu.kh',
      baseSalaryUsd: 590,
      hourlyRateUsd: 11,
      loggedHoursMonth: 90,
      status: 'Active',
    },
    {
      id: 't-07',
      staffCode: 'GIS-T007',
      nameKh: 'លោកគ្រូ ផាន់ សុភា',
      nameEn: 'Phan Sophea',
      role: 'Khmer Academic Teacher',
      department: 'Academic',
      nationality: 'Cambodian',
      country: 'Cambodia',
      contractType: 'Part-Time',
      contractEnd: dayOffset(180),
      phone: '015 742 330',
      email: 'phan.sophea@gis-school.edu.kh',
      baseSalaryUsd: 220,
      hourlyRateUsd: 11,
      loggedHoursMonth: 48,
      status: 'Active',
    },
    {
      id: 't-08',
      staffCode: 'GIS-T008',
      nameKh: 'លោក ហ្វាង ជីងហ្វេង',
      nameEn: 'Huang Jingfeng',
      role: 'Senior Mandarin Instructor',
      department: 'Academic',
      nationality: 'Foreign',
      country: 'China',
      contractType: 'Full-Time',
      contractEnd: dayOffset(195),
      visaExpiry: dayOffset(88),
      phone: '096 818 204',
      email: 'huang.jf@gis-school.edu.kh',
      baseSalaryUsd: 1200,
      hourlyRateUsd: 19,
      loggedHoursMonth: 82,
      status: 'Active',
    },
    {
      id: 's-01',
      staffCode: 'GIS-S001',
      nameKh: 'លោកស្រី នួន សុគន្ធា',
      nameEn: 'Noun Sokunthea',
      role: 'School Principal & Operations',
      department: 'Administration',
      nationality: 'Cambodian',
      country: 'Cambodia',
      contractType: 'Full-Time',
      contractEnd: dayOffset(400),
      phone: '012 778 900',
      email: 'director@gis-school.edu.kh',
      baseSalaryUsd: 1100,
      hourlyRateUsd: 0,
      loggedHoursMonth: 160,
      status: 'Active',
      avatarUrl: '/src/assets/images/avatar_director_1794839259258.jpg',
    },
    {
      id: 's-02',
      staffCode: 'GIS-S002',
      nameKh: 'កញ្ញា ហេង បុប្ផា',
      nameEn: 'Heng Bopha',
      role: 'Finance & Cashier Officer',
      department: 'Finance',
      nationality: 'Cambodian',
      country: 'Cambodia',
      contractType: 'Full-Time',
      contractEnd: dayOffset(360),
      phone: '081 665 432',
      email: 'finance@gis-school.edu.kh',
      baseSalaryUsd: 540,
      hourlyRateUsd: 0,
      loggedHoursMonth: 160,
      status: 'Active',
    },
  ];

  const classes: SchoolClass[] = [
    { id: 'cls-01', name: 'GEP-M1 (Starters)', programId: 'prog-gep', level: 'Starters', shift: 'Morning', timeSlot: '07:30 - 09:00', days: 'Mon - Fri', room: 'Room 101', teacherId: 't-06', capacity: 28 },
    { id: 'cls-02', name: 'GEP-M2 (Movers)', programId: 'prog-gep', level: 'Movers', shift: 'Morning', timeSlot: '09:15 - 10:45', days: 'Mon - Fri', room: 'Room 102', teacherId: 't-02', capacity: 28 },
    { id: 'cls-03', name: 'GEP-M3 (Level 3)', programId: 'prog-gep', level: 'GEP Level 3', shift: 'Morning', timeSlot: '08:00 - 10:00', days: 'Mon - Fri', room: 'Room 103', teacherId: 't-03', capacity: 28 },
    { id: 'cls-04', name: 'HSK-M1 (HSK 1)', programId: 'prog-chn', level: 'HSK 1', shift: 'Morning', timeSlot: '08:00 - 10:00', days: 'Mon - Fri', room: 'Room 201', teacherId: 't-04', capacity: 28 },
    { id: 'cls-05', name: 'GEP-A1 (Flyers)', programId: 'prog-gep', level: 'Flyers', shift: 'Afternoon', timeSlot: '13:30 - 15:00', days: 'Mon - Fri', room: 'Room 101', teacherId: 't-06', capacity: 28 },
    { id: 'cls-06', name: 'GEP-A2 (Level 2)', programId: 'prog-gep', level: 'GEP Level 2', shift: 'Afternoon', timeSlot: '15:15 - 16:45', days: 'Mon - Fri', room: 'Room 102', teacherId: 't-02', capacity: 28 },
    { id: 'cls-07', name: 'HSK-A1 (HSK 2-3)', programId: 'prog-chn', level: 'HSK 2', shift: 'Afternoon', timeSlot: '13:30 - 15:30', days: 'Mon - Fri', room: 'Room 201', teacherId: 't-08', capacity: 28 },
    { id: 'cls-08', name: 'KHM-A1 (Khmer Lit)', programId: 'prog-khm', level: 'Khmer Intermediate', shift: 'Afternoon', timeSlot: '14:00 - 16:00', days: 'Mon - Fri', room: 'Room 204', teacherId: 't-07', capacity: 25 },
    { id: 'cls-09', name: 'GEP-E1 (Level 5)', programId: 'prog-gep', level: 'GEP Level 5', shift: 'Evening', timeSlot: '17:30 - 19:00', days: 'Mon - Fri', room: 'Room 103', teacherId: 't-03', capacity: 28 },
    { id: 'cls-10', name: 'IELTS-E1 (Target 6.5)', programId: 'prog-ielts', level: 'IELTS Target 6.5', shift: 'Evening', timeSlot: '17:45 - 19:45', days: 'Mon - Fri', room: 'Room 202', teacherId: 't-01', capacity: 24 },
    { id: 'cls-11', name: 'HSK-E1 (HSK 4)', programId: 'prog-chn', level: 'HSK 4', shift: 'Evening', timeSlot: '18:00 - 19:30', days: 'Mon - Fri', room: 'Room 201', teacherId: 't-05', capacity: 26 },
    { id: 'cls-12', name: 'IELTS-W1 (Weekend)', programId: 'prog-ielts', level: 'Pre-IELTS 5.0', shift: 'Morning', timeSlot: '08:00 - 11:00', days: 'Sat - Sun', room: 'Room 202', teacherId: 't-01', capacity: 24 },
  ];

  // Authentic Khmer surnames & given names to generate ~296 realistic students across all 12 classes
  const surnamesKh = ['សុខ', 'ចាន់', 'លី', 'កែវ', 'ផាន់', 'ហេង', 'នួន', 'ឈឹម', 'មាស', 'ពេជ្រ', 'អ៊ុង', 'តាំង', 'ស៊ឹម', 'វង្ស', 'កង'];
  const surnamesEn = ['Sok', 'Chan', 'Ly', 'Keo', 'Phan', 'Heng', 'Noun', 'Chhim', 'Meas', 'Pich', 'Ung', 'Tang', 'Sim', 'Vong', 'Kong'];

  const maleFirstKh = ['វិបុល', 'សុវណ្ណ', 'រតនា', 'មេសា', 'បញ្ញា', 'ដារ៉ា', 'ពិសិដ្ឋ', 'វីរៈ', 'សំណាង', 'ឧត្តម', 'រិទ្ធី', 'សុខា', 'កក្កដា', 'សីហា', 'វិសាល'];
  const maleFirstEn = ['Vibol', 'Sovann', 'Rathana', 'Mesa', 'Panha', 'Dara', 'Piseth', 'Vireak', 'Samnang', 'Oudom', 'Rithy', 'Sokha', 'Kakada', 'Seyha', 'Visal'];

  const femaleFirstKh = ['ស្រីល័ក្ខ', 'ម៉ាលីស', 'បុប្ផា', 'សុគន្ធា', 'ចន្ទ្រា', 'នារី', 'រស្មី', 'កល្យាណ', 'ធីតា', 'សុភា', 'រក្សា', 'មរកត', 'ដាវី', 'ពិសី', 'ស្រីពេជ្រ'];
  const femaleFirstEn = ['Sreyleak', 'Malis', 'Bopha', 'Sokunthea', 'Chantrea', 'Neary', 'Reaksmey', 'Kalyana', 'Thida', 'Sophea', 'Raksa', 'Morokot', 'Davy', 'Pisey', 'Sreypich'];

  const guardianPrefixesKh = ['លោក ', 'លោកស្រី '];
  const classStudentCounts = [26, 25, 27, 24, 26, 24, 25, 22, 26, 23, 25, 23]; // Sum = 296 students!

  const students: Student[] = [];
  const attendance: AttendanceRecord[] = [];
  const grades: GradeRecord[] = [];
  const invoices: Invoice[] = [];

  let globalIndex = 1;
  classes.forEach((cls, cIdx) => {
    const count = classStudentCounts[cIdx];
    const prog = programs.find((p) => p.id === cls.programId)!;

    for (let i = 0; i < count; i++) {
      const idx = globalIndex++;
      const isFemale = (idx + cIdx) % 2 === 0;
      const sIdx = (idx * 7 + i * 3) % surnamesKh.length;
      const fIdx = (idx * 5 + i * 11) % maleFirstKh.length;
      const gIdx = (idx * 3 + 2) % surnamesKh.length;

      const nameKh = `${surnamesKh[sIdx]} ${isFemale ? femaleFirstKh[fIdx] : maleFirstKh[fIdx]}`;
      const nameEn = `${surnamesEn[sIdx]} ${isFemale ? femaleFirstEn[fIdx] : maleFirstEn[fIdx]}`;
      const guardianName = `${guardianPrefixesKh[idx % 2]}${surnamesKh[sIdx]} ${maleFirstKh[gIdx]}`;

      const phoneMid = String(100 + ((idx * 37) % 899)).padStart(3, '0');
      const phoneEnd = String(100 + ((idx * 53) % 899)).padStart(3, '0');
      const guardianPhone = `0${['12', '17', '77', '89', '92', '96', '15'][idx % 7]} ${phoneMid} ${phoneEnd}`;

      const scholarship = idx % 14 === 0 ? 50 : idx % 9 === 0 ? 20 : idx % 6 === 0 ? 10 : 0;
      const birthYear = cls.level.includes('Starters') || cls.level.includes('Movers') ? 2015 + (idx % 4) : cls.level.includes('IELTS') ? 2004 + (idx % 5) : 2008 + (idx % 6);
      const birthMonth = String(1 + (idx % 12)).padStart(2, '0');
      const birthDay = String(1 + (idx % 27)).padStart(2, '0');

      const studentId = `stu-${String(idx).padStart(3, '0')}`;
      const studentCode = `GIS-${year}-${String(idx).padStart(3, '0')}`;

      students.push({
        id: studentId,
        studentCode,
        nameKh,
        nameEn,
        gender: isFemale ? 'Female' : 'Male',
        dob: `${birthYear}-${birthMonth}-${birthDay}`,
        phone: guardianPhone,
        guardianName,
        guardianPhone,
        telegramUsername: `@${nameEn.toLowerCase().replace(/\s+/g, '_')}`,
        programId: cls.programId,
        classId: cls.id,
        level: cls.level,
        shift: cls.shift,
        scholarshipPercent: scholarship,
        enrollmentDate: dayOffset(-(30 + (idx % 180))),
        status: idx % 48 === 0 ? 'Suspended' : 'Active',
      });

      // Today's attendance (~93% Present, ~4% Late, ~3% Absent/Excused)
      const attRoll = (idx * 13 + cIdx) % 100;
      let attStatus: AttendanceStatus = 'Present';
      if (attRoll >= 97) attStatus = 'Absent';
      else if (attRoll >= 95) attStatus = 'Excused';
      else if (attRoll >= 91) attStatus = 'Late';

      attendance.push({
        id: `att-${today}-${studentId}`,
        date: today,
        classId: cls.id,
        studentId,
        status: attStatus,
        note: attStatus === 'Absent' ? 'រង់ចាំការបញ្ជាក់ពីអាណាព្យាបាល' : attStatus === 'Late' ? 'មកយឺត ១០ នាទី' : undefined,
      });

      // Yesterday's attendance for trend accuracy
      const yestRoll = (idx * 17 + cIdx) % 100;
      attendance.push({
        id: `att-${dayOffset(-1)}-${studentId}`,
        date: dayOffset(-1),
        classId: cls.id,
        studentId,
        status: yestRoll >= 96 ? 'Absent' : yestRoll >= 92 ? 'Late' : 'Present',
      });

      // Grades for the current term
      const listening = 70 + ((idx * 7) % 28);
      const speaking = 68 + ((idx * 11) % 30);
      const reading = 72 + ((idx * 5) % 26);
      const writing = 66 + ((idx * 13) % 31);
      const midterm = Math.round((listening + speaking + reading + writing) / 4);
      const finalScore = Math.min(99, Math.max(58, midterm + ((idx % 7) - 3)));
      const totalScore = Math.round(midterm * 0.4 + finalScore * 0.6);

      grades.push({
        id: `grd-${studentId}`,
        studentId,
        classId: cls.id,
        term: 'Term 4 - 2026',
        listening,
        speaking,
        reading,
        writing,
        midterm,
        final: finalScore,
        totalScore,
        gradeLetter: computeGradeLetter(totalScore),
        teacherComment:
          totalScore >= 85
            ? 'សិស្សមានការខិតខំប្រឹងប្រែង និងចូលរួមសកម្មក្នុងថ្នាក់។'
            : totalScore >= 70
            ? 'លទ្ធផលល្អ បន្តពង្រឹងជំនាញសរសេរ និងវាក្យសព្ទ។'
            : 'ត្រូវការហ្វឹកហាត់បន្ថែមលើការស្ដាប់ និងការនិយាយ។',
      });

      // Invoices for Term 4
      const tuitionAmount = prog.termTuitionUsd;
      const bookFee = prog.bookFeeUsd;
      const netAmount = Math.round((tuitionAmount * (1 - scholarship / 100) + bookFee) * 100) / 100;
      const invMod = idx % 20;
      let invStatus: Invoice['status'] = 'Paid';
      let paidAmount = netAmount;
      let dueDate = dayOffset(-10);

      if (invMod === 18 || invMod === 19) {
        invStatus = 'Overdue';
        paidAmount = 0;
        dueDate = dayOffset(-6);
      } else if (invMod === 16 || invMod === 17) {
        invStatus = 'Unpaid';
        paidAmount = 0;
        dueDate = dayOffset(7);
      } else if (invMod === 14 || invMod === 15) {
        invStatus = 'Partial';
        paidAmount = Math.round(netAmount * 0.5);
        dueDate = dayOffset(3);
      }

      const issueDate = dayOffset(-(14 + (idx % 12)));
      const methods: Array<'ABA Bank' | 'ACLEDA' | 'Wing' | 'Cash'> = ['ABA Bank', 'Cash', 'ACLEDA', 'Wing'];
      const payMethod = methods[idx % methods.length];

      invoices.push({
        id: `inv-${String(idx).padStart(4, '0')}`,
        invoiceNo: `INV-${year}-${String(1000 + idx)}`,
        studentId,
        term: 'Term 4 - 2026',
        description: `${prog.code} (${cls.level}) — ថ្លៃសិក្សា និងសៀវភៅ`,
        tuitionAmount,
        bookFee,
        discountPercent: scholarship,
        netAmount,
        paidAmount,
        issueDate,
        dueDate,
        status: invStatus,
        payments:
          paidAmount > 0
            ? [
                {
                  id: `pay-${idx}`,
                  date: issueDate,
                  amount: paidAmount,
                  method: payMethod,
                  receivedBy: 'Heng Bopha',
                  reference: `${payMethod.slice(0, 3).toUpperCase()}-${48200 + idx}`,
                },
              ]
            : [],
      });
    }
  });

  const staffAttendance: StaffAttendanceLog[] = teachers.map((t, idx) => ({
    id: `sa-${today}-${t.id}`,
    staffId: t.id,
    date: today,
    checkIn: t.contractType === 'Full-Time' ? '07:25' : '13:15',
    checkOut: t.contractType === 'Full-Time' ? '17:05' : '19:30',
    teachingHours: t.department === 'Academic' ? (idx % 2 === 0 ? 4 : 3.5) : 8,
    status: idx === 4 ? 'Late' : 'Present',
    note: idx === 4 ? 'ចូលបង្រៀនយឺត ៥ នាទី' : undefined,
  }));

  const exams: ExamSchedule[] = [
    { id: 'ex-01', title: 'GEP Term 4 Midterm Examination', programId: 'prog-gep', classId: 'cls-03', examType: 'Midterm', date: dayOffset(4), time: '08:00 - 10:00', room: 'Room 103', proctorId: 't-03' },
    { id: 'ex-02', title: 'IELTS Mock Test (Listening & Reading)', programId: 'prog-ielts', classId: 'cls-10', examType: 'Midterm', date: dayOffset(6), time: '17:45 - 19:45', room: 'Room 202', proctorId: 't-01' },
    { id: 'ex-03', title: 'HSK 4 Writing & Listening Assessment', programId: 'prog-chn', classId: 'cls-11', examType: 'Final', date: dayOffset(11), time: '18:00 - 19:30', room: 'Room 201', proctorId: 't-05' },
    { id: 'ex-04', title: 'Young Learners Flyers Speaking Test', programId: 'prog-gep', classId: 'cls-05', examType: 'Midterm', date: dayOffset(8), time: '13:30 - 15:00', room: 'Room 101', proctorId: 't-06' },
    { id: 'ex-05', title: 'Khmer Literacy & Essay Final Exam', programId: 'prog-khm', classId: 'cls-08', examType: 'Final', date: dayOffset(14), time: '14:00 - 16:00', room: 'Room 204', proctorId: 't-07' },
  ];

  const payroll: PayrollRecord[] = teachers.map((t, idx) => {
    const variablePay = t.department === 'Academic' ? Math.round(t.loggedHoursMonth * t.hourlyRateUsd * 0.25) : 0;
    const bonus = idx < 2 ? 50 : 0;
    const deductions = idx === 4 ? 15 : 0;
    const netPay = t.baseSalaryUsd + variablePay + bonus - deductions;
    return {
      id: `pr-${currentMonth}-${t.id}`,
      staffId: t.id,
      month: currentMonth,
      baseSalary: t.baseSalaryUsd,
      teachingHours: t.loggedHoursMonth,
      hourlyRate: t.hourlyRateUsd,
      bonus,
      deductions,
      netPay,
      status: idx < 5 ? 'Paid' : 'Pending',
      paidDate: idx < 5 ? dayOffset(-2) : undefined,
    };
  });

  const expenses: ExpenseRecord[] = [
    { id: 'exp-01', date: dayOffset(-12), category: 'Rent', description: 'ថ្លៃជួលអគារសាលាប្រចាំខែ (Main Campus)', amount: 3800, paidBy: 'Noun Sokunthea' },
    { id: 'exp-02', date: dayOffset(-8), category: 'Utilities', description: 'ថ្លៃអគ្គិសនី និងទឹកស្អាត + អ៊ីនធឺណិត Fiber', amount: 780, paidBy: 'Heng Bopha' },
    { id: 'exp-03', date: dayOffset(-5), category: 'Books & Supplies', description: 'ទិញសៀវភៅ Oxford GEP & HSK Workbooks បន្ថែម', amount: 1450, paidBy: 'Heng Bopha' },
    { id: 'exp-04', date: dayOffset(-3), category: 'Marketing', description: 'ផ្សព្វផ្សាយវគ្គសិក្សាថ្មីលើ Facebook & Leaflet', amount: 420, paidBy: 'Noun Sokunthea' },
    { id: 'exp-05', date: dayOffset(-2), category: 'Payroll', description: 'ទូទាត់ប្រាក់បៀវត្សរ៍គ្រូបង្រៀន ជំហានទី១ (៥ នាក់)', amount: 7496, paidBy: 'Heng Bopha' },
    { id: 'exp-06', date: today, category: 'Maintenance', description: 'សម្អាត និងថែទាំម៉ាស៊ីនត្រជាក់បន្ទប់រៀន ១០១–១០៣', amount: 165, paidBy: 'Heng Bopha' },
  ];

  const notifications: NotificationLog[] = [
    {
      id: 'notif-01',
      date: `${today} 08:30`,
      channel: 'Telegram',
      recipientType: 'All Parents',
      recipientLabel: 'មាតាបិតាសិស្សទាំងអស់ (២៩៦ នាក់)',
      title: 'សេចក្ដីជូនដំណឹងកាលវិភាគប្រឡងពាក់កណ្ដាលវគ្គ (Midterm)',
      message: 'សាលា ជី អាយ អេស សូមជម្រាបជូនមាតាបិតាថា ការប្រឡងពាក់កណ្ដាលវគ្គទី៤ នឹងចាប់ផ្ដើមនៅសប្ដាហ៍ក្រោយ។ សូមពិនិត្យកាលវិភាគក្នុង Portal។',
      status: 'Delivered',
    },
    {
      id: 'notif-02',
      date: `${today} 09:15`,
      channel: 'SMS',
      recipientType: 'Individual',
      recipientLabel: 'អាណាព្យាបាលសិស្សជំពាក់ថ្លៃសិក្សា (Overdue)',
      title: 'រំលឹកការបង់ថ្លៃសិក្សា Term 4',
      message: 'សូមគោរពជូនមាតាបិតា! វិក្កយបត្រថ្លៃសិក្សា Term 4 ដល់កាលកំណត់បង់ប្រាក់ហើយ។ អាចបង់តាម ABA / ACLEDA ឬការិយាល័យសាលា។',
      status: 'Sent',
    },
    {
      id: 'notif-03',
      date: `${dayOffset(-1)} 14:00`,
      channel: 'Portal',
      recipientType: 'Class',
      recipientLabel: 'ថ្នាក់ IELTS-E1 (Target 6.5)',
      title: 'Mock Test Speaking Schedule',
      message: 'សិស្សានុសិស្សថ្នាក់ IELTS-E1 សូមត្រៀមខ្លួនសម្រាប់ការធ្វើតេស្តសាកល្បង Speaking នៅថ្ងៃសុក្រ ម៉ោង ១៧:៤៥។',
      status: 'Delivered',
    },
  ];

  const libraryItems: LibraryItem[] = [
    { id: 'lib-01', sku: 'BK-OXF-ST', title: 'Oxford Let’s Go Starter (Student Book + Workbook)', programId: 'prog-gep', category: 'Textbook', totalStock: 60, availableStock: 28, unitPriceUsd: 25 },
    { id: 'lib-02', sku: 'BK-OXF-EF3', title: 'English File Intermediate (4th Edition)', programId: 'prog-gep', category: 'Textbook', totalStock: 50, availableStock: 19, unitPriceUsd: 28 },
    { id: 'lib-03', sku: 'BK-HSK-01', title: 'HSK Standard Course Level 1 & Workbook', programId: 'prog-chn', category: 'Workbook', totalStock: 45, availableStock: 21, unitPriceUsd: 20 },
    { id: 'lib-04', sku: 'BK-HSK-04', title: 'HSK Standard Course Level 4 (A & B)', programId: 'prog-chn', category: 'Textbook', totalStock: 35, availableStock: 14, unitPriceUsd: 24 },
    { id: 'lib-05', sku: 'BK-IEL-19', title: 'Cambridge IELTS 19 Academic with Answers', programId: 'prog-ielts', category: 'Reference', totalStock: 40, availableStock: 16, unitPriceUsd: 35 },
    { id: 'lib-06', sku: 'BK-KHM-02', title: 'សៀវភៅវេយ្យាករណ៍ និងសំណេរខ្មែរ កម្រិតមធ្យម', programId: 'prog-khm', category: 'Textbook', totalStock: 30, availableStock: 18, unitPriceUsd: 15 },
  ];

  const libraryLoans: LibraryLoan[] = [
    { id: 'loan-01', itemId: 'lib-05', borrowerName: 'Sok Vibol', borrowerCode: 'GIS-T003', borrowerType: 'Teacher', borrowDate: dayOffset(-10), dueDate: dayOffset(20), returned: false },
    { id: 'loan-02', itemId: 'lib-02', borrowerName: students[12]?.nameEn || 'Chan Dara', borrowerCode: students[12]?.studentCode || 'GIS-2026-013', borrowerType: 'Student', borrowDate: dayOffset(-5), dueDate: dayOffset(9), returned: false },
    { id: 'loan-03', itemId: 'lib-03', borrowerName: students[52]?.nameEn || 'Ly Pisey', borrowerCode: students[52]?.studentCode || 'GIS-2026-053', borrowerType: 'Student', borrowDate: dayOffset(-15), dueDate: dayOffset(-1), returned: true, returnDate: dayOffset(-2) },
  ];

  return {
    schoolProfile: {
      nameKh: 'សាលាភាសាអន្តរជាតិ ជី អាយ អេស',
      nameEn: 'GIS International Language School',
      branchName: 'សាខាទី១ ភ្នំពេញ (Main Campus)',
      address: 'ផ្លូវលេខ ២៧១ សង្កាត់ទឹកល្អក់ទី៣ ខណ្ឌទួលគោក រាជធានីភ្នំពេញ',
      phone: '023 885 900 / 012 778 900',
      email: 'info@gis-school.edu.kh',
      currentTerm: 'Term 4 · 2026',
      targetCapacity: 300,
    },
    programs,
    classes,
    students,
    teachers,
    staffAttendance,
    attendance,
    exams,
    grades,
    invoices,
    payroll,
    expenses,
    notifications,
    libraryItems,
    libraryLoans,
  };
}
