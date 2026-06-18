export interface FlowVector {
  wellId: number;
  u: number; // Flow component along X (East-West) in m/m
  v: number; // Flow component along Y (North-South) in m/m
  magnitude: number; // Hydraulic gradient magnitude
  bearing: number; // Compass bearing in degrees (0 = North, 90 = East, etc.)
  head: number; // Hydraulic head (Z - WL)
}

/**
 * Calculates hydraulic head for each well: h = Z - WL (latest water level)
 */
export function getHydraulicHeads(wells: any[]): Map<number, number> {
  const heads = new Map<number, number>();
  wells.forEach(w => {
    const latestWL = w.history && w.history.length > 0
      ? w.history[w.history.length - 1].wl
      : 0;
    heads.set(w.id, w.z - latestWL);
  });
  return heads;
}

/**
 * Calculates flow vector for each well based on local hydraulic head gradient.
 * Uses a Weighted Least Squares (WLS) fit of a local plane to find dh/dx and dh/dy.
 */
export function calculateFlowVectors(wells: any[]): FlowVector[] {
  const heads = getHydraulicHeads(wells);
  
  return wells.map(well => {
    const xi = well.x;
    const yi = well.y;
    const hi = heads.get(well.id) || 0;
    
    // Find neighbors: same aquifer if specified, otherwise other wells.
    // Exclude the current well itself.
    let neighbors = wells.filter(w => w.id !== well.id);
    if (well.aquiferId !== undefined && well.aquiferId !== null) {
      const sameAquifer = neighbors.filter(w => w.aquiferId === well.aquiferId);
      if (sameAquifer.length > 0) {
        neighbors = sameAquifer;
      }
    }
    
    let u = 0; // East-West flow velocity component (-dh/dx)
    let v = 0; // North-South flow velocity component (-dh/dy)
    let magnitude = 0;
    let bearing = 0;
    
    if (neighbors.length >= 2) {
      // Fit local plane h(x, y) = A(x - xi) + B(y - yi) + hi using WLS
      // Weight is inverse distance squared: w = 1 / d^2
      let m00 = 0;
      let m01 = 0;
      let m11 = 0;
      let v0 = 0;
      let v1 = 0;
      
      neighbors.forEach(n => {
        const dx = n.x - xi;
        const dy = n.y - yi;
        const hn = heads.get(n.id) || 0;
        const dh = hn - hi;
        
        const distSq = dx * dx + dy * dy;
        if (distSq > 0) {
          const w = 1 / distSq;
          m00 += w * dx * dx;
          m01 += w * dx * dy;
          m11 += w * dy * dy;
          v0 += w * dh * dx;
          v1 += w * dh * dy;
        }
      });
      
      const det = m00 * m11 - m01 * m01;
      
      if (Math.abs(det) > 1e-12) {
        // Solve using Cramer's rule
        const A = (v0 * m11 - v1 * m01) / det; // dh/dx
        const B = (m00 * v1 - m01 * v0) / det; // dh/dy
        
        // Flow points in direction of negative gradient
        u = -A;
        v = -B;
        magnitude = Math.sqrt(u * u + v * v);
      } else {
        // Collinear neighbors fallback - use nearest neighbor simple slope
        fallbackSingleNeighbor();
      }
    } else if (neighbors.length === 1) {
      fallbackSingleNeighbor();
    }
    
    function fallbackSingleNeighbor() {
      if (neighbors.length > 0) {
        // Fallback to nearest neighbor
        let nearest = neighbors[0];
        let minDistSq = Infinity;
        neighbors.forEach(n => {
          const dx = n.x - xi;
          const dy = n.y - yi;
          const distSq = dx * dx + dy * dy;
          if (distSq > 0 && distSq < minDistSq) {
            minDistSq = distSq;
            nearest = n;
          }
        });
        
        const dx = nearest.x - xi;
        const dy = nearest.y - yi;
        const dist = Math.sqrt(minDistSq);
        if (dist > 0) {
          const hn = heads.get(nearest.id) || 0;
          const dh = hn - hi;
          // Simple slope dh/ds
          const slope = dh / dist;
          // Flow vector is in the direction of negative slope
          u = -slope * (dx / dist);
          v = -slope * (dy / dist);
          magnitude = Math.abs(slope);
        }
      }
    }
    
    if (magnitude > 0) {
      // Compute bearing in degrees clockwise from North:
      // Math.atan2(dx, dy) where dx is East (u), dy is North (v)
      // Bearing ranges from -PI to PI, map to 0 to 360 degrees
      let rad = Math.atan2(u, v);
      bearing = (rad * 180 / Math.PI + 360) % 360;
    }
    
    return {
      wellId: well.id,
      u,
      v,
      magnitude,
      bearing,
      head: hi
    };
  });
}
