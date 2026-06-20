const XLSX = require('xlsx');

const workbook = XLSX.readFile('./Standard user data.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

for (let i = 0; i < Math.min(25, data.length); i++) {
  console.log(`Row ${i}:`, data[i] ? data[i].slice(0, 15) : null);
}
