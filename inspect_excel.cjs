const XLSX = require('xlsx');

function inspectXlsx(filePath) {
  console.log(`\n=== Inspecting ${filePath} ===`);
  const workbook = XLSX.readFile(filePath);
  workbook.SheetNames.forEach(sheetName => {
    console.log(`Sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    // Print first 20 rows and first 32 columns of each row
    data.slice(0, 20).forEach((row, i) => {
      console.log(`Row ${i}:`, row.slice(0, 32));
    });
  });
}

inspectXlsx('./Standard user data.xlsx');
inspectXlsx('./Advanced user data.xlsx');
