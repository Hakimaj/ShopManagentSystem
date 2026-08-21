import React, { useState } from 'react';
import { FileDown, Calendar, Loader2 } from 'lucide-react';
import { dashboardApi } from '../services/dashboardApi';
import { transactionsApi } from '../services/transactionsApi';

// jsPDF + autotable are loaded on-demand (dynamic import) to keep the
// initial app bundle lean. They are only fetched when the user clicks
// "Generate Report" for the first time.

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

// jsPDF's built-in fonts (helvetica) only support Latin-1 characters.
// We replace Ethiopic characters with their Latin equivalents for PDF output only —
// the UI still shows the Ethiopic names normally.
function safePdfText(str) {
  if (!str) return '';
  return String(str)
    .replace(/ጁጁ ጽዳት/g, 'Juju Tzidat')
    .replace(/[^\x00-\xFF]/g, '?'); // fallback: replace any remaining non-Latin-1
}

export const ReportGenerator = ({ currentTimeFilter, currentCustomDate }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportPeriod, setReportPeriod] = useState(currentTimeFilter || 'all');
  const [reportDate, setReportDate] = useState(currentCustomDate || getTodayFormatted());
  const [errorMsg, setErrorMsg] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg('');

    try {
      // ── 0. Load PDF libraries on demand ─────────────────────────────
      // autoTable patches jsPDF.prototype — it must be imported AFTER jsPDF.
      const { default: jsPDF }    = await import('jspdf');
      await import('jspdf-autotable');          // side-effect: patches jsPDF.prototype
      // autoTable is now available as doc.autoTable() on the instance,
      // but jspdf-autotable also exports a named fn we can call directly.
      const { default: autoTable } = await import('jspdf-autotable');

      // ── 1. Fetch ALL transactions for the period (paginate, max 100/page) ──
      const PAGE_SIZE = 100;
      let allTransactions = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const res = await transactionsApi.list({
          period: reportPeriod,
          custom_date: reportPeriod === 'custom' ? reportDate : undefined,
          size: PAGE_SIZE,
          page: currentPage
        });
        const items = res?.items ?? [];
        allTransactions = allTransactions.concat(items);
        totalPages = res?.pages ?? 1;
        currentPage++;
      } while (currentPage <= totalPages);

      // Fetch KPI summary in parallel with the first page (already done above)
      const kpiRes = await dashboardApi.getSummary({
        period: reportPeriod,
        custom_date: reportPeriod === 'custom' ? reportDate : undefined
      });

      const transactions = allTransactions;
      const kpi = kpiRes?.kpi ?? {};

      // ── 2. Initialise document ───────────────────────────────────────
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const now = new Date();
      const ACCENT = [79, 70, 229];
      const DARK   = [15, 23, 42];
      const MUTED  = [100, 116, 139];
      const GREEN  = [5, 150, 105];
      const STRIPE = [241, 245, 249];

      const periodLabel = reportPeriod === 'custom'
        ? `Specific Day: ${reportDate}`
        : (PERIOD_LABELS[reportPeriod] ?? reportPeriod);

      // ── 3. Page header (drawn once here; footer via didDrawPage) ─────
      const drawPageHeader = () => {
        doc.setFillColor(...ACCENT);
        doc.rect(0, 0, pageW, 60, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Juju Tzidat — Sales & Revenue Report', 36, 28);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Period: ${safePdfText(periodLabel)}   |   Generated: ${now.toLocaleString('en-US')}`,
          36, 46
        );
      };
      drawPageHeader();

      // ── 4. KPI summary table ─────────────────────────────────────────
      let cursorY = 80;

      doc.setTextColor(...DARK);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
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
        styles:       { fontSize: 10, cellPadding: 4, textColor: DARK },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: MUTED, cellWidth: 140 },
          1: { fontStyle: 'bold' }
        },
        tableWidth: 300,
        margin: { left: 36 }
      });

      cursorY = doc.lastAutoTable.finalY + 20;

      // ── 5. Transactions log table ────────────────────────────────────
      doc.setTextColor(...DARK);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Transaction Log', 36, cursorY);
      cursorY += 4;

      const txnRows = transactions.map((txn) => {
        const totalUnits = (txn.items ?? []).reduce((s, i) => s + (i.quantity ?? 0), 0);
        const itemsSummary = (txn.items ?? [])
          .map((i) => `${safePdfText(i.product_name)} x${i.quantity}`)
          .join(', ');
        return [
          safePdfText(txn.id),
          new Date(txn.timestamp).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          }),
          safePdfText(txn.payment_method),
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
          fillColor: ACCENT,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        bodyStyles:          { fontSize: 7.5, textColor: DARK },
        alternateRowStyles:  { fillColor: STRIPE },
        columnStyles: {
          0: { cellWidth: 62,  fontStyle: 'bold' },
          1: { cellWidth: 90 },
          2: { cellWidth: 48 },
          3: { cellWidth: 38 },
          4: { cellWidth: 62, halign: 'right' },
          5: { cellWidth: 62, halign: 'right', textColor: GREEN },
          6: { cellWidth: 'auto' }
        },
        margin: { left: 36, right: 36 },
        didDrawPage: ({ pageNumber }) => {
          // Footer on every page
          doc.setFontSize(7.5);
          doc.setTextColor(...MUTED);
          const totalPages = doc.internal.getNumberOfPages();
          doc.text(
            `Page ${pageNumber} of ${totalPages} — Juju Tzidat POS`,
            pageW / 2, pageH - 16,
            { align: 'center' }
          );
        }
      });

      // ── 6. Per-transaction line-item breakdown (≤ 100 transactions) ──
      if (transactions.length > 0 && transactions.length <= 100) {
        doc.addPage();

        // Re-draw header on the new page
        drawPageHeader();

        let yDetail = 76;
        doc.setTextColor(...DARK);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Itemized Line-Item Breakdown', 36, yDetail);
        yDetail += 14;

        for (const txn of transactions) {
          // Check remaining page space; add new page if needed
          if (yDetail > pageH - 120) {
            doc.addPage();
            drawPageHeader();
            yDetail = 76;
          }

          const lineRows = (txn.items ?? []).map((item) => {
            const rev  = Number(item.selling_price) * (item.quantity ?? 0);
            const cost = Number(item.cost_price)    * (item.quantity ?? 0);
            return [
              safePdfText(item.product_name),
              String(item.quantity ?? 0),
              `${Number(item.cost_price).toFixed(2)}`,
              `${Number(item.selling_price).toFixed(2)}`,
              `${rev.toFixed(2)}`,
              `+${(rev - cost).toFixed(2)}`
            ];
          });

          autoTable(doc, {
            startY: yDetail,
            head: [[
              {
                content: `Order ${safePdfText(txn.id)}  |  ${new Date(txn.timestamp).toLocaleString('en-US')}  |  ${safePdfText(txn.payment_method)}`,
                colSpan: 6,
                styles: { fillColor: [226, 232, 240], textColor: DARK, fontStyle: 'bold', fontSize: 7.5 }
              }
            ]],
            body: [
              ['Product Name', 'Qty', 'Cost/Unit', 'Sold/Unit', 'Revenue', 'Profit'],
              ...lineRows
            ],
            theme: 'plain',
            styles:       { fontSize: 7.5, cellPadding: 3, textColor: DARK },
            headStyles:   { fontSize: 7.5 },
            columnStyles: {
              0: { cellWidth: 160 },
              4: { halign: 'right' },
              5: { halign: 'right', textColor: GREEN }
            },
            margin: { left: 36, right: 36 },
            didDrawPage: ({ pageNumber }) => {
              doc.setFontSize(7.5);
              doc.setTextColor(...MUTED);
              const totalPages = doc.internal.getNumberOfPages();
              doc.text(
                `Page ${pageNumber} of ${totalPages} — Juju Tzidat POS`,
                pageW / 2, pageH - 16,
                { align: 'center' }
              );
            }
          });

          yDetail = doc.lastAutoTable.finalY + 8;
        }
      }

      // ── 7. Save ──────────────────────────────────────────────────────
      const safeDate = reportPeriod === 'custom' ? reportDate : reportPeriod;
      const filename = `juju-report-${safeDate}-${now.toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);

    } catch (err) {
      console.error('[ReportGenerator] PDF generation failed:', err);
      setErrorMsg(err?.message || 'Unknown error. Check the browser console for details.');
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
          onChange={(e) => { setReportPeriod(e.target.value); setErrorMsg(''); }}
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
              <span>Generating…</span>
            </>
          ) : (
            <>
              <FileDown size={16} />
              <span>Generate Report</span>
            </>
          )}
        </button>
      </div>

      {/* Inline error — more useful than a generic alert() */}
      {errorMsg && (
        <div style={{
          fontSize: '0.78rem',
          color: 'var(--danger)',
          background: 'var(--danger-bg)',
          border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: '6px',
          padding: '0.4rem 0.7rem',
          maxWidth: '480px',
          wordBreak: 'break-word'
        }}>
          ⚠ PDF error: {errorMsg}
        </div>
      )}
    </div>
  );
};
