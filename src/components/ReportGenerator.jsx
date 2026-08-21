import React, { useState } from 'react';
import { FileDown, Calendar, Loader2 } from 'lucide-react';
import { dashboardApi } from '../services/dashboardApi';
import { transactionsApi } from '../services/transactionsApi';

/**
 * ReportGenerator — generates a PDF with full Amharic / Ethiopic support.
 *
 * Font strategy:
 *   Noto Sans Ethiopic is fetched once from jsDelivr (fontsource CDN),
 *   converted to a base64 string, then registered into jsPDF's virtual
 *   filesystem. After that, doc.setFont('NotoSansEthiopic') renders all
 *   Amharic / Ethiopic / Ge'ez characters correctly.
 *
 * The font (~270 KB) is only downloaded when the user clicks "Generate
 * Report" for the first time; subsequent clicks use a module-level cache.
 */

const FONT_CDN =
  'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-ethiopic@5/ethiopic-400-normal.ttf';

const FONT_NAME = 'NotoSansEthiopic';

// Module-level cache — fetched once per browser session.
let _fontBase64Cache = null;

async function loadEthiopicFontBase64() {
  if (_fontBase64Cache) return _fontBase64Cache;
  const res = await fetch(FONT_CDN);
  if (!res.ok) throw new Error(`Failed to fetch Ethiopic font (HTTP ${res.status})`);
  const buffer = await res.arrayBuffer();
  // Convert ArrayBuffer → base64 string
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  _fontBase64Cache = btoa(binary);
  return _fontBase64Cache;
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
  const [reportDate, setReportDate] = useState(currentCustomDate || getTodayFormatted());
  const [statusMsg, setStatusMsg] = useState('');  // shows progress steps
  const [errorMsg, setErrorMsg] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg('');
    setStatusMsg('Loading font…');

    try {
      // ── 0. Load jsPDF + autoTable + Ethiopic font in parallel ────────
      const [
        { default: jsPDF },
        _autoTableModule,
        fontBase64
      ] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),   // side-effect: patches jsPDF.prototype
        loadEthiopicFontBase64()
      ]);
      const { default: autoTable } = await import('jspdf-autotable');

      setStatusMsg('Fetching data…');

      // ── 1. Paginate through ALL transactions (backend max 100/page) ──
      const PAGE_SIZE = 100;
      let allTransactions = [];
      let page = 1;
      let totalPages = 1;

      // Kick off first page and KPI fetch in parallel
      const [firstPage, kpiRes] = await Promise.all([
        transactionsApi.list({
          period: reportPeriod,
          custom_date: reportPeriod === 'custom' ? reportDate : undefined,
          size: PAGE_SIZE,
          page: 1
        }),
        dashboardApi.getSummary({
          period: reportPeriod,
          custom_date: reportPeriod === 'custom' ? reportDate : undefined
        })
      ]);

      allTransactions = firstPage?.items ?? [];
      totalPages = firstPage?.pages ?? 1;

      // Fetch remaining pages if there are more
      for (let p = 2; p <= totalPages; p++) {
        setStatusMsg(`Fetching page ${p} of ${totalPages}…`);
        const res = await transactionsApi.list({
          period: reportPeriod,
          custom_date: reportPeriod === 'custom' ? reportDate : undefined,
          size: PAGE_SIZE,
          page: p
        });
        allTransactions = allTransactions.concat(res?.items ?? []);
      }

      const transactions = allTransactions;
      const kpi = kpiRes?.kpi ?? {};

      setStatusMsg('Building PDF…');

      // ── 2. Initialise jsPDF ──────────────────────────────────────────
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const now   = new Date();

      // ── 3. Register Noto Sans Ethiopic ───────────────────────────────
      // addFileToVFS puts the raw TTF bytes into jsPDF's virtual FS.
      // addFont maps that file to a family name + style.
      doc.addFileToVFS(`${FONT_NAME}.ttf`, fontBase64);
      doc.addFont(`${FONT_NAME}.ttf`, FONT_NAME, 'normal');

      // Helper: set the Ethiopic font (used everywhere)
      const setEthFont   = (size = 10, style = 'normal') => {
        doc.setFont(FONT_NAME, style);
        doc.setFontSize(size);
      };
      // For column headers / labels where only ASCII is needed we still
      // use helvetica (lighter weight inside the PDF byte stream).
      const setLatinFont = (size = 10, style = 'normal') => {
        doc.setFont('helvetica', style);
        doc.setFontSize(size);
      };

      // Colour constants
      const ACCENT  = [79, 70, 229];
      const DARK    = [15, 23, 42];
      const MUTED   = [100, 116, 139];
      const GREEN   = [5, 150, 105];
      const STRIPE  = [241, 245, 249];
      const WHITE   = [255, 255, 255];
      const GRAY_BG = [226, 232, 240];

      const periodLabel = reportPeriod === 'custom'
        ? `Specific Day: ${reportDate}`
        : (PERIOD_LABELS[reportPeriod] ?? reportPeriod);

      // ── 4. Shared page-header drawing function ───────────────────────
      const drawHeader = () => {
        doc.setFillColor(...ACCENT);
        doc.rect(0, 0, pageW, 62, 'F');
        doc.setTextColor(...WHITE);
        setEthFont(17, 'normal');
        doc.text('ጁጁ ጽዳት — Sales & Revenue Report', 36, 30);
        setLatinFont(9);
        doc.text(
          `Period: ${periodLabel}   |   Generated: ${now.toLocaleString('en-US')}`,
          36, 50
        );
      };
      drawHeader();

      // ── 5. KPI summary table ─────────────────────────────────────────
      let cursorY = 78;
      doc.setTextColor(...DARK);
      setLatinFont(10, 'bold');
      doc.text('Summary', 36, cursorY);
      cursorY += 4;

      autoTable(doc, {
        startY: cursorY,
        head: [],
        body: [
          ['Total Revenue',  `${Number(kpi.filtered_revenue ?? 0).toFixed(2)} ETB`],
          ['Net Profit',     `${Number(kpi.filtered_profit  ?? 0).toFixed(2)} ETB`],
          ['Total Orders',   String(kpi.orders_count ?? 0)],
          ['Units Sold',     String(kpi.items_sold   ?? 0)]
        ],
        theme: 'plain',
        styles:       { font: 'helvetica', fontSize: 10, cellPadding: 4, textColor: DARK },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: MUTED, cellWidth: 140 },
          1: { fontStyle: 'bold' }
        },
        tableWidth: 310,
        margin: { left: 36 }
      });

      cursorY = doc.lastAutoTable.finalY + 20;

      // ── 6. Transaction log table ─────────────────────────────────────
      doc.setTextColor(...DARK);
      setLatinFont(10, 'bold');
      doc.text('Transaction Log', 36, cursorY);
      cursorY += 4;

      const pageFooter = ({ pageNumber }) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...MUTED);
        const total = doc.internal.getNumberOfPages();
        doc.text(
          `Page ${pageNumber} of ${total} — Juju Tzidat POS`,
          pageW / 2, pageH - 16,
          { align: 'center' }
        );
      };

      const txnRows = transactions.map((txn) => {
        const totalUnits   = (txn.items ?? []).reduce((s, i) => s + (i.quantity ?? 0), 0);
        const itemsSummary = (txn.items ?? [])
          .map((i) => `${i.product_name ?? ''} x${i.quantity}`)
          .join(', ');
        return [
          txn.id ?? '',
          new Date(txn.timestamp).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          }),
          txn.payment_method ?? '',
          `${totalUnits} units`,
          `${Number(txn.total_revenue).toFixed(2)} ETB`,
          `${Number(txn.total_profit).toFixed(2)} ETB`,
          itemsSummary
        ];
      });

      autoTable(doc, {
        startY: cursorY,
        head: [['Order ID', 'Date & Time', 'Payment', 'Qty', 'Revenue (ETB)', 'Profit (ETB)', 'Items']],
        body: txnRows.length > 0
          ? txnRows
          : [['No transactions found for this period.', '', '', '', '', '', '']],
        theme: 'striped',
        headStyles: {
          font: 'helvetica',
          fillColor: ACCENT,
          textColor: WHITE,
          fontStyle: 'bold',
          fontSize: 8
        },
        bodyStyles: {
          font: FONT_NAME,      // ← Ethiopic font for item names in body
          fontSize: 7.5,
          textColor: DARK
        },
        alternateRowStyles: { fillColor: STRIPE },
        columnStyles: {
          0: { font: 'helvetica', cellWidth: 60,  fontStyle: 'bold' },
          1: { font: 'helvetica', cellWidth: 88 },
          2: { font: 'helvetica', cellWidth: 48 },
          3: { font: 'helvetica', cellWidth: 38 },
          4: { font: 'helvetica', cellWidth: 62, halign: 'right' },
          5: { font: 'helvetica', cellWidth: 62, halign: 'right', textColor: GREEN },
          6: { cellWidth: 'auto' }   // items column — uses FONT_NAME from bodyStyles
        },
        margin: { left: 36, right: 36 },
        didDrawPage: pageFooter
      });

      // ── 7. Per-transaction line-item breakdown ───────────────────────
      if (transactions.length > 0 && transactions.length <= 100) {
        doc.addPage();
        drawHeader();

        let yDetail = 76;
        doc.setTextColor(...DARK);
        setLatinFont(12, 'bold');
        doc.text('Itemized Line-Item Breakdown', 36, yDetail);
        yDetail += 14;

        for (const txn of transactions) {
          if (yDetail > pageH - 120) {
            doc.addPage();
            drawHeader();
            yDetail = 76;
          }

          const lineRows = (txn.items ?? []).map((item) => {
            const rev  = Number(item.selling_price) * (item.quantity ?? 0);
            const cost = Number(item.cost_price)    * (item.quantity ?? 0);
            return [
              item.product_name ?? '',
              String(item.quantity ?? 0),
              Number(item.cost_price).toFixed(2),
              Number(item.selling_price).toFixed(2),
              rev.toFixed(2),
              `+${(rev - cost).toFixed(2)}`
            ];
          });

          autoTable(doc, {
            startY: yDetail,
            head: [[
              {
                content: `Order ${txn.id}  |  ${new Date(txn.timestamp).toLocaleString('en-US')}  |  ${txn.payment_method}`,
                colSpan: 6,
                styles: {
                  font: 'helvetica',
                  fillColor: GRAY_BG,
                  textColor: DARK,
                  fontStyle: 'bold',
                  fontSize: 7.5
                }
              }
            ]],
            body: [
              // Sub-header row with column labels
              [
                { content: 'Product Name',  styles: { font: 'helvetica', fontStyle: 'bold', textColor: MUTED } },
                { content: 'Qty',           styles: { font: 'helvetica', fontStyle: 'bold', textColor: MUTED } },
                { content: 'Cost/Unit',     styles: { font: 'helvetica', fontStyle: 'bold', textColor: MUTED } },
                { content: 'Sold/Unit',     styles: { font: 'helvetica', fontStyle: 'bold', textColor: MUTED } },
                { content: 'Revenue',       styles: { font: 'helvetica', fontStyle: 'bold', textColor: MUTED } },
                { content: 'Profit',        styles: { font: 'helvetica', fontStyle: 'bold', textColor: MUTED } }
              ],
              ...lineRows
            ],
            theme: 'plain',
            styles:       { font: FONT_NAME, fontSize: 7.5, cellPadding: 3, textColor: DARK },
            columnStyles: {
              0: { cellWidth: 155 },
              1: { font: 'helvetica' },
              2: { font: 'helvetica', halign: 'right' },
              3: { font: 'helvetica', halign: 'right' },
              4: { font: 'helvetica', halign: 'right' },
              5: { font: 'helvetica', halign: 'right', textColor: GREEN }
            },
            margin: { left: 36, right: 36 },
            didDrawPage: pageFooter
          });

          yDetail = doc.lastAutoTable.finalY + 8;
        }
      }

      // ── 8. Save ──────────────────────────────────────────────────────
      const safeDate = reportPeriod === 'custom' ? reportDate : reportPeriod;
      const filename = `juju-report-${safeDate}-${now.toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
      setStatusMsg('');

    } catch (err) {
      console.error('[ReportGenerator] PDF generation failed:', err);
      setErrorMsg(err?.message || 'Unknown error — see browser console.');
      setStatusMsg('');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>

        {/* Period selector */}
        <select
          value={reportPeriod}
          onChange={(e) => { setReportPeriod(e.target.value); setErrorMsg(''); setStatusMsg(''); }}
          disabled={isGenerating}
          style={{
            padding: '0.55rem 0.9rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            fontSize: '0.85rem',
            fontWeight: 600,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="daily">Daily (Today)</option>
          <option value="monthly">This Month</option>
          <option value="half_year">Last 6 Months</option>
          <option value="yearly">Yearly</option>
          <option value="all">All Time</option>
          <option value="custom">Specific Day</option>
        </select>

        {/* Custom date picker */}
        {reportPeriod === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Calendar size={14} color="var(--accent-primary)" />
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              disabled={isGenerating}
              style={{
                padding: '0.5rem 0.7rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none'
              }}
            />
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1.1rem',
            opacity: isGenerating ? 0.75 : 1,
            cursor: isGenerating ? 'not-allowed' : 'pointer'
          }}
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />
              <span>{statusMsg || 'Generating…'}</span>
            </>
          ) : (
            <>
              <FileDown size={16} />
              <span>Generate Report</span>
            </>
          )}
        </button>
      </div>

      {/* Inline error */}
      {errorMsg && (
        <div style={{
          fontSize: '0.78rem',
          color: 'var(--danger)',
          background: 'var(--danger-bg)',
          border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: '6px',
          padding: '0.4rem 0.7rem',
          maxWidth: '520px',
          wordBreak: 'break-word'
        }}>
          ⚠ {errorMsg}
        </div>
      )}
    </div>
  );
};
