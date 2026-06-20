const fs = require('fs');

const oldData = JSON.parse(fs.readFileSync('./src/data/advancedData.json', 'utf8'));
const newData = JSON.parse(fs.readFileSync('./temp_advanced.json', 'utf8'));

console.log("Old aquifers:");
console.log(JSON.stringify(oldData.aquifers, null, 2));

console.log("\nNew aquifers:");
console.log(JSON.stringify(newData.aquifers, null, 2));

console.log("\nChecking wells compatibility:");
if (oldData.wells.length !== newData.wells.length) {
  console.log(`Well counts differ: old ${oldData.wells.length}, new ${newData.wells.length}`);
} else {
  console.log("Well counts match: 30 wells");
}

// Compare history lengths
newData.wells.forEach((well, idx) => {
  const oldWell = oldData.wells.find(w => w.name === well.name || w.id === well.id);
  if (!oldWell) {
    console.log(`Well not found in old data: ${well.name}`);
  } else {
    if (oldWell.history.length !== well.history.length) {
      console.log(`Well ${well.name} history length differ: old ${oldWell.history.length}, new ${well.history.length}`);
    }
  }
});
