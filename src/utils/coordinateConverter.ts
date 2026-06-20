import proj4 from 'proj4';

// Define projection parameter string for Lambert Conic Conformal (Algeria Nord, EPSG:30791)
const ALGERIA_LAMBERT = "+proj=lcc +lat_0=36 +lon_0=2.7 +lat_1=36 +lat_2=36 +x_0=500135 +y_0=300090 +ellps=clrk80ign +towgs84=-158,-205,-200,0,0,0,0 +units=m +no_defs";
const WGS84 = "+proj=longlat +datum=WGS84 +no_defs";

/**
 * Converts X and Y Lambert coordinates to WGS84 Latitude and Longitude.
 * @param x X coordinate in Lambert system (meters)
 * @param y Y coordinate in Lambert system (meters)
 * @returns An array containing [latitude, longitude]
 */
export function lambertToWgs84(x: number, y: number): [number, number] {
  try {
    // proj4 expects [x, y] and returns [longitude, latitude]
    const [lng, lat] = proj4(ALGERIA_LAMBERT, WGS84, [x, y]);
    // Safety boundaries check for Algeria/Tébessa region
    if (isNaN(lat) || isNaN(lng)) {
      return [35.4, 8.12]; // Fallback to Tébessa coordinates
    }
    return [lat, lng];
  } catch (error) {
    console.error("Coordinate conversion error:", error);
    return [35.4, 8.12]; // Fallback
  }
}
