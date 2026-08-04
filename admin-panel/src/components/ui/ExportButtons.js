'use client';
import { exportToExcel, exportToPDF } from '@/utils/export';
import { IconFileSpreadsheet, IconFileTypePdf } from '@tabler/icons-react';

export default function ExportButtons({ data, columns, filename, title }) {
  if (!data || data.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button 
        className="btn btn-secondary btn-sm" 
        onClick={() => exportToExcel(data, columns, filename)}
        title="Export to Excel"
        style={{ padding: '0 8px' }}
      >
        <IconFileSpreadsheet size={16} style={{ marginRight: 4 }} /> Excel
      </button>
      <button 
        className="btn btn-secondary btn-sm" 
        onClick={() => exportToPDF(data, columns, filename, title)}
        title="Export to PDF"
        style={{ padding: '0 8px' }}
      >
        <IconFileTypePdf size={16} style={{ marginRight: 4 }} /> PDF
      </button>
    </div>
  );
}
