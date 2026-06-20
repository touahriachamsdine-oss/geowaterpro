const proj4 = require('proj4');
const fs = require('fs');

const ALGERIA_LAMBERT = "+proj=lcc +lat_0=36 +lon_0=2.7 +lat_1=36 +lat_2=36 +x_0=500135 +y_0=300090 +ellps=clrk80ign +towgs84=-158,-205,-200,0,0,0,0 +units=m +no_defs";
const WGS84 = "+proj=longlat +datum=WGS84 +no_defs";

function lambertToWgs84(x, y) {
  try {
    const [lng, lat] = proj4(ALGERIA_LAMBERT, WGS84, [x, y]);
    return [lat, lng];
  } catch (error) {
    return [35.4, 8.12];
  }
}

const advanced = JSON.parse(fs.readFileSync('./src/data/advancedData.json', 'utf8'));

const groups = {};
advanced.wells.forEach(w => {
  const [lat, lng] = lambertToWgs84(w.x, w.y);
  if (!groups[w.aquiferId]) {
    groups[w.aquiferId] = [];
  }
  groups[w.aquiferId].push({ name: w.name, lat, lng });
});

for (const aquiferId in groups) {
  const list = groups[aquiferId];
  const lats = list.map(item => item.lat);
  const lngs = list.map(item => item.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  
  console.log(`\nAquifer ${aquiferId}:`);
  console.log(`  Well Count: ${list.length}`);
  console.log(`  Lat Range: ${minLat.toFixed(5)} to ${maxLat.toFixed(5)}`);
  console.log(`  Lng Range: ${minLng.toFixed(5)} to ${maxLng.toFixed(5)}`);
  console.log(`  Wells:`, list.map(item => `${item.name} (${item.lat.toFixed(4)}, ${item.lng.toFixed(4)})`).join(', '));
}
