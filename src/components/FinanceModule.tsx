import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Plus,
  Printer,
  Search,
  Send,
  X,
} from 'lucide-react';
import { schoolApi } from '../api/schoolApi.ts';
import type { Lang } from '../i18n/translations.ts';
import type {
  ExpenseCategory,
  Invoice,
  InvoiceStatus,
  PaymentMethod,
  PayrollRecord,
  SchoolDatabase,
} from '../types/school.ts';

interface FinanceModuleProps {
  db: SchoolDatabase;
  lang: Lang;
  onRefresh: () => Promise<void>;
  externalPayInvoice?: Invoice | null;
  onClearExternalPayInvoice?: () => void;
}

export const FinanceModule: React.FC<FinanceModuleProps> = ({
  db,
  lang,
  onRefresh,
  externalPayInvoice,
  onClearExternalPayInvoice,
}) => {
  const [subTab, setSubTab] = useState<'invoices' | 'payroll' | 'reports'>('invoices');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [reportScope, setReportScope] = useState<'daily' | 'monthly' | 'annual'>('monthly');
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null);
  const [payingPayroll, setPayingPayroll] = useState<PayrollRecord | null>(null);
  const [payslipRecord, setPayslipRecord] = useState<PayrollRecord | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const activePayInvoice = payingInvoice || externalPayInvoice || null;
  const closePayModal = () => {
    setPayingInvoice(null);
    onClearExternalPayInvoice?.();
  };

  const [payForm, setPayForm] = useState({
    amount: 0,
    method: 'ABA Bank' as PaymentMethod,
    reference: '',
  });

  const [invForm, setInvForm] = useState({
    studentId: db.students[0]?.id || '',
    term: db.schoolProfile.currentTerm,
    description: 'ថ្លៃសិក្សា និងសៀវភៅ (Term 4)',
    tuitionAmount: 165,
    bookFee: 25,
    discountPercent: 0,
    dueDate: new Date().toISOString().slice(0, 10),
  });

  const [payrollAdj, setPayrollAdj] = useState({ bonus: 0, deductions: 0 });
  const [expForm, setExpForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: 'Utilities' as ExpenseCategory,
    description: '',
    amount: 0,
  });

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const financeSummary = useMemo(() => {
    const billed = db.invoices.reduce((s, i) => s + i.netAmount, 0);
    const collected = db.invoices.reduce((s, i) => s + i.paidAmount, 0);
    const due = Math.max(0, billed - collected);
    const overdue = db.invoices.filter((i) => i.status === 'Overdue').length;
    return { billed, collected, due, overdue };
  }, [db.invoices]);

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.invoices.filter((inv) => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (!q) return true;
      const st = db.students.find((s) => s.id === inv.studentId);
      return (
        inv.invoiceNo.toLowerCase().includes(q) ||
        (st?.nameKh.toLowerCase().includes(q) ?? false) ||
        (st?.nameEn.toLowerCase().includes(q) ?? false) ||
        (st?.studentCode.toLowerCase().includes(q) ?? false)
      );
    });
  }, [db.invoices, db.students, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const pagedInvoices = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    return filteredInvoices.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [filteredInvoices, page, totalPages]);

  const openPayFor = (inv: Invoice) => {
    const remaining = Math.max(0, Math.round((inv.netAmount - inv.paidAmount) * 100) / 100);
    setPayForm({ amount: remaining, method: 'ABA Bank', reference: '' });
    setPayingInvoice(inv);
  };

  // Sync payForm if triggered externally from Overview
  React.useEffect(() => {
    if (externalPayInvoice) {
      const remaining = Math.max(0, Math.round((externalPayInvoice.netAmount - externalPayInvoice.paidAmount) * 100) / 100);
      setPayForm({ amount: remaining, method: 'ABA Bank', reference: '' });
    }
  }, [externalPayInvoice]);

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayInvoice) return;
    setSaving(true);
    try {
      await schoolApi.payInvoice(activePayInvoice.id, {
        amount: payForm.amount,
        method: payForm.method,
        reference: payForm.reference,
      });
      await onRefresh();
      closePayModal();
      notify(lang === 'km' ? 'បានកត់ត្រាការបង់ប្រាក់រួចរាល់!' : 'Payment recorded successfully.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await schoolApi.createInvoice(invForm);
      await onRefresh();
      setShowNewInvoice(false);
      notify(lang === 'km' ? 'បានបង្កើតវិក្កយបត្រថ្មីរួចរាល់!' : 'Invoice created.');
    } finally {
      setSaving(false);
    }
  };

  const handlePayPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPayroll) return;
    setSaving(true);
    try {
      await schoolApi.payPayroll(payingPayroll.id, payrollAdj);
      await onRefresh();
      setPayingPayroll(null);
      notify(lang === 'km' ? 'បានទូទាត់បៀវត្សរ៍ និងកត់ត្រាក្នុងរបាយការណ៍ចំណាយ!' : 'Payroll paid and recorded in expense ledger.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await schoolApi.createExpense(expForm);
      await onRefresh();
      setShowAddExpense(false);
      setExpForm({ ...expForm, description: '', amount: 0 });
      notify(lang === 'km' ? 'បានកត់ត្រាចំណាយថ្មីរួចរាល់!' : 'Expense recorded.');
    } finally {
      setSaving(false);
    }
  };

  const reportData = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const year = today.slice(0, 4);

    const matchDate = (d: string) => {
      if (reportScope === 'daily') return d === today;
      if (reportScope === 'monthly') return d.startsWith(month);
      return d.startsWith(year);
    };

    let revenue = 0;
    const byMethod: Record<PaymentMethod, number> = {
      'ABA Bank': 0,
      ACLEDA: 0,
      Wing: 0,
      Cash: 0,
    };

    db.invoices.forEach((inv) => {
      inv.payments.forEach((p) => {
        if (matchDate(p.date)) {
          revenue += p.amount;
          byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
        }
      });
    });

    const filteredExpenses = db.expenses.filter((e) => matchDate(e.date));
    const totalExpense = filteredExpenses.reduce((s, e) => s + e.amount, 0);

    const byCategory: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });

    return {
      revenue,
      totalExpense,
      netProfit: revenue - totalExpense,
      byMethod,
      byCategory,
      filteredExpenses,
    };
  }, [db.invoices, db.expenses, reportScope]);

  const invoiceStatusClass = (st: InvoiceStatus) => {
    if (st === 'Paid') return 'text-emerald-700';
    if (st === 'Partial') return 'text-amber-700';
    if (st === 'Overdue') return 'text-rose-700 font-semibold';
    return 'text-slate-700';
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

      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            onClick={() => setSubTab('invoices')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'invoices' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'km' ? 'វិក្កយបត្រ និងបំណុលថ្លៃសិក្សា' : 'Tuition Invoices & Debt'}
          </button>
          <button
            onClick={() => setSubTab('payroll')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'payroll' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'km' ? 'បៀវត្សរ៍គ្រូ និងបុគ្គលិក' : 'Teacher & Staff Payroll'}
          </button>
          <button
            onClick={() => setSubTab('reports')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'reports' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'km' ? 'របាយការណ៍ចំណូល-ចំណាយ' : 'Income & Expense Reports'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {subTab === 'invoices' && (
            <button
              onClick={() => {
                const firstStu = db.students[0];
                const prog = db.programs.find((p) => p.id === firstStu?.programId) || db.programs[0];
                setInvForm({
                  ...invForm,
                  studentId: firstStu?.id || '',
                  tuitionAmount: prog?.termTuitionUsd || 165,
                  bookFee: prog?.bookFeeUsd || 25,
                  discountPercent: firstStu?.scholarshipPercent || 0,
                });
                setShowNewInvoice(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              {lang === 'km' ? 'ចេញវិក្កយបត្រថ្មី' : 'Issue Invoice'}
            </button>
          )}
          {subTab === 'reports' && (
            <button
              onClick={() => setShowAddExpense(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              {lang === 'km' ? 'កត់ត្រាចំណាយថ្មី' : 'Record Expense'}
            </button>
          )}
        </div>
      </div>

      {subTab === 'invoices' && (
        <>
          {/* Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">{lang === 'km' ? 'ទឹកប្រាក់សរុបតាមវិក្កយបត្រ' : 'Total Invoiced'}</div>
              <div className="text-xl font-bold text-slate-900 font-mono-tabular mt-1">
                ${financeSummary.billed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">{lang === 'km' ? 'ទឹកប្រាក់ប្រមូលបាន' : 'Collected'}</div>
              <div className="text-xl font-bold text-emerald-700 font-mono-tabular mt-1">
                ${financeSummary.collected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">{lang === 'km' ? 'នៅជំពាក់សរុប' : 'Outstanding Balance'}</div>
              <div className="text-xl font-bold text-rose-700 font-mono-tabular mt-1">
                ${financeSummary.due.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">{lang === 'km' ? 'ហួសកាលកំណត់ (Overdue)' : 'Overdue Invoices'}</div>
              <div className="text-xl font-bold text-amber-700 font-mono-tabular mt-1">{financeSummary.overdue}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder={lang === 'km' ? 'ស្វែងរកលេខវិក្កយបត្រ ឬឈ្មោះសិស្ស...' : 'Search invoice #, student name or ID...'}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(['all', 'Overdue', 'Unpaid', 'Partial', 'Paid'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusFilter(st);
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
                      statusFilter === st ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    {st === 'all' ? (lang === 'km' ? 'ទាំងអស់' : 'All') : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="py-2.5 px-4">{lang === 'km' ? 'លេខវិក្កយបត្រ' : 'Invoice #'}</th>
                    <th className="py-2.5 px-4">{lang === 'km' ? 'សិស្ស' : 'Student'}</th>
                    <th className="py-2.5 px-4">{lang === 'km' ? 'បរិយាយ' : 'Description'}</th>
                    <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'ត្រូវបង់' : 'Net Total'}</th>
                    <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'បានបង់' : 'Paid'}</th>
                    <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'នៅខ្វះ' : 'Balance'}</th>
                    <th className="py-2.5 px-4">{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                    <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'សកម្មភាព' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {pagedInvoices.map((inv) => {
                    const st = db.students.find((s) => s.id === inv.studentId);
                    const bal = Math.max(0, Math.round((inv.netAmount - inv.paidAmount) * 100) / 100);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono-tabular font-medium text-slate-800">{inv.invoiceNo}</td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900">{st?.nameKh || inv.studentId}</div>
                          <div className="text-slate-500 font-mono-tabular">{st?.studentCode} · {st?.guardianPhone}</div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 max-w-[240px] truncate">{inv.description}</td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular text-slate-900">${inv.netAmount.toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular text-emerald-700">${inv.paidAmount.toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular font-semibold text-rose-700">
                          {bal > 0 ? `$${bal.toFixed(2)}` : '—'}
                        </td>
                        <td className={`py-2.5 px-4 ${invoiceStatusClass(inv.status)}`}>{inv.status}</td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {bal > 0 && (
                              <>
                                <button
                                  onClick={() => openPayFor(inv)}
                                  className="px-2.5 py-1 bg-slate-900 text-white rounded-md hover:bg-slate-800 font-medium"
                                >
                                  {lang === 'km' ? 'បង់ប្រាក់' : 'Pay'}
                                </button>
                                <button
                                  onClick={async () => {
                                    await schoolApi.sendNotification({
                                      channel: 'Telegram',
                                      recipientType: 'Individual',
                                      recipientLabel: `${st?.guardianName || ''} (${st?.guardianPhone || ''})`,
                                      title: `រំលឹកបង់ថ្លៃសិក្សា (${inv.invoiceNo})`,
                                      message: `សូមគោរពជូនមាតាបិតាសិស្ស ${st?.nameKh || ''} វិក្កយបត្រ ${inv.invoiceNo} នៅខ្វះចំនួន $${bal.toFixed(2)}។ សូមអរគុណ!`,
                                    });
                                    await onRefresh();
                                    notify(lang === 'km' ? `បានផ្ញើសាររំលឹកទៅ ${st?.guardianPhone}` : 'Payment reminder sent.');
                                  }}
                                  title={lang === 'km' ? 'ផ្ញើសាររំលឹក' : 'Send Reminder'}
                                  className="p-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-100"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setReceiptInvoice(inv)}
                              title={lang === 'km' ? 'បោះពុម្ពវិក្កយបត្រ' : 'Print Receipt'}
                              className="p-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-100"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span className="font-mono-tabular">
                {pagedInvoices.length} / {filteredInvoices.length} {lang === 'km' ? 'វិក្កយបត្រ' : 'invoices'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 border border-slate-200 rounded-md disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono-tabular">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 border border-slate-200 rounded-md disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {subTab === 'payroll' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {lang === 'km' ? 'តារាងទូទាត់ប្រាក់បៀវត្សរ៍គ្រូបង្រៀន និងបុគ្គលិក' : 'Monthly Staff Payroll Sheet'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'km'
                  ? 'ប្រាក់ខែគោល + ម៉ោងបង្រៀនបន្ថែម + ប្រាក់ឧបត្ថម្ភ − ការកាត់ទុក'
                  : 'Base salary + teaching hour allowance + bonus − deductions'}
              </p>
            </div>
            <span className="text-xs font-mono-tabular text-slate-600">
              Total:{' '}
              <strong className="text-slate-900">
                ${db.payroll.reduce((s, p) => s + p.netPay, 0).toLocaleString()}
              </strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">{lang === 'km' ? 'គ្រូ / បុគ្គលិក' : 'Staff Member'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'ប្រាក់ខែគោល' : 'Base'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'ម៉ោងបង្រៀន' : 'Hours'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'ប្រាក់លើកទឹកចិត្ត' : 'Bonus'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'កាត់ទុក' : 'Deduct'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'ប្រាក់ត្រូវបើកសរុប' : 'Net Pay'}</th>
                  <th className="py-2.5 px-4">{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'សកម្មភាព' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {db.payroll.map((pr) => {
                  const st = db.teachers.find((t) => t.id === pr.staffId);
                  return (
                    <tr key={pr.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{st?.nameKh}</div>
                        <div className="text-slate-500">{st?.nameEn} · {st?.role}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular">${pr.baseSalary.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono-tabular">
                        {pr.teachingHours}h × ${pr.hourlyRate}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular text-emerald-700">+${pr.bonus.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono-tabular text-rose-700">-${pr.deductions.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono-tabular font-bold text-slate-900">${pr.netPay.toFixed(2)}</td>
                      <td className="py-3 px-4 font-medium">
                        <span className={pr.status === 'Paid' ? 'text-emerald-700' : 'text-amber-700'}>
                          {pr.status} {pr.paidDate ? `· ${pr.paidDate}` : ''}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {pr.status === 'Pending' && (
                            <button
                              onClick={() => {
                                setPayrollAdj({ bonus: pr.bonus, deductions: pr.deductions });
                                setPayingPayroll(pr);
                              }}
                              className="px-2.5 py-1 bg-slate-900 text-white rounded-md hover:bg-slate-800 font-medium"
                            >
                              {lang === 'km' ? 'បើកប្រាក់ខែ' : 'Pay Salary'}
                            </button>
                          )}
                          <button
                            onClick={() => setPayslipRecord(pr)}
                            className="p-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-100"
                            title="Payslip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'reports' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {lang === 'km' ? 'របាយការណ៍ចំណូល-ចំណាយសាលា' : 'Income & Expense Financial Report'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lang === 'km' ? 'តាមដានប្រចាំថ្ងៃ ប្រចាំខែ ឬប្រចាំឆ្នាំ' : 'Filter financial cashflow by Daily, Monthly, or Annual window'}
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(['daily', 'monthly', 'annual'] as const).map((sc) => (
                  <button
                    key={sc}
                    onClick={() => setReportScope(sc)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                      reportScope === sc ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    {sc === 'daily'
                      ? lang === 'km'
                        ? 'ប្រចាំថ្ងៃ'
                        : 'Daily'
                      : sc === 'monthly'
                      ? lang === 'km'
                        ? 'ប្រចាំខែ'
                        : 'Monthly'
                      : lang === 'km'
                      ? 'ប្រចាំឆ្នាំ'
                      : 'Annual'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div>
                <div className="text-xs text-slate-500">{lang === 'km' ? 'ចំណូលសរុប (Revenue)' : 'Total Revenue'}</div>
                <div className="text-2xl font-bold text-emerald-700 font-mono-tabular mt-1">
                  ${reportData.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">{lang === 'km' ? 'ចំណាយសរុប (Expenses)' : 'Total Expenses'}</div>
                <div className="text-2xl font-bold text-rose-700 font-mono-tabular mt-1">
                  ${reportData.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">{lang === 'km' ? 'ចំណេញសុទ្ធ (Net Surplus)' : 'Net Surplus'}</div>
                <div className={`text-2xl font-bold font-mono-tabular mt-1 ${reportData.netProfit >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                  ${reportData.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 text-xs">
              <div>
                <h4 className="font-semibold text-slate-800 mb-3">
                  {lang === 'km' ? 'ចំណូលតាមមធ្យោបាយទូទាត់' : 'Revenue by Payment Channel'}
                </h4>
                <div className="space-y-2">
                  {(Object.entries(reportData.byMethod) as Array<[PaymentMethod, number]>).map(([method, amt]) => (
                    <div key={method} className="flex items-center justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-700">{method}</span>
                      <span className="font-mono-tabular font-semibold text-slate-900">${amt.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 mb-3">
                  {lang === 'km' ? 'ចំណាយតាមប្រភេទ' : 'Expenses by Category'}
                </h4>
                <div className="space-y-2">
                  {Object.keys(reportData.byCategory).length === 0 ? (
                    <p className="text-slate-400">{lang === 'km' ? 'មិនមានចំណាយក្នុងចន្លោះពេលនេះ' : 'No expenses in this period.'}</p>
                  ) : (
                    Object.entries(reportData.byCategory).map(([cat, amt]) => (
                      <div key={cat} className="flex items-center justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-700">{cat}</span>
                        <span className="font-mono-tabular font-semibold text-rose-700">${amt.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 text-sm font-semibold text-slate-900">
              {lang === 'km' ? 'បញ្ជីកំណត់ត្រាចំណាយប្រតិបត្តិការ' : 'Expense Ledger'}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="py-2.5 px-4">{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                    <th className="py-2.5 px-4">{lang === 'km' ? 'ប្រភេទ' : 'Category'}</th>
                    <th className="py-2.5 px-4">{lang === 'km' ? 'បរិយាយ' : 'Description'}</th>
                    <th className="py-2.5 px-4">{lang === 'km' ? 'អ្នកទូទាត់' : 'Paid By'}</th>
                    <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'ទឹកប្រាក់' : 'Amount'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {reportData.filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono-tabular text-slate-600">{exp.date}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">{exp.category}</td>
                      <td className="py-2.5 px-4 text-slate-700">{exp.description}</td>
                      <td className="py-2.5 px-4 text-slate-600">{exp.paidBy}</td>
                      <td className="py-2.5 px-4 text-right font-mono-tabular font-semibold text-rose-700">
                        ${exp.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {activePayInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handlePaySubmit} className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{lang === 'km' ? 'កត់ត្រាការបង់ថ្លៃសិក្សា' : 'Record Tuition Payment'}</h3>
                <p className="text-xs text-slate-500 font-mono-tabular">{activePayInvoice.invoiceNo}</p>
              </div>
              <button type="button" onClick={closePayModal}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between">
                <span className="text-slate-600">{lang === 'km' ? 'ទឹកប្រាក់នៅខ្វះ៖' : 'Remaining Balance:'}</span>
                <span className="font-mono-tabular font-bold text-rose-700">
                  ${Math.max(0, activePayInvoice.netAmount - activePayInvoice.paidAmount).toFixed(2)}
                </span>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ចំនួនប្រាក់បង់ ($)' : 'Payment Amount ($)'}</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'មធ្យោបាយបង់ប្រាក់' : 'Payment Method'}</label>
                <select
                  value={payForm.method}
                  onChange={(e) => setPayForm({ ...payForm, method: e.target.value as PaymentMethod })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="ABA Bank">ABA Bank (KHQR / Transfer)</option>
                  <option value="ACLEDA">ACLEDA Bank</option>
                  <option value="Wing">Wing Money</option>
                  <option value="Cash">Cash (សាច់ប្រាក់)</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'លេខយោងប្រតិបត្តិការ' : 'Reference ID (Optional)'}</label>
                <input
                  value={payForm.reference}
                  onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                  placeholder="ABA-98421"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button type="button" onClick={closePayModal} className="px-4 py-2 text-xs border border-slate-300 rounded-lg">
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs bg-slate-900 text-white rounded-lg">
                <CreditCard className="w-3.5 h-3.5" />
                {lang === 'km' ? 'បញ្ជាក់ការបង់ប្រាក់' : 'Confirm Payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Invoice Modal */}
      {showNewInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateInvoice} className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">{lang === 'km' ? 'ចេញវិក្កយបត្រថ្លៃសិក្សាថ្មី' : 'Issue Tuition Invoice'}</h3>
              <button type="button" onClick={() => setShowNewInvoice(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ជ្រើសរើសសិស្ស' : 'Student'}</label>
                <select
                  value={invForm.studentId}
                  onChange={(e) => {
                    const st = db.students.find((s) => s.id === e.target.value);
                    const prog = db.programs.find((p) => p.id === st?.programId);
                    setInvForm({
                      ...invForm,
                      studentId: e.target.value,
                      tuitionAmount: prog?.termTuitionUsd || invForm.tuitionAmount,
                      bookFee: prog?.bookFeeUsd || invForm.bookFee,
                      discountPercent: st?.scholarshipPercent || 0,
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  {db.students.slice(0, 60).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.studentCode} · {s.nameKh} ({s.level})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ថ្លៃសិក្សា ($)' : 'Tuition ($)'}</label>
                  <input
                    type="number"
                    value={invForm.tuitionAmount}
                    onChange={(e) => setInvForm({ ...invForm, tuitionAmount: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'សៀវភៅ ($)' : 'Books ($)'}</label>
                  <input
                    type="number"
                    value={invForm.bookFee}
                    onChange={(e) => setInvForm({ ...invForm, bookFee: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'បញ្ចុះ (%)' : 'Disc (%)'}</label>
                  <input
                    type="number"
                    value={invForm.discountPercent}
                    onChange={(e) => setInvForm({ ...invForm, discountPercent: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ថ្ងៃផុតកំណត់បង់ប្រាក់' : 'Due Date'}</label>
                <input
                  type="date"
                  value={invForm.dueDate}
                  onChange={(e) => setInvForm({ ...invForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button type="button" onClick={() => setShowNewInvoice(false)} className="px-4 py-2 text-xs border border-slate-300 rounded-lg">
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-xs bg-slate-900 text-white rounded-lg">
                {lang === 'km' ? 'បង្កើតវិក្កយបត្រ' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pay Payroll Modal */}
      {payingPayroll && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handlePayPayroll} className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">{lang === 'km' ? 'ទូទាត់ប្រាក់បៀវត្សរ៍' : 'Process Staff Payroll'}</h3>
              <button type="button" onClick={() => setPayingPayroll(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ប្រាក់លើកទឹកចិត្ត ($)' : 'Bonus ($)'}</label>
                <input
                  type="number"
                  value={payrollAdj.bonus}
                  onChange={(e) => setPayrollAdj({ ...payrollAdj, bonus: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ប្រាក់កាត់ទុក ($)' : 'Deductions ($)'}</label>
                <input
                  type="number"
                  value={payrollAdj.deductions}
                  onChange={(e) => setPayrollAdj({ ...payrollAdj, deductions: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button type="button" onClick={() => setPayingPayroll(null)} className="px-4 py-2 text-xs border border-slate-300 rounded-lg">
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-xs bg-slate-900 text-white rounded-lg">
                {lang === 'km' ? 'បញ្ជាក់ការបើកប្រាក់ខែ' : 'Mark as Paid'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateExpense} className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">{lang === 'km' ? 'កត់ត្រាចំណាយប្រតិបត្តិការ' : 'Record Operating Expense'}</h3>
              <button type="button" onClick={() => setShowAddExpense(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</label>
                  <input
                    type="date"
                    value={expForm.date}
                    onChange={(e) => setExpForm({ ...expForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ប្រភេទចំណាយ' : 'Category'}</label>
                  <select
                    value={expForm.category}
                    onChange={(e) => setExpForm({ ...expForm, category: e.target.value as ExpenseCategory })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Utilities">Utilities</option>
                    <option value="Rent">Rent</option>
                    <option value="Books & Supplies">Books & Supplies</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Payroll">Payroll</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'បរិយាយ *' : 'Description *'}</label>
                <input
                  required
                  value={expForm.description}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                  placeholder="ឧ. ទិញសម្ភារសិក្សា ឬថ្លៃទឹកភ្លើង"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ទឹកប្រាក់ ($)' : 'Amount ($)'}</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={expForm.amount}
                  onChange={(e) => setExpForm({ ...expForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button type="button" onClick={() => setShowAddExpense(false)} className="px-4 py-2 text-xs border border-slate-300 rounded-lg">
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-xs bg-slate-900 text-white rounded-lg">
                {lang === 'km' ? 'រក្សាទុកចំណាយ' : 'Save Expense'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Printable Official Receipt Modal */}
      {receiptInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 border border-slate-300 space-y-5">
            <div className="flex items-center justify-between no-print">
              <span className="text-xs font-semibold text-slate-500">
                {lang === 'km' ? 'វិក្កយបត្រផ្លូវការ (Official Receipt)' : 'Official Tuition Receipt'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {lang === 'km' ? 'បោះពុម្ព' : 'Print'}
                </button>
                <button onClick={() => setReceiptInvoice(null)} className="p-1.5 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {(() => {
              const st = db.students.find((s) => s.id === receiptInvoice.studentId);
              return (
                <div className="border border-slate-300 p-5 space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src="/src/assets/images/gis_school_emblem_1794839258387.jpg"
                        alt="GIS Emblem"
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 object-contain"
                      />
                      <div>
                        <div className="font-bold text-sm text-slate-900">{db.schoolProfile.nameKh}</div>
                        <div className="text-slate-500">{db.schoolProfile.nameEn}</div>
                      </div>
                    </div>
                    <div className="text-right font-mono-tabular">
                      <div className="font-bold text-slate-900">{receiptInvoice.invoiceNo}</div>
                      <div className="text-slate-500">{receiptInvoice.issueDate}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500">Student: </span>
                      <span className="font-semibold text-slate-900">{st?.nameKh} ({st?.nameEn})</span>
                    </div>
                    <div className="text-right font-mono-tabular">
                      <span className="text-slate-500">ID: </span>
                      <span>{st?.studentCode}</span>
                    </div>
                  </div>

                  <div className="border-t border-b border-slate-200 py-3 space-y-1.5">
                    <div className="flex justify-between">
                      <span>{receiptInvoice.description}</span>
                      <span className="font-mono-tabular">${receiptInvoice.tuitionAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Books & Learning Materials</span>
                      <span className="font-mono-tabular">${receiptInvoice.bookFee.toFixed(2)}</span>
                    </div>
                    {receiptInvoice.discountPercent > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Scholarship Discount ({receiptInvoice.discountPercent}%)</span>
                        <span className="font-mono-tabular">
                          -${((receiptInvoice.tuitionAmount * receiptInvoice.discountPercent) / 100).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 font-mono-tabular">
                    <div className="flex justify-between font-bold text-slate-900 text-sm">
                      <span>Net Total:</span>
                      <span>${receiptInvoice.netAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Paid Amount:</span>
                      <span>${receiptInvoice.paidAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-rose-700 font-semibold">
                      <span>Balance Due:</span>
                      <span>${Math.max(0, receiptInvoice.netAmount - receiptInvoice.paidAmount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Printable Payslip Modal */}
      {payslipRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-300 space-y-4 text-xs">
            <div className="flex items-center justify-between no-print">
              <span className="font-semibold text-slate-600">Staff Payslip · {payslipRecord.month}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-lg"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button onClick={() => setPayslipRecord(null)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
            {(() => {
              const st = db.teachers.find((t) => t.id === payslipRecord.staffId);
              return (
                <div className="border border-slate-300 p-4 space-y-3">
                  <div className="font-bold text-sm text-slate-900">{db.schoolProfile.nameKh}</div>
                  <div className="text-slate-600">
                    Payslip for <strong>{st?.nameKh}</strong> ({st?.nameEn}) · {st?.staffCode}
                  </div>
                  <div className="border-t border-slate-200 pt-2 space-y-1 font-mono-tabular">
                    <div className="flex justify-between">
                      <span>Base Salary:</span>
                      <span>${payslipRecord.baseSalary.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Teaching Hours ({payslipRecord.teachingHours}h):</span>
                      <span>
                        $
                        {(
                          payslipRecord.netPay -
                          payslipRecord.baseSalary -
                          payslipRecord.bonus +
                          payslipRecord.deductions
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Bonus:</span>
                      <span>+${payslipRecord.bonus.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-rose-700">
                      <span>Deductions:</span>
                      <span>-${payslipRecord.deductions.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-sm">
                      <span>Net Pay:</span>
                      <span>${payslipRecord.netPay.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
