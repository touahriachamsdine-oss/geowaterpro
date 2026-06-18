/**
 * Calculates the well function W(u) using series expansion.
 * W(u) = -0.57721566 - ln(u) + u - u^2/(2*2!) + u^3/(3*3!) - ...
 * @param u dimensionless parameter (r^2 * S) / (4 * T * t)
 */
export function calculateWellFunctionW(u: number): number {
  if (u <= 0) return 0;
  if (u >= 15) return 0; // W(u) is negligible

  const EulerMascheroni = 0.5772156649015328;
  let sum = 0;
  let term = u;
  let n = 1;
  const tolerance = 1e-12;

  while (Math.abs(term / n) > tolerance && n < 100) {
    sum += term / n;
    n++;
    term = -term * u / n;
  }

  return -EulerMascheroni - Math.log(u) + sum;
}

interface TheisParams {
  Q: number;      // Pumping rate (m3/day)
  T: number;      // Transmissivity (m2/day)
  S: number;      // Storativity (dimensionless)
  r: number;      // Radial distance (m)
  t: number;      // Time (days)
}

/**
 * Calculates transient drawdown using the Theis equation.
 */
export function calculateTheisDrawdown(params: TheisParams): number {
  const { Q, T, S, r, t } = params;
  if (t <= 0 || r <= 0 || T <= 0 || S <= 0) return 0;
  
  const u = (r * r * S) / (4 * T * t);
  const W = calculateWellFunctionW(u);
  
  const drawdown = (Q * W) / (4 * Math.PI * T);
  return Math.max(0, drawdown);
}

/**
 * Calculates transient drawdown using Cooper-Jacob approximation.
 * Valid for u < 0.01.
 */
export function calculateCooperJacobDrawdown(params: TheisParams): { drawdown: number; isValid: boolean; u: number } {
  const { Q, T, S, r, t } = params;
  if (t <= 0 || r <= 0 || T <= 0 || S <= 0) return { drawdown: 0, isValid: false, u: 0 };

  const u = (r * r * S) / (4 * T * t);
  const isValid = u < 0.01;

  // s = (Q / (4 * pi * T)) * ln(2.25 * T * t / (r^2 * S))
  const ratio = (2.25 * T * t) / (r * r * S);
  if (ratio <= 0) return { drawdown: 0, isValid: false, u };
  
  const drawdown = (Q / (4 * Math.PI * T)) * Math.log(ratio);
  return { 
    drawdown: Math.max(0, drawdown), 
    isValid,
    u 
  };
}

interface DupuitParams {
  Q: number;      // Pumping rate (m3/day)
  K: number;      // Hydraulic conductivity (m/day)
  H: number;      // Initial hydraulic head / Aquifer thickness (m)
  r: number;      // Radial distance (m)
  R: number;      // Radius of influence (m)
  isConfined: boolean;
}

/**
 * Calculates steady-state drawdown using the Dupuit-Thiem equations.
 */
export function calculateDupuitDrawdown(params: DupuitParams): { drawdown: number; dryWell: boolean } {
  const { Q, K, H, r, R, isConfined } = params;
  if (r <= 0 || K <= 0 || H <= 0 || R <= r) return { drawdown: 0, dryWell: false };

  if (isConfined) {
    // Confined Aquifer: s = (Q / (2 * pi * T)) * ln(R / r)
    const T = K * H; // Transmissivity
    const drawdown = (Q / (2 * Math.PI * T)) * Math.log(R / r);
    const cappedDrawdown = Math.min(H, drawdown);
    return {
      drawdown: Math.max(0, cappedDrawdown),
      dryWell: drawdown >= H
    };
  } else {
    // Unconfined Aquifer (Dupuit equation): h^2 = H^2 - (Q / (pi * K)) * ln(R / r)
    const term = (Q / (Math.PI * K)) * Math.log(R / r);
    const h2 = H * H - term;
    
    if (h2 <= 0) {
      return { drawdown: H, dryWell: true }; // Well goes fully dry at this distance
    }
    
    const h = Math.sqrt(h2);
    const drawdown = H - h;
    return {
      drawdown: Math.max(0, drawdown),
      dryWell: false
    };
  }
}
