import React, { useMemo, useState } from 'react';
import { BookOpen, CalendarClock, CheckCircle2, CreditCard, GraduationCap, MessageSquare } from 'lucide-react';
import type { Lang } from '../i18n/translations.ts';
import type { SchoolDatabase } from '../types/school.ts';

interface ParentPortalModuleProps {
  db: SchoolDatabase;
  lang: Lang;
}

export const ParentPortalModule: React.FC<ParentPortalModuleProps> = ({ db, lang }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(db.students[0]?.id || '');

  const student = useMemo(
    () => db.students.find((s) => s.id === selectedStudentId) || db.students[0],
    [db.students, selectedStudentId]
  );

  const studentData = useMemo(() => {
    if (!student) return null;
    const cls = db.classes.find((c) => c.id === student.classId);
    const prog = db.programs.find((p) => p.id === student.programId);
    const teacher = db.teachers.find((t) => t.id === cls?.teacherId);
    const attRecords = db.attendance.filter((a) => a.studentId === student.id);
    const presentCount = attRecords.filter((a) => a.status === 'Present' || a.status === 'Late').length;
    const attPct = attRecords.length > 0 ? Math.round((presentCount / attRecords.length) * 100) : 100;
    const grade = db.grades.find((g) => g.studentId === student.id);
    const invoices = db.invoices.filter((i) => i.studentId === student.id);
    const exams = db.exams.filter((e) => e.classId === student.classId);

    return { cls, prog, teacher, attRecords, attPct, grade, invoices, exams };
  }, [db, student]);

  if (!student || !studentData) return null;

  return (
    <div className="space-y-6">
      {/* Student Account Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500">
            {lang === 'km' ? 'វិបផតថលមាតាបិតា និងសិស្ស (Parent & Student Portal)' : 'Parent & Student Portal Preview'}
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
            {student.nameKh} · <span className="font-normal text-slate-600">{student.nameEn}</span>
          </h2>
          <p className="text-xs text-slate-500 font-mono-tabular mt-0.5">
            {student.studentCode} · {studentData.cls?.name} · {student.shift} ({studentData.cls?.timeSlot})
          </p>
        </div>

        <div className="w-full sm:w-80">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            {lang === 'km' ? 'ជ្រើសរើសគណនីសិស្សដើម្បីមើលទិន្នន័យ៖' : 'Switch Student Account:'}
          </label>
          <select
            value={student.id}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900"
          >
            {db.students.slice(0, 50).map((s) => (
              <option key={s.id} value={s.id}>
                {s.studentCode} — {s.nameKh} ({s.level})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Portal Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{lang === 'km' ? 'អត្រាវត្តមានសិក្សា' : 'Attendance Rate'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1.5">{studentData.attPct}%</div>
          <div className="text-xs text-slate-500 mt-1">
            {studentData.attRecords.length} {lang === 'km' ? 'ថ្ងៃកត់ត្រាចុងក្រោយ' : 'recorded sessions'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{lang === 'km' ? 'ពិន្ទុ និងនិទ្ទេសបច្ចុប្បន្ន' : 'Current Term Grade'}</span>
            <GraduationCap className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1.5">
            {studentData.grade ? `${studentData.grade.totalScore}% (${studentData.grade.gradeLetter})` : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-1">{studentData.prog?.code} · {student.level}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{lang === 'km' ? 'កាលវិភាគ & បន្ទប់រៀន' : 'Schedule & Classroom'}</span>
            <CalendarClock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1.5">{studentData.cls?.room}</div>
          <div className="text-xs text-slate-500 font-mono-tabular mt-1">
            {studentData.cls?.days} · {studentData.cls?.timeSlot}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{lang === 'km' ? 'ស្ថានភាពថ្លៃសិក្សា' : 'Tuition Balance'}</span>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          {(() => {
            const due = studentData.invoices.reduce((sum, i) => sum + Math.max(0, i.netAmount - i.paidAmount), 0);
            return (
              <>
                <div className={`text-2xl font-bold font-mono-tabular mt-1.5 ${due > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  ${due.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {due > 0 ? (lang === 'km' ? 'សូមទូទាត់តាម ABA / សាលា' : 'Payment due') : (lang === 'km' ? 'បានបង់គ្រប់គ្រាន់' : 'All settled')}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Academic Scores & Teacher Feedback */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              {lang === 'km' ? 'លទ្ធផលប្រឡង និងមតិយោបល់គ្រូបង្រៀន' : 'Academic Scores & Teacher Comment'}
            </h3>
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>

          {studentData.grade ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                <div>
                  <span className="text-slate-500 block">Listening</span>
                  <span className="font-mono-tabular font-bold text-slate-900 text-sm">{studentData.grade.listening}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Speaking</span>
                  <span className="font-mono-tabular font-bold text-slate-900 text-sm">{studentData.grade.speaking}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Reading</span>
                  <span className="font-mono-tabular font-bold text-slate-900 text-sm">{studentData.grade.reading}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Writing</span>
                  <span className="font-mono-tabular font-bold text-slate-900 text-sm">{studentData.grade.writing}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Midterm (40%)</span>
                  <span className="font-mono-tabular font-bold text-slate-900 text-sm">{studentData.grade.midterm}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Final (60%)</span>
                  <span className="font-mono-tabular font-bold text-slate-900 text-sm">{studentData.grade.final}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="text-slate-500 mb-1">
                  {lang === 'km' ? 'គ្រូបង្រៀនប្រចាំថ្នាក់៖' : 'Homeroom Teacher:'}{' '}
                  <strong className="text-slate-800">{studentData.teacher?.nameKh || studentData.teacher?.nameEn}</strong>
                </div>
                <p className="text-slate-700 leading-relaxed">{studentData.grade.teacherComment}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No grades recorded yet.</p>
          )}
        </div>

        {/* Tuition & Attendance History */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">
            {lang === 'km' ? 'វិក្កយបត្រថ្លៃសិក្សា និងការបង់ប្រាក់' : 'Tuition Invoices & Payment History'}
          </h3>
          <div className="space-y-3 text-xs">
            {studentData.invoices.map((inv) => {
              const bal = Math.max(0, inv.netAmount - inv.paidAmount);
              return (
                <div key={inv.id} className="border border-slate-200 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tabular font-semibold text-slate-900">{inv.invoiceNo}</span>
                    <span
                      className={`font-medium ${
                        inv.status === 'Paid'
                          ? 'text-emerald-700'
                          : inv.status === 'Overdue'
                          ? 'text-rose-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <div className="text-slate-600">{inv.description}</div>
                  <div className="flex items-center justify-between font-mono-tabular pt-1 border-t border-slate-100">
                    <span>
                      Paid: <strong className="text-emerald-700">${inv.paidAmount.toFixed(2)}</strong> / ${inv.netAmount.toFixed(2)}
                    </span>
                    {bal > 0 && <span className="text-rose-700 font-semibold">Due: ${bal.toFixed(2)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* School Announcements & Attendance Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              {lang === 'km' ? 'កំណត់ត្រាវត្តមានសិស្ស' : 'Recent Attendance Records'}
            </h3>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {studentData.attRecords.map((a) => (
              <div key={a.id} className="py-2.5 flex items-center justify-between">
                <span className="font-mono-tabular text-slate-700">{a.date}</span>
                <span className="text-slate-500">{a.note || '—'}</span>
                <span
                  className={`font-semibold ${
                    a.status === 'Present'
                      ? 'text-emerald-700'
                      : a.status === 'Late'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              {lang === 'km' ? 'សេចក្ដីជូនដំណឹងពីសាលា' : 'School Announcements'}
            </h3>
            <MessageSquare className="w-4 h-4 text-slate-400" />
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {db.notifications.slice(0, 4).map((n) => (
              <div key={n.id} className="py-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{n.title}</span>
                  <span className="font-mono-tabular text-slate-400">{n.date}</span>
                </div>
                <p className="text-slate-600">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
