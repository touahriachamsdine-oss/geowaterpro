const proj4 = require('proj4');
const fs = require('fs');

const ALGERIA_LAMBERT = "+proj=lcc +lat_0=36 +lon_0=2.7 +lat_1=36 +lat_2=36 +x_0=500135 +y_0=300090 +ellps=clrk80ign +towgs84=-158,-205,-200,0,0,0,0 +units=m +no_defs";
const WGS84 = "+proj=longlat +datum=WGS84 +no_defs";

function lambertToWgs84(x, y) {
  try {
    const [lng, lat] = proj4(ALGERIA_LAMBERT, WGS84, [x, y]);
    return [lat, lng];
  } catch (error) {
    return [null, null];
  }
}

const advanced = JSON.parse(fs.readFileSync('./src/data/advancedData.json', 'utf8'));

console.log("Checking coordinates conversion:");
advanced.wells.slice(0, 10).forEach(w => {
  const [lat, lng] = lambertToWgs84(w.x, w.y);
  console.log(`Well ${w.name}: X=${w.x}, Y=${w.y} => Lat=${lat.toFixed(5)}, Lng=${lng.toFixed(5)}`);
});
