const XLSX = require('xlsx');

const workbook = XLSX.readFile('./Standard user data.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const idsRow = data[0];
const namesRow = data[1];
const locationsRow = data[2];
const xRow = data[3];
const yRow = data[4];
const zRow = data[5];

const wells = [];
const colCount = namesRow.length;

// Columns start at index 2
for (let col = 2; col < colCount; col++) {
  if (!namesRow[col]) continue;
  
  const well = {
    id: idsRow[col],
    name: namesRow[col],
    location: locationsRow[col],
    x: Number(xRow[col]),
    y: Number(yRow[col]),
    z: Number(zRow[col]),
    history: []
  };
  
  // Rows with data start at index 6
  for (let r = 6; r < data.length; r += 2) {
    const rowQ = data[r];
    const rowWl = data[r + 1];
    if (!rowQ || !rowQ[0]) break; // End of months or empty row
    
    const month = rowQ[0];
    const qVal = rowQ[col] !== undefined ? Number(rowQ[col]) : null;
    const wlVal = (rowWl && rowWl[col] !== undefined) ? Number(rowWl[col]) : null;
    
    well.history.push({
      month: month,
      q: qVal,
      wl: wlVal
    });
  }
  wells.push(well);
}

console.log(JSON.stringify(wells, null, 2));
