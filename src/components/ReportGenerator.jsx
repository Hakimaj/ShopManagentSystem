import React, { useState } from 'react';
import { FileDown, Calendar, Loader2 } from 'lucide-react';
import { dashboardApi } from '../services/dashboardApi';
import { transactionsApi } from '../services/transactionsApi';

/**
 * ReportGenerator — PDF with side-by-side English + Amharic support.
 *
 * Font strategy (definitive):
 *   • helvetica  — built-in jsPDF font, renders all Latin/ASCII perfectly.
 *   • NotoSansEthiopic — fetched once from jsDelivr CDN, registered into
 *     jsPDF VFS, used ONLY for cells whose text contains Ethiopic characters.
 *
 *   Per-cell font switching is done via jspdf-autotable's `didParseCell`
 *   hook — the only reliable way to mix fonts inside the same table.
 *   `columnStyles.font` is NOT a real jspdf-autotable option and is ignored.
 *
 * Ethiopic Unicode block: U+1200–U+137F  (Amharic, Tigrinya, Ge'ez …)
 */

const FONT_CDN =
  'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-ethiopic@5/ethiopic-400-normal.ttf';
const FONT_NAME = 'NotoSansEthiopic';

// Cached once per browser session
let _fontBase64Cache = null;

async function loadEthiopicFontBase64() {
  if (_fontBase64Cache) return _fontBase64Cache;
  const res = await fetch(FONT_CDN);
  if (!res.ok) throw new Error(`Font fetch failed (HTTP ${res.status})`);
  const buf   = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  _fontBase64Cache = btoa(bin);
  return _fontBase64Cache;
}

/** Returns true if the string contains any Ethiopic character. */
function hasEthiopic(str) {
  if (!str) return false;
  // Ethiopic: U+1200–U+137F | Ethiopic Supplement: U+1380–U+139F
  // Ethiopic Extended:       U+2D80–U+2DDF
  return /[\u1200-\u139F\u2D80-\u2DDF]/.test(str);
}

function getTodayFormatted() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PERIOD_LABELS = {
  daily:     'Daily (Today)',
  monthly:   'This Month',
  half_year: 'Last 6 Months',
  yearly:    'Yearly',
  all:       'All Time',
  custom:    'Specific Day'
};

export const ReportGenerator = ({ currentTimeFilter, currentCustomDate }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportPeriod, setReportPeriod] = useState(currentTimeFilter || 'all');
  const [reportDate,   setReportDate]   = useState(currentCustomDate || getTodayFormatted());
  const [statusMsg,    setStatusMsg]    = useState('');
  const [errorMsg,     setErrorMsg]     = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg('');
    setStatusMsg('Loading font…');

    try {
      // ── 0. Load libraries + font in parallel ──────────────────────────
      const [{ default: jsPDF }, , fontBase64] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),      // patches jsPDF.prototype (side-effect)
        loadEthiopicFontBase64()
      ]);
      // Import again to get the named export after the side-effect import above
      const { default: autoTable } = await import('jspdf-autotable');

      setStatusMsg('Fetching data…');

      // ── 1. Fetch all transactions (paginate, max 100 per page) ─────────
      const PAGE_SIZE = 100;
      let allTxns = [];
      const [firstPage, kpiRes] = await Promise.all([
        transactionsApi.list({
          period: reportPeriod,
          custom_date: reportPeriod === 'custom' ? reportDate : undefined,
          size: PAGE_SIZE, page: 1
        }),
        dashboardApi.getSummary({
          period: reportPeriod,
          custom_date: reportPeriod === 'custom' ? reportDate : undefined
        })
      ]);

      allTxns = firstPage?.items ?? [];
      const totalPages = firstPage?.pages ?? 1;
      for (let p = 2; p <= totalPages; p++) {
        setStatusMsg(`Fetching page ${p} / ${totalPages}…`);
        const r = await transactionsApi.list({
          period: reportPeriod,
          custom_date: reportPeriod === 'custom' ? reportDate : undefined,
          size: PAGE_SIZE, page: p
        });
        allTxns = allTxns.concat(r?.items ?? []);
      }

      const transactions = allTxns;
      const kpi = kpiRes?.kpi ?? {};

      setStatusMsg('Building PDF…');

      // ── 2. Setup document ──────────────────────────────────────────────
      const doc   = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const now   = new Date();

      // Register Noto Sans Ethiopic
      doc.addFileToVFS(`${FONT_NAME}.ttf`, fontBase64);
      doc.addFont(`${FONT_NAME}.ttf`, FONT_NAME, 'normal');

      // Colour palette
      const C = {
        accent:  [79, 70, 229],
        dark:    [15, 23, 42],
        muted:   [100, 116, 139],
        green:   [5, 150, 105],
        stripe:  [241, 245, 249],
        white:   [255, 255, 255],
        grayBg:  [226, 232, 240]
      };

      const periodLabel = reportPeriod === 'custom'
        ? `Specific Day: ${reportDate}`
        : (PERIOD_LABELS[reportPeriod] ?? reportPeriod);

      // ── 3. didParseCell hook — per-cell font switching ─────────────────
      // This is the ONLY reliable way to mix fonts in jspdf-autotable.
      // columnStyles.font does NOT exist as an option and is silently ignored.
      const smartFontHook = ({ cell }) => {
        if (!cell.text) return;
        const text = Array.isArray(cell.text) ? cell.text.join('') : String(cell.text);
        // Switch to Ethiopic font only when the cell actually contains Ethiopic chars
        cell.styles.font = hasEthiopic(text) ? FONT_NAME : 'helvetica';
      };

      // ── 4. Page header ─────────────────────────────────────────────────
      const drawHeader = () => {
        doc.setFillColor(...C.accent);
        doc.rect(0, 0, pageW, 62, 'F');
        doc.setTextColor(...C.white);
        // Title: Amharic — use Ethiopic font
        doc.setFont(FONT_NAME, 'normal');
        doc.setFontSize(17);
        doc.text('ጁጁ ጽዳት — Sales & Revenue Report', 36, 30);
        // Sub-line: Latin only — use helvetica
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(
          `Period: ${periodLabel}   |   Generated: ${now.toLocaleString('en-US')}`,
          36, 50
        );
      };
      drawHeader();

      const pageFooter = ({ pageNumber }) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...C.muted);
        doc.text(
          `Page ${pageNumber} of ${doc.internal.getNumberOfPages()} — Juju Tzidat POS`,
          pageW / 2, pageH - 16, { align: 'center' }
        );
      };

      // ── 5. KPI summary ─────────────────────────────────────────────────
      let cursorY = 78;
      doc.setTextColor(...C.dark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Summary', 36, cursorY);
      cursorY += 4;

      autoTable(doc, {
        startY: cursorY,
        head: [],
        body: [
          ['Total Revenue',   `${Number(kpi.filtered_revenue ?? 0).toFixed(2)} ETB`],
          ['Gross Profit',    `${Number(kpi.filtered_profit  ?? 0).toFixed(2)} ETB`],
          ['Total Expenses',  `-${Number(kpi.total_expenses  ?? 0).toFixed(2)} ETB`],
          ['Net Profit',      `${Number(kpi.net_profit       ?? kpi.filtered_profit ?? 0).toFixed(2)} ETB`],
          ['Total Orders',    String(kpi.orders_count ?? 0)],
          ['Units Sold',      String(kpi.items_sold   ?? 0)]
        ],
        theme: 'plain',
        styles:       { font: 'helvetica', fontSize: 10, cellPadding: 4, textColor: C.dark },
        columnStyles: { 0: { fontStyle: 'bold', textColor: C.muted, cellWidth: 140 }, 1: { fontStyle: 'bold' } },
        tableWidth: 310,
        margin: { left: 36 }
      });

      cursorY = doc.lastAutoTable.finalY + 20;

      // ── 6. Transaction log table ───────────────────────────────────────
      doc.setTextColor(...C.dark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Transaction Log', 36, cursorY);
      cursorY += 4;

      // Build rows — items summary is the raw string from the API, no filtering
      const txnRows = transactions.map((txn) => {
        const items = txn.items ?? [];
        const totalUnits = items.reduce((s, i) => s + (i.quantity ?? 0), 0);

        // Verified property name: the raw API returns `product_name` on each item
        const itemsSummary = items
          .map((i) => `${String(i.product_name || i.name || 'Unknown')} x${i.quantity ?? 0}`)
          .join(', ');

        console.debug('[PDF] txn', txn.id, 'items:', itemsSummary); // verify in console

        return [
          String(txn.id ?? ''),
          new Date(txn.timestamp).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          }),
          String(txn.payment_method ?? ''),
          `${totalUnits} units`,
          `${Number(txn.total_revenue).toFixed(2)} ETB`,
          `${Number(txn.total_profit).toFixed(2)} ETB`,
          itemsSummary    // raw, no regex, no replace
        ];
      });

      autoTable(doc, {
        startY: cursorY,
        head: [['Order ID', 'Date & Time', 'Payment', 'Qty', 'Revenue (ETB)', 'Profit (ETB)', 'Items']],
        body: txnRows.length > 0
          ? txnRows
          : [['No transactions for this period.', '', '', '', '', '', '']],
        theme: 'striped',
        headStyles: { font: 'helvetica', fillColor: C.accent, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
        // helvetica as default for ALL cells — smartFontHook upgrades to Ethiopic only when needed
        bodyStyles:         { font: 'helvetica', fontSize: 7.5, textColor: C.dark },
        alternateRowStyles: { fillColor: C.stripe },
        columnStyles: {
          0: { cellWidth: 60,  fontStyle: 'bold' },
          1: { cellWidth: 88 },
          2: { cellWidth: 48 },
          3: { cellWidth: 38 },
          4: { cellWidth: 62, halign: 'right' },
          5: { cellWidth: 62, halign: 'right', textColor: C.green },
          6: { cellWidth: 'auto' }
        },
        // Per-cell font switching — the ONLY supported way in jspdf-autotable
        didParseCell: smartFontHook,
        margin: { left: 36, right: 36 },
        didDrawPage: pageFooter
      });

      // ── 7. Per-transaction line-item breakdown ─────────────────────────
      if (transactions.length > 0 && transactions.length <= 100) {
        doc.addPage();
        drawHeader();
        let yDetail = 76;
        doc.setTextColor(...C.dark);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Itemized Line-Item Breakdown', 36, yDetail);
        yDetail += 14;

        for (const txn of transactions) {
          if (yDetail > pageH - 120) { doc.addPage(); drawHeader(); yDetail = 76; }

          const lineRows = (txn.items ?? []).map((item) => {
            const name = String(item.product_name || item.name || 'Unknown');
            const qty  = item.quantity ?? 0;
            const rev  = Number(item.selling_price) * qty;
            const cost = Number(item.cost_price)    * qty;
            return [
              name,                                  // raw — no filter, no replace
              String(qty),
              Number(item.cost_price).toFixed(2),
              Number(item.selling_price).toFixed(2),
              rev.toFixed(2),
              `+${(rev - cost).toFixed(2)}`
            ];
          });

          autoTable(doc, {
            startY: yDetail,
            head: [[{
              content: `Order ${txn.id}  |  ${new Date(txn.timestamp).toLocaleString('en-US')}  |  ${txn.payment_method}`,
              colSpan: 6,
              styles: { font: 'helvetica', fillColor: C.grayBg, textColor: C.dark, fontStyle: 'bold', fontSize: 7.5 }
            }]],
            body: [
              [
                { content: 'Product Name', styles: { font: 'helvetica', fontStyle: 'bold', textColor: C.muted } },
                { content: 'Qty',          styles: { font: 'helvetica', fontStyle: 'bold', textColor: C.muted } },
                { content: 'Cost/Unit',    styles: { font: 'helvetica', fontStyle: 'bold', textColor: C.muted } },
                { content: 'Sold/Unit',    styles: { font: 'helvetica', fontStyle: 'bold', textColor: C.muted } },
                { content: 'Revenue',      styles: { font: 'helvetica', fontStyle: 'bold', textColor: C.muted } },
                { content: 'Profit',       styles: { font: 'helvetica', fontStyle: 'bold', textColor: C.muted } }
              ],
              ...lineRows
            ],
            theme: 'plain',
            styles:       { font: 'helvetica', fontSize: 7.5, cellPadding: 3, textColor: C.dark },
            columnStyles: {
              0: { cellWidth: 155 },
              1: {},
              2: { halign: 'right' },
              3: { halign: 'right' },
              4: { halign: 'right' },
              5: { halign: 'right', textColor: C.green }
            },
            // Per-cell font switching — same hook, handles Amharic product names
            didParseCell: smartFontHook,
            margin: { left: 36, right: 36 },
            didDrawPage: pageFooter
          });

          yDetail = doc.lastAutoTable.finalY + 8;
        }
      }

      // ── 8. Save ────────────────────────────────────────────────────────
      const safeDate = reportPeriod === 'custom' ? reportDate : reportPeriod;
      doc.save(`juju-report-${safeDate}-${now.toISOString().slice(0, 10)}.pdf`);
      setStatusMsg('');

    } catch (err) {
      console.error('[ReportGenerator] PDF generation failed:', err);
      
      let errorMessage = 'Unknown error — see browser console.';
      if (err instanceof Error) {
        if (err.name === 'ApiError') {
          errorMessage = `Backend Error: ${err.message}`;
        } else if (err.message) {
          errorMessage = err.message;
        }
      }
      
      setErrorMsg(errorMessage);
      setStatusMsg('');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>

        <select
          value={reportPeriod}
          onChange={(e) => { setReportPeriod(e.target.value); setErrorMsg(''); setStatusMsg(''); }}
          disabled={isGenerating}
          style={{
            padding: '0.55rem 0.9rem', borderRadius: '8px',
            border: '1px solid var(--border-color)', background: 'var(--bg-card)',
            color: 'var(--text-primary)', fontFamily: 'inherit',
            fontSize: '0.85rem', fontWeight: 600, outline: 'none', cursor: 'pointer'
          }}
        >
          <option value="daily">Daily (Today)</option>
          <option value="monthly">This Month</option>
          <option value="half_year">Last 6 Months</option>
          <option value="yearly">Yearly</option>
          <option value="all">All Time</option>
          <option value="custom">Specific Day</option>
        </select>

        {reportPeriod === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Calendar size={14} color="var(--accent-primary)" />
            <input
              type="date" value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              disabled={isGenerating}
              style={{
                padding: '0.5rem 0.7rem', borderRadius: '8px',
                border: '1px solid var(--border-color)', background: 'var(--bg-card)',
                color: 'var(--text-primary)', fontFamily: 'inherit',
                fontSize: '0.85rem', fontWeight: 600, outline: 'none'
              }}
            />
          </div>
        )}

        <button
          onClick={handleGenerate} disabled={isGenerating}
          className="btn-primary"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            padding: '0.55rem 1.1rem',
            opacity: isGenerating ? 0.75 : 1,
            cursor: isGenerating ? 'not-allowed' : 'pointer'
          }}
        >
          {isGenerating ? (
            <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /><span>{statusMsg || 'Generating…'}</span></>
          ) : (
            <><FileDown size={16} /><span>Generate Report</span></>
          )}
        </button>
      </div>

      {errorMsg && (
        <div style={{
          fontSize: '0.78rem', color: 'var(--danger)', background: 'var(--danger-bg)',
          border: '1px solid rgba(220,38,38,0.2)', borderRadius: '6px',
          padding: '0.4rem 0.7rem', maxWidth: '520px', wordBreak: 'break-word'
        }}>
          ⚠ {errorMsg}
        </div>
      )}
    </div>
  );
};
