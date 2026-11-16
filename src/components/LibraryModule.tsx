import React, { useState } from 'react';
import { BookOpen, Plus, RotateCcw, X } from 'lucide-react';
import { schoolApi } from '../api/schoolApi.ts';
import type { Lang } from '../i18n/translations.ts';
import type { LibraryItem, SchoolDatabase } from '../types/school.ts';

interface LibraryModuleProps {
  db: SchoolDatabase;
  lang: Lang;
  onRefresh: () => Promise<void>;
}

export const LibraryModule: React.FC<LibraryModuleProps> = ({ db, lang, onRefresh }) => {
  const [showAddItem, setShowAddItem] = useState(false);
  const [loanItem, setLoanItem] = useState<LibraryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [itemForm, setItemForm] = useState({
    sku: '',
    title: '',
    programId: db.programs[0]?.id || 'prog-gep',
    category: 'Textbook' as LibraryItem['category'],
    totalStock: 30,
    unitPriceUsd: 22,
  });

  const [loanForm, setLoanForm] = useState({
    borrowerName: db.students[0]?.nameEn || '',
    borrowerCode: db.students[0]?.studentCode || '',
    borrowerType: 'Student' as 'Student' | 'Teacher',
  });

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await schoolApi.createLibraryItem(itemForm);
      await onRefresh();
      setShowAddItem(false);
      setItemForm({ ...itemForm, sku: '', title: '' });
      notify(lang === 'km' ? 'បានបន្ថែមសៀវភៅ/សម្ភារសិក្សាថ្មី!' : 'Library item added.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanItem) return;
    setSaving(true);
    try {
      await schoolApi.createLibraryLoan({
        itemId: loanItem.id,
        ...loanForm,
      });
      await onRefresh();
      setLoanItem(null);
      notify(lang === 'km' ? 'បានកត់ត្រាការខ្ចីសៀវភៅរួចរាល់!' : 'Material loan recorded.');
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

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {lang === 'km' ? 'ស្តុកសៀវភៅសិក្សា និងបណ្ណាល័យ' : 'Library & Learning Materials Inventory'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'km' ? 'គ្រប់គ្រងសៀវភៅកម្មវិធី GEP, HSK, IELTS និងការខ្ចី-សង' : 'Track textbook stock and student/teacher borrowing'}
          </p>
        </div>
        <button
          onClick={() => setShowAddItem(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          {lang === 'km' ? 'បន្ថែមសៀវភៅថ្មី' : 'Add Material'}
        </button>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4">SKU</th>
                <th className="py-2.5 px-4">{lang === 'km' ? 'ចំណងជើងសៀវភៅ / សម្ភារ' : 'Title'}</th>
                <th className="py-2.5 px-4">{lang === 'km' ? 'ប្រភេទ' : 'Category'}</th>
                <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'តម្លៃឯកតា' : 'Unit Price'}</th>
                <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'នៅសល់ / សរុប' : 'Available / Total'}</th>
                <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'សកម្មភាព' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {db.libraryItems.map((item) => {
                const prog = db.programs.find((p) => p.id === item.programId);
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono-tabular text-slate-600">{item.sku}</td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900">{item.title}</div>
                      <div className="text-slate-500">{prog?.code}</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{item.category}</td>
                    <td className="py-2.5 px-4 text-right font-mono-tabular">${item.unitPriceUsd.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right font-mono-tabular">
                      <span className={item.availableStock <= 5 ? 'text-rose-700 font-bold' : 'text-slate-900 font-semibold'}>
                        {item.availableStock}
                      </span>{' '}
                      / {item.totalStock}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        disabled={item.availableStock <= 0}
                        onClick={() => setLoanItem(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <BookOpen className="w-3 h-3" />
                        {lang === 'km' ? 'ឱ្យខ្ចី' : 'Issue Loan'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Borrowing History */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 text-sm font-semibold text-slate-900">
          {lang === 'km' ? 'បញ្ជីការខ្ចី និងសងសៀវភៅ' : 'Borrowing & Return Log'}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4">{lang === 'km' ? 'សៀវភៅ' : 'Item'}</th>
                <th className="py-2.5 px-4">{lang === 'km' ? 'អ្នកខ្ចី' : 'Borrower'}</th>
                <th className="py-2.5 px-4">{lang === 'km' ? 'ថ្ងៃខ្ចី / ថ្ងៃសង' : 'Borrowed / Due'}</th>
                <th className="py-2.5 px-4">{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'សកម្មភាព' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {db.libraryLoans.map((loan) => {
                const item = db.libraryItems.find((i) => i.id === loan.itemId);
                return (
                  <tr key={loan.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-medium text-slate-900">{item?.title || loan.itemId}</td>
                    <td className="py-2.5 px-4 text-slate-700">
                      {loan.borrowerName} · <span className="font-mono-tabular text-slate-500">{loan.borrowerCode}</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono-tabular text-slate-600">
                      {loan.borrowDate} → {loan.dueDate}
                    </td>
                    <td className="py-2.5 px-4 font-medium">
                      <span className={loan.returned ? 'text-emerald-700' : 'text-amber-700'}>
                        {loan.returned ? `Returned (${loan.returnDate})` : 'Borrowed'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {!loan.returned && (
                        <button
                          onClick={async () => {
                            await schoolApi.returnLibraryLoan(loan.id);
                            await onRefresh();
                            notify(lang === 'km' ? 'បានកត់ត្រាការសងសៀវភៅរួចរាល់!' : 'Item returned to stock.');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white rounded-md hover:bg-slate-800"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {lang === 'km' ? 'សងវិញ' : 'Mark Returned'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Stock Modal */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleAddItem} className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">{lang === 'km' ? 'បន្ថែមសៀវភៅ/សម្ភារថ្មី' : 'Add Learning Material'}</h3>
              <button type="button" onClick={() => setShowAddItem(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ឈ្មោះសៀវភៅ *' : 'Title *'}</label>
                <input
                  required
                  value={itemForm.title}
                  onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">SKU</label>
                  <input
                    value={itemForm.sku}
                    onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                    placeholder="BK-GEP-05"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ចំនួនស្តុក' : 'Stock Qty'}</label>
                  <input
                    type="number"
                    value={itemForm.totalStock}
                    onChange={(e) => setItemForm({ ...itemForm, totalStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button type="button" onClick={() => setShowAddItem(false)} className="px-4 py-2 text-xs border border-slate-300 rounded-lg">
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-xs bg-slate-900 text-white rounded-lg">
                {lang === 'km' ? 'រក្សាទុក' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loan Modal */}
      {loanItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateLoan} className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">{lang === 'km' ? 'កត់ត្រាការខ្ចីសៀវភៅ' : 'Issue Material Loan'}</h3>
              <button type="button" onClick={() => setLoanItem(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900">
                {loanItem.title}
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ឈ្មោះអ្នកខ្ចី *' : 'Borrower Name *'}</label>
                <input
                  required
                  value={loanForm.borrowerName}
                  onChange={(e) => setLoanForm({ ...loanForm, borrowerName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'អត្តលេខ' : 'ID Code'}</label>
                  <input
                    value={loanForm.borrowerCode}
                    onChange={(e) => setLoanForm({ ...loanForm, borrowerCode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ប្រភេទ' : 'Type'}</label>
                  <select
                    value={loanForm.borrowerType}
                    onChange={(e) => setLoanForm({ ...loanForm, borrowerType: e.target.value as 'Student' | 'Teacher' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Student">Student</option>
                    <option value="Teacher">Teacher</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button type="button" onClick={() => setLoanItem(null)} className="px-4 py-2 text-xs border border-slate-300 rounded-lg">
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-xs bg-slate-900 text-white rounded-lg">
                {lang === 'km' ? 'បញ្ជាក់ការខ្ចី' : 'Confirm Loan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
