import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileText,
  UserPlus,
  Users,
} from 'lucide-react';
import type { Lang } from '../i18n/translations.ts';
import type { Invoice, SchoolDatabase } from '../types/school.ts';

interface OverviewModuleProps {
  db: SchoolDatabase;
  lang: Lang;
  onNavigate: (tab: string) => void;
  onQuickEnroll: () => void;
  onQuickPayInvoice: (invoice: Invoice) => void;
}

export const OverviewModule: React.FC<OverviewModuleProps> = ({
  db,
  lang,
  onNavigate,
  onQuickEnroll,
  onQuickPayInvoice,
}) => {
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'annual'>('monthly');
  const today = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const activeStudents = db.students.filter((s) => s.status === 'Active').length;
    const todayAtt = db.attendance.filter((a) => a.date === today);
    const presentCount = todayAtt.filter((a) => a.status === 'Present').length;
    const lateCount = todayAtt.filter((a) => a.status === 'Late').length;
    const absentCount = todayAtt.filter((a) => a.status === 'Absent' || a.status === 'Excused').length;
    const attRate = todayAtt.length > 0 ? Math.round(((presentCount + lateCount) / todayAtt.length) * 100) : 0;

    const totalBilled = db.invoices.reduce((acc, inv) => acc + inv.netAmount, 0);
    const totalCollected = db.invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
    const totalDue = Math.max(0, totalBilled - totalCollected);
    const overdueCount = db.invoices.filter((i) => i.status === 'Overdue' || i.status === 'Unpaid').length;

    const pendingPayroll = db.payroll.filter((p) => p.status === 'Pending');
    const pendingPayrollSum = pendingPayroll.reduce((acc, p) => acc + p.netPay, 0);

    const totalExpenses = db.expenses.reduce((acc, e) => acc + e.amount, 0);

    return {
      activeStudents,
      presentCount,
      lateCount,
      absentCount,
      attRate,
      totalBilled,
      totalCollected,
      totalDue,
      overdueCount,
      pendingPayrollCount: pendingPayroll.length,
      pendingPayrollSum,
      totalExpenses,
    };
  }, [db, today]);

  const chartSeries = useMemo(() => {
    if (period === 'daily') {
      const days: Array<{ label: string; income: number; expense: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const dayPayments = db.invoices.reduce(
          (sum, inv) => sum + inv.payments.filter((p) => p.date === iso).reduce((s, p) => s + p.amount, 0),
          0
        );
        const dayExp = db.expenses.filter((e) => e.date === iso).reduce((s, e) => s + e.amount, 0);
        days.push({
          label: iso.slice(5),
          income: Math.round(dayPayments),
          expense: Math.round(dayExp),
        });
      }
      return days;
    }
    if (period === 'annual') {
      return [
        { label: '2023', income: 148200, expense: 109500 },
        { label: '2024', income: 169800, expense: 121400 },
        { label: '2025', income: 188400, expense: 132600 },
        { label: '2026 YTD', income: Math.round(stats.totalCollected + 142000), expense: Math.round(stats.totalExpenses + 98000) },
      ];
    }
    return [
      { label: 'Term 1', income: 42100, expense: 29400 },
      { label: 'Term 2', income: 44850, expense: 31200 },
      { label: 'Term 3', income: 46300, expense: 31800 },
      { label: 'Term 4 (Now)', income: Math.round(stats.totalCollected), expense: Math.round(stats.totalExpenses) },
    ];
  }, [db, period, stats.totalCollected, stats.totalExpenses]);

  const maxChartVal = Math.max(1000, ...chartSeries.flatMap((c) => [c.income, c.expense]));

  const urgentInvoices = useMemo(() => {
    return db.invoices
      .filter((i) => i.status === 'Overdue' || i.status === 'Partial' || i.status === 'Unpaid')
      .slice(0, 6);
  }, [db.invoices]);

  const visaAlerts = useMemo(() => {
    const now = new Date();
    return db.teachers
      .filter((t) => t.nationality === 'Foreign' && t.visaExpiry)
      .map((t) => {
        const diffDays = Math.ceil((new Date(t.visaExpiry!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { ...t, diffDays };
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [db.teachers]);

  const programBreakdown = useMemo(() => {
    return db.programs.map((prog) => {
      const count = db.students.filter((s) => s.programId === prog.id && s.status === 'Active').length;
      const pct = stats.activeStudents > 0 ? Math.round((count / stats.activeStudents) * 100) : 0;
      return { prog, count, pct };
    });
  }, [db.programs, db.students, stats.activeStudents]);

  return (
    <div className="space-y-6">
      {/* Top KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {lang === 'km' ? 'សិស្សកំពុងសិក្សាសរុប' : 'Active Enrolled Students'}
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono-tabular">{stats.activeStudents}</span>
            <span className="text-xs text-slate-500 font-mono-tabular">
              / {db.schoolProfile.targetCapacity} {lang === 'km' ? 'នាក់' : 'cap'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {db.classes.length} {lang === 'km' ? 'ថ្នាក់ · ៣ វេនសិក្សា' : 'classes · 3 daily shifts'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {lang === 'km' ? 'អត្រាវត្តមានថ្ងៃនេះ' : "Today's Attendance Rate"}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono-tabular">{stats.attRate}%</span>
            <span className="text-xs font-medium text-emerald-700 font-mono-tabular">
              {stats.presentCount} {lang === 'km' ? 'មករៀន' : 'present'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 font-mono-tabular">
            {stats.lateCount} {lang === 'km' ? 'យឺត' : 'late'} · {stats.absentCount} {lang === 'km' ? 'អវត្តមាន' : 'absent'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {lang === 'km' ? 'ថ្លៃសិក្សាប្រមូលបាន (Term 4)' : 'Tuition Collected (Term 4)'}
            </span>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono-tabular">
              ${stats.totalCollected.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-rose-700 font-mono-tabular">
              ${stats.totalDue.toLocaleString()} {lang === 'km' ? 'ជំពាក់' : 'due'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {stats.overdueCount} {lang === 'km' ? 'វិក្កយបត្រមិនទាន់បង់ពេញ' : 'unpaid/overdue invoices'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {lang === 'km' ? 'បៀវត្សរ៍រង់ចាំទូទាត់' : 'Pending Staff Payroll'}
            </span>
            <CalendarClock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono-tabular">
              ${stats.pendingPayrollSum.toLocaleString()}
            </span>
            <span className="text-xs text-amber-700 font-medium font-mono-tabular">
              {stats.pendingPayrollCount} {lang === 'km' ? 'នាក់' : 'staff'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {db.teachers.length} {lang === 'km' ? 'គ្រូ និងបុគ្គលិកសរុប' : 'total teachers & staff'}
          </p>
        </div>
      </div>

      {/* Main Analytics + Program Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {lang === 'km' ? 'សង្ខេបចំណូល និងចំណាយសាលា' : 'School Revenue & Expense Overview'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'km'
                  ? 'ប្រៀបធៀបថ្លៃសិក្សាប្រមូលបាន និងចំណាយប្រតិបត្តិការ (USD)'
                  : 'Comparison of collected tuition revenue and operating expenses (USD)'}
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['daily', 'monthly', 'annual'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p === 'daily'
                    ? lang === 'km'
                      ? '៧ ថ្ងៃ'
                      : '7 Days'
                    : p === 'monthly'
                    ? lang === 'km'
                      ? 'តាមវគ្គ/ខែ'
                      : 'By Term'
                    : lang === 'km'
                    ? 'ប្រចាំឆ្នាំ'
                    : 'Annual'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-600 mb-4">
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-slate-900 inline-block" />
              {lang === 'km' ? 'ចំណូលថ្លៃសិក្សា (Revenue)' : 'Tuition Revenue'}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-slate-300 inline-block" />
              {lang === 'km' ? 'ចំណាយសរុប (Expenses)' : 'Operating Expenses'}
            </span>
          </div>

          {/* Crisp SVG Bar Chart */}
          <div className="w-full overflow-x-auto">
            <div className="min-w-[460px] h-56 flex items-end gap-4 pt-6 pb-2 border-b border-slate-200">
              {chartSeries.map((item) => {
                const incHeight = Math.max(4, Math.round((item.income / maxChartVal) * 165));
                const expHeight = Math.max(4, Math.round((item.expense / maxChartVal) * 165));
                return (
                  <div key={item.label} className="flex-1 flex flex-col items-center justify-end gap-2">
                    <div className="w-full flex items-end justify-center gap-1.5 h-44">
                      <div className="flex flex-col items-center gap-1 flex-1 max-w-[36px]">
                        <span className="text-[11px] text-slate-600 font-mono-tabular">
                          ${item.income >= 1000 ? `${(item.income / 1000).toFixed(1)}k` : item.income}
                        </span>
                        <div
                          className="w-full bg-slate-900 rounded-t transition-all"
                          style={{ height: `${incHeight}px` }}
                          title={`Revenue: $${item.income.toLocaleString()}`}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1 flex-1 max-w-[36px]">
                        <span className="text-[11px] text-slate-400 font-mono-tabular">
                          ${item.expense >= 1000 ? `${(item.expense / 1000).toFixed(1)}k` : item.expense}
                        </span>
                        <div
                          className="w-full bg-slate-300 rounded-t transition-all"
                          style={{ height: `${expHeight}px` }}
                          title={`Expense: $${item.expense.toLocaleString()}`}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-600 whitespace-nowrap">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Program Enrollment & Quick Actions */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {lang === 'km' ? 'សិស្សតាមកម្មវិធីសិក្សា' : 'Enrollment by Program'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              {lang === 'km' ? 'ការបែងចែកសិស្សតាមភាសា' : 'Distribution across language tracks'}
            </p>
            <div className="space-y-4">
              {programBreakdown.map(({ prog, count, pct }) => (
                <div key={prog.id}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-800 truncate pr-2">
                      {lang === 'km' ? prog.nameKh : prog.nameEn}
                    </span>
                    <span className="font-mono-tabular text-slate-600 shrink-0">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-800 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 gap-2">
            <button
              onClick={onQuickEnroll}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {lang === 'km' ? 'ចុះឈ្មោះសិស្ស' : 'Enroll Student'}
            </button>
            <button
              onClick={() => onNavigate('finance')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5" />
              {lang === 'km' ? 'របាយការណ៍លុយ' : 'Finance Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Urgent Follow-up Queue: Overdue Tuition & Foreign Teacher Visa Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {lang === 'km' ? 'វិក្កយបត្រថ្លៃសិក្សាត្រូវតាមដាន (ជំពាក់ / ហួសកំណត់)' : 'Tuition Follow-Up Queue (Unpaid / Overdue)'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'km' ? 'ចុចទទួលប្រាក់ភ្លាមៗ ឬមើលទាំងអស់ក្នុងផ្នែកហិរញ្ញវត្ថុ' : 'Record payment immediately or view all invoices'}
              </p>
            </div>
            <button
              onClick={() => onNavigate('finance')}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 whitespace-nowrap"
            >
              {lang === 'km' ? 'មើលទាំងអស់' : 'View all'}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-4">{lang === 'km' ? 'លេខវិក្កយបត្រ' : 'Invoice'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'សិស្ស' : 'Student'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'នៅខ្វះ' : 'Balance'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'ថ្ងៃផុតកំណត់' : 'Due Date'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'សកម្មភាព' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {urgentInvoices.map((inv) => {
                  const student = db.students.find((s) => s.id === inv.studentId);
                  const balance = Math.max(0, inv.netAmount - inv.paidAmount);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono-tabular text-xs font-medium text-slate-800">{inv.invoiceNo}</td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-900 text-xs">{student?.nameKh || inv.studentId}</div>
                        <div className="text-xs text-slate-500">{student?.guardianPhone}</div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-tabular font-semibold text-rose-700 text-xs">
                        ${balance.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-mono-tabular text-slate-600">
                        {inv.dueDate} ·{' '}
                        <span className={inv.status === 'Overdue' ? 'text-rose-700 font-medium' : 'text-amber-700 font-medium'}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => onQuickPayInvoice(inv)}
                          className="px-2.5 py-1 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap"
                        >
                          {lang === 'km' ? 'ទទួលប្រាក់' : 'Pay Now'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Visa & Exam Alerts */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                {lang === 'km' ? 'ការជូនដំណឹងទិដ្ឋាការគ្រូបរទេស' : 'Foreign Teacher Visa Watch'}
              </h3>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="space-y-3">
              {visaAlerts.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <div className="text-xs font-medium text-slate-900">{t.nameEn}</div>
                    <div className="text-xs text-slate-500">
                      {t.country} · {t.visaExpiry}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono-tabular font-semibold ${
                      t.diffDays <= 30 ? 'text-rose-700' : 'text-amber-700'
                    }`}
                  >
                    {t.diffDays}d
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900">
                {lang === 'km' ? 'ការប្រឡងជិតមកដល់' : 'Upcoming Exams'}
              </h3>
              <button
                onClick={() => onNavigate('academics')}
                className="text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                {lang === 'km' ? 'ទាំងអស់' : 'All'}
              </button>
            </div>
            <div className="space-y-2.5">
              {db.exams.slice(0, 3).map((ex) => (
                <div key={ex.id} className="text-xs">
                  <div className="font-medium text-slate-800 truncate">{ex.title}</div>
                  <div className="text-slate-500 font-mono-tabular">
                    {ex.date} · {ex.time} · {ex.room}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
