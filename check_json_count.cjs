const fs = require('fs');

const standard = JSON.parse(fs.readFileSync('./src/data/standardData.json', 'utf8'));
const advanced = JSON.parse(fs.readFileSync('./src/data/advancedData.json', 'utf8'));

console.log("Standard JSON wells count:", Array.isArray(standard) ? standard.length : Object.keys(standard).length);
console.log("Advanced JSON wells count:", advanced.wells ? advanced.wells.length : "no wells array");
if (Array.isArray(standard)) {
  console.log("Standard wells names:", standard.map(w => w.name));
}
if (advanced.wells) {
  console.log("Advanced wells names:", advanced.wells.map(w => w.name));
}
