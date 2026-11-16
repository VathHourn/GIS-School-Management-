import React, { useMemo, useState } from 'react';
import { Calendar, Edit3, Plus, X } from 'lucide-react';
import { schoolApi } from '../api/schoolApi.ts';
import type { Lang } from '../i18n/translations.ts';
import type { GradeRecord, SchoolDatabase } from '../types/school.ts';

interface AcademicsModuleProps {
  db: SchoolDatabase;
  lang: Lang;
  onRefresh: () => Promise<void>;
}

export const AcademicsModule: React.FC<AcademicsModuleProps> = ({ db, lang, onRefresh }) => {
  const [subTab, setSubTab] = useState<'programs' | 'exams' | 'grading'>('programs');
  const [gradeClassId, setGradeClassId] = useState(db.classes[0]?.id || 'cls-01');
  const [editingGrade, setEditingGrade] = useState<GradeRecord | null>(null);
  const [showAddExam, setShowAddExam] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [examForm, setExamForm] = useState({
    title: '',
    classId: db.classes[0]?.id || 'cls-01',
    examType: 'Midterm' as 'Midterm' | 'Final' | 'Placement',
    date: new Date().toISOString().slice(0, 10),
    time: '08:00 - 10:00',
    room: 'Room 101',
    proctorId: db.teachers[0]?.id || 't-01',
  });

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const rankedGrades = useMemo(() => {
    const classGrades = db.grades.filter((g) => g.classId === gradeClassId);
    return [...classGrades].sort((a, b) => b.totalScore - a.totalScore);
  }, [db.grades, gradeClassId]);

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrade) return;
    setSaving(true);
    try {
      await schoolApi.saveGrade(editingGrade);
      await onRefresh();
      setEditingGrade(null);
      notify(lang === 'km' ? 'បានរក្សាទុកពិន្ទុ និងគណនាចំណាត់ថ្នាក់ថ្មី!' : 'Grade updated and class rank recalculated.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cls = db.classes.find((c) => c.id === examForm.classId);
      await schoolApi.createExam({
        ...examForm,
        programId: cls?.programId || db.programs[0].id,
      });
      await onRefresh();
      setShowAddExam(false);
      setExamForm({ ...examForm, title: '' });
      notify(lang === 'km' ? 'បានបន្ថែមកាលវិភាគប្រឡងរួចរាល់!' : 'Exam scheduled.');
    } finally {
      setSaving(false);
    }
  };

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
            onClick={() => setSubTab('programs')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'programs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'km' ? 'កម្មវិធីសិក្សា និងម៉ូឌុល' : 'Programs & Curriculum'}
          </button>
          <button
            onClick={() => setSubTab('exams')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'exams' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'km' ? `កាលវិភាគប្រឡង (${db.exams.length})` : `Exam Schedule (${db.exams.length})`}
          </button>
          <button
            onClick={() => setSubTab('grading')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'grading' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'km' ? 'ពិន្ទុ និងចំណាត់ថ្នាក់' : 'Grading & Ranking'}
          </button>
        </div>

        {subTab === 'exams' && (
          <button
            onClick={() => setShowAddExam(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            {lang === 'km' ? 'បង្កើតកាលវិភាគប្រឡង' : 'Schedule Exam'}
          </button>
        )}
      </div>

      {subTab === 'programs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {db.programs.map((prog) => {
            const enrolled = db.students.filter((s) => s.programId === prog.id && s.status === 'Active').length;
            return (
              <div key={prog.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono-tabular text-slate-500">
                      {prog.code} · {prog.durationWeeks} {lang === 'km' ? 'សប្ដាហ៍/វគ្គ' : 'weeks/term'}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{prog.nameKh}</h3>
                    <p className="text-xs text-slate-500">{prog.nameEn}</p>
                  </div>
                  <div className="text-right font-mono-tabular">
                    <div className="text-lg font-bold text-slate-900">${prog.termTuitionUsd}</div>
                    <div className="text-[11px] text-slate-500">+${prog.bookFeeUsd} books</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
                  <div>
                    <span className="font-semibold text-slate-700">{lang === 'km' ? 'កម្រិតសិក្សា៖ ' : 'Levels: '}</span>
                    <span className="text-slate-600">{prog.levels.join(' · ')}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">{lang === 'km' ? 'ម៉ូឌុលសំខាន់ៗ៖ ' : 'Modules: '}</span>
                    <span className="text-slate-600">{prog.modules.join(' · ')}</span>
                  </div>
                  <div className="pt-1 font-mono-tabular text-slate-500">
                    {lang === 'km' ? 'សិស្សកំពុងសិក្សា៖' : 'Active Enrollment:'}{' '}
                    <span className="font-semibold text-slate-900">{enrolled}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {subTab === 'exams' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">{lang === 'km' ? 'ការប្រឡង' : 'Examination'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'ប្រភេទ' : 'Type'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'ថ្នាក់' : 'Class'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'កាលបរិច្ឆេទ & ម៉ោង' : 'Date & Time'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'បន្ទប់ & អនុរក្ស' : 'Room & Proctor'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {db.exams.map((ex) => {
                  const cls = db.classes.find((c) => c.id === ex.classId);
                  const proctor = db.teachers.find((t) => t.id === ex.proctorId);
                  return (
                    <tr key={ex.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-900">{ex.title}</td>
                      <td className="py-3 px-4 text-slate-700">{ex.examType}</td>
                      <td className="py-3 px-4 text-slate-700">{cls?.name || ex.classId}</td>
                      <td className="py-3 px-4 font-mono-tabular text-slate-700">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {ex.date} · {ex.time}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {ex.room} · {proctor?.nameKh || proctor?.nameEn}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'grading' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <select
              value={gradeClassId}
              onChange={(e) => setGradeClassId(e.target.value)}
              className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-800"
            >
              {db.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.shift}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">
              {lang === 'km' ? 'គណនាចំណាត់ថ្នាក់ដោយស្វ័យប្រវត្តិ (Midterm 40% + Final 60%)' : 'Auto-ranked by Total Score (Midterm 40% + Final 60%)'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">{lang === 'km' ? 'ចំណាត់ថ្នាក់' : 'Rank'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'សិស្ស' : 'Student'}</th>
                  <th className="py-2.5 px-3 text-right">L</th>
                  <th className="py-2.5 px-3 text-right">S</th>
                  <th className="py-2.5 px-3 text-right">R</th>
                  <th className="py-2.5 px-3 text-right">W</th>
                  <th className="py-2.5 px-3 text-right">Mid</th>
                  <th className="py-2.5 px-3 text-right">Final</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'សរុប / និទ្ទេស' : 'Total / Grade'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'កែពិន្ទុ' : 'Edit'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rankedGrades.map((g, idx) => {
                  const st = db.students.find((s) => s.id === g.studentId);
                  return (
                    <tr key={g.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono-tabular font-bold text-slate-700">#{idx + 1}</td>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">{st?.nameKh}</div>
                        <div className="text-slate-500 font-mono-tabular">{st?.studentCode}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular">{g.listening}</td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular">{g.speaking}</td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular">{g.reading}</td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular">{g.writing}</td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular">{g.midterm}</td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular">{g.final}</td>
                      <td className="py-2.5 px-4 text-right font-mono-tabular font-bold">
                        <span className={g.totalScore >= 80 ? 'text-emerald-700' : g.totalScore >= 65 ? 'text-slate-900' : 'text-rose-700'}>
                          {g.totalScore}% · {g.gradeLetter}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => setEditingGrade({ ...g })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-200 rounded-md hover:bg-slate-100 text-slate-700"
                        >
                          <Edit3 className="w-3 h-3" />
                          {lang === 'km' ? 'កែ' : 'Edit'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Grade Modal */}
      {editingGrade && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveGrade} className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">{lang === 'km' ? 'កែសម្រួលពិន្ទុសិស្ស' : 'Update Student Scores'}</h3>
              <button type="button" onClick={() => setEditingGrade(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {(['listening', 'speaking', 'reading', 'writing', 'final'] as const).map((field) => (
                <div key={field}>
                  <label className="block font-medium text-slate-700 mb-1 capitalize">{field} (0–100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editingGrade[field]}
                    onChange={(e) => setEditingGrade({ ...editingGrade, [field]: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                  />
                </div>
              ))}
            </div>
            <div className="text-xs">
              <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'មតិយោបល់គ្រូ' : 'Teacher Comment'}</label>
              <textarea
                rows={2}
                value={editingGrade.teacherComment}
                onChange={(e) => setEditingGrade({ ...editingGrade, teacherComment: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button type="button" onClick={() => setEditingGrade(null)} className="px-4 py-2 text-xs border border-slate-300 rounded-lg">
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-xs bg-slate-900 text-white rounded-lg">
                {lang === 'km' ? 'រក្សាទុកពិន្ទុ' : 'Save Scores'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Exam Modal */}
      {showAddExam && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleAddExam} className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">{lang === 'km' ? 'បង្កើតកាលវិភាគប្រឡងថ្មី' : 'Schedule Examination'}</h3>
              <button type="button" onClick={() => setShowAddExam(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ឈ្មោះការប្រឡង *' : 'Exam Title *'}</label>
                <input
                  required
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  placeholder="GEP Final Speaking Exam"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ថ្នាក់' : 'Class'}</label>
                  <select
                    value={examForm.classId}
                    onChange={(e) => setExamForm({ ...examForm, classId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    {db.classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ប្រភេទ' : 'Type'}</label>
                  <select
                    value={examForm.examType}
                    onChange={(e) => setExamForm({ ...examForm, examType: e.target.value as 'Midterm' | 'Final' | 'Placement' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Midterm">Midterm</option>
                    <option value="Final">Final</option>
                    <option value="Placement">Placement</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ថ្ងៃប្រឡង' : 'Date'}</label>
                  <input
                    type="date"
                    value={examForm.date}
                    onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'បន្ទប់' : 'Room'}</label>
                  <input
                    value={examForm.room}
                    onChange={(e) => setExamForm({ ...examForm, room: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button type="button" onClick={() => setShowAddExam(false)} className="px-4 py-2 text-xs border border-slate-300 rounded-lg">
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-xs bg-slate-900 text-white rounded-lg">
                {lang === 'km' ? 'រក្សាទុក' : 'Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
