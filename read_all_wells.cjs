const XLSX = require('xlsx');

const workbook = XLSX.readFile('./Advanced user data.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const wellsHeader = data[6];
const namesRow = data[7];
const aquiferIdRow = data[8];
const xRow = data[9];
const yRow = data[10];
const zRow = data[11];

console.log("Parsed wells from Excel:");
const wells = [];
for (let j = 2; j < namesRow.length; j++) {
  if (!namesRow[j]) continue;
  wells.push({
    id: wellsHeader[j],
    name: namesRow[j],
    aquiferId: aquiferIdRow[j],
    x: xRow[j],
    y: yRow[j],
    z: zRow[j]
  });
}

console.log(JSON.stringify(wells, null, 2));
