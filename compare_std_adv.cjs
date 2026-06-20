const fs = require('fs');

const standard = JSON.parse(fs.readFileSync('./src/data/standardData.json', 'utf8'));
const advanced = JSON.parse(fs.readFileSync('./src/data/advancedData.json', 'utf8'));

console.log(`Standard: ${standard.length} wells`);
console.log(`Advanced: ${advanced.wells.length} wells`);

standard.forEach(sw => {
  const aw = advanced.wells.find(w => w.name === sw.name);
  if (!aw) {
    console.log(`Well ${sw.name} in Standard but NOT in Advanced!`);
  } else {
    // Compare coordinates
    const coordDiff = Math.abs(sw.x - aw.x) > 0.01 || Math.abs(sw.y - aw.y) > 0.01 || Math.abs(sw.z - aw.z) > 0.01;
    if (coordDiff) {
      console.log(`Coord diff for ${sw.name}: Std(${sw.x}, ${sw.y}, ${sw.z}) vs Adv(${aw.x}, ${aw.y}, ${aw.z})`);
    }
    // Compare history length
    if (sw.history.length !== aw.history.length) {
      console.log(`History length diff for ${sw.name}: Std=${sw.history.length}, Adv=${aw.history.length}`);
    } else {
      // Compare values
      let diffVal = false;
      const diffs = [];
      for (let i = 0; i < sw.history.length; i++) {
        if (sw.history[i].month !== aw.history[i].month ||
            sw.history[i].q !== aw.history[i].q ||
            sw.history[i].wl !== aw.history[i].wl) {
          diffVal = true;
          diffs.push({
            month: sw.history[i].month,
            std: { q: sw.history[i].q, wl: sw.history[i].wl },
            adv: { q: aw.history[i].q, wl: aw.history[i].wl }
          });
        }
      }
      if (diffVal) {
        console.log(`History values diff for ${sw.name}:`);
        console.log(diffs.slice(0, 5)); // print first 5 differences
      }
    }
  }
});
