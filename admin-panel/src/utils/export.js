import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToExcel(data, columns, filename = 'export') {
  const exportData = data.map(item => {
    const row = {};
    columns.forEach(col => {
      row[col.header] = typeof col.accessor === 'function' ? col.accessor(item) : item[col.accessor];
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToPDF(data, columns, filename = 'export', title = 'Export') {
  const doc = new jsPDF();
  
  if (title) {
    doc.setFontSize(16);
    doc.text(title, 14, 15);
  }

  const tableColumn = columns.map(col => col.header);
  const tableRows = data.map(item => {
    return columns.map(col => {
      const val = typeof col.accessor === 'function' ? col.accessor(item) : item[col.accessor];
      return val == null ? '' : String(val);
    });
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: title ? 20 : 10,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
  });

  doc.save(`${filename}.pdf`);
}
