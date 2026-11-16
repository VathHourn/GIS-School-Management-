import React, { useMemo, useState } from 'react';
import {
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Search,
  Send,
  UserPlus,
  X,
} from 'lucide-react';
import { schoolApi } from '../api/schoolApi.ts';
import type { Lang } from '../i18n/translations.ts';
import { downloadPrintableHtml, triggerIsolatedPrint } from '../utils/printDocument.ts';
import type {
  AttendanceStatus,
  SchoolDatabase,
  ShiftType,
  Student,
} from '../types/school.ts';

interface StudentsModuleProps {
  db: SchoolDatabase;
  lang: Lang;
  onRefresh: () => Promise<void>;
  openEnrollTrigger?: boolean;
  onCloseEnrollTrigger?: () => void;
}

export const StudentsModule: React.FC<StudentsModuleProps> = ({
  db,
  lang,
  onRefresh,
  openEnrollTrigger,
  onCloseEnrollTrigger,
}) => {
  const [subTab, setSubTab] = useState<'directory' | 'attendance'>('directory');
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [certificateStudent, setCertificateStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Enroll form state
  const [form, setForm] = useState({
    nameKh: '',
    nameEn: '',
    gender: 'Male' as 'Male' | 'Female',
    dob: '2013-04-12',
    guardianName: '',
    guardianPhone: '',
    telegramUsername: '',
    programId: db.programs[0]?.id || 'prog-gep',
    classId: db.classes[0]?.id || 'cls-01',
    shift: 'Morning' as ShiftType,
    scholarshipPercent: 0,
    generateInvoice: true,
  });

  // Attendance roll-call state
  const today = new Date().toISOString().slice(0, 10);
  const [attDate, setAttDate] = useState(today);
  const [attClassId, setAttClassId] = useState(db.classes[0]?.id || 'cls-01');
  const [attDraft, setAttDraft] = useState<Record<string, { status: AttendanceStatus; note?: string }>>({});
  const [notifyAbsent, setNotifyAbsent] = useState(true);

  const isEnrollOpen = showEnrollModal || Boolean(openEnrollTrigger);
  const closeEnroll = () => {
    setShowEnrollModal(false);
    onCloseEnrollTrigger?.();
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.students.filter((s) => {
      if (programFilter !== 'all' && s.programId !== programFilter) return false;
      if (shiftFilter !== 'all' && s.shift !== shiftFilter) return false;
      if (!q) return true;
      return (
        s.nameKh.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        s.guardianPhone.toLowerCase().includes(q)
      );
    });
  }, [db.students, programFilter, shiftFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const pagedStudents = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    return filteredStudents.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [filteredStudents, page, totalPages]);

  // Class roster for attendance
  const classRoster = useMemo(
    () => db.students.filter((s) => s.classId === attClassId && s.status === 'Active'),
    [db.students, attClassId]
  );

  const currentClassAttendance = useMemo(() => {
    const map: Record<string, { status: AttendanceStatus; note?: string }> = {};
    for (const s of classRoster) {
      if (attDraft[s.id]) {
        map[s.id] = attDraft[s.id];
      } else {
        const existing = db.attendance.find(
          (a) => a.date === attDate && a.classId === attClassId && a.studentId === s.id
        );
        map[s.id] = { status: existing?.status || 'Present', note: existing?.note };
      }
    }
    return map;
  }, [classRoster, attDraft, db.attendance, attDate, attClassId]);

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cls = db.classes.find((c) => c.id === form.classId);
      await schoolApi.createStudent({
        ...form,
        level: cls?.level || 'Level 1',
        shift: cls?.shift || form.shift,
      });
      await onRefresh();
      closeEnroll();
      setForm({
        ...form,
        nameKh: '',
        nameEn: '',
        guardianName: '',
        guardianPhone: '',
        telegramUsername: '',
        scholarshipPercent: 0,
      });
      showToast(lang === 'km' ? 'បានចុះឈ្មោះសិស្សថ្មី និងបង្កើតវិក្កយបត្ររួចរាល់!' : 'Student enrolled and invoice created.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const records = classRoster.map((s) => ({
        studentId: s.id,
        status: currentClassAttendance[s.id]?.status || 'Present',
        note: currentClassAttendance[s.id]?.note,
      }));
      const res = await schoolApi.saveAttendanceBulk({
        date: attDate,
        classId: attClassId,
        records,
        notifyAbsent,
      });
      setAttDraft({});
      await onRefresh();
      showToast(
        res.notifications.length > 0
          ? lang === 'km'
            ? `បានរក្សាទុកវត្តមាន (${res.saved} នាក់) និងផ្ញើសារជូនអាណាព្យាបាល!`
            : `Saved ${res.saved} attendance records & notified absent parents!`
          : lang === 'km'
          ? `បានរក្សាទុកវត្តមានសិស្ស ${res.saved} នាក់រួចរាល់`
          : `Saved attendance for ${res.saved} students.`
      );
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = () => {
    const next: Record<string, { status: AttendanceStatus; note?: string }> = {};
    classRoster.forEach((s) => {
      next[s.id] = { status: 'Present' };
    });
    setAttDraft(next);
  };

  const statusColorText = (st: AttendanceStatus) => {
    if (st === 'Present') return 'text-emerald-700';
    if (st === 'Late') return 'text-amber-700';
    if (st === 'Absent') return 'text-rose-700';
    return 'text-slate-600';
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-slate-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-navigation Segmented Control + Action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            onClick={() => setSubTab('directory')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'directory' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'km' ? `បញ្ជីសិស្ស (${db.students.length})` : `Student Directory (${db.students.length})`}
          </button>
          <button
            onClick={() => setSubTab('attendance')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'attendance' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'km' ? 'កត់វត្តមានប្រចាំថ្ងៃ' : 'Daily Roll-Call Attendance'}
          </button>
        </div>

        <button
          onClick={() => setShowEnrollModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          {lang === 'km' ? 'ចុះឈ្មោះសិស្សថ្មី' : 'Enroll New Student'}
        </button>
      </div>

      {subTab === 'directory' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Filter Toolbar */}
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={lang === 'km' ? 'ស្វែងរកឈ្មោះសិស្ស លេខកូដ ឬលេខទូរស័ព្ទ...' : 'Search student name, code, or phone...'}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
              />
            </div>

            <select
              value={programFilter}
              onChange={(e) => {
                setProgramFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="all">{lang === 'km' ? 'កម្មវិធីសិក្សា៖ ទាំងអស់' : 'All Programs'}</option>
              {db.programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {lang === 'km' ? p.nameKh : p.nameEn}
                </option>
              ))}
            </select>

            <select
              value={shiftFilter}
              onChange={(e) => {
                setShiftFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="all">{lang === 'km' ? 'វេនសិក្សា៖ ទាំងអស់' : 'All Shifts'}</option>
              <option value="Morning">{lang === 'km' ? 'ពេលព្រឹក (Morning)' : 'Morning'}</option>
              <option value="Afternoon">{lang === 'km' ? 'ពេលរសៀល (Afternoon)' : 'Afternoon'}</option>
              <option value="Evening">{lang === 'km' ? 'ពេលល្ងាច (Evening)' : 'Evening'}</option>
            </select>
          </div>

          {/* Student Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">{lang === 'km' ? 'អត្តលេខ' : 'ID'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'ឈ្មោះសិស្ស (ខ្មែរ / អង់គ្លេស)' : 'Student Name'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'ថ្នាក់ & កម្រិត' : 'Class & Level'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'វេនសិក្សា' : 'Shift'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'អាណាព្យាបាល & ទូរស័ព្ទ' : 'Guardian & Phone'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'អាហារូបករណ៍' : 'Discount'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {pagedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      {lang === 'km' ? 'មិនមានទិន្នន័យសិស្សត្រូវនឹងការស្វែងរកទេ' : 'No students match your search criteria.'}
                    </td>
                  </tr>
                ) : (
                  pagedStudents.map((s) => {
                    const cls = db.classes.find((c) => c.id === s.classId);
                    return (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedStudent(s)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-4 font-mono-tabular font-medium text-slate-700">{s.studentCode}</td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900">{s.nameKh}</div>
                          <div className="text-slate-500">{s.nameEn} · {s.gender === 'Female' ? (lang === 'km' ? 'ស្រី' : 'F') : (lang === 'km' ? 'ប្រុស' : 'M')}</div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          <div className="font-medium">{cls?.name || s.classId}</div>
                          <div className="text-slate-500">{s.level}</div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">{s.shift}</td>
                        <td className="py-2.5 px-4">
                          <div className="text-slate-800">{s.guardianName}</div>
                          <div className="font-mono-tabular text-slate-500">{s.guardianPhone}</div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular text-slate-700">
                          {s.scholarshipPercent > 0 ? `${s.scholarshipPercent}%` : '—'}
                        </td>
                        <td className="py-2.5 px-4 font-medium">
                          <span className={s.status === 'Active' ? 'text-emerald-700' : 'text-amber-700'}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="font-mono-tabular">
              {lang === 'km'
                ? `បង្ហាញ ${pagedStudents.length} នៃ ${filteredStudents.length} នាក់`
                : `Showing ${pagedStudents.length} of ${filteredStudents.length} students`}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono-tabular">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Daily Attendance Roll-Call View */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={attClassId}
                onChange={(e) => {
                  setAttClassId(e.target.value);
                  setAttDraft({});
                }}
                className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-800"
              >
                {db.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.shift} ({c.timeSlot})
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={attDate}
                onChange={(e) => {
                  setAttDate(e.target.value);
                  setAttDraft({});
                }}
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 font-mono-tabular"
              />

              <button
                onClick={markAllPresent}
                className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                {lang === 'km' ? 'សម្គាល់មករៀនទាំងអស់' : 'Mark All Present'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyAbsent}
                  onChange={(e) => setNotifyAbsent(e.target.checked)}
                  className="rounded border-slate-300"
                />
                {lang === 'km' ? 'ផ្ញើ Telegram ជូនអាណាព្យាបាលបើសិស្សអវត្តមាន' : 'Auto-notify absent parents via Telegram'}
              </label>

              <button
                onClick={handleSaveAttendance}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                {saving ? '...' : lang === 'km' ? 'រក្សាទុកវត្តមាន' : 'Save Attendance'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">{lang === 'km' ? 'អត្តលេខ' : 'Code'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'ឈ្មោះសិស្ស' : 'Student'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'ទូរស័ព្ទអាណាព្យាបាល' : 'Guardian Phone'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'ស្ថានភាពវត្តមាន' : 'Attendance Status'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'កំណត់ចំណាំ' : 'Note'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {classRoster.map((s) => {
                  const entry = currentClassAttendance[s.id] || { status: 'Present' as AttendanceStatus };
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono-tabular text-slate-600">{s.studentCode}</td>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">{s.nameKh}</div>
                        <div className="text-slate-500">{s.nameEn}</div>
                      </td>
                      <td className="py-2.5 px-4 font-mono-tabular text-slate-600">{s.guardianPhone}</td>
                      <td className="py-2.5 px-4">
                        <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                          {(['Present', 'Late', 'Absent', 'Excused'] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() =>
                                setAttDraft((prev) => ({
                                  ...prev,
                                  [s.id]: { ...entry, status: st },
                                }))
                              }
                              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                                entry.status === st
                                  ? `bg-white shadow-sm ${statusColorText(st)}`
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          value={entry.note || ''}
                          onChange={(e) =>
                            setAttDraft((prev) => ({
                              ...prev,
                              [s.id]: { ...entry, note: e.target.value },
                            }))
                          }
                          placeholder={lang === 'km' ? 'មូលហេតុ...' : 'Reason...'}
                          className="w-full max-w-[200px] px-2.5 py-1 text-xs border border-slate-200 rounded-md"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Profile Drawer */}
      {selectedStudent && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 flex justify-end">
          <div className="w-full max-w-xl bg-white h-full overflow-y-auto p-6 border-l border-slate-200 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <div className="text-xs font-mono-tabular text-slate-500">{selectedStudent.studentCode}</div>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">{selectedStudent.nameKh}</h3>
                  <p className="text-sm text-slate-600">
                    {selectedStudent.nameEn} · {selectedStudent.level} · {selectedStudent.shift}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">{lang === 'km' ? 'អាណាព្យាបាល' : 'Guardian'}</span>
                  <span className="font-semibold text-slate-900">{selectedStudent.guardianName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{lang === 'km' ? 'ទូរស័ព្ទ / Telegram' : 'Phone / Telegram'}</span>
                  <span className="font-mono-tabular text-slate-900">
                    {selectedStudent.guardianPhone} · {selectedStudent.telegramUsername}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">{lang === 'km' ? 'ថ្ងៃខែឆ្នាំកំណើត' : 'Date of Birth'}</span>
                  <span className="font-mono-tabular text-slate-900">{selectedStudent.dob}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{lang === 'km' ? 'អាហារូបករណ៍' : 'Scholarship'}</span>
                  <span className="font-mono-tabular text-slate-900">{selectedStudent.scholarshipPercent}%</span>
                </div>
              </div>

              {/* Student Grades */}
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-semibold text-slate-900 mb-3">
                  {lang === 'km' ? 'លទ្ធផលសិក្សា (Term 4)' : 'Academic Performance (Term 4)'}
                </h4>
                {(() => {
                  const grd = db.grades.find((g) => g.studentId === selectedStudent.id);
                  if (!grd) return <p className="text-xs text-slate-500">No grade records yet.</p>;
                  return (
                    <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-slate-500">Listening:</span>{' '}
                        <span className="font-mono-tabular font-semibold">{grd.listening}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Speaking:</span>{' '}
                        <span className="font-mono-tabular font-semibold">{grd.speaking}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Reading:</span>{' '}
                        <span className="font-mono-tabular font-semibold">{grd.reading}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Writing:</span>{' '}
                        <span className="font-mono-tabular font-semibold">{grd.writing}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Final:</span>{' '}
                        <span className="font-mono-tabular font-semibold">{grd.final}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Grade:</span>{' '}
                        <span className="font-mono-tabular font-bold text-slate-900">
                          {grd.totalScore}% ({grd.gradeLetter})
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Student Invoices */}
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-semibold text-slate-900 mb-3">
                  {lang === 'km' ? 'ប្រវត្តិវិក្កយបត្រថ្លៃសិក្សា' : 'Tuition Invoices'}
                </h4>
                <div className="space-y-2">
                  {db.invoices
                    .filter((i) => i.studentId === selectedStudent.id)
                    .map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between text-xs p-3 border border-slate-200 rounded-lg"
                      >
                        <div>
                          <div className="font-mono-tabular font-medium text-slate-900">{inv.invoiceNo}</div>
                          <div className="text-slate-500">{inv.description}</div>
                        </div>
                        <div className="text-right font-mono-tabular">
                          <div className="font-semibold text-slate-900">
                            ${inv.paidAmount.toFixed(2)} / ${inv.netAmount.toFixed(2)}
                          </div>
                          <div
                            className={
                              inv.status === 'Paid'
                                ? 'text-emerald-700'
                                : inv.status === 'Overdue'
                                ? 'text-rose-700'
                                : 'text-amber-700'
                            }
                          >
                            {inv.status}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={async () => {
                  await schoolApi.sendNotification({
                    channel: 'Telegram',
                    recipientType: 'Individual',
                    recipientLabel: `${selectedStudent.guardianName} (${selectedStudent.guardianPhone})`,
                    title: `ដំណឹងអំពីការសិក្សារបស់សិស្ស ${selectedStudent.nameKh}`,
                    message: `សាលា ជី អាយ អេស សូមជូនដំណឹងអំពីវឌ្ឍនភាពសិក្សារបស់សិស្ស ${selectedStudent.nameKh} (${selectedStudent.studentCode})។`,
                  });
                  await onRefresh();
                  showToast(lang === 'km' ? 'បានផ្ញើសារជូនអាណាព្យាបាលរួចរាល់!' : 'Notification sent to guardian.');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                <Send className="w-3.5 h-3.5" />
                {lang === 'km' ? 'ផ្ញើសារជូនអាណាព្យាបាល' : 'Message Parent'}
              </button>

              <button
                onClick={() => setCertificateStudent(selectedStudent)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                <Award className="w-3.5 h-3.5" />
                {lang === 'km' ? 'ចេញលិខិតបញ្ជាក់ / សញ្ញាបត្រ' : 'Issue Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll New Student Modal */}
      {isEnrollOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleEnrollSubmit}
            className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {lang === 'km' ? 'ចុះឈ្មោះសិស្សចូលរៀនថ្មី (Admission)' : 'New Student Enrollment'}
              </h3>
              <button type="button" onClick={closeEnroll} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {lang === 'km' ? 'ឈ្មោះជាភាសាខ្មែរ *' : 'Khmer Full Name *'}
                </label>
                <input
                  required
                  type="text"
                  value={form.nameKh}
                  onChange={(e) => setForm({ ...form, nameKh: e.target.value })}
                  placeholder="ឧ. សុខ បញ្ញា"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {lang === 'km' ? 'ឈ្មោះជាអក្សរឡាតាំង *' : 'English Name *'}
                </label>
                <input
                  required
                  type="text"
                  value={form.nameEn}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                  placeholder="Sok Panha"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ភេទ' : 'Gender'}</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value as 'Male' | 'Female' })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Male">{lang === 'km' ? 'ប្រុស (Male)' : 'Male'}</option>
                  <option value="Female">{lang === 'km' ? 'ស្រី (Female)' : 'Female'}</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ថ្ងៃខែឆ្នាំកំណើត' : 'Date of Birth'}</label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {lang === 'km' ? 'ឈ្មោះអាណាព្យាបាល *' : 'Guardian Name *'}
                </label>
                <input
                  required
                  type="text"
                  value={form.guardianName}
                  onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                  placeholder="លោក សុខ ដារ៉ា"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {lang === 'km' ? 'លេខទូរស័ព្ទអាណាព្យាបាល *' : 'Guardian Phone *'}
                </label>
                <input
                  required
                  type="text"
                  value={form.guardianPhone}
                  onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
                  placeholder="012 345 678"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ថ្នាក់រៀន & វេនសិក្សា' : 'Assigned Class'}</label>
                <select
                  value={form.classId}
                  onChange={(e) => {
                    const cls = db.classes.find((c) => c.id === e.target.value);
                    setForm({
                      ...form,
                      classId: e.target.value,
                      programId: cls?.programId || form.programId,
                      shift: cls?.shift || form.shift,
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  {db.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.shift} ({c.timeSlot})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {lang === 'km' ? 'អាហារូបករណ៍ / បញ្ចុះតម្លៃ (%)' : 'Scholarship Discount (%)'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.scholarshipPercent}
                  onChange={(e) => setForm({ ...form, scholarshipPercent: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 pt-1">
              <input
                type="checkbox"
                checked={form.generateInvoice}
                onChange={(e) => setForm({ ...form, generateInvoice: e.target.checked })}
              />
              {lang === 'km' ? 'បង្កើតវិក្កយបត្រថ្លៃសិក្សា Term 4 ដោយស្វ័យប្រវត្តិ' : 'Automatically generate Term 4 tuition invoice'}
            </label>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={closeEnroll}
                className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? '...' : lang === 'km' ? 'រក្សាទុក និងចុះឈ្មោះ' : 'Complete Enrollment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Printable Certificate / Completion Letter Modal */}
      {certificateStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-8 border border-slate-300 space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 no-print">
              <span className="text-xs font-semibold text-slate-500">
                {lang === 'km' ? 'គំរូលិខិតបញ្ជាក់ការសិក្សា / សញ្ញាបត្រ' : 'Official Certificate Preview'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    downloadPrintableHtml(
                      'gis-certificate-sheet',
                      `Certificate-${certificateStudent.studentCode}.html`,
                      `Certificate - ${certificateStudent.nameEn}`
                    );
                    showToast(
                      lang === 'km'
                        ? `បានទាញយកលិខិតបញ្ជាក់ ${certificateStudent.studentCode}.html រួចរាល់!`
                        : `Downloaded ${certificateStudent.studentCode}.html`
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  {lang === 'km' ? 'ទាញយក HTML' : 'Save HTML'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ok = triggerIsolatedPrint('gis-certificate-sheet');
                    if (!ok) {
                      downloadPrintableHtml(
                        'gis-certificate-sheet',
                        `Certificate-${certificateStudent.studentCode}.html`,
                        `Certificate - ${certificateStudent.nameEn}`
                      );
                      showToast(
                        lang === 'km'
                          ? 'Preview បិទការបោះពុម្ពផ្ទាល់ — បានទាញយកឯកសារ (.html) ជំនួសរួចរាល់!'
                          : 'Preview iframe blocks direct print — downloaded printable .html certificate!'
                      );
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {lang === 'km' ? 'បោះពុម្ព' : 'Print'}
                </button>
                <button
                  type="button"
                  onClick={() => setCertificateStudent(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div id="gis-certificate-sheet" className="border-2 border-slate-800 p-8 text-center space-y-4 bg-white">
              <img
                src="/assets/aistudio/photo_2026-11-11_21-49-33_c07b1e7d.jpg"
                alt="GIS School Emblem"
                referrerPolicy="no-referrer"
                className="w-20 h-20 object-contain mx-auto rounded-full"
              />
              <div>
                <h2 className="text-lg font-bold text-slate-900">{db.schoolProfile.nameKh}</h2>
                <p className="text-xs tracking-wider text-slate-600 uppercase">{db.schoolProfile.nameEn}</p>
              </div>
              <div className="py-2">
                <h3 className="text-xl font-bold text-slate-900">លិខិតបញ្ជាក់ការសិក្សា · CERTIFICATE OF ACHIEVEMENT</h3>
              </div>
              <p className="text-sm text-slate-700">
                សាលា ជី អាយ អេស សូមបញ្ជាក់ថាសិស្សឈ្មោះ / This is to certify that
              </p>
              <div className="py-2">
                <div className="text-2xl font-bold text-slate-900">{certificateStudent.nameKh}</div>
                <div className="text-base font-semibold text-slate-700">{certificateStudent.nameEn}</div>
                <div className="text-xs font-mono-tabular text-slate-500 mt-1">
                  ID: {certificateStudent.studentCode} · DOB: {certificateStudent.dob}
                </div>
              </div>
              <p className="text-sm text-slate-700">
                បានសិក្សា និងបញ្ចប់ដោយជោគជ័យនូវកម្រិត <span className="font-semibold">{certificateStudent.level}</span> វេន{' '}
                <span className="font-semibold">{certificateStudent.shift}</span> ក្នុងឆមាស {db.schoolProfile.currentTerm}។
              </p>
              <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-slate-700">
                <div>
                  <div className="border-t border-slate-400 pt-2 mx-6">Academic Coordinator</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-2 mx-6">School Principal · {db.schoolProfile.nameEn}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
