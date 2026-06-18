import proj4 from 'proj4';

// Define projection parameter string for Lambert Conic Conformal (Algeria Nord, EPSG:30791)
const ALGERIA_LAMBERT = "+proj=lcc +lat_1=36.16666666666666 +lat_0=36.16666666666666 +lon_0=3 +k_0=0.999625769 +x_0=500000 +y_0=300000 +a=6378249.2 +rf=293.4660212936269 +towgs84=-158,-205,-200,0,0,0,0 +units=m +no_defs";
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
