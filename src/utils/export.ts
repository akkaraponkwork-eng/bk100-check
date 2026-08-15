import * as XLSX from 'xlsx';

export function exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Convert data array to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
