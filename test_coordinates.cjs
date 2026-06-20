const proj4 = require('proj4');
const ALGERIA_LAMBERT = "+proj=lcc +lat_1=36.16666666666666 +lat_0=36.16666666666666 +lon_0=3 +k_0=0.999625769 +x_0=500000 +y_0=300000 +a=6378249.2 +rf=293.4660212936269 +towgs84=-158,-205,-200,0,0,0,0 +units=m +no_defs";
const WGS84 = "+proj=longlat +datum=WGS84 +no_defs";

const wells = [
  { name: "M2 BIS", x: 992975.0, y: 229070.0 },
  { name: "EV1", x: 998000.0, y: 230900.0 },
  { name: "N2-3", x: 987900.0, y: 249200.0 },
  { name: "T9", x: 988798.0, y: 246613.0 },
  { name: "CH1bis", x: 957160.0, y: 231177.0 },
  { name: "T12", x: 951122.0, y: 211393.0 }
];

wells.forEach(w => {
  const [lng, lat] = proj4(ALGERIA_LAMBERT, WGS84, [w.x, w.y]);
  console.log(`${w.name}: Lambert(${w.x}, ${w.y}) -> Lat/Lng(${lat}, ${lng})`);
});
