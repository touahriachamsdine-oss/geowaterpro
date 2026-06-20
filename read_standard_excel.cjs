const XLSX = require('xlsx');

const workbook = XLSX.readFile('./Standard user data.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const wellsHeader = data[6];
const namesRow = data[7];
const xRow = data[8];
const yRow = data[9];
const zRow = data[10];

console.log("Parsed standard wells from Excel:");
const wells = [];
for (let j = 2; j < namesRow.length; j++) {
  if (!namesRow[j]) continue;
  wells.push({
    id: wellsHeader[j],
    name: namesRow[j],
    x: xRow[j],
    y: yRow[j],
    z: zRow[j]
  });
}

console.log(JSON.stringify(wells, null, 2));
console.log("Total wells in standard excel:", wells.length);
