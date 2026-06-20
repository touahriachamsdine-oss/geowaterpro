const proj4 = require('proj4');

const projDef = "+proj=lcc +lat_0=36 +lon_0=2.7 +lat_1=36 +lat_2=36 +x_0=500135 +y_0=300090 +ellps=clrk80ign +towgs84=-158,-205,-200,0,0,0,0 +units=m +no_defs";
const WGS84 = "+proj=longlat +datum=WGS84 +no_defs";

try {
  const [lng, lat] = proj4(projDef, WGS84, [992975.0, 229070.0]);
  console.log("Success! Converted M2 BIS to:", lat, lng);
} catch (e) {
  console.error("Error with clrk80ign:", e.message);
}
