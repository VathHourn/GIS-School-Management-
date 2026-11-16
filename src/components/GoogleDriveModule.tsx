import React, { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CloudUpload,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  LogOut,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { Lang } from '../i18n/translations.ts';
import { getAccessToken, googleSignIn, initAuth, logout } from '../lib/googleAuth.ts';
import type { SchoolDatabase } from '../types/school.ts';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
}

interface GoogleDriveModuleProps {
  db: SchoolDatabase;
  lang: Lang;
}

type ConfirmAction =
  | { type: 'delete'; file: DriveFile }
  | { type: 'rename'; file: DriveFile; newName: string }
  | { type: 'backup'; filename: string; content: string; mimeType: string };

export const GoogleDriveModule: React.FC<GoogleDriveModuleProps> = ({ db, lang }) => {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'folders' | 'docs' | 'pdf'>('all');
  const [folderStack, setFolderStack] = useState<Array<{ id: string; name: string }>>([
    { id: 'root', name: 'My Drive' },
  ]);

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderName, setFolderName] = useState('GIS School Documents');
  const [renameTarget, setRenameTarget] = useState<{ file: DriveFile; name: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [mutating, setMutating] = useState(false);

  const currentFolder = folderStack[folderStack.length - 1];

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadFiles = useCallback(
    async (folderId = currentFolder.id, queryText = search) => {
      const token = await getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        return;
      }

      setLoadingFiles(true);
      setError(null);
      try {
        const qParts = ['trashed = false'];
        if (queryText.trim()) {
          const escaped = queryText.trim().replace(/'/g, "\\'");
          qParts.push(`name contains '${escaped}'`);
        } else {
          qParts.push(`'${folderId}' in parents`);
        }

        if (typeFilter === 'folders') {
          qParts.push("mimeType = 'application/vnd.google-apps.folder'");
        } else if (typeFilter === 'docs') {
          qParts.push(
            "(mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.google-apps.presentation')"
          );
        } else if (typeFilter === 'pdf') {
          qParts.push("mimeType = 'application/pdf'");
        }

        const params = new URLSearchParams({
          q: qParts.join(' and '),
          pageSize: '40',
          orderBy: 'folder,modifiedTime desc',
          fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink)',
        });

        const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          setNeedsAuth(true);
          return;
        }
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error?.message || `Drive API error (${res.status})`);
        }
        const data = (await res.json()) as { files?: DriveFile[] };
        setFiles(data.files || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Google Drive files');
      } finally {
        setLoadingFiles(false);
      }
    },
    [currentFolder.id, search, typeFilter]
  );

  useEffect(() => {
    const unsub = initAuth(
      (u) => {
        setUser(u);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!needsAuth) {
      loadFiles(currentFolder.id, search);
    }
  }, [needsAuth, currentFolder.id, typeFilter, loadFiles]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setFiles([]);
    setNeedsAuth(true);
  };

  const uploadMultipart = async (name: string, mimeType: string, content: Blob | string) => {
    const token = await getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    const metadata = {
      name,
      parents: currentFolder.id === 'root' ? undefined : [currentFolder.id],
    };
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', content instanceof Blob ? content : new Blob([content], { type: mimeType }));

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || 'Upload failed');
    }
    await loadFiles(currentFolder.id, search);
  };

  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMutating(true);
    setError(null);
    try {
      await uploadMultipart(file.name, file.type || 'application/octet-stream', file);
      notify(lang === 'km' ? `បានបង្ហោះឯកសារ "${file.name}" ទៅ Google Drive!` : `Uploaded "${file.name}" to Google Drive.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setMutating(false);
      e.target.value = '';
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    setMutating(true);
    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName.trim() || 'GIS School Folder',
          mimeType: 'application/vnd.google-apps.folder',
          parents: currentFolder.id === 'root' ? undefined : [currentFolder.id],
        }),
      });
      if (!res.ok) throw new Error('Failed to create folder');
      setShowNewFolder(false);
      await loadFiles(currentFolder.id, search);
      notify(lang === 'km' ? `បានបង្កើតថត "${folderName}" លើ Google Drive!` : `Folder "${folderName}" created.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Folder creation failed');
    } finally {
      setMutating(false);
    }
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    const token = await getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      setConfirmAction(null);
      return;
    }
    setMutating(true);
    setError(null);
    try {
      if (confirmAction.type === 'delete') {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${confirmAction.file.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ trashed: true }),
        });
        if (!res.ok) throw new Error('Failed to move file to trash');
        notify(
          lang === 'km'
            ? `បានលុប "${confirmAction.file.name}" ចូល Trash រួចរាល់`
            : `Moved "${confirmAction.file.name}" to trash.`
        );
      } else if (confirmAction.type === 'rename') {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${confirmAction.file.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: confirmAction.newName }),
        });
        if (!res.ok) throw new Error('Failed to rename file');
        notify(
          lang === 'km'
            ? `បានប្ដូរឈ្មោះឯកសារទៅជា "${confirmAction.newName}"`
            : `Renamed file to "${confirmAction.newName}".`
        );
      } else if (confirmAction.type === 'backup') {
        await uploadMultipart(confirmAction.filename, confirmAction.mimeType, confirmAction.content);
        notify(
          lang === 'km'
            ? `បានរក្សាទុកឯកសារ "${confirmAction.filename}" ទៅ Google Drive រួចរាល់!`
            : `Exported "${confirmAction.filename}" to Google Drive.`
        );
      }
      setConfirmAction(null);
      await loadFiles(currentFolder.id, search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setMutating(false);
    }
  };

  const handleDownloadFile = async (file: DriveFile) => {
    const token = await getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    try {
      const isGoogleDoc = file.mimeType.startsWith('application/vnd.google-apps.');
      const url = isGoogleDoc
        ? `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=application/pdf`
        : `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = isGoogleDoc ? `${file.name}.pdf` : file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download file');
    }
  };

  const triggerExportStudentsCsv = () => {
    const headers = ['Code', 'Khmer Name', 'English Name', 'Gender', 'Class', 'Level', 'Shift', 'Guardian', 'Phone', 'Scholarship %'];
    const rows = db.students.map((s) => {
      const cls = db.classes.find((c) => c.id === s.classId)?.name || s.classId;
      return [
        s.studentCode,
        `"${s.nameKh}"`,
        `"${s.nameEn}"`,
        s.gender,
        `"${cls}"`,
        `"${s.level}"`,
        s.shift,
        `"${s.guardianName}"`,
        `"${s.guardianPhone}"`,
        String(s.scholarshipPercent),
      ].join(',');
    });
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const filename = `GIS-Students-Roster-${new Date().toISOString().slice(0, 10)}.csv`;
    setConfirmAction({ type: 'backup', filename, content: csv, mimeType: 'text/csv;charset=utf-8' });
  };

  const triggerExportFinanceCsv = () => {
    const headers = ['Invoice #', 'Student Code', 'Student Name', 'Term', 'Net Total ($)', 'Paid ($)', 'Balance ($)', 'Status', 'Due Date'];
    const rows = db.invoices.map((inv) => {
      const st = db.students.find((s) => s.id === inv.studentId);
      const bal = Math.max(0, inv.netAmount - inv.paidAmount);
      return [
        inv.invoiceNo,
        st?.studentCode || '',
        `"${st?.nameKh || ''}"`,
        `"${inv.term}"`,
        inv.netAmount.toFixed(2),
        inv.paidAmount.toFixed(2),
        bal.toFixed(2),
        inv.status,
        inv.dueDate,
      ].join(',');
    });
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const filename = `GIS-Tuition-Invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    setConfirmAction({ type: 'backup', filename, content: csv, mimeType: 'text/csv;charset=utf-8' });
  };

  const triggerFullBackupJson = () => {
    const filename = `GIS-School-Full-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    setConfirmAction({
      type: 'backup',
      filename,
      content: JSON.stringify(db, null, 2),
      mimeType: 'application/json',
    });
  };

  if (needsAuth) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-2xl mx-auto text-center space-y-5">
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">
            {lang === 'km' ? 'ភ្ជាប់ Google Drive សម្រាប់ឯកសារសាលា' : 'Connect Google Drive for GIS School'}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto">
            {lang === 'km'
              ? 'ចូលប្រើដោយសុវត្ថិភាពជាមួយគណនី Google របស់អ្នក ដើម្បីរក្សាទុកឯកសារបម្រុង (Backup) បញ្ជីឈ្មោះសិស្ស វិក្កយបត្រ និងសម្ភារសិក្សាលើ Google Drive ផ្ទាល់ខ្លួន។'
              : 'Sign in with Google to browse school folders, upload curriculum files, and export student rosters or tuition reports directly to your Google Drive.'}
          </p>
        </div>

        {error && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">{error}</div>}

        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="gsi-material-button"
          >
            <div className="gsi-material-button-state" />
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
              </div>
              <span className="gsi-material-button-contents">
                {isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
              </span>
              <span className="hidden">Sign in with Google</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

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

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-lg text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Connected Account & School Backup Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500">
            {lang === 'km' ? 'បានភ្ជាប់គណនី Google Drive' : 'Connected Google Drive Account'}
          </div>
          <div className="text-sm font-bold text-slate-900 mt-0.5">
            {user?.displayName || 'Google User'} ·{' '}
            <span className="font-normal text-slate-600 font-mono-tabular">{user?.email}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={triggerExportStudentsCsv}
            disabled={mutating}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {lang === 'km' ? 'នាំចេញបញ្ជីសិស្ស (CSV)' : 'Export Students CSV'}
          </button>
          <button
            onClick={triggerExportFinanceCsv}
            disabled={mutating}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {lang === 'km' ? 'នាំចេញវិក្កយបត្រ (CSV)' : 'Export Invoices CSV'}
          </button>
          <button
            onClick={triggerFullBackupJson}
            disabled={mutating}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 whitespace-nowrap"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            {lang === 'km' ? 'Backup ទិន្នន័យសាលាទៅ Drive' : 'Backup School DB'}
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            {lang === 'km' ? 'ចាកចេញ' : 'Sign out'}
          </button>
        </div>
      </div>

      {/* Drive Browser */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Folder Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 flex-wrap">
            {folderStack.map((folder, idx) => (
              <React.Fragment key={folder.id}>
                {idx > 0 && <span className="text-slate-300">/</span>}
                <button
                  onClick={() => setFolderStack((prev) => prev.slice(0, idx + 1))}
                  className={`hover:text-slate-900 ${
                    idx === folderStack.length - 1 ? 'font-bold text-slate-900' : 'text-slate-500'
                  }`}
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => loadFiles(currentFolder.id, search)}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowNewFolder(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              {lang === 'km' ? 'បង្កើតថតថ្មី' : 'New Folder'}
            </button>
            <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer whitespace-nowrap">
              <CloudUpload className="w-3.5 h-3.5" />
              {lang === 'km' ? 'បង្ហោះឯកសារ' : 'Upload File'}
              <input type="file" onChange={handleLocalFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') loadFiles(currentFolder.id, search);
              }}
              placeholder={lang === 'km' ? 'ស្វែងរកឈ្មោះឯកសារក្នុង Google Drive...' : 'Search Google Drive files...'}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: lang === 'km' ? 'ទាំងអស់' : 'All' },
                { id: 'folders', label: lang === 'km' ? 'ថតឯកសារ' : 'Folders' },
                { id: 'docs', label: 'Docs / Sheets' },
                { id: 'pdf', label: 'PDF' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setTypeFilter(f.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
                  typeFilter === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Files Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4">{lang === 'km' ? 'ឈ្មោះឯកសារ' : 'Name'}</th>
                <th className="py-2.5 px-4">{lang === 'km' ? 'ប្រភេទ' : 'Type'}</th>
                <th className="py-2.5 px-4">{lang === 'km' ? 'កែប្រែចុងក្រោយ' : 'Modified'}</th>
                <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'ទំហំ' : 'Size'}</th>
                <th className="py-2.5 px-4 text-right">{lang === 'km' ? 'សកម្មភាព' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loadingFiles ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    {lang === 'km' ? 'កំពុងទាញយកឯកសារពី Google Drive...' : 'Loading files from Google Drive...'}
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    {lang === 'km'
                      ? 'មិនទាន់មានឯកសារក្នុងថតនេះទេ។ សូមបង្កើតថត ឬបង្ហោះឯកសារថ្មី!'
                      : 'No files found in this folder.'}
                  </td>
                </tr>
              ) : (
                files.map((file) => {
                  const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                  return (
                    <tr key={file.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">
                        {isFolder ? (
                          <button
                            onClick={() => setFolderStack((prev) => [...prev, { id: file.id, name: file.name }])}
                            className="inline-flex items-center gap-2 font-semibold text-slate-900 hover:underline text-left"
                          >
                            <Folder className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>{file.name}</span>
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-2 font-medium text-slate-900">
                            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>{file.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {isFolder
                          ? 'Folder'
                          : file.mimeType.includes('spreadsheet')
                          ? 'Google Sheet'
                          : file.mimeType.includes('document')
                          ? 'Google Doc'
                          : file.mimeType.split('/').pop()}
                      </td>
                      <td className="py-2.5 px-4 font-mono-tabular text-slate-600">
                        {file.modifiedTime ? file.modifiedTime.slice(0, 16).replace('T', ' ') : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-tabular text-slate-600">
                        {file.size ? `${Math.max(1, Math.round(Number(file.size) / 1024))} KB` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={lang === 'km' ? 'បើកក្នុង Google Drive' : 'Open in Drive'}
                              className="p-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-100"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {!isFolder && (
                            <button
                              onClick={() => handleDownloadFile(file)}
                              title={lang === 'km' ? 'ទាញយក' : 'Download'}
                              className="p-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-100"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setRenameTarget({ file, name: file.name })}
                            title={lang === 'km' ? 'ប្ដូរឈ្មោះ' : 'Rename'}
                            className="p-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-100"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmAction({ type: 'delete', file })}
                            title={lang === 'km' ? 'លុបចូល Trash' : 'Move to Trash'}
                            className="p-1.5 border border-slate-200 rounded-md text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Folder Modal */}
      {showNewFolder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateFolder} className="bg-white border border-slate-200 rounded-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {lang === 'km' ? 'បង្កើតថតថ្មីលើ Google Drive' : 'New Google Drive Folder'}
              </h3>
              <button type="button" onClick={() => setShowNewFolder(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="text-xs">
              <label className="block font-medium text-slate-700 mb-1">
                {lang === 'km' ? 'ឈ្មោះថត *' : 'Folder Name *'}
              </label>
              <input
                required
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button type="button" onClick={() => setShowNewFolder(false)} className="px-4 py-2 text-xs border border-slate-300 rounded-lg">
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button type="submit" disabled={mutating} className="px-4 py-2 text-xs bg-slate-900 text-white rounded-lg">
                {lang === 'km' ? 'បង្កើតថត' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rename Input Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setConfirmAction({
                type: 'rename',
                file: renameTarget.file,
                newName: renameTarget.name.trim(),
              });
              setRenameTarget(null);
            }}
            className="bg-white border border-slate-200 rounded-xl w-full max-w-sm p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">{lang === 'km' ? 'ប្ដូរឈ្មោះឯកសារ' : 'Rename File'}</h3>
              <button type="button" onClick={() => setRenameTarget(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="text-xs">
              <label className="block font-medium text-slate-700 mb-1">{lang === 'km' ? 'ឈ្មោះថ្មី *' : 'New Name *'}</label>
              <input
                required
                value={renameTarget.name}
                onChange={(e) => setRenameTarget({ ...renameTarget, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button type="button" onClick={() => setRenameTarget(null)} className="px-4 py-2 text-xs border border-slate-300 rounded-lg">
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button type="submit" className="px-4 py-2 text-xs bg-slate-900 text-white rounded-lg">
                {lang === 'km' ? 'បន្ត' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Explicit User Confirmation Modal for All Mutating / Destructive Drive Actions */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {confirmAction.type === 'delete'
                ? lang === 'km'
                  ? 'បញ្ជាក់ការលុបឯកសារពី Google Drive'
                  : 'Confirm Move to Trash'
                : confirmAction.type === 'rename'
                ? lang === 'km'
                  ? 'បញ្ជាក់ការប្ដូរឈ្មោះឯកសារ'
                  : 'Confirm File Rename'
                : lang === 'km'
                ? 'បញ្ជាក់ការបង្ហោះឯកសារទៅ Google Drive'
                : 'Confirm Upload to Google Drive'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmAction.type === 'delete' &&
                (lang === 'km'
                  ? `តើអ្នកប្រាកដជាចង់លុបឯកសារ "${confirmAction.file.name}" ចូលទៅក្នុង Trash នៅលើ Google Drive របស់អ្នកមែនទេ?`
                  : `Move "${confirmAction.file.name}" to the trash in your Google Drive?`)}
              {confirmAction.type === 'rename' &&
                (lang === 'km'
                  ? `ប្ដូរឈ្មោះឯកសារពី "${confirmAction.file.name}" ទៅជា "${confirmAction.newName}" នៅលើ Google Drive?`
                  : `Rename "${confirmAction.file.name}" to "${confirmAction.newName}" in Google Drive?`)}
              {confirmAction.type === 'backup' &&
                (lang === 'km'
                  ? `តើអ្នកចង់បង្ហោះឯកសារ "${confirmAction.filename}" ទៅក្នុងថត "${currentFolder.name}" នៅលើ Google Drive របស់អ្នកមែនទេ?`
                  : `Upload "${confirmAction.filename}" into "${currentFolder.name}" on your Google Drive?`)}
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={mutating}
                className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={executeConfirmedAction}
                disabled={mutating}
                className={`px-4 py-2 text-xs font-medium text-white rounded-lg ${
                  confirmAction.type === 'delete' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {mutating
                  ? '...'
                  : confirmAction.type === 'delete'
                  ? lang === 'km'
                    ? 'លុបឯកសារ'
                    : 'Delete'
                  : lang === 'km'
                  ? 'បញ្ជាក់'
                  : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
