const fs = require('fs');
const XLSX = require('xlsx');

// 1. Process Standard user data.xlsx
{
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

  for (let col = 2; col < colCount; col++) {
    if (!namesRow[col]) continue;
    
    const well = {
      id: idsRow[col],
      name: namesRow[col].toString().trim(),
      location: locationsRow[col] ? locationsRow[col].toString().trim() : "",
      x: Number(xRow[col]),
      y: Number(yRow[col]),
      z: Number(zRow[col]),
      history: []
    };
    
    for (let r = 6; r < data.length; r += 2) {
      const rowQ = data[r];
      const rowWl = data[r + 1];
      if (!rowQ || !rowQ[0]) break;
      
      const roundToTwo = (val) => {
        if (val === null || val === undefined) return null;
        return Math.round(Number(val) * 100) / 100;
      };

      const month = rowQ[0].toString().trim();
      const qVal = rowQ[col] !== undefined ? roundToTwo(rowQ[col]) : null;
      const wlVal = (rowWl && rowWl[col] !== undefined) ? roundToTwo(rowWl[col]) : null;
      
      well.history.push({
        month: month,
        q: qVal,
        wl: wlVal
      });
    }
    wells.push(well);
  }
  
  fs.writeFileSync('./src/data/standardData.json', JSON.stringify(wells, null, 2));
  console.log("Updated standardData.json with", wells.length, "wells.");
}

// 2. Process Advanced user data.xlsx
{
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
        name: row[1] ? row[1].toString().trim() : "",
        location: row[2] ? row[2].toString().trim() : "",
        captiveType: row[3] ? row[3].toString().trim() : "",
        type: row[4] ? row[4].toString().trim() : "",
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
      name: namesRow[col].toString().trim(),
      aquiferId: Number(aquiferIdRow[col]),
      location: "",
      x: Number(xRow[col]),
      y: Number(yRow[col]),
      z: Number(zRow[col]),
      history: []
    };
    
    const aq = aquifers.find(a => a.id === well.aquiferId);
    if (aq) {
      well.location = aq.location;
    }
    
    for (let r = 12; r < data.length; r += 3) {
      const rowQ = data[r];
      const rowR = data[r + 1];
      const rowWl = data[r + 2];
      
      if (!rowQ || !rowQ[0]) break;
      
      const roundToTwo = (val) => {
        if (val === null || val === undefined) return null;
        return Math.round(Number(val) * 100) / 100;
      };

      const month = rowQ[0].toString().trim();
      const qVal = rowQ[col] !== undefined ? roundToTwo(rowQ[col]) : null;
      const rVal = (rowR && rowR[col] !== undefined) ? roundToTwo(rowR[col]) : null;
      const wlVal = (rowWl && rowWl[col] !== undefined) ? roundToTwo(rowWl[col]) : null;
      
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
  fs.writeFileSync('./src/data/advancedData.json', JSON.stringify(result, null, 2));
  console.log("Updated advancedData.json with", result.wells.length, "wells.");
}
