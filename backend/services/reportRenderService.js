const ExcelJS = require('exceljs');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const crypto = require('crypto');

function computeHash(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function formatCurrency(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('rw-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(value);
}

function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toISOString().split('T')[0];
}

function formatDateTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleString();
}

function buildEnvelope({ title, period, filtersApplied, generatedBy, summary, columns, data, total }) {
  return {
    title: title || 'Report',
    period: period || {},
    filtersApplied: filtersApplied || {},
    generatedAt: new Date().toISOString(),
    generatedBy: generatedBy || {},
    summary: summary || {},
    columns: columns || [],
    data: data || [],
    total: total ?? data.length
  };
}

async function generateCsv(envelope) {
  const { columns, data } = envelope;
  if (!columns.length || !data.length) return '';

  const headers = columns.map(c => c.label);
  const escapeCsv = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const rows = data.map(row => columns.map(c => escapeCsv(row[c.key] ?? '')));
  const csvLines = [headers.join(','), ...rows.map(r => r.join(','))];
  return csvLines.join('\n');
}

async function generateExcel(envelope) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'UMURIMO Saving Group';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet((envelope.title || 'Report').substring(0, 31));

  const headerRow = sheet.addRow(envelope.columns.map(c => c.label));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  envelope.data.forEach((row) => {
    const r = sheet.addRow(envelope.columns.map(c => row[c.key] ?? ''));
    r.eachCell((cell) => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  });

  envelope.columns.forEach((col, idx) => {
    const key = col.key;
    let maxLen = col.label.length;
    envelope.data.forEach(row => {
      const len = String(row[key] ?? '').length;
      if (len > maxLen) maxLen = len;
    });
    sheet.getColumn(idx + 1).width = Math.min(Math.max(maxLen + 2, 10), 40);
  });

  return workbook;
}

async function generatePdf(envelope) {
  const { columns, data, title, period, generatedAt, generatedBy, summary } = envelope;
  const pdfDoc = await PDFDocument.create();
  const isWide = columns.length > 6;
  const pageWidth = isWide ? 841.89 : 595.28;
  const pageHeight = isWide ? 595.28 : 841.89;
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  const { width, height } = page.getSize();
  const margin = 40;
  let y = height - margin;

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const drawText = (text, x, yPos, font, size, color = rgb(0, 0, 0)) => {
    page.drawText(String(text ?? ''), { x, y: yPos, size, font, color });
  };

  const drawLine = (yPos, xStart = margin, xEnd = width - margin, thickness = 0.5, color = rgb(0.7, 0.7, 0.7)) => {
    page.drawLine({
      start: { x: xStart, y: yPos },
      end: { x: xEnd, y: yPos },
      thickness,
      color
    });
  };

  const truncate = (text, maxWidth, font, size) => {
    const str = String(text ?? '');
    if (font.widthOfTextAtSize(str, size) <= maxWidth) return str;
    let truncated = str;
    while (truncated.length > 0 && font.widthOfTextAtSize(truncated + '...', size) > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  };

  const wrapText = (text, maxWidth, font, size) => {
    const str = String(text ?? '');
    if (font.widthOfTextAtSize(str, size) <= maxWidth) return [str];
    const words = str.split(' ');
    const lines = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (font.widthOfTextAtSize(testLine, size) <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        if (font.widthOfTextAtSize(word, size) > maxWidth) {
          let partial = word;
          while (partial.length > 0 && font.widthOfTextAtSize(partial + '...', size) > maxWidth) {
            partial = partial.slice(0, -1);
          }
          if (partial !== word) {
            lines.push(partial + '...');
            currentLine = '';
            continue;
          }
        }
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [''];
  };

  const measureText = (text, font, size) => {
    const str = String(text ?? '');
    return font.widthOfTextAtSize(str, size);
  };

  const headerPadding = 6;
  const cellPadding = 4;
  const summaryPadding = 5;

  // ===== HEADER =====
  drawText('UMURIMO Saving Group', margin, y, helveticaBold, 16, rgb(0.08, 0.08, 0.25));
  y -= 18;
  drawText('Official Record Sheet', margin, y, helvetica, 9, rgb(0.45, 0.45, 0.55));
  y -= 14;
  drawLine(y, margin, width - margin, 1.2, rgb(0.2, 0.2, 0.3));
  y -= 10;

  // Title block
  drawText(title || 'Report', margin, y, helveticaBold, 13, rgb(0.05, 0.05, 0.2));
  y -= 14;

  const periodLabel = period?.label || `${formatDate(period?.startDate)} - ${formatDate(period?.endDate)}`;
  drawText(`Period: ${periodLabel}`, margin, y, helvetica, 9, rgb(0.3, 0.3, 0.3));
  y -= 10;
  drawText(`Generated: ${formatDateTime(generatedAt)}`, margin, y, helvetica, 9, rgb(0.3, 0.3, 0.3));
  y -= 10;
  if (generatedBy?.fullName) {
    drawText(`Generated by: ${generatedBy.fullName} (${generatedBy.role || ''})`, margin, y, helvetica, 9, rgb(0.3, 0.3, 0.3));
    y -= 10;
  }
  y -= 4;
  drawLine(y, margin, width - margin, 1, rgb(0.35, 0.35, 0.4));
  y -= 10;

  // ===== SUMMARY BLOCK =====
  if (summary && Object.keys(summary).length > 0) {
    const summaryEntries = Object.entries(summary).slice(0, 8);
    const colCount = 2;
    const itemWidth = (width - margin * 2) / colCount;
    const itemHeight = 20;
    const rows = Math.ceil(summaryEntries.length / colCount);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < colCount; col++) {
        const idx = row * colCount + col;
        if (idx >= summaryEntries.length) break;
        const [key, val] = summaryEntries[idx];
        const x = margin + col * itemWidth;
        const boxY = y;

        // Background for summary item
        page.drawRectangle({
          x: x + 1,
          y: boxY - itemHeight + 2,
          width: itemWidth - 2,
          height: itemHeight - 2,
          color: rgb(0.96, 0.96, 0.97),
          borderColor: rgb(0.75, 0.75, 0.8),
          borderWidth: 0.5
        });

        const label = String(key).replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        const displayVal = typeof val === 'number' && (key.toLowerCase().includes('amount') || key.toLowerCase().includes('total') || key.toLowerCase().includes('value'))
          ? formatCurrency(val)
          : String(val ?? '');

        drawText(`${label}:`, x + summaryPadding, boxY - 8, helvetica, 8, rgb(0.35, 0.35, 0.4));
        drawText(displayVal, x + summaryPadding, boxY - 16, helveticaBold, 9, rgb(0.05, 0.05, 0.2));
      }
      y -= itemHeight;
    }

    y -= 10;
    drawLine(y, margin, width - margin, 1, rgb(0.35, 0.35, 0.4));
    y -= 10;
  }

  // ===== TABLE =====
  const usableWidth = width - margin * 2;
  const headerFontSize = 9;
  const dataFontSize = 9;
  const headerHeight = 24;
  const rowPadding = 5;
  const rowGap = 2;

  const colWidths = columns.map(c => {
    const headerWidth = measureText(c.label, helveticaBold, headerFontSize) + rowPadding * 2 + 8;
    let maxDataWidth = 30;
    for (let i = 0; i < Math.min(data.length, 20); i++) {
      const val = data[i][c.key];
      const str = String(val ?? '');
      const dataWidth = measureText(str, helvetica, dataFontSize) + rowPadding * 2 + 8;
      if (dataWidth > maxDataWidth) maxDataWidth = dataWidth;
    }
    return Math.min(Math.max(headerWidth, maxDataWidth), usableWidth / columns.length);
  });

  const totalColWidth = colWidths.reduce((a, b) => a + b, 0);
  const scale = totalColWidth > usableWidth ? usableWidth / totalColWidth : 1;
  const scaledColWidths = colWidths.map(w => w * scale);

  function drawTableHeader() {
    let hx = margin;
    scaledColWidths.forEach((w, i) => {
      const col = columns[i];
      const text = truncate(col.label, w - rowPadding * 2, helveticaBold, headerFontSize);
      const textWidth = measureText(text, helveticaBold, headerFontSize);

      page.drawRectangle({
        x: hx,
        y: y - headerHeight + 2,
        width: w,
        height: headerHeight - 2,
        color: rgb(0.15, 0.25, 0.45)
      });

      const textX = hx + (w - textWidth) / 2;
      drawText(text, textX, y - headerHeight / 2 - 2, helveticaBold, headerFontSize, rgb(1, 1, 1));
      hx += w;
    });
    y -= headerHeight;
    drawLine(y, margin, width - margin, 1, rgb(0.15, 0.25, 0.45));
    y -= 2;
  }

  if (y - headerHeight < margin) {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = height - margin;
  }
  drawTableHeader();

  data.forEach((row, rowIdx) => {
    const rowData = columns.map((col, i) => {
      const val = row[col.key];
      const text = val !== undefined && val !== null ? String(val) : '';
      return { text, width: scaledColWidths[i] - rowPadding * 2 };
    });

    const maxLines = Math.max(...rowData.map(d => wrapText(d.text, d.width, helvetica, dataFontSize).length), 1);
    const neededHeight = maxLines * (dataFontSize + 3) + rowPadding * 2 + rowGap;

    if (y - neededHeight < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = height - margin;
      drawTableHeader();
    }

    const rowBgColor = rowIdx % 2 === 0 ? rgb(0.94, 0.94, 0.96) : rgb(1, 1, 1);
    let hx = margin;
    scaledColWidths.forEach((w, i) => {
      page.drawRectangle({
        x: hx,
        y: y - neededHeight + 2,
        width: w,
        height: neededHeight - 2,
        color: rowBgColor
      });
      hx += w;
    });

    hx = margin;
    rowData.forEach((d, i) => {
      const lines = wrapText(d.text, d.width, helvetica, dataFontSize);
      const isAmount = /amount|balance|total|loan|contribution|repay/i.test(columns[i].key);
      lines.forEach((line, lineIdx) => {
        const textWidth = measureText(line, helvetica, dataFontSize);
        const textY = y - rowPadding - (lines.length - 1 - lineIdx) * (dataFontSize + 3) - 3;
        if (isAmount) {
          drawText(line, hx + scaledColWidths[i] - rowPadding - textWidth, textY, helvetica, dataFontSize, rgb(0.05, 0.05, 0.2));
        } else {
          drawText(line, hx + rowPadding, textY, helvetica, dataFontSize, rgb(0.1, 0.1, 0.15));
        }
      });
      hx += scaledColWidths[i];
    });

    y -= neededHeight;
  });

  if (data.length > 0) {
    const tableTop = height - margin - headerHeight - 2;
    const tableBottom = Math.max(margin, y);
    if (tableTop > tableBottom) {
      page.drawRectangle({
        x: margin,
        y: tableBottom,
        width: usableWidth,
        height: tableTop - tableBottom,
        borderColor: rgb(0.3, 0.3, 0.35),
        borderWidth: 1
      });
    }
  } else {
    drawText('No records found for this period.', margin, y - 10, helvetica, 9, rgb(0.5, 0.5, 0.5));
    y -= 14;
  }

  // ===== FOOTER =====
  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const currentPage = pdfDoc.getPage(i);
    currentPage.drawText(`Page ${i + 1} of ${totalPages}`, {
      x: width - margin - 50,
      y: margin - 20,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5)
    });
    currentPage.drawText('UMURIMO Saving Group - Point-in-time snapshot', {
      x: margin,
      y: margin - 20,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5)
    });
  }

  return pdfDoc;
}

async function renderExport(envelope, format) {
  if (format === 'csv') {
    const csv = await generateCsv(envelope);
    return { buffer: Buffer.from(csv, 'utf-8'), contentType: 'text/csv;charset=utf-8', extension: 'csv' };
  }
  if (format === 'xlsx') {
    const workbook = await generateExcel(envelope);
    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer: Buffer.from(buffer), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx' };
  }
  if (format === 'pdf') {
    const pdfDoc = await generatePdf(envelope);
    const buffer = await pdfDoc.save();
    return { buffer, contentType: 'application/pdf', extension: 'pdf' };
  }
  throw new Error(`Unsupported export format: ${format}`);
}

module.exports = {
  buildEnvelope,
  computeHash,
  formatCurrency,
  formatDate,
  formatDateTime,
  generateCsv,
  generateExcel,
  generatePdf,
  renderExport
};
