const proj4 = require('proj4');

const projections = {
  "Current App Proj": "+proj=lcc +lat_1=36.16666666666666 +lat_0=36.16666666666666 +lon_0=3 +k_0=0.999625769 +x_0=500000 +y_0=300000 +a=6378249.2 +rf=293.4660212936269 +towgs84=-158,-205,-200,0,0,0,0 +units=m +no_defs",
  "Official EPSG:30791 (from search)": "+proj=lcc +lat_0=36 +lon_0=2.7 +lat_1=36 +lat_2=36 +x_0=500135 +y_0=300090 +ellps=clrk80ign +units=m +no_defs",
  "Official EPSG:30791 with WGS84 datum shift": "+proj=lcc +lat_0=36 +lon_0=2.7 +lat_1=36 +lat_2=36 +x_0=500135 +y_0=300090 +ellps=clrk80ign +towgs84=-158,-205,-200,0,0,0,0 +units=m +no_defs",
  "Voirol 1875 Nord (EPSG:30491) but with lon_0=2.7": "+proj=lcc +lat_1=36.16666666666666 +lat_0=36.16666666666666 +lon_0=2.7 +k_0=0.999625769 +x_0=500000 +y_0=300000 +a=6378249.145 +b=6356515 +units=m +no_defs"
};

const testWells = [
  { name: "M2 BIS (El Malabiod, expected ~35.2056, ~8.1700)", x: 992975.0, y: 229070.0 },
  { name: "FTA.2 (Tébessa, expected ~35.408, ~8.124)", x: 990750.0, y: 250000.0 },
  { name: "T12 (Chéria, expected ~35.233, ~7.756)", x: 951122.0, y: 211393.0 }
];

const WGS84 = "+proj=longlat +datum=WGS84 +no_defs";

for (const [projName, projDef] of Object.entries(projections)) {
  console.log(`\n=== Testing ${projName} ===`);
  testWells.forEach(w => {
    try {
      const [lng, lat] = proj4(projDef, WGS84, [w.x, w.y]);
      console.log(`  ${w.name} -> Lat/Lng: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch (e) {
      console.log(`  ${w.name} -> Error: ${e.message}`);
    }
  });
}
