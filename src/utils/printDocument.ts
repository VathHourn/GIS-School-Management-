import type { Invoice, PayrollRecord, SchoolProfile, Student, TeacherStaff } from '../types/school.ts';

/**
 * Triggers browser print isolating only the element with `elementId`.
 * Returns true if native print dialog likely opened, or false if running in a restricted iframe.
 */
export function triggerIsolatedPrint(elementId: string): boolean {
  const source = document.getElementById(elementId);
  if (!source) return false;

  let printRoot = document.getElementById('gis-print-root');
  if (!printRoot) {
    printRoot = document.createElement('div');
    printRoot.id = 'gis-print-root';
    document.body.appendChild(printRoot);
  }

  printRoot.innerHTML = '';
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  printRoot.appendChild(clone);

  document.body.classList.add('gis-printing');

  const cleanup = () => {
    document.body.classList.remove('gis-printing');
    if (printRoot) printRoot.innerHTML = '';
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);

  let blockedByIframe = false;
  try {
    const start = Date.now();
    window.print();
    const elapsed = Date.now() - start;
    // In sandboxed iframes without allow-modals, window.print() returns instantaneously (< 30ms) without opening a dialog
    if (window.self !== window.top && elapsed < 30) {
      blockedByIframe = true;
    }
  } catch {
    blockedByIframe = true;
  }

  // Fallback cleanup if afterprint doesn't fire (e.g. sandboxed iframe)
  setTimeout(() => {
    if (document.body.classList.contains('gis-printing')) {
      cleanup();
    }
  }, 1500);

  return !blockedByIframe;
}

/**
 * Downloads a standalone, print-ready HTML file for any printable section.
 */
export function downloadPrintableHtml(elementId: string, filename: string, title: string): void {
  const source = document.getElementById(elementId);
  if (!source) return;

  const html = `<!doctype html>
<html lang="km">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Kantumruy+Pro:wght@400;600;700&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: 'Kantumruy Pro', system-ui, sans-serif; background: #fff; padding: 24px; color: #0f172a; }
    .font-mono-tabular { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="max-width:720px;margin:0 auto 16px;display:flex;justify-content:flex-end;gap:8px;">
    <button onclick="window.print()" style="background:#0f172a;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;">បោះពុម្ព / Print (Ctrl+P)</button>
  </div>
  <div style="max-width:720px;margin:0 auto;">
    ${source.outerHTML.replace(/src="\/(src\/assets|assets)\//g, `src="${window.location.origin}/$1/`)}
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Renders a crisp high-resolution PNG tuition receipt using Canvas 2D (works in all sandboxed iframes).
 */
export async function downloadReceiptPng(
  invoice: Invoice,
  student: Student | undefined,
  school: SchoolProfile
): Promise<void> {
  const scale = 2;
  const width = 680;
  const height = 560;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(scale, scale);

  // White paper background & clean border
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Try loading school emblem
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, 42, 40, 56, 56);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = '/assets/aistudio/photo_2026-11-11_21-49-33_c07b1e7d.jpg';
    });
  } catch {
    // Ignore emblem errors
  }

  // Header
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 17px "Kantumruy Pro", sans-serif';
  ctx.fillText(school.nameKh, 112, 62);
  ctx.fillStyle = '#64748b';
  ctx.font = '12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(school.nameEn, 112, 82);

  // Invoice # right aligned
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px "JetBrains Mono", monospace';
  ctx.fillText(invoice.invoiceNo, width - 42, 62);
  ctx.fillStyle = '#64748b';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillText(`Date: ${invoice.issueDate}`, width - 42, 82);

  // Divider
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(42, 114);
  ctx.lineTo(width - 42, 114);
  ctx.stroke();

  // Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px "Kantumruy Pro", sans-serif';
  ctx.fillText('វិក្កយបត្របង់ប្រាក់ · OFFICIAL TUITION RECEIPT', width / 2, 144);

  // Student info
  ctx.textAlign = 'left';
  ctx.fillStyle = '#475569';
  ctx.font = '12px "Kantumruy Pro", sans-serif';
  ctx.fillText(`សិស្ស (Student): ${student?.nameKh || ''} (${student?.nameEn || ''})`, 42, 180);
  ctx.fillText(`អាណាព្យាបាល: ${student?.guardianName || ''} · ${student?.guardianPhone || ''}`, 42, 202);

  ctx.textAlign = 'right';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillText(`ID: ${student?.studentCode || invoice.studentId}`, width - 42, 180);
  ctx.fillText(`Term: ${invoice.term}`, width - 42, 202);

  // Line items box
  ctx.beginPath();
  ctx.moveTo(42, 224);
  ctx.lineTo(width - 42, 224);
  ctx.stroke();

  let y = 254;
  const drawRow = (label: string, val: string, color = '#0f172a', bold = false) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold ' : ''}13px "Kantumruy Pro", sans-serif`;
    ctx.fillText(label, 42, y);

    ctx.textAlign = 'right';
    ctx.font = `${bold ? 'bold ' : ''}13px "JetBrains Mono", monospace`;
    ctx.fillText(val, width - 42, y);
    y += 28;
  };

  drawRow(invoice.description, `$${invoice.tuitionAmount.toFixed(2)}`);
  drawRow('Books & Learning Materials', `$${invoice.bookFee.toFixed(2)}`, '#475569');
  if (invoice.discountPercent > 0) {
    const discAmt = (invoice.tuitionAmount * invoice.discountPercent) / 100;
    drawRow(`Scholarship Discount (${invoice.discountPercent}%)`, `-$${discAmt.toFixed(2)}`, '#047857');
  }

  ctx.beginPath();
  ctx.moveTo(42, y - 8);
  ctx.lineTo(width - 42, y - 8);
  ctx.stroke();
  y += 16;

  const balance = Math.max(0, invoice.netAmount - invoice.paidAmount);
  drawRow('សរុបត្រូវបង់ (Net Total)', `$${invoice.netAmount.toFixed(2)}`, '#0f172a', true);
  drawRow('ប្រាក់បានបង់ (Paid Amount)', `$${invoice.paidAmount.toFixed(2)}`, '#047857', true);
  drawRow('ប្រាក់នៅខ្វះ (Balance Due)', `$${balance.toFixed(2)}`, balance > 0 ? '#be123c' : '#0f172a', true);

  // Footer note
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px "Kantumruy Pro", sans-serif';
  ctx.fillText(`${school.address}`, 42, height - 62);
  ctx.fillText(`Tel: ${school.phone} · Status: ${invoice.status}`, 42, height - 42);

  ctx.textAlign = 'right';
  ctx.fillText('Cashier / Authorised Signature', width - 42, height - 42);

  const link = document.createElement('a');
  link.download = `${invoice.invoiceNo}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function downloadPayslipPng(
  payroll: PayrollRecord,
  staff: TeacherStaff | undefined,
  school: SchoolProfile
): Promise<void> {
  const scale = 2;
  const width = 620;
  const height = 420;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px "Kantumruy Pro", sans-serif';
  ctx.fillText(school.nameKh, 42, 58);
  ctx.fillStyle = '#64748b';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillText(`STAFF PAYSLIP · ${payroll.month}`, 42, 80);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px "Kantumruy Pro", sans-serif';
  ctx.fillText(`${staff?.nameKh || ''} (${staff?.nameEn || ''}) · ${staff?.staffCode || ''}`, 42, 118);

  let y = 160;
  const drawRow = (label: string, val: string, color = '#0f172a', bold = false) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold ' : ''}13px "Kantumruy Pro", sans-serif`;
    ctx.fillText(label, 42, y);
    ctx.textAlign = 'right';
    ctx.font = `${bold ? 'bold ' : ''}13px "JetBrains Mono", monospace`;
    ctx.fillText(val, width - 42, y);
    y += 30;
  };

  const hoursPay = payroll.netPay - payroll.baseSalary - payroll.bonus + payroll.deductions;
  drawRow('Base Salary', `$${payroll.baseSalary.toFixed(2)}`);
  drawRow(`Teaching Hours (${payroll.teachingHours}h)`, `$${hoursPay.toFixed(2)}`);
  drawRow('Bonus', `+$${payroll.bonus.toFixed(2)}`, '#047857');
  drawRow('Deductions', `-$${payroll.deductions.toFixed(2)}`, '#be123c');
  y += 10;
  drawRow('Net Pay', `$${payroll.netPay.toFixed(2)}`, '#0f172a', true);

  const link = document.createElement('a');
  link.download = `Payslip-${staff?.staffCode || payroll.staffId}-${payroll.month}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  link.remove();
}
