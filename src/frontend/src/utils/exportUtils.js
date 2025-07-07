import { saveAs } from 'file-saver';
import { utils, write } from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Export to CSV
const exportToCSV = (data, filename = 'export') => {
  if (!data || data.length === 0) return;

  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Convert data to CSV format
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(fieldName => {
        // Handle nested objects and arrays
        const value = fieldName.split('.').reduce((obj, key) => 
          (obj && obj[key] !== undefined) ? obj[key] : '', row);
        
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value || '').replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

// Export to Excel
const exportToExcel = (data, filename = 'export') => {
  if (!data || data.length === 0) return;

  // Convert data to worksheet
  const ws = utils.json_to_sheet(data);
  
  // Create workbook
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Sheet1');
  
  // Generate file and download
  const excelBuffer = write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
};

// Export to PDF
const exportToPDF = (data, filename = 'export', title = 'User Report') => {
  if (!data || data.length === 0) return;

  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Format data for PDF
  const body = data.map(row => 
    headers.map(fieldName => {
      // Handle nested objects and arrays
      const value = fieldName.split('.').reduce((obj, key) => 
        (obj && obj[key] !== undefined) ? obj[key] : '', row);
      return String(value || '');
    })
  );

  // Create PDF
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  
  // Add date
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
  
  // Add table
  doc.autoTable({
    head: [headers.map(h => h.charAt(0).toUpperCase() + h.slice(1))],
    body: body,
    startY: 40,
    styles: { 
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
      lineWidth: 0.1,
      lineColor: [200, 200, 200]
    },
    headStyles: {
      fillColor: [41, 98, 255],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { top: 40 }
  });
  
  // Save the PDF
  doc.save(`${filename}.pdf`);
};

// Format user data for export
const formatUserDataForExport = (users) => {
  return users.map(user => ({
    'ID': user.id || '',
    'Name': `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    'Email': user.email || '',
    'Role': user.role?.name || user.role || '',
    'Status': user.status || '',
    'Verified': user.emailVerified ? 'Yes' : 'No',
    'Last Login': user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never',
    'Registration Date': user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
    'Phone': user.phone || '',
    'Department': user.department || '',
    '2FA Enabled': user.twoFactorEnabled ? 'Yes' : 'No',
  }));
};

// Main export function
const exportData = (data, format, options = {}) => {
  const { filename = 'export', title = 'User Export' } = options;
  const formattedData = formatUserDataForExport(data);
  
  switch (format.toLowerCase()) {
    case 'csv':
      return exportToCSV(formattedData, filename);
    case 'excel':
    case 'xlsx':
      return exportToExcel(formattedData, filename);
    case 'pdf':
      return exportToPDF(formattedData, filename, title);
    default:
      console.error('Unsupported export format');
  }
};

export { exportData, exportToCSV, exportToExcel, exportToPDF };
