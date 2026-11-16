import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import { schoolApi } from '../api/schoolApi.ts';
import type { Lang } from '../i18n/translations.ts';
import type { NotificationChannel, SchoolDatabase } from '../types/school.ts';

interface CommunicationsModuleProps {
  db: SchoolDatabase;
  lang: Lang;
  onRefresh: () => Promise<void>;
}

export const CommunicationsModule: React.FC<CommunicationsModuleProps> = ({ db, lang, onRefresh }) => {
  const [channel, setChannel] = useState<NotificationChannel>('Telegram');
  const [recipientType, setRecipientType] = useState<'All Parents' | 'Class' | 'Individual'>('All Parents');
  const [recipientLabel, setRecipientLabel] = useState('មាតាបិតាសិស្សទាំងអស់ (២៩៦ នាក់)');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const templates = [
    {
      label: lang === 'km' ? 'គំរូ៖ រំលឹកបង់ថ្លៃសិក្សា' : 'Template: Tuition Reminder',
      title: 'សេចក្ដីជូនដំណឹងបង់ថ្លៃសិក្សា Term 4',
      message:
        'សូមគោរពជូនមាតាបិតា និងអាណាព្យាបាល! សូមមេត្តាទូទាត់ថ្លៃសិក្សា Term 4 មុនថ្ងៃផុតកំណត់តាមរយៈ ABA / ACLEDA ឬការិយាល័យសាលា ជី អាយ អេស។ សូមអរគុណ!',
    },
    {
      label: lang === 'km' ? 'គំរូ៖ កាលវិភាគប្រឡង' : 'Template: Exam Notice',
      title: 'កាលវិភាគប្រឡងពាក់កណ្ដាលវគ្គ (Midterm)',
      message:
        'សាលា ជី អាយ អេស សូមជម្រាបជូនមាតាបិតាថា សិស្សានុសិស្សនឹងមានការប្រឡងពាក់កណ្ដាលវគ្គនៅសប្ដាហ៍ក្រោយ។ សូមជំរុញប្អូនៗរំលឹកមេរៀន និងមករៀនឱ្យបានទៀងទាត់។',
    },
    {
      label: lang === 'km' ? 'គំរូ៖ ថ្ងៃឈប់សម្រាក' : 'Template: Holiday Notice',
      title: 'សេចក្ដីជូនដំណឹងអំពីថ្ងៃឈប់សម្រាក',
      message:
        'សាលាភាសាអន្តរជាតិ ជី អាយ អេស សូមជម្រាបជូនថាសាលានឹងឈប់សម្រាកតាមប្រក្រតិទិនបុណ្យជាតិ ហើយនឹងបើកបង្រៀនវិញជាធម្មតានៅថ្ងៃបន្ទាប់។',
    },
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await schoolApi.sendNotification({
        channel,
        recipientType,
        recipientLabel,
        title,
        message,
      });
      await onRefresh();
      setTitle('');
      setMessage('');
      setToast(lang === 'km' ? 'បានផ្ញើសេចក្ដីជូនដំណឹងរួចរាល់!' : 'Notification delivered.');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSending(false);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Composer */}
        <form onSubmit={handleSend} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {lang === 'km' ? 'ផ្ញើសារជូនដំណឹង (SMS / Telegram / Portal)' : 'Send School Notification'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'km' ? 'ជ្រើសរើសគំរូសារ ឬសរសេរខ្លឹមសារថ្មី' : 'Use a template or compose a custom announcement'}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {templates.map((tpl) => (
              <button
                key={tpl.label}
                type="button"
                onClick={() => {
                  setTitle(tpl.title);
                  setMessage(tpl.message);
                }}
                className="px-2.5 py-1 text-[11px] font-medium border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50"
              >
                {tpl.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'បណ្ដាញផ្ញើ' : 'Channel'}</label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-lg">
                {(['Telegram', 'SMS', 'Portal'] as const).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(ch)}
                    className={`py-1.5 font-medium rounded-md ${
                      channel === ch ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'អ្នកទទួល' : 'Audience'}</label>
              <select
                value={recipientType}
                onChange={(e) => {
                  const val = e.target.value as 'All Parents' | 'Class' | 'Individual';
                  setRecipientType(val);
                  if (val === 'All Parents') setRecipientLabel(`មាតាបិតាសិស្សទាំងអស់ (${db.students.length} នាក់)`);
                  if (val === 'Class') setRecipientLabel(db.classes[0]?.name || 'Class');
                  if (val === 'Individual') setRecipientLabel('អាណាព្យាបាលសិស្ស');
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="All Parents">{lang === 'km' ? 'មាតាបិតាសិស្សទាំងអស់' : 'All Parents'}</option>
                <option value="Class">{lang === 'km' ? 'តាមថ្នាក់រៀន' : 'Specific Class'}</option>
                <option value="Individual">{lang === 'km' ? 'បុគ្គល / អាណាព្យាបាល' : 'Individual Guardian'}</option>
              </select>
            </div>

            {recipientType === 'Class' && (
              <div>
                <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ជ្រើសរើសថ្នាក់' : 'Select Class'}</label>
                <select
                  value={recipientLabel}
                  onChange={(e) => setRecipientLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  {db.classes.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.shift})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ចំណងជើង *' : 'Subject *'}</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="សេចក្ដីជូនដំណឹង..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ខ្លឹមសារសារ *' : 'Message *'}</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="សូមគោរពជូនមាតាបិតា..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? '...' : lang === 'km' ? 'ផ្ញើសារជូនដំណឹងឥឡូវនេះ' : 'Send Notification'}
          </button>
        </form>

        {/* Sent History */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              {lang === 'km' ? 'ប្រវត្តិសារដែលបានផ្ញើចេញ' : 'Notification Delivery Log'}
            </h3>
            <span className="text-xs font-mono-tabular text-slate-500">{db.notifications.length} total</span>
          </div>
          <div className="divide-y divide-slate-100">
            {db.notifications.map((n) => (
              <div key={n.id} className="p-4 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-900">{n.title}</span>
                  <span className="font-mono-tabular text-slate-500">
                    {n.channel} · {n.date} · <span className="text-emerald-700 font-medium">{n.status}</span>
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {lang === 'km' ? 'ផ្ញើទៅ៖ ' : 'To: '}
                  <span className="font-medium text-slate-700">{n.recipientLabel}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
