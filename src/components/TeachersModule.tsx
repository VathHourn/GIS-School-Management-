import React, { useMemo, useState } from 'react';
import { Clock, Plus, UserPlus, X } from 'lucide-react';
import { schoolApi } from '../api/schoolApi.ts';
import type { Lang } from '../i18n/translations.ts';
import type {
  ContractType,
  NationalityType,
  SchoolDatabase,
  ShiftType,
} from '../types/school.ts';

interface TeachersModuleProps {
  db: SchoolDatabase;
  lang: Lang;
  onRefresh: () => Promise<void>;
}

export const TeachersModule: React.FC<TeachersModuleProps> = ({ db, lang, onRefresh }) => {
  const [subTab, setSubTab] = useState<'directory' | 'timetable' | 'hours'>('directory');
  const [nationalityFilter, setNationalityFilter] = useState<'all' | NationalityType>('all');
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showLogHours, setShowLogHours] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [teacherForm, setTeacherForm] = useState({
    nameKh: '',
    nameEn: '',
    role: 'English Language Instructor',
    department: 'Academic' as 'Academic' | 'Administration' | 'Finance',
    nationality: 'Cambodian' as NationalityType,
    country: 'Cambodia',
    contractType: 'Full-Time' as ContractType,
    contractEnd: '2027-08-30',
    visaExpiry: '2027-03-15',
    phone: '',
    email: '',
    baseSalaryUsd: 650,
    hourlyRateUsd: 12,
  });

  const [classForm, setClassForm] = useState({
    name: '',
    programId: db.programs[0]?.id || 'prog-gep',
    level: 'GEP Level 1',
    shift: 'Morning' as ShiftType,
    timeSlot: '08:00 - 10:00',
    days: 'Mon - Fri',
    room: 'Room 104',
    teacherId: db.teachers[0]?.id || 't-01',
    capacity: 26,
  });

  const [hourForm, setHourForm] = useState({
    staffId: db.teachers[0]?.id || 't-01',
    date: new Date().toISOString().slice(0, 10),
    checkIn: '07:30',
    checkOut: '11:30',
    teachingHours: 4,
    status: 'Present' as 'Present' | 'Late' | 'Leave',
    note: '',
  });

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filteredTeachers = useMemo(() => {
    return db.teachers.filter((t) => nationalityFilter === 'all' || t.nationality === nationalityFilter);
  }, [db.teachers, nationalityFilter]);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await schoolApi.createTeacher(teacherForm);
      await onRefresh();
      setShowAddTeacher(false);
      setTeacherForm({ ...teacherForm, nameKh: '', nameEn: '', phone: '', email: '' });
      notify(lang === 'km' ? 'បានបន្ថែមគ្រូ/បុគ្គលិកថ្មីរួចរាល់!' : 'Staff member added successfully.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await schoolApi.createClass(classForm);
      await onRefresh();
      setShowAddClass(false);
      setClassForm({ ...classForm, name: '' });
      notify(lang === 'km' ? 'បានបង្កើតកាលវិភាគថ្នាក់ថ្មីរួចរាល់!' : 'New class schedule created.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogHours = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await schoolApi.logStaffAttendance(hourForm);
      await onRefresh();
      setShowLogHours(false);
      notify(lang === 'km' ? 'បានកត់ត្រាម៉ោងបង្រៀន និងធ្វើបច្ចុប្បន្នភាពបៀវត្សរ៍!' : 'Teaching hours logged and synced to payroll.');
    } finally {
      setSaving(false);
    }
  };

  const shifts: ShiftType[] = ['Morning', 'Afternoon', 'Evening'];

  return (
    <div className="space-y-5">
      {toast && (
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between">
          <span>{toast}</span>
          <button onClick={() => setToast(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            onClick={() => setSubTab('directory')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'directory' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'km' ? `គ្រូ និងបុគ្គលិក (${db.teachers.length})` : `Teachers & Staff (${db.teachers.length})`}
          </button>
          <button
            onClick={() => setSubTab('timetable')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'timetable' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'km' ? 'កាលវិភាគបង្រៀន (Timetable)' : 'Weekly Timetable'}
          </button>
          <button
            onClick={() => setSubTab('hours')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'hours' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'km' ? 'ម៉ោងបង្រៀន និងវត្តមានបុគ្គលិក' : 'Teaching Hours & Staff Log'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {subTab === 'directory' && (
            <button
              onClick={() => setShowAddTeacher(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {lang === 'km' ? 'បន្ថែមគ្រូ/បុគ្គលិក' : 'Add Staff'}
            </button>
          )}
          {subTab === 'timetable' && (
            <button
              onClick={() => setShowAddClass(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              {lang === 'km' ? 'បង្កើតថ្នាក់ថ្មី' : 'Add Class Slot'}
            </button>
          )}
          {subTab === 'hours' && (
            <button
              onClick={() => setShowLogHours(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 whitespace-nowrap"
            >
              <Clock className="w-3.5 h-3.5" />
              {lang === 'km' ? 'កត់ត្រាម៉ោងបង្រៀន' : 'Log Teaching Hours'}
            </button>
          )}
        </div>
      </div>

      {subTab === 'directory' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['all', 'Cambodian', 'Foreign'] as const).map((nat) => (
                <button
                  key={nat}
                  onClick={() => setNationalityFilter(nat)}
                  className={`px-3 py-1 text-xs font-medium rounded-md ${
                    nationalityFilter === nat ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {nat === 'all'
                    ? lang === 'km'
                      ? 'ទាំងអស់'
                      : 'All'
                    : nat === 'Cambodian'
                    ? lang === 'km'
                      ? 'គ្រូ/បុគ្គលិកកម្ពុជា'
                      : 'Cambodian'
                    : lang === 'km'
                    ? 'គ្រូបរទេស'
                    : 'Foreign'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">{lang === 'km' ? 'កូដ' : 'Code'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'ឈ្មោះ និងតួនាទី' : 'Name & Role'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'សញ្ជាតិ / កិច្ចសន្យា' : 'Origin / Contract'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'ផុតកំណត់កិច្ចសន្យា / Visa' : 'Contract / Visa Expiry'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'ម៉ោងខែនេះ' : 'Hours/Mo'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'ប្រាក់ខែគោល' : 'Base Salary'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTeachers.map((t) => {
                  const visaDays = t.visaExpiry
                    ? Math.ceil((new Date(t.visaExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono-tabular text-slate-600">{t.staffCode}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {t.avatarUrl ? (
                            <img
                              src={t.avatarUrl}
                              alt={t.nameEn}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-slate-700">
                              {t.nameEn.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900">{t.nameKh}</div>
                            <div className="text-slate-500">
                              {t.nameEn} · {t.role}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div>{t.country}</div>
                        <div className="text-slate-500">{t.contractType} · {t.phone}</div>
                      </td>
                      <td className="py-3 px-4 font-mono-tabular">
                        <div className="text-slate-700">{t.contractEnd}</div>
                        {t.visaExpiry && (
                          <div className={visaDays !== null && visaDays <= 30 ? 'text-rose-700 font-semibold' : 'text-amber-700'}>
                            Visa: {t.visaExpiry} ({visaDays}d)
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular text-slate-800">{t.loggedHoursMonth}h</td>
                      <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-slate-900">
                        ${t.baseSalaryUsd.toLocaleString()}
                        {t.hourlyRateUsd > 0 && (
                          <span className="block text-[11px] font-normal text-slate-500">+${t.hourlyRateUsd}/hr</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'timetable' && (
        <div className="space-y-5">
          {shifts.map((shift) => {
            const shiftClasses = db.classes.filter((c) => c.shift === shift);
            return (
              <div key={shift} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {shift === 'Morning'
                      ? lang === 'km'
                        ? 'វេនពេលព្រឹក (Morning Shift · 07:30 – 11:00)'
                        : 'Morning Shift · 07:30 – 11:00'
                      : shift === 'Afternoon'
                      ? lang === 'km'
                        ? 'វេនពេលរសៀល (Afternoon Shift · 13:30 – 17:00)'
                        : 'Afternoon Shift · 13:30 – 17:00'
                      : lang === 'km'
                      ? 'វេនពេលល្ងាច (Evening Shift · 17:30 – 20:00)'
                      : 'Evening Shift · 17:30 – 20:00'}
                  </h3>
                  <span className="text-xs font-mono-tabular text-slate-500">
                    {shiftClasses.length} {lang === 'km' ? 'ថ្នាក់' : 'classes'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                  {shiftClasses.map((cls) => {
                    const teacher = db.teachers.find((t) => t.id === cls.teacherId);
                    const enrolled = db.students.filter((s) => s.classId === cls.id && s.status === 'Active').length;
                    return (
                      <div key={cls.id} className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{cls.name}</span>
                          <span className="text-xs font-mono-tabular text-slate-500">{cls.room}</span>
                        </div>
                        <div className="text-xs text-slate-600">
                          {cls.days} · <span className="font-mono-tabular">{cls.timeSlot}</span>
                        </div>
                        <div className="text-xs text-slate-700 pt-1">
                          {lang === 'km' ? 'គ្រូ៖' : 'Teacher:'}{' '}
                          <span className="font-medium">{teacher?.nameKh || teacher?.nameEn}</span>
                        </div>
                        <div className="text-xs font-mono-tabular text-slate-500">
                          {lang === 'km' ? 'ចំនួនសិស្ស៖' : 'Enrolled:'}{' '}
                          <span className="font-semibold text-slate-800">
                            {enrolled}/{cls.capacity}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {subTab === 'hours' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              {lang === 'km' ? 'កំណត់ត្រាវត្តមាន និងម៉ោងបង្រៀនបុគ្គលិក' : 'Daily Staff Check-In & Teaching Hours'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'km'
                ? 'ទិន្នន័យម៉ោងបង្រៀននឹងត្រូវភ្ជាប់ដោយស្វ័យប្រវត្តិទៅក្នុងប្រព័ន្ធគណនាប្រាក់បៀវត្សរ៍'
                : 'Logged teaching hours automatically synchronize with pending staff payroll.'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'ឈ្មោះគ្រូ / បុគ្គលិក' : 'Staff Member'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'ម៉ោងចូល - ចេញ' : 'Check-In / Out'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'ម៉ោងបង្រៀន' : 'Hours'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'កំណត់ចំណាំ' : 'Note'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {db.staffAttendance.map((log) => {
                  const st = db.teachers.find((t) => t.id === log.staffId);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono-tabular text-slate-600">{log.date}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {st?.nameKh} ({st?.nameEn})
                      </td>
                      <td className="py-2.5 px-4 font-mono-tabular text-slate-700">
                        {log.checkIn} — {log.checkOut}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-tabular font-semibold text-slate-900">
                        {log.teachingHours}h
                      </td>
                      <td className="py-2.5 px-4 font-medium">
                        <span className={log.status === 'Present' ? 'text-emerald-700' : 'text-amber-700'}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{log.note || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Teacher Modal */}
      {showAddTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleAddTeacher} className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {lang === 'km' ? 'បន្ថែមគ្រូបង្រៀន ឬបុគ្គលិកថ្មី' : 'Add New Teacher / Staff'}
              </h3>
              <button type="button" onClick={() => setShowAddTeacher(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ឈ្មោះខ្មែរ *' : 'Khmer Name *'}</label>
                <input
                  required
                  value={teacherForm.nameKh}
                  onChange={(e) => setTeacherForm({ ...teacherForm, nameKh: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ឈ្មោះអង់គ្លេស *' : 'English Name *'}</label>
                <input
                  required
                  value={teacherForm.nameEn}
                  onChange={(e) => setTeacherForm({ ...teacherForm, nameEn: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'សញ្ជាតិ' : 'Nationality'}</label>
                <select
                  value={teacherForm.nationality}
                  onChange={(e) =>
                    setTeacherForm({
                      ...teacherForm,
                      nationality: e.target.value as NationalityType,
                      country: e.target.value === 'Cambodian' ? 'Cambodia' : 'United Kingdom',
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Cambodian">Cambodian</option>
                  <option value="Foreign">Foreign</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ប្រភេទកិច្ចសន្យា' : 'Contract Type'}</label>
                <select
                  value={teacherForm.contractType}
                  onChange={(e) => setTeacherForm({ ...teacherForm, contractType: e.target.value as ContractType })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Full-Time">Full-Time</option>
                  <option value="Part-Time">Part-Time</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ប្រាក់ខែគោល ($)' : 'Base Salary ($)'}</label>
                <input
                  type="number"
                  value={teacherForm.baseSalaryUsd}
                  onChange={(e) => setTeacherForm({ ...teacherForm, baseSalaryUsd: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'អត្រាក្នុង១ម៉ោង ($)' : 'Hourly Rate ($)'}</label>
                <input
                  type="number"
                  value={teacherForm.hourlyRateUsd}
                  onChange={(e) => setTeacherForm({ ...teacherForm, hourlyRateUsd: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'លេខទូរស័ព្ទ' : 'Phone'}</label>
                <input
                  value={teacherForm.phone}
                  onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                  placeholder="012 345 678"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {teacherForm.nationality === 'Foreign' ? 'Visa Expiry' : 'Contract End'}
                </label>
                <input
                  type="date"
                  value={teacherForm.nationality === 'Foreign' ? teacherForm.visaExpiry : teacherForm.contractEnd}
                  onChange={(e) =>
                    teacherForm.nationality === 'Foreign'
                      ? setTeacherForm({ ...teacherForm, visaExpiry: e.target.value })
                      : setTeacherForm({ ...teacherForm, contractEnd: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button type="button" onClick={() => setShowAddTeacher(false)} className="px-4 py-2 text-xs border border-slate-300 rounded-lg">
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-xs bg-slate-900 text-white rounded-lg">
                {lang === 'km' ? 'រក្សាទុក' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Class Modal */}
      {showAddClass && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleAddClass} className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">{lang === 'km' ? 'បង្កើតថ្នាក់ & កាលវិភាគថ្មី' : 'Create Class Schedule'}</h3>
              <button type="button" onClick={() => setShowAddClass(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ឈ្មោះថ្នាក់ *' : 'Class Name *'}</label>
                <input
                  required
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  placeholder="GEP-M4 (Level 4)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'វេនសិក្សា' : 'Shift'}</label>
                  <select
                    value={classForm.shift}
                    onChange={(e) => setClassForm({ ...classForm, shift: e.target.value as ShiftType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'បន្ទប់' : 'Room'}</label>
                  <input
                    value={classForm.room}
                    onChange={(e) => setClassForm({ ...classForm, room: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ម៉ោងសិក្សា' : 'Time Slot'}</label>
                  <input
                    value={classForm.timeSlot}
                    onChange={(e) => setClassForm({ ...classForm, timeSlot: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'គ្រូបង្រៀន' : 'Teacher'}</label>
                  <select
                    value={classForm.teacherId}
                    onChange={(e) => setClassForm({ ...classForm, teacherId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    {db.teachers
                      .filter((t) => t.department === 'Academic')
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nameKh}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button type="button" onClick={() => setShowAddClass(false)} className="px-4 py-2 text-xs border border-slate-300 rounded-lg">
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-xs bg-slate-900 text-white rounded-lg">
                {lang === 'km' ? 'បង្កើតថ្នាក់' : 'Create Class'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Log Teaching Hours Modal */}
      {showLogHours && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleLogHours} className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">{lang === 'km' ? 'កត់ត្រាម៉ោងបង្រៀនប្រចាំថ្ងៃ' : 'Log Teaching Hours'}</h3>
              <button type="button" onClick={() => setShowLogHours(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'គ្រូ / បុគ្គលិក' : 'Staff Member'}</label>
                <select
                  value={hourForm.staffId}
                  onChange={(e) => setHourForm({ ...hourForm, staffId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  {db.teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nameKh} ({t.nameEn})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ចូល' : 'In'}</label>
                  <input
                    value={hourForm.checkIn}
                    onChange={(e) => setHourForm({ ...hourForm, checkIn: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ចេញ' : 'Out'}</label>
                  <input
                    value={hourForm.checkOut}
                    onChange={(e) => setHourForm({ ...hourForm, checkOut: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ម៉ោង' : 'Hours'}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={hourForm.teachingHours}
                    onChange={(e) => setHourForm({ ...hourForm, teachingHours: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button type="button" onClick={() => setShowLogHours(false)} className="px-4 py-2 text-xs border border-slate-300 rounded-lg">
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-xs bg-slate-900 text-white rounded-lg">
                {lang === 'km' ? 'រក្សាទុក' : 'Save Log'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
