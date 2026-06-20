const XLSX = require('xlsx');

const workbook = XLSX.readFile('./Advanced user data.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Parse aquifers from rows 1, 2, 3
const aquifers = [];
for (let r = 1; r <= 3; r++) {
  const row = data[r];
  if (row && row[0]) {
    aquifers.push({
      id: Number(row[0]),
      name: row[1],
      location: row[2],
      captiveType: row[3],
      type: row[4],
      b: Number(row[5]),
      K: Number(row[6]),
      S: Number(row[7])
    });
  }
}

const idsRow = data[6];
const namesRow = data[7];
const aquiferIdRow = data[8];
const xRow = data[9];
const yRow = data[10];
const zRow = data[11];

const wells = [];
const colCount = namesRow.length;

for (let col = 2; col < colCount; col++) {
  if (!namesRow[col]) continue;
  
  const well = {
    id: idsRow[col],
    name: namesRow[col].trim(),
    aquiferId: Number(aquiferIdRow[col]),
    location: "", // will fill based on aquifer or default
    x: Number(xRow[col]),
    y: Number(yRow[col]),
    z: Number(zRow[col]),
    history: []
  };
  
  // Set location from aquifer
  const aq = aquifers.find(a => a.id === well.aquiferId);
  if (aq) {
    well.location = aq.location;
  }
  
  // Parse monthly history starting at row 12
  for (let r = 12; r < data.length; r += 3) {
    const rowQ = data[r];
    const rowR = data[r + 1];
    const rowWl = data[r + 2];
    
    if (!rowQ || !rowQ[0]) break; // End of data
    
    const month = rowQ[0];
    const qVal = rowQ[col] !== undefined ? Number(rowQ[col]) : null;
    const rVal = (rowR && rowR[col] !== undefined) ? Number(rowR[col]) : null;
    const wlVal = (rowWl && rowWl[col] !== undefined) ? Number(rowWl[col]) : null;
    
    well.history.push({
      month: month,
      q: qVal,
      r: rVal,
      wl: wlVal
    });
  }
  
  wells.push(well);
}

const result = { aquifers, wells };
console.log("Parsed advanced data summary:");
console.log("Aquifers count:", result.aquifers.length);
console.log("Wells count:", result.wells.length);
console.log("First well history sample:", result.wells[0].history.slice(0, 2));

// Save standard and advanced files
const fs = require('fs');
fs.writeFileSync('temp_advanced.json', JSON.stringify(result, null, 2));
