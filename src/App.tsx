import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  CalendarClock,
  CreditCard,
  GraduationCap,
  HardDrive,
  LayoutDashboard,
  Library,
  Menu,
  MessageSquare,
  RotateCcw,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { schoolApi } from './api/schoolApi.ts';
import { AcademicsModule } from './components/AcademicsModule.tsx';
import { CommunicationsModule } from './components/CommunicationsModule.tsx';
import { FinanceModule } from './components/FinanceModule.tsx';
import { GoogleDriveModule } from './components/GoogleDriveModule.tsx';
import { LibraryModule } from './components/LibraryModule.tsx';
import { OverviewModule } from './components/OverviewModule.tsx';
import { ParentPortalModule } from './components/ParentPortalModule.tsx';
import { StudentsModule } from './components/StudentsModule.tsx';
import { TeachersModule } from './components/TeachersModule.tsx';
import { labels, type Lang } from './i18n/translations.ts';
import type { Invoice, SchoolDatabase } from './types/school.ts';

type NavTab =
  | 'overview'
  | 'students'
  | 'teachers'
  | 'academics'
  | 'finance'
  | 'communications'
  | 'library'
  | 'drive'
  | 'portal';

export default function App() {
  const [db, setDb] = useState<SchoolDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('km');
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [triggerEnroll, setTriggerEnroll] = useState(false);
  const [externalPayInvoice, setExternalPayInvoice] = useState<Invoice | null>(null);
  const [resetting, setResetting] = useState(false);

  const fetchDatabase = useCallback(async () => {
    try {
      const data = await schoolApi.bootstrap();
      setDb(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load school data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDatabase();
  }, [fetchDatabase]);

  const t = labels[lang];

  const navItems: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: t.navOverview, icon: LayoutDashboard },
    { id: 'students', label: t.navStudents, icon: Users },
    { id: 'teachers', label: t.navTeachers, icon: CalendarClock },
    { id: 'academics', label: t.navAcademics, icon: GraduationCap },
    { id: 'finance', label: t.navFinance, icon: CreditCard },
    { id: 'communications', label: t.navComms, icon: MessageSquare },
    { id: 'library', label: t.navLibrary, icon: Library },
    { id: 'drive', label: t.navDrive, icon: HardDrive },
    { id: 'portal', label: t.navPortal, icon: UserCheck },
  ];

  const activeNavItem = navItems.find((item) => item.id === activeTab);

  const handleQuickEnroll = () => {
    setActiveTab('students');
    setTriggerEnroll(true);
  };

  const handleQuickPayInvoice = (invoice: Invoice) => {
    setExternalPayInvoice(invoice);
    setActiveTab('finance');
  };

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      const fresh = await schoolApi.resetDemo();
      setDb(fresh);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <aside className="hidden lg:block w-64 bg-white border-r border-slate-200 p-5 space-y-4">
          <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          <div className="space-y-2 pt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </aside>
        <main className="flex-1 p-6 space-y-6">
          <div className="h-12 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </main>
      </div>
    );
  }

  if (error || !db) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full text-center space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            {lang === 'km' ? 'មិនអាចភ្ជាប់ទៅកាន់ប្រព័ន្ធទិន្នន័យបានទេ' : 'Unable to load school system'}
          </h2>
          <p className="text-xs text-slate-500">{error}</p>
          <button
            onClick={fetchDatabase}
            className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
          >
            {lang === 'km' ? 'ព្យាយាមម្ដងទៀត' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* School Brand Header */}
        <div className="px-4 py-5 border-b border-slate-200 flex items-center gap-3">
          <img
            src="/assets/aistudio/photo_2026-11-11_21-49-33_c07b1e7d.jpg"
            alt="GIS School Emblem"
            referrerPolicy="no-referrer"
            className="w-10 h-10 object-contain rounded-full border border-slate-200 bg-white shrink-0"
          />
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 truncate">GIS School</div>
            <div className="text-[11px] text-slate-500 truncate">{db.schoolProfile.currentTerm}</div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors text-left ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Reset */}
      <div className="p-4 border-t border-slate-200 space-y-3">
        <div className="flex items-center gap-2.5">
          <img
            src="/src/assets/images/avatar_director_1794839259258.jpg"
            alt="Principal"
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
          />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-900 truncate">លោកស្រី នួន សុគន្ធា</div>
            <div className="text-[11px] text-slate-500 truncate">Principal · Main Campus</div>
          </div>
        </div>
        <button
          onClick={handleResetDemo}
          disabled={resetting}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        >
          <RotateCcw className="w-3 h-3" />
          {resetting ? '...' : t.resetDemo}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-white border-r border-slate-200 shrink-0 no-print">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-slate-900/50 flex no-print">
          <aside className="w-64 bg-white h-full border-r border-slate-200 relative">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-3 top-4 p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 border border-slate-200 rounded-lg text-slate-600"
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
              <span className="font-semibold text-slate-900 whitespace-nowrap truncate">{t.schoolName}</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-600 font-medium whitespace-nowrap truncate">
                {activeNavItem?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg">
              <button
                onClick={() => setLang('km')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  lang === 'km' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                ខ្មែរ
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  lang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                EN
              </button>
            </div>

            <button
              onClick={handleQuickEnroll}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {lang === 'km' ? 'ចុះឈ្មោះសិស្ស' : 'Enroll Student'}
            </button>
          </div>
        </header>

        {/* Active Module Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewModule
              db={db}
              lang={lang}
              onNavigate={(tab) => setActiveTab(tab as NavTab)}
              onQuickEnroll={handleQuickEnroll}
              onQuickPayInvoice={handleQuickPayInvoice}
            />
          )}

          {activeTab === 'students' && (
            <StudentsModule
              db={db}
              lang={lang}
              onRefresh={fetchDatabase}
              openEnrollTrigger={triggerEnroll}
              onCloseEnrollTrigger={() => setTriggerEnroll(false)}
            />
          )}

          {activeTab === 'teachers' && (
            <TeachersModule db={db} lang={lang} onRefresh={fetchDatabase} />
          )}

          {activeTab === 'academics' && (
            <AcademicsModule db={db} lang={lang} onRefresh={fetchDatabase} />
          )}

          {activeTab === 'finance' && (
            <FinanceModule
              db={db}
              lang={lang}
              onRefresh={fetchDatabase}
              externalPayInvoice={externalPayInvoice}
              onClearExternalPayInvoice={() => setExternalPayInvoice(null)}
            />
          )}

          {activeTab === 'communications' && (
            <CommunicationsModule db={db} lang={lang} onRefresh={fetchDatabase} />
          )}

          {activeTab === 'library' && (
            <LibraryModule db={db} lang={lang} onRefresh={fetchDatabase} />
          )}

          {activeTab === 'drive' && <GoogleDriveModule db={db} lang={lang} />}

          {activeTab === 'portal' && <ParentPortalModule db={db} lang={lang} />}
        </main>

        {/* Quiet Campus Footer */}
        <footer className="px-6 py-4 border-t border-slate-200 bg-white text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {db.schoolProfile.nameKh} · {db.schoolProfile.branchName}
            </span>
          </div>
          <div className="font-mono-tabular">
            {db.schoolProfile.phone} · {db.schoolProfile.email}
          </div>
        </footer>
      </div>
    </div>
  );
}
