const fs = require('fs');
const proj4 = require('proj4');

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

// Convex hull (Graham Scan or Monotone Chain)
function convexHull(points) {
  points.sort((a, b) => a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]);
  const lower = [];
  for (const p of points) {
    while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function crossProduct(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

const advanced = JSON.parse(fs.readFileSync('./src/data/advancedData.json', 'utf8'));

const groups = {};
advanced.wells.forEach(w => {
  const [lat, lng] = lambertToWgs84(w.x, w.y);
  if (!groups[w.aquiferId]) groups[w.aquiferId] = [];
  groups[w.aquiferId].push([lat, lng]);
});

const hullsData = {};
for (let id = 1; id <= 3; id++) {
  const pts = groups[id];
  if (!pts) continue;
  
  const hull = convexHull(pts);
  
  // Let's pad the hull by moving points slightly outward from centroid
  const centroid = hull.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]).map(v => v / hull.length);
  const paddedHull = hull.map(p => {
    const dLat = p[0] - centroid[0];
    const dLng = p[1] - centroid[1];
    // Scale out by 1.25 and add a minimum padding of 0.02
    const len = Math.sqrt(dLat * dLat + dLng * dLng);
    const factor = len > 0 ? 1.25 + (0.015 / len) : 1.25;
    return [
      Number((centroid[0] + dLat * factor).toFixed(4)),
      Number((centroid[1] + dLng * factor).toFixed(4))
    ];
  });
  
  hullsData[id] = paddedHull;
  console.log(`\nAquifer ${id} Padded Hull Coords:`);
  console.log(JSON.stringify(paddedHull));
}

fs.writeFileSync('./src/data/hulls.json', JSON.stringify(hullsData, null, 2));
console.log("Updated hulls.json");

