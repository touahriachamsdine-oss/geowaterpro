import { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Droplet, 
  MapPin, 
  Activity, 
  Cpu, 
  Settings, 
  Search, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Globe,
  Database,
  ArrowRight,
  HelpCircle,
  Maximize2,
  Compass,
  Lock,
  User,
  LogIn,
  LogOut,
  ShieldAlert,
  Upload
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, Polyline, Circle, Tooltip as LeafletTooltip } from 'react-leaflet';
import L from 'leaflet';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';

// Import local utilities and datasets
import { lambertToWgs84 } from './utils/coordinateConverter';
import { 
  calculateTheisDrawdown, 
  calculateCooperJacobDrawdown, 
  calculateDupuitDrawdown 
} from './utils/analyticalModels';
import { trainAndForecast, getAquiferForecast, SCENARIOS } from './utils/forecasting';
import { calculateFlowVectors } from './utils/groundwaterFlow';
import { translations } from './data/translations';
import UploadAnalyze from './components/UploadAnalyze';
import type { LanguageCode } from './data/translations';

import standardDataRaw from './data/standardData.json';
import advancedDataRaw from './data/advancedData.json';
import hullsDataRaw from './data/hulls.json';

const hullsData = hullsDataRaw as unknown as Record<string, [number, number][]>;

// Fix Leaflet marker icon asset loading issues using CDNs
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// App Interfaces
interface HistoryPoint {
  month: string;
  q: number;
  r?: number;
  wl: number;
}

interface Well {
  id: number;
  name: string;
  location: string;
  x: number;
  y: number;
  z: number;
  aquiferId?: number;
  history: HistoryPoint[];
}

interface Aquifer {
  id: number;
  name: string;
  location: string;
  captiveType: string;
  type: string;
  b: number;
  K: number;
  S: number;
}

// Map Component to Recenter View Dynamically
function MapRecenter({ center, zoom = 10 }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function App() {
  // Global State
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [userRole, setUserRole] = useState<'simple' | 'advanced'>('simple');
  const [selectedDataset, setSelectedDataset] = useState<'standard' | 'advanced'>('standard');
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'simulator' | 'ai' | 'upload' | 'settings'>('overview');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [selectedWellId, setSelectedWellId] = useState<number>(1);
  const [selectedAquiferId, setSelectedAquiferId] = useState<number>(1);
  const [wellSearch, setWellSearch] = useState('');
  const [aquiferFilter, _setAquiferFilter] = useState<number | 'all'>('all');
  const [showFlowDirections, setShowFlowDirections] = useState(true);
  const [showFlowChannels, setShowFlowChannels] = useState(true);
  const [showPotentiometric, setShowPotentiometric] = useState(false);
  const [showDrawdownCones, setShowDrawdownCones] = useState(false);
  const [showRechargeSinks, setShowRechargeSinks] = useState(false);
  const [showWellLabels, setShowWellLabels] = useState(true);
  const [showWells, setShowWells] = useState(true);
  const [showAquifers, setShowAquifers] = useState(true);

  // AI Forecasting State
  const [activeScenarioId, setActiveScenarioId] = useState<string>('normal');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [activeForecastMetric, setActiveForecastMetric] = useState<'wl' | 'drawdown' | 'head'>('wl');

  // Enforce dataset restriction for simple role
  useEffect(() => {
    if (userRole === 'simple' && selectedDataset === 'advanced') {
      setSelectedDataset('standard');
      setSelectedWellId(1);
    }
  }, [userRole, selectedDataset]);

  // Load and type check data
  const standardWells = standardDataRaw as Well[];
  const advancedAquifers = advancedDataRaw.aquifers as Aquifer[];
  const advancedWells = advancedDataRaw.wells as Well[];

  // Active dataset variables
  const wells = selectedDataset === 'standard' ? standardWells : advancedWells;
  const aquifers = selectedDataset === 'standard' ? [] : advancedAquifers;

  // Selected Well Object
  const selectedWell = useMemo(() => {
    return wells.find(w => w.id === selectedWellId) || wells[0];
  }, [wells, selectedWellId]);

  // Selected Aquifer Object (For advanced dataset)
  const selectedAquifer = useMemo(() => {
    if (selectedDataset === 'standard') return null;
    return aquifers.find(a => a.id === selectedAquiferId) || aquifers[0] || null;
  }, [selectedDataset, selectedAquiferId, aquifers]);

  // Synchronize selectedAquiferId with selectedWell.aquiferId when selected well changes in advanced mode
  useEffect(() => {
    if (selectedDataset === 'advanced' && selectedWell && selectedWell.aquiferId) {
      if (selectedWell.aquiferId !== selectedAquiferId) {
        setSelectedAquiferId(selectedWell.aquiferId);
      }
    }
  }, [selectedWellId, selectedWell, selectedDataset, selectedAquiferId]);

  // Search/Filter Wells List
  const filteredWells = useMemo(() => {
    return wells.filter(well => {
      const matchSearch = well.name.toLowerCase().includes(wellSearch.toLowerCase()) ||
                          well.location.toLowerCase().includes(wellSearch.toLowerCase());
      const matchAquifer = aquiferFilter === 'all' || well.aquiferId === aquiferFilter;
      return matchSearch && matchAquifer;
    });
  }, [wells, wellSearch, aquiferFilter]);

  // Map settings and reprojection with classifications
  const wellsWithCoordinates = useMemo(() => {
    const vectors = calculateFlowVectors(wells);
    const vectorMap = new Map(vectors.map(v => [v.wellId, v]));

    const projected = wells.map(w => {
      const [lat, lng] = lambertToWgs84(w.x, w.y);
      
      // Calculate latest drawdown status
      const history = w.history;
      const initialWL = history[0]?.wl || 0;
      const latestWL = history[history.length - 1]?.wl || 0;
      const currentDrawdown = latestWL - initialWL;
      
      let status: 'stable' | 'warning' | 'critical' = 'stable';
      if (selectedDataset === 'standard') {
        const n = history.length;
        if (n > 1) {
          const deltaWLs: number[] = [];
          for (let i = 1; i < n; i++) {
            deltaWLs.push(-(history[i].wl - history[i - 1].wl));
          }
          const avgDeltaWL = deltaWLs.reduce((sum, v) => sum + v, 0) / deltaWLs.length;
          const avgDeltaWLSq = deltaWLs.reduce((sum, v) => sum + Math.pow(v - avgDeltaWL, 2), 0);
          const sigma = deltaWLs.length > 1 ? Math.sqrt(avgDeltaWLSq / (deltaWLs.length - 1)) : 0.1;

          if (avgDeltaWL < -1.5 * sigma) {
            status = 'critical';
          } else if (avgDeltaWL <= -0.5 * sigma) {
            status = 'warning';
          } else {
            status = 'stable';
          }
        }
      } else {
        const aquifer = aquifers.find(a => a.id === w.aquiferId);
        const maxThickness = aquifer ? aquifer.b : 35;
        const depletionRatio = currentDrawdown / maxThickness;

        if (depletionRatio > 0.4 || currentDrawdown > 8.0) {
          status = 'critical';
        } else if (depletionRatio > 0.15 || currentDrawdown > 3.0) {
          status = 'warning';
        } else {
          status = 'stable';
        }
      }

      const flow = vectorMap.get(w.id);

      return { 
        ...w, 
        lat, 
        lng, 
        currentDrawdown, 
        status,
        flowBearing: flow ? flow.bearing : 0,
        flowMagnitude: flow ? flow.magnitude : 0,
        flowHead: flow ? flow.head : 0
      };
    });

    // Classify wells dynamically as source (recharge) or sink (discharge) per aquifer
    const aquiferHeads = new Map<number, number[]>();
    projected.forEach(w => {
      if (w.aquiferId !== undefined && w.aquiferId !== null) {
        if (!aquiferHeads.has(w.aquiferId)) {
          aquiferHeads.set(w.aquiferId, []);
        }
        aquiferHeads.get(w.aquiferId)!.push(w.flowHead);
      }
    });

    return projected.map(w => {
      let isSource = false;
      let isSink = false;

      if (w.aquiferId !== undefined && w.aquiferId !== null) {
        const heads = aquiferHeads.get(w.aquiferId) || [];
        if (heads.length >= 2) {
          const maxHead = Math.max(...heads);
          const minHead = Math.min(...heads);
          if (maxHead > minHead) {
            if (w.flowHead === maxHead) {
              isSource = true;
            } else if (w.flowHead === minHead) {
              isSink = true;
            }
          }
        }
      }

      return {
        ...w,
        isSource,
        isSink
      };
    });
  }, [wells, selectedDataset, aquifers]);

  // Flow channels memo
  const flowChannels = useMemo(() => {
    const channels: { from: [number, number]; to: [number, number]; key: string }[] = [];
    
    wellsWithCoordinates.forEach(w1 => {
      // Find neighbors in the same aquifer
      const sameAquiferWells = wellsWithCoordinates.filter(w2 => 
        w2.id !== w1.id && 
        w2.aquiferId === w1.aquiferId
      );
      
      let bestNeighbor: any = null;
      let minDistance = Infinity;
      
      sameAquiferWells.forEach(w2 => {
        // Condition 1: h_j < h_i
        if (w2.flowHead >= w1.flowHead) return;
        
        // Compute bearing of the connection vector w1 -> w2
        const dx = w2.x - w1.x;
        const dy = w2.y - w1.y;
        const rad = Math.atan2(dx, dy);
        const phi = (rad * 180 / Math.PI + 360) % 360;
        
        // Angular deviation deltaTheta
        const diff = Math.abs(w1.flowBearing - phi);
        const deltaTheta = Math.min(diff, 360 - diff);
        
        // Condition 2: deltaTheta < 60 degrees
        if (deltaTheta < 60) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDistance) {
            minDistance = dist;
            bestNeighbor = w2;
          }
        }
      });
      
      if (bestNeighbor) {
        channels.push({
          from: [w1.lat, w1.lng],
          to: [bestNeighbor.lat, bestNeighbor.lng],
          key: `channel-${w1.id}-${bestNeighbor.id}`
        });
      }
    });
    
    return channels;
  }, [wellsWithCoordinates]);

  // Potentiometric circles memo (interpolated gradient colors)
  const potentiometricCircles = useMemo(() => {
    const heads = wellsWithCoordinates.map(w => w.flowHead);
    const maxHead = Math.max(...heads);
    const minHead = Math.min(...heads);
    const headRange = maxHead - minHead;

    return wellsWithCoordinates.map(w => {
      const normalized = headRange > 0 ? (w.flowHead - minHead) / headRange : 0.5;
      
      // Interpolate colors:
      // High head (normalized -> 1): Cyan (#06b6d4)
      // Average head (normalized -> 0.5): Blue (#3b82f6)
      // Depleted head (normalized -> 0): Red (#ef4444)
      let color = '#3b82f6';
      if (normalized > 0.5) {
        const t = (normalized - 0.5) * 2;
        const r = Math.round(59 + (6 - 59) * t);
        const g = Math.round(130 + (182 - 130) * t);
        const b = Math.round(246 + (212 - 246) * t);
        color = `rgb(${r}, ${g}, ${b})`;
      } else {
        const t = normalized * 2;
        const r = Math.round(239 + (59 - 239) * t);
        const g = Math.round(68 + (130 - 68) * t);
        const b = Math.round(68 + (246 - 68) * t);
        color = `rgb(${r}, ${g}, ${b})`;
      }

      return {
        lat: w.lat,
        lng: w.lng,
        color,
        head: w.flowHead,
        key: `potentiometric-${w.id}`
      };
    });
  }, [wellsWithCoordinates]);

  // Drawdown Cones of Influence
  const drawdownCones = useMemo(() => {
    return wellsWithCoordinates
      .filter(w => w.currentDrawdown > 0)
      .map(w => {
        const radius = w.currentDrawdown * 500;
        return {
          lat: w.lat,
          lng: w.lng,
          radius,
          drawdown: w.currentDrawdown,
          key: `drawdown-cone-${w.id}`
        };
      });
  }, [wellsWithCoordinates]);

  // Map coordinates state
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.4, 8.12]);

  // Update map center when selected well changes
  useEffect(() => {
    const well = wellsWithCoordinates.find(w => w.id === selectedWellId);
    if (well) {
      setMapCenter([well.lat, well.lng]);
    }
  }, [selectedWellId, wellsWithCoordinates]);

  // Aquifer boundary coordinates (Approximated polygons in WGS84 for Map representation)
  const aquiferZones = useMemo(() => [
    {
      id: 1,
      name: "Bassin d’El Malabiod",
      color: "#c084fc",
      coords: (hullsData['1'] || []) as [number, number][]
    },
    {
      id: 2,
      name: "Bassin alluvial de Tébessa",
      color: "#38bdf8",
      coords: (hullsData['2'] || []) as [number, number][]
    },
    {
      id: 3,
      name: "Bassin de Chéria",
      color: "#10b981",
      coords: (hullsData['3'] || []) as [number, number][]
    }
  ], []);

  // Selected language object
  const t = translations[selectedLanguage];
  const isRtl = selectedLanguage === 'ar';

  // Handle User Login
  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (usernameInput === 'advanced' && passwordInput === 'advanced') {
      setUserRole('advanced');
      setSelectedDataset('advanced');
      setLoginModalOpen(false);
      setLoginError('');
      setUsernameInput('');
      setPasswordInput('');
    } else if (usernameInput === 'simple' && passwordInput === 'simple') {
      setUserRole('simple');
      setSelectedDataset('standard');
      setLoginModalOpen(false);
      setLoginError('');
      setUsernameInput('');
      setPasswordInput('');
      if (activeTab === 'simulator' || activeTab === 'ai') {
        setActiveTab('overview');
      }
    } else {
      setLoginError(t.invalidCredentials);
    }
  };

  // Handle Quick Login/Switch Role
  const handleQuickLogin = (role: 'simple' | 'advanced') => {
    setUserRole(role);
    setSelectedDataset(role === 'advanced' ? 'advanced' : 'standard');
    setLoginModalOpen(false);
    setLoginError('');
    setUsernameInput('');
    setPasswordInput('');
    if (role === 'simple' && (activeTab === 'simulator' || activeTab === 'ai')) {
      setActiveTab('overview');
    }
  };

  // Simulator State Parameters (pre-loaded with default values, loaded dynamically from selected well)
  const [simModel, setSimModel] = useState<'theis' | 'cooper' | 'dupuit'>('theis');
  const [simQ, setSimQ] = useState(1500); // m3/day
  const [simT, setSimT] = useState(150);  // m2/day (Transmissivity)
  const [simS, setSimS] = useState(0.005); // Storativity
  const [simK, setSimK] = useState(5.0);   // Hydraulic conductivity (m/day)
  const [simH, setSimH] = useState(40.0);  // Saturated thickness (m)
  const [simDistance, setSimDistance] = useState(150); // m
  const [simTime, setSimTime] = useState(30); // days
  const [simR, setSimR] = useState(800); // Radius of influence (m) for Dupuit
  const [simIsConfined, setSimIsConfined] = useState(true);

  // Sync simulator params with selected well / aquifer
  const loadWellParamsIntoSimulator = () => {
    if (!selectedWell) return;
    const history = selectedWell.history;
    const latestQMonthly = history[history.length - 1]?.q || 0;
    // convert m3/month to m3/day (approx 30 days per month)
    const qDay = Math.round(latestQMonthly / 30);
    setSimQ(qDay > 0 ? qDay : 1500);

    if (selectedDataset === 'advanced' && selectedAquifer) {
      setSimH(selectedAquifer.b);
      setSimK(selectedAquifer.K);
      setSimS(selectedAquifer.S);
      setSimT(selectedAquifer.K * selectedAquifer.b);
      setSimIsConfined(selectedAquifer.captiveType === 'Confined' || selectedAquifer.captiveType === 'Semi-captive');
    } else {
      // Standard values defaults
      setSimH(35);
      setSimK(6.0);
      setSimS(0.01);
      setSimT(6.0 * 35);
      setSimIsConfined(true);
    }
  };

  // Compute simulation charts data on-the-fly
  const spatialDrawdownData = useMemo(() => {
    const dataPoints = [];
    const step = 20;
    for (let r = 1; r <= 1000; r += step) {
      let s = 0;
      if (simModel === 'theis') {
        s = calculateTheisDrawdown({ Q: simQ, T: simT, S: simS, r, t: simTime });
      } else if (simModel === 'cooper') {
        const res = calculateCooperJacobDrawdown({ Q: simQ, T: simT, S: simS, r, t: simTime });
        s = res.drawdown;
      } else {
        const res = calculateDupuitDrawdown({ Q: simQ, K: simK, H: simH, r, R: simR, isConfined: simIsConfined });
        s = res.drawdown;
      }
      dataPoints.push({ distance: r, [t.drawdown]: parseFloat(s.toFixed(2)) });
    }
    return dataPoints;
  }, [simModel, simQ, simT, simS, simK, simH, simTime, simR, simIsConfined, t.drawdown]);

  const transientDrawdownData = useMemo(() => {
    if (simModel === 'dupuit') return []; // Dupuit is steady-state (time independent)

    const dataPoints = [];
    const timeSteps = [0.1, 0.5, 1, 2, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 270, 365];
    for (const time of timeSteps) {
      let s = 0;
      if (simModel === 'theis') {
        s = calculateTheisDrawdown({ Q: simQ, T: simT, S: simS, r: simDistance, t: time });
      } else {
        const res = calculateCooperJacobDrawdown({ Q: simQ, T: simT, S: simS, r: simDistance, t: time });
        s = res.drawdown;
      }
      dataPoints.push({ time, [t.drawdown]: parseFloat(s.toFixed(2)) });
    }
    return dataPoints;
  }, [simModel, simQ, simT, simS, simDistance, t.drawdown]);

  // Compute drawdown at observation point
  const currentObsPointDrawdown = useMemo(() => {
    if (simModel === 'theis') {
      return calculateTheisDrawdown({ Q: simQ, T: simT, S: simS, r: simDistance, t: simTime });
    } else if (simModel === 'cooper') {
      return calculateCooperJacobDrawdown({ Q: simQ, T: simT, S: simS, r: simDistance, t: simTime }).drawdown;
    } else {
      return calculateDupuitDrawdown({ Q: simQ, K: simK, H: simH, r: simDistance, R: simR, isConfined: simIsConfined }).drawdown;
    }
  }, [simModel, simQ, simT, simS, simK, simH, simDistance, simTime, simR, simIsConfined]);

  // Simulator helpers for Cooper Jacob Validity
  const simulatorJacobU = useMemo(() => {
    if (simTime <= 0 || simDistance <= 0 || simT <= 0 || simS <= 0) return 0;
    return (simDistance * simDistance * simS) / (4 * simT * simTime);
  }, [simDistance, simS, simT, simTime]);

  // AI Forecasting Calculations
  const currentForecastScenario = useMemo(() => {
    return SCENARIOS.find(s => s.id === activeScenarioId) || SCENARIOS[1];
  }, [activeScenarioId]);

  const aquiferForecastResult = useMemo(() => {
    if (selectedDataset !== 'advanced' || !selectedAquifer) return null;
    const wellsInAquifer = advancedWells.filter(w => w.aquiferId === selectedAquifer.id);
    if (wellsInAquifer.length === 0) return null;
    return getAquiferForecast(
      wellsInAquifer,
      currentForecastScenario,
      6,
      selectedAquifer.K,
      selectedAquifer.b,
      selectedAquifer.S
    );
  }, [selectedDataset, selectedAquifer, currentForecastScenario, advancedWells]);

  const forecastResult = useMemo(() => {
    if (!selectedWell) return null;
    if (selectedDataset === 'advanced') {
      return trainAndForecast(
        selectedWell.history,
        currentForecastScenario,
        6,
        selectedAquifer?.K,
        selectedAquifer?.b,
        selectedAquifer?.S
      );
    }
    return trainAndForecast(
      selectedWell.history,
      currentForecastScenario,
      6
    );
  }, [selectedWell, currentForecastScenario, selectedAquifer, selectedDataset]);

  const currentForecastResult = useMemo(() => {
    if (selectedDataset === 'advanced') {
      return aquiferForecastResult;
    }
    return forecastResult;
  }, [selectedDataset, aquiferForecastResult, forecastResult]);

  const aiForecastData = useMemo(() => {
    if (selectedDataset === 'advanced') {
      if (!selectedAquifer || !aquiferForecastResult) return [];
      const { forecastPoints, historyFits } = aquiferForecastResult;
      
      const combinedData: any[] = [];
      const wellsInAquifer = advancedWells.filter(w => w.aquiferId === selectedAquifer.id);
      if (wellsInAquifer.length === 0) return [];
      
      const _avgInitialWL = wellsInAquifer.reduce((sum, w) => sum + (w.history[0]?.wl || 0), 0) / wellsInAquifer.length; void _avgInitialWL;
      const avgElevation = wellsInAquifer.reduce((sum, w) => sum + w.z, 0) / wellsInAquifer.length;

      // Add history (first 12 points)
      historyFits.forEach((fit, idx) => {
        const actualWlSum = wellsInAquifer.reduce((sum, w) => sum + (w.history[idx]?.wl || 0), 0);
        const actualWL = actualWlSum / wellsInAquifer.length;

        combinedData.push({
          month: fit.month.substring(5), // "01", "02", etc
          actualWL: parseFloat(actualWL.toFixed(2)),
          historyWL: fit.wl,
          forecastWL: null,
          historyAnalyticalWL: fit.wlAnalytical,
          forecastAnalyticalWL: null,
          historyAIWL: fit.wlAI,
          forecastAIWL: null,
          historyDrawdown: fit.drawdown,
          forecastDrawdown: null,
          historyHead: parseFloat((avgElevation - actualWL).toFixed(2)),
          forecastHead: null,
          historyQ: fit.q,
          forecastQ: null,
          historyR: fit.r !== undefined ? fit.r : null,
          forecastR: null,
          [t.drawdown]: fit.drawdown,
          isForecast: false
        });
      });

      // Add forecast
      forecastPoints.forEach(pt => {
        combinedData.push({
          month: pt.month + " (IA)",
          actualWL: null,
          historyWL: null,
          forecastWL: pt.wl,
          historyAnalyticalWL: null,
          forecastAnalyticalWL: pt.wlAnalytical,
          historyAIWL: null,
          forecastAIWL: pt.wlAI,
          historyDrawdown: null,
          forecastDrawdown: pt.drawdown,
          historyHead: null,
          forecastHead: parseFloat((avgElevation - pt.wl).toFixed(2)),
          historyQ: null,
          forecastQ: pt.q,
          historyR: null,
          forecastR: pt.r !== undefined ? pt.r : null,
          [t.drawdown]: pt.drawdown,
          isForecast: true
        });
      });

      return combinedData;
    } else {
      if (!selectedWell || !forecastResult) return [];
      
      const { forecastPoints, historyFits } = forecastResult;
      const combinedData: any[] = [];
      const initialWL = selectedWell.history[0]?.wl || 0;
      
      selectedWell.history.forEach((pt, idx) => {
        const fit = historyFits[idx];
        combinedData.push({
          month: pt.month.substring(5), // "01", "02", etc
          actualWL: pt.wl,
          historyWL: fit ? fit.wl : null,
          forecastWL: null,
          historyAnalyticalWL: fit ? fit.wlAnalytical : null,
          forecastAnalyticalWL: null,
          historyAIWL: fit ? fit.wlAI : null,
          forecastAIWL: null,
          historyDrawdown: parseFloat((pt.wl - initialWL).toFixed(2)),
          forecastDrawdown: null,
          historyHead: parseFloat((selectedWell.z - pt.wl).toFixed(2)),
          forecastHead: null,
          historyQ: pt.q,
          forecastQ: null,
          historyR: pt.r !== undefined ? pt.r : null,
          forecastR: null,
          [t.drawdown]: parseFloat((pt.wl - initialWL).toFixed(2)),
          isForecast: false
        });
      });

      forecastPoints.forEach(pt => {
        combinedData.push({
          month: pt.month + " (IA)",
          actualWL: null,
          historyWL: null,
          forecastWL: pt.wl,
          historyAnalyticalWL: null,
          forecastAnalyticalWL: pt.wlAnalytical,
          historyAIWL: null,
          forecastAIWL: pt.wlAI,
          historyDrawdown: null,
          forecastDrawdown: pt.drawdown,
          historyHead: null,
          forecastHead: parseFloat((selectedWell.z - pt.wl).toFixed(2)),
          historyQ: null,
          forecastQ: pt.q,
          historyR: null,
          forecastR: pt.r !== undefined ? pt.r : null,
          [t.drawdown]: pt.drawdown,
          isForecast: true
        });
      });

      return combinedData;
    }
  }, [selectedDataset, selectedWell, selectedAquifer, forecastResult, aquiferForecastResult, t.drawdown, advancedWells]);

  const historyKey = activeForecastMetric === 'wl' 
    ? 'historyWL' 
    : activeForecastMetric === 'drawdown' 
      ? 'historyDrawdown' 
      : 'historyHead';

  const forecastKey = activeForecastMetric === 'wl' 
    ? 'forecastWL' 
    : activeForecastMetric === 'drawdown' 
      ? 'forecastDrawdown' 
      : 'forecastHead';

  const metricLabel = activeForecastMetric === 'wl' 
    ? t.waterLevel 
    : activeForecastMetric === 'drawdown' 
      ? t.drawdown 
      : t.saturatedHead;

  const predictedLabel = activeForecastMetric === 'wl' 
    ? t.predictedWL 
    : activeForecastMetric === 'drawdown' 
      ? t.predictedDrawdown 
      : t.predictedSaturatedHead;

  // AI Sustainability metrics
  const sustainabilityScore = useMemo(() => {
    if (selectedDataset === 'standard') {
      const history = selectedWell?.history || [];
      const n = history.length;
      if (n <= 1) return { percent: 100, rating: 'A', text: t.stable, color: 'good' };
      
      const deltaWLs: number[] = [];
      for (let i = 1; i < n; i++) {
        deltaWLs.push(-(history[i].wl - history[i - 1].wl));
      }
      const avgDeltaWL = deltaWLs.reduce((sum, v) => sum + v, 0) / deltaWLs.length;
      const avgDeltaWLSq = deltaWLs.reduce((sum, v) => sum + Math.pow(v - avgDeltaWL, 2), 0);
      const sigma = deltaWLs.length > 1 ? Math.sqrt(avgDeltaWLSq / (deltaWLs.length - 1)) : 0.1;
      
      if (avgDeltaWL < -1.5 * sigma) {
        return { percent: 25, rating: 'F', text: t.critical, color: 'poor' };
      } else if (avgDeltaWL <= -0.5 * sigma) {
        return { percent: 60, rating: 'C', text: t.warning, color: 'fair' };
      } else {
        return { percent: 95, rating: 'A', text: t.stable, color: 'good' };
      }
    } else {
      if (aiForecastData.length === 0 || !selectedAquifer) return { percent: 100, rating: 'A', text: t.stable, color: 'good' };
      
      const finalPt = aiForecastData[aiForecastData.length - 1];
      const finalDrawdown = finalPt[t.drawdown] as number;

      const maxThickness = selectedAquifer.b;
      const depletionRatio = finalDrawdown / maxThickness;

      if (depletionRatio > 0.4 || finalDrawdown > 8.0) {
        return { 
          percent: Math.max(10, Math.round(100 - (depletionRatio * 150))), 
          rating: 'F', 
          text: t.critical, 
          color: 'poor' 
        };
      } else if (depletionRatio > 0.15 || finalDrawdown > 3.0) {
        return { 
          percent: Math.round(100 - (depletionRatio * 110)), 
          rating: 'C', 
          text: t.warning, 
          color: 'fair' 
        };
      } else {
        return { 
          percent: Math.min(100, Math.round(100 - (depletionRatio * 50))), 
          rating: 'A', 
          text: t.stable, 
          color: 'good' 
        };
      }
    }
  }, [selectedDataset, selectedWell, aiForecastData, selectedAquifer, t.drawdown, t.waterLevel, t.stable, t.warning, t.critical]);

  const computedSafeYield = useMemo(() => {
    if (selectedDataset === 'standard') {
      if (!selectedWell) return 0;
      const history = selectedWell.history;
      const baselineAvgQ = history.reduce((s, h) => s + h.q, 0) / history.length;
      return Math.round(baselineAvgQ * 0.9);
    } else {
      if (!selectedAquifer) return 0;
      const wellsInAquifer = advancedWells.filter(w => w.aquiferId === selectedAquifer.id);
      if (wellsInAquifer.length === 0) return 0;
      let totalQ = 0;
      let totalR = 0;
      let countPoints = 0;
      wellsInAquifer.forEach(w => {
        w.history.forEach(h => {
          totalQ += h.q;
          totalR += h.r || 0.003;
          countPoints++;
        });
      });
      const avgQ = countPoints > 0 ? totalQ / countPoints : 40000;
      const avgR = countPoints > 0 ? totalR / countPoints : 0.003;
      const factor = avgR / 0.003;
      return Math.round(avgQ * factor);
    }
  }, [selectedWell, selectedAquifer, selectedDataset, advancedWells]);

  const aquifersSummary = useMemo(() => {
    if (selectedDataset !== 'advanced') return [];
    
    return advancedAquifers.map(aq => {
      const wellsInAq = advancedWells.filter(w => w.aquiferId === aq.id);
      const numWells = wellsInAq.length || 1;
      
      const avgCurrentWL = wellsInAq.reduce((sum, w) => {
        const lastPt = w.history[w.history.length - 1];
        return sum + (lastPt ? lastPt.wl : 0);
      }, 0) / numWells;

      const forecast = getAquiferForecast(
        wellsInAq,
        currentForecastScenario,
        6,
        aq.K,
        aq.b,
        aq.S
      );

      const latestForecastWL = forecast.forecastPoints[forecast.forecastPoints.length - 1].wl;
      const latestForecastDrawdown = forecast.forecastPoints[forecast.forecastPoints.length - 1].drawdown;

      const depletionRatio = latestForecastDrawdown / aq.b;

      let status: 'stable' | 'warning' | 'critical' = 'stable';
      if (depletionRatio > 0.4 || latestForecastDrawdown > 8.0) {
        status = 'critical';
      } else if (depletionRatio > 0.15 || latestForecastDrawdown > 3.0) {
        status = 'warning';
      }

      const avgQ = wellsInAq.reduce((sum, w) => {
        const lastPt = w.history[w.history.length - 1];
        return sum + (lastPt ? lastPt.q : 0);
      }, 0) / numWells;

      const avgR = wellsInAq.reduce((sum, w) => {
        const lastPt = w.history[w.history.length - 1];
        return sum + (lastPt ? (lastPt.r || 0) : 0);
      }, 0) / numWells;

      return {
        id: aq.id,
        name: aq.name,
        location: aq.location,
        type: aq.captiveType,
        wellsCount: numWells,
        currentWL: parseFloat(avgCurrentWL.toFixed(2)),
        forecastWL: parseFloat(latestForecastWL.toFixed(2)),
        drawdown: parseFloat(latestForecastDrawdown.toFixed(2)),
        q: Math.round(avgQ),
        r: parseFloat(avgR.toFixed(4)),
        status
      };
    });
  }, [selectedDataset, advancedAquifers, advancedWells, currentForecastScenario]);

  // aquiferAverageHistory — reserved for future chart; computed lazily via selectedAquiferWellsHistory below

  // allAquifersHistoryData — reserved for future cross-aquifer comparison chart

  const selectedAquiferWellsHistory = useMemo(() => {
    if (selectedDataset !== 'advanced' || !selectedAquifer) return [];
    const wellsInAq = advancedWells.filter(w => w.aquiferId === selectedAquifer.id);
    if (wellsInAq.length === 0) return [];
    const historyLen = 12;
    return Array.from({ length: historyLen }, (_, idx) => {
      const month = wellsInAq[0]?.history[idx]?.month || '';
      const row: any = { month: month.substring(5) };
      wellsInAq.forEach(w => {
        row[w.name] = w.history[idx]?.wl || 0;
      });
      return row;
    });
  }, [selectedDataset, selectedAquifer, advancedWells]);

  const aquiferNetChangeData = useMemo(() => {
    if (selectedDataset !== 'advanced') return [];
    return aquifersSummary.map(aq => ({
      name: aq.name,
      netChange: parseFloat((aq.forecastWL - aq.currentWL).toFixed(2)),
      color: aq.id === 1 ? '#c084fc' : aq.id === 2 ? '#38bdf8' : '#10b981'
    }));
  }, [selectedDataset, aquifersSummary]);

  const wellNetChangeData = useMemo(() => {
    if (selectedDataset !== 'advanced' || !selectedAquifer) return [];
    const wellsInAq = advancedWells.filter(w => w.aquiferId === selectedAquifer.id);
    return wellsInAq.map(well => {
      const aq = advancedAquifers.find(a => a.id === well.aquiferId);
      const res = trainAndForecast(
        well.history,
        currentForecastScenario,
        6,
        aq?.K,
        aq?.b,
        aq?.S
      );
      const currentWL = well.history[well.history.length - 1]?.wl || 0;
      const forecastWL = res.forecastPoints[res.forecastPoints.length - 1]?.wl || 0;
      return {
        name: well.name,
        netChange: parseFloat((forecastWL - currentWL).toFixed(2))
      };
    });
  }, [selectedDataset, selectedAquifer, advancedWells, currentForecastScenario, advancedAquifers]);

  // Overall Statistics for Dashboard
  const dashboardStats = useMemo(() => {
    const totalPumped = wells.reduce((sum, w) => {
      const latestQ = w.history[w.history.length - 1]?.q || 0;
      return sum + latestQ;
    }, 0);

    const averageDepth = wells.reduce((sum, w) => {
      const latestWL = w.history[w.history.length - 1]?.wl || 0;
      return sum + latestWL;
    }, 0) / wells.length;

    const maxDrawdown = wells.reduce((max, w) => {
      const initWL = w.history[0]?.wl || 0;
      const latestWL = w.history[w.history.length - 1]?.wl || 0;
      const drawdown = latestWL - initWL;
      return drawdown > max ? drawdown : max;
    }, 0);

    return {
      totalPumped: Math.round(totalPumped),
      averageDepth: parseFloat(averageDepth.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      activeWellsCount: wells.length
    };
  }, [wells]);

  // Correlation cross-plot data (Q vs WL)
  const correlationData = useMemo(() => {
    if (!selectedWell) return [];
    return selectedWell.history.map(pt => ({
      q: pt.q,
      wl: pt.wl,
      month: pt.month.substring(5)
    }));
  }, [selectedWell]);

  // Sustainability text color converter helper
  const getSustainabilityColorClass = (color: string) => {
    if (color === 'good') return 'green';
    if (color === 'fair') return 'yellow';
    return 'red';
  };

  // Export to PDF report helper
  const exportToPDF = async () => {
    const reportElement = document.getElementById('ai-report-content');
    if (!reportElement) return;

    setIsExportingPdf(true);
    // Give short delay for state updates to apply before capturing
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(reportElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#020617', // Match the base slate background color
          logging: false
        });

        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'l' : 'p',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`GeoWaterIcs_AI_Forecast_${selectedWell?.name || 'Well'}.pdf`);
      } catch (err) {
        console.error('Error generating PDF:', err);
      } finally {
        setIsExportingPdf(false);
      }
    }, 300);
  };

  return (
    <div className={`app-container ${isRtl ? 'rtl-layout' : ''}`}>
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">
            <Droplet size={24} color="#020617" strokeWidth={3} />
          </div>
          <div className="logo-text">
            <h1>{t.title}</h1>
            <p>Tébessa HydroAI v2.0</p>
          </div>
        </div>

        <nav>
          <ul className="nav-links">
            <li>
              <div 
                className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <Activity size={18} />
                <span>{t.tabDashboard}</span>
              </div>
            </li>
            <li>
              <div 
                className={`nav-item ${activeTab === 'map' ? 'active' : ''}`}
                onClick={() => setActiveTab('map')}
              >
                <MapPin size={18} />
                <span>{t.tabMap}</span>
              </div>
            </li>
            <li>
              <div 
                className={`nav-item ${activeTab === 'simulator' ? 'active' : ''}`}
                onClick={() => {
                  if (userRole === 'simple') {
                    setLoginModalOpen(true);
                  } else {
                    setActiveTab('simulator');
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Compass size={18} />
                  <span>{t.tabSimulator}</span>
                </div>
                {userRole === 'simple' && <Lock size={12} style={{ color: '#fb923c', marginLeft: isRtl ? '0' : '8px', marginRight: isRtl ? '8px' : '0' }} />}
              </div>
            </li>
            <li>
              <div 
                className={`nav-item ${activeTab === 'ai' ? 'active' : ''}`}
                onClick={() => {
                  if (userRole === 'simple') {
                    setLoginModalOpen(true);
                  } else {
                    setActiveTab('ai');
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Cpu size={18} />
                  <span>{t.tabAI}</span>
                </div>
                {userRole === 'simple' && <Lock size={12} style={{ color: '#fb923c', marginLeft: isRtl ? '0' : '8px', marginRight: isRtl ? '8px' : '0' }} />}
              </div>
            </li>
            <li>
              <div 
                className={`nav-item ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => setActiveTab('upload')}
              >
                <Upload size={18} />
                <span>Upload & Analyze</span>
              </div>
            </li>
            <li>
              <div 
                className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <Settings size={18} />
                <span>{t.tabSettings}</span>
              </div>
            </li>
          </ul>
        </nav>

        {/* User Profile / Access Control Panel */}
        <div style={{ 
          padding: '12px', 
          margin: '16px 0 0 0', 
          background: 'rgba(255, 255, 255, 0.02)', 
          border: '1px solid var(--panel-border)', 
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} color="var(--primary)" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{t.userRoleLabel}</span>
              <strong style={{ fontSize: '11px', color: '#fff' }}>
                {userRole === 'advanced' ? t.userRoleAdvanced : t.userRoleSimple}
              </strong>
            </div>
            {userRole === 'simple' ? (
              <span style={{ 
                fontSize: '9px', 
                background: 'rgba(245, 158, 11, 0.15)', 
                color: 'var(--warning)', 
                padding: '2px 6px', 
                borderRadius: '4px',
                marginLeft: isRtl ? '0' : 'auto',
                marginRight: isRtl ? 'auto' : '0',
                fontWeight: 'bold'
              }}>
                {t.standardDataset}
              </span>
            ) : (
              <span style={{ 
                fontSize: '9px', 
                background: 'rgba(34, 197, 94, 0.15)', 
                color: '#22c55e', 
                padding: '2px 6px', 
                borderRadius: '4px',
                marginLeft: isRtl ? '0' : 'auto',
                marginRight: isRtl ? 'auto' : '0',
                fontWeight: 'bold'
              }}>
                {t.advancedDataset}
              </span>
            )}
          </div>

          {userRole === 'simple' ? (
            <button 
              onClick={() => setLoginModalOpen(true)}
              className="btn-primary"
              style={{ 
                width: '100%', 
                padding: '6px', 
                fontSize: '11px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <LogIn size={12} />
              <span>{t.loginButton}</span>
            </button>
          ) : (
            <button 
              onClick={() => handleQuickLogin('simple')}
              className="btn-secondary"
              style={{ 
                width: '100%', 
                padding: '6px', 
                fontSize: '11px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '6px',
                color: '#ef4444',
                borderColor: 'rgba(239, 68, 68, 0.2)',
                cursor: 'pointer'
              }}
            >
              <LogOut size={12} />
              <span>{t.logout}</span>
            </button>
          )}
        </div>

        {/* Global Controls at bottom of Sidebar */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <Globe size={14} />
            <span>{t.language}:</span>
            <div style={{ display: 'flex', gap: '4px', marginLeft: isRtl ? '0' : 'auto', marginRight: isRtl ? 'auto' : '0' }}>
              <button 
                onClick={() => setSelectedLanguage('en')}
                style={{
                  background: selectedLanguage === 'en' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                  border: 'none', color: selectedLanguage === 'en' ? '#000' : '#fff',
                  padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer'
                }}
              >EN</button>
              <button 
                onClick={() => setSelectedLanguage('ar')}
                style={{
                  background: selectedLanguage === 'ar' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                  border: 'none', color: selectedLanguage === 'ar' ? '#000' : '#fff',
                  padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer'
                }}
              >العربية</button>
              <button 
                onClick={() => setSelectedLanguage('fr')}
                style={{
                  background: selectedLanguage === 'fr' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                  border: 'none', color: selectedLanguage === 'fr' ? '#000' : '#fff',
                  padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer'
                }}
              >FR</button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <Database size={14} />
            <span>{t.dataset}:</span>
            <select 
              value={selectedDataset} 
              onChange={(e) => {
                const ds = e.target.value as 'standard' | 'advanced';
                if (ds === 'advanced' && userRole === 'simple') {
                  setLoginModalOpen(true);
                } else {
                  setSelectedDataset(ds);
                  setSelectedWellId(1); // Reset select well
                }
              }}
              style={{
                background: 'rgba(15,23,42,0.6)', border: '1px solid var(--panel-border)',
                color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', outline: 'none',
                marginLeft: isRtl ? '0' : 'auto', marginRight: isRtl ? 'auto' : '0'
              }}
            >
              <option value="standard">{t.standardDataset}</option>
              <option value="advanced">{userRole === 'simple' ? `${t.advancedDataset} (${t.locked})` : t.advancedDataset}</option>
            </select>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="main-content">
        
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="header-row">
              <div className="page-title">
                <h2>{t.tabDashboard}</h2>
                <p>{selectedDataset === 'standard' ? t.standardDataset : t.advancedDataset}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge stable" style={{ textTransform: 'capitalize' }}>
                  {t.metric}
                </span>
              </div>
            </div>

            {/* Dashboard General Stats Cards */}
            {selectedDataset === 'standard' ? (
              <div className="metrics-grid">
                <div className="glass-panel metric-card">
                  <div className="metric-icon-box purple">
                    <Droplet size={24} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">{t.pumpingRate} (Latest)</span>
                    <span className="metric-value">{dashboardStats.totalPumped.toLocaleString()} {t.m3month}</span>
                  </div>
                </div>
                <div className="glass-panel metric-card">
                  <div className="metric-icon-box blue">
                    <Activity size={24} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">{t.waterLevel} (Mean)</span>
                    <span className="metric-value">{dashboardStats.averageDepth} {t.m}</span>
                  </div>
                </div>
                <div className="glass-panel metric-card">
                  <div className="metric-icon-box yellow">
                    <TrendingDown size={24} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Max Seasonal {t.drawdown}</span>
                    <span className="metric-value">{dashboardStats.maxDrawdown} {t.m}</span>
                  </div>
                </div>
                <div className="glass-panel metric-card">
                  <div className="metric-icon-box green">
                    <MapPin size={24} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Monitored {t.wells}</span>
                    <span className="metric-value">{dashboardStats.activeWellsCount}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aquifer-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {aquifersSummary.map(aq => {
                  const aquiferColor = aq.id === 1 ? '#c084fc' : aq.id === 2 ? '#38bdf8' : '#10b981';
                  const isSelected = selectedAquiferId === aq.id;
                  return (
                    <div 
                      key={aq.id} 
                      className={`glass-panel aquifer-summary-card ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedAquiferId(aq.id);
                        const firstWell = wells.find(w => w.aquiferId === aq.id);
                        if (firstWell) {
                          setSelectedWellId(firstWell.id);
                        }
                      }}
                      style={{
                        padding: '20px',
                        cursor: 'pointer',
                        border: isSelected ? `2px solid ${aquiferColor}` : '1px solid var(--panel-border)',
                        borderLeft: `6px solid ${aquiferColor}`,
                        background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        borderRadius: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#fff' }}>{aq.name}</h4>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{aq.location}</span>
                        </div>
                        <span className={`status-badge ${aq.status}`} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', textTransform: 'capitalize' }}>
                          {aq.status}
                        </span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>{t.wells}</span>
                          <strong>{aq.wellsCount} Active Wells</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>{t.aquiferType}</span>
                          <strong>{aq.type}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Avg {t.waterLevel}</span>
                          <strong>{aq.currentWL} m</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Avg Pumping</span>
                          <strong>{aq.q.toLocaleString()} m³/mo</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Main Interactive Dashboard Section */}
            <div className="dashboard-layout">
              {/* Sidebar: Wells List / Aquifers List */}
              <div className="glass-panel well-list-panel">
                {selectedDataset === 'standard' ? (
                  <>
                    <div className="search-container">
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '12px' }} />
                        <input 
                          type="text" 
                          placeholder={t.wellName + "..."}
                          value={wellSearch}
                          onChange={(e) => setWellSearch(e.target.value)}
                          className="form-input"
                          style={{ width: '100%', paddingLeft: isRtl ? '12px' : '36px', paddingRight: isRtl ? '36px' : '12px' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                      {filteredWells.map(well => {
                        const isSelected = well.id === selectedWellId;
                        const lastPt = well.history[well.history.length - 1];
                        return (
                          <div 
                            key={well.id} 
                            className={`well-item ${isSelected ? 'active' : ''}`}
                            onClick={() => setSelectedWellId(well.id)}
                          >
                            <div>
                              <div className="well-item-name">{well.name}</div>
                              <div className="well-item-sub">{well.location}</div>
                            </div>
                            <div style={{ textAlign: isRtl ? 'left' : 'right', fontSize: '11px' }}>
                              <div style={{ fontWeight: 'bold' }}>{lastPt?.wl} m</div>
                              <div style={{ color: 'var(--text-muted)' }}>{Math.round(lastPt?.q / 30)} m³/d</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Advanced Mode: Aquifer-centric Sidebar */}
                    <div className="search-container" style={{ marginBottom: '12px' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '12px' }} />
                        <input 
                          type="text" 
                          placeholder={t.wellName + "..."}
                          value={wellSearch}
                          onChange={(e) => setWellSearch(e.target.value)}
                          className="form-input"
                          style={{ width: '100%', paddingLeft: isRtl ? '12px' : '36px', paddingRight: isRtl ? '36px' : '12px' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                      {aquifersSummary.map(aq => {
                        const isAquiferSelected = selectedAquiferId === aq.id;
                        const aquiferColor = aq.id === 1 ? '#c084fc' : aq.id === 2 ? '#38bdf8' : '#10b981';
                        
                        // Filter wells belonging to this aquifer
                        const wellsInAq = wellsWithCoordinates.filter(w => w.aquiferId === aq.id && 
                          (wellSearch === '' || w.name.toLowerCase().includes(wellSearch.toLowerCase()) || w.location.toLowerCase().includes(wellSearch.toLowerCase()))
                        );

                        return (
                          <div key={aq.id} className="aquifer-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {/* Aquifer Header Item */}
                            <div 
                              onClick={() => {
                                setSelectedAquiferId(aq.id);
                                // Automatically select first well of this aquifer
                                const firstWell = wells.find(w => w.aquiferId === aq.id);
                                if (firstWell) {
                                  setSelectedWellId(firstWell.id);
                                }
                              }}
                              className={`aquifer-sidebar-item ${isAquiferSelected ? 'active' : ''}`}
                              style={{
                                cursor: 'pointer',
                                padding: '12px',
                                borderRadius: '8px',
                                borderLeft: `4px solid ${aquiferColor}`,
                                background: isAquiferSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                transition: 'all 0.2s ease',
                                border: isAquiferSelected ? `1px solid ${aquiferColor}` : '1px solid rgba(255, 255, 255, 0.05)',
                                borderLeftWidth: '4px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontWeight: '600', fontSize: '14px', color: isAquiferSelected ? '#fff' : 'var(--text-secondary)' }}>{aq.name}</span>
                                <span className={`status-badge ${aq.status}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                  {aq.status.toUpperCase()}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                                <span>{aq.type}</span>
                                <span>Avg WL: <strong>{aq.currentWL} m</strong></span>
                              </div>
                            </div>

                            {/* Nested Wells */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: isRtl ? '0' : '12px', paddingRight: isRtl ? '12px' : '0' }}>
                              {wellsInAq.map(well => {
                                const isWellSelected = selectedWellId === well.id;
                                return (
                                  <div 
                                    key={well.id} 
                                    className={`well-item nested-well-item ${isWellSelected ? 'active' : ''}`}
                                    onClick={() => {
                                      setSelectedWellId(well.id);
                                      setSelectedAquiferId(aq.id);
                                    }}
                                    style={{
                                      padding: '8px 10px',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      background: isWellSelected ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                                      border: isWellSelected ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid transparent',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontWeight: isWellSelected ? '600' : 'normal', color: isWellSelected ? '#fff' : 'var(--text-secondary)' }}>{well.name}</div>
                                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{well.location}</div>
                                    </div>
                                    <div style={{ fontSize: '11px', textAlign: 'right' }}>
                                      <div>{well.history[well.history.length - 1]?.wl} m</div>
                                    </div>
                                  </div>
                                );
                              })}
                              {wellsInAq.length === 0 && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '8px', fontStyle: 'italic' }}>
                                  No wells found
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div className="charts-container">
                {selectedDataset === 'standard' ? (
                  selectedWell && (
                    <div className="glass-panel">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                        <div>
                          <h3 style={{ fontSize: '22px', fontWeight: '700' }}>{selectedWell.name}</h3>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                            {t.location}: {selectedWell.location} | {t.coordinates}: X: {selectedWell.x}, Y: {selectedWell.y} | Z: {selectedWell.z}m
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                        <div className="chart-card" style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={16} color="var(--primary)" />
                            {t.trend}: {t.waterLevel} (2024)
                          </h4>
                          <div style={{ height: '300px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={selectedWell.history}>
                                <defs>
                                  <linearGradient id="wlColor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="month" stroke="var(--text-secondary)" tickFormatter={(m) => m.substring(5)} />
                                <YAxis domain={['dataMin - 2', 'dataMax + 2']} reversed stroke="var(--text-secondary)" />
                                <Tooltip />
                                <Area type="monotone" dataKey="wl" name={t.waterLevel} stroke="var(--primary)" fillOpacity={1} fill="url(#wlColor)" strokeWidth={2} isAnimationActive={false} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                            * Note: Y-axis is reversed because water table depth measures distance from surface down to water. A lower line means higher water table.
                          </p>
                        </div>

                        <div className="chart-card" style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Droplet size={16} color="var(--secondary)" />
                            {t.pumpingRate} (2024)
                          </h4>
                          <div style={{ height: '300px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={selectedWell.history}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="month" stroke="var(--text-secondary)" tickFormatter={(m) => m.substring(5)} />
                                <YAxis stroke="var(--secondary)" label={{ value: 'm³/month', angle: -90, position: 'insideLeft', fill: 'var(--secondary)' }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="q" name={t.pumpingRate} stroke="var(--secondary)" strokeWidth={2} activeDot={{ r: 8 }} isAnimationActive={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="chart-card" style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <HelpCircle size={16} color="var(--warning)" />
                            {t.correlation}: Q vs. WL
                          </h4>
                          <div style={{ height: '260px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <ScatterChart>
                                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                                <XAxis type="number" dataKey="q" name={t.pumpingRate} label={{ value: 'Pumping Rate (m³/month)', position: 'insideBottom', offset: -5, fill: 'var(--text-secondary)' }} stroke="var(--text-secondary)" />
                                <YAxis type="number" dataKey="wl" name={t.waterLevel} reversed label={{ value: 'Water Level WL (m)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }} stroke="var(--text-secondary)" />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                <Scatter name="Correlation" data={correlationData} fill="var(--warning)" isAnimationActive={false} />
                              </ScatterChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  selectedAquifer && (
                    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Aquifer Info Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                        <div>
                          <h3 style={{ fontSize: '24px', fontWeight: '700', color: selectedAquiferId === 1 ? '#c084fc' : selectedAquiferId === 2 ? '#38bdf8' : '#10b981' }}>
                            {selectedAquifer.name}
                          </h3>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            {t.location}: {selectedAquifer.location} | Basin Type: <strong>{selectedAquifer.captiveType}</strong>
                          </p>
                        </div>
                        <div style={{ 
                          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', 
                          padding: '12px 16px', borderRadius: '8px', fontSize: '13px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' 
                        }}>
                          <div><span style={{ color: 'var(--text-secondary)' }}>Thickness (b):</span> <strong>{selectedAquifer.b} m</strong></div>
                          <div><span style={{ color: 'var(--text-secondary)' }}>Hyd. Conductivity (K):</span> <strong>{selectedAquifer.K} m/d</strong></div>
                          <div><span style={{ color: 'var(--text-secondary)' }}>Storativity (S):</span> <strong>{selectedAquifer.S}</strong></div>
                          <div><span style={{ color: 'var(--text-secondary)' }}>Active Wells:</span> <strong>{wellsWithCoordinates.filter(w => w.aquiferId === selectedAquifer.id).length}</strong></div>
                        </div>
                      </div>

                      {/* Advanced Charts Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                        {/* 1. Multi-well time series chart grouping history of the selected aquifer's wells */}
                        <div className="chart-card" style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={16} color={selectedAquiferId === 1 ? '#c084fc' : selectedAquiferId === 2 ? '#38bdf8' : '#10b981'} />
                            {selectedAquifer.name} - Individual Wells Water Level (2024)
                          </h4>
                          <div style={{ height: '320px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={selectedAquiferWellsHistory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="month" stroke="var(--text-secondary)" />
                                <YAxis domain={['dataMin - 5', 'dataMax + 5']} reversed stroke="var(--text-secondary)" />
                                <Tooltip />
                                <Legend />
                                {Object.keys(selectedAquiferWellsHistory[0] || {})
                                  .filter(k => k !== 'month')
                                  .map((wellName, idx) => {
                                    const aqColor = selectedAquiferId === 1 ? '#c084fc' : selectedAquiferId === 2 ? '#38bdf8' : '#10b981';
                                    // Generate different opacity/shades based on index
                                    const opacities = [1, 0.7, 0.4, 0.8, 0.5];
                                    const opacity = opacities[idx % opacities.length];
                                    const isWellActive = selectedWell?.name === wellName;
                                    return (
                                      <Line 
                                        key={wellName} 
                                        type="monotone" 
                                        dataKey={wellName} 
                                        stroke={aqColor} 
                                        strokeOpacity={opacity}
                                        strokeWidth={isWellActive ? 3 : 1.5}
                                        isAnimationActive={false} 
                                      />
                                    );
                                  })
                                }
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                            * Note: Thick line represents the active selection. Colors are matched to the active aquifer's signature theme.
                          </p>
                        </div>

                        {/* 2. Aquifer Net Change Comparison Bar Chart */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                          <div className="chart-card" style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <TrendingDown size={16} color="var(--warning)" />
                              Regional Aquifers: Net Forecast Drawdown (6-Month change, Δh)
                            </h4>
                            <div style={{ height: '260px', width: '100%' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={aquiferNetChangeData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                  <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 10 }} />
                                  <YAxis stroke="var(--text-secondary)" label={{ value: 'Net Change (m)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }} />
                                  <Tooltip formatter={(value) => [`${value} m`, 'Net Change']} />
                                  <Bar dataKey="netChange" isAnimationActive={false}>
                                    {aquiferNetChangeData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* 3. Child Wells Net Change Comparison Bar Chart */}
                          <div className="chart-card" style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <TrendingDown size={16} color="var(--warning)" />
                              {selectedAquifer.name}: Child Wells Net Drawdown (6-Month change)
                            </h4>
                            <div style={{ height: '260px', width: '100%' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={wellNetChangeData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                  <XAxis dataKey="name" stroke="var(--text-secondary)" />
                                  <YAxis stroke="var(--text-secondary)" label={{ value: 'Net Change (m)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }} />
                                  <Tooltip formatter={(value) => [`${value} m`, 'Net Change']} />
                                  <Bar dataKey="netChange" fill={selectedAquiferId === 1 ? '#c084fc' : selectedAquiferId === 2 ? '#38bdf8' : '#10b981'} isAnimationActive={false} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INTERACTIVE MAP */}
        {activeTab === 'map' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="header-row">
              <div className="page-title">
                <h2>{t.tabMap}</h2>
                <p>Regional Aquifer Basins in Tébessa Province, Algeria</p>
              </div>
            </div>

            {/* Interactive Leaflet Map Box */}
            <div className="glass-panel" style={{ padding: '8px' }}>
              <div className="map-view-container">
                <MapContainer 
                  center={mapCenter} 
                  zoom={10} 
                  scrollWheelZoom={true}
                >
                  <MapRecenter center={mapCenter} />
                  
                  {/* CartoDB Dark Matter tile layer for premium visual style */}
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />

                  {/* Draw Aquifer boundaries (polygons) if advanced dataset is active and enabled */}
                  {showAquifers && userRole === 'advanced' && selectedDataset === 'advanced' && aquiferZones.map(zone => (
                    <Polygon 
                      key={zone.id} 
                      positions={zone.coords}
                      pathOptions={{
                        color: zone.color,
                        fillColor: zone.color,
                        fillOpacity: 0.15,
                        weight: 2,
                        dashArray: '4, 6'
                      }}
                    >
                      <Popup>
                        <div style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>
                          {zone.name}
                        </div>
                      </Popup>
                    </Polygon>
                  ))}

                  {/* 1. Potentiometric Surface Layer */}
                  {showPotentiometric && userRole === 'advanced' && potentiometricCircles.map(circle => (
                    <Circle
                      key={circle.key}
                      center={[circle.lat, circle.lng]}
                      radius={4000}
                      pathOptions={{
                        color: circle.color,
                        fillColor: circle.color,
                        fillOpacity: 0.18,
                        stroke: false
                      }}
                      interactive={false}
                    />
                  ))}

                  {/* 2. Drawdown Cones of Influence */}
                  {showDrawdownCones && userRole === 'advanced' && drawdownCones.map(cone => (
                    <Circle
                      key={cone.key}
                      center={[cone.lat, cone.lng]}
                      radius={cone.radius}
                      pathOptions={{
                        color: '#ef4444',
                        fillColor: '#ef4444',
                        fillOpacity: 0.06,
                        weight: 1.5,
                        dashArray: '3, 6'
                      }}
                      interactive={false}
                    />
                  ))}

                  {/* 3. Flow Channels (dashed animated paths) */}
                  {showFlowChannels && userRole === 'advanced' && flowChannels.map(channel => (
                    <Polyline
                      key={channel.key}
                      positions={[channel.from, channel.to]}
                      pathOptions={{
                        color: '#0ea5e9',
                        weight: 2,
                        opacity: 0.6
                      }}
                      className="flow-channel-line"
                      interactive={false}
                    />
                  ))}

                  {/* 4. Pulsing Source/Sink Halos */}
                  {showRechargeSinks && userRole === 'advanced' && wellsWithCoordinates.map(well => {
                    if (!well.isSource && !well.isSink) return null;
                    const color = well.isSource ? '#22c55e' : '#ef4444';
                    const className = well.isSource ? 'recharge-halo' : 'discharge-halo';
                    return (
                      <Circle
                        key={`halo-${well.id}`}
                        center={[well.lat, well.lng]}
                        radius={600}
                        pathOptions={{
                          color,
                          fillColor: color,
                          fillOpacity: 0.22,
                          weight: 1.5
                        }}
                        className={className}
                        interactive={false}
                      />
                    );
                  })}

                  {/* Plot Well Markers */}
                  {showWells && wellsWithCoordinates.map(well => {
                    // Set marker color based on drawdown status
                    let markerColor = 'var(--success)';
                    if (well.status === 'critical') markerColor = 'var(--critical)';
                    else if (well.status === 'warning') markerColor = 'var(--warning)';

                    // Custom SVG colored circle markers for a premium UI look
                    const customMarkerIcon = L.divIcon({
                      html: `<div style="
                        width: 16px; 
                        height: 16px; 
                        background-color: ${markerColor}; 
                        border: 2px solid #ffffff; 
                        border-radius: 50%; 
                        box-shadow: 0 0 12px ${markerColor};
                      "></div>`,
                      className: 'custom-leaflet-marker',
                      iconSize: [16, 16],
                      iconAnchor: [8, 8]
                    });

                    return (
                      <Marker 
                        key={well.id} 
                        position={[well.lat, well.lng]}
                        icon={customMarkerIcon}
                      >
                        {showWellLabels && (
                          <LeafletTooltip
                            permanent
                            direction="right"
                            offset={[10, 0]}
                            className="custom-well-tooltip"
                          >
                            {well.name}
                          </LeafletTooltip>
                        )}
                        <Popup>
                          <div style={{ color: '#fff', width: '220px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '4px' }}>
                              {well.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                              {t.location}: {well.location}
                            </div>
                            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', marginBottom: '8px' }} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                              <div>{t.waterLevel}:</div>
                              <div style={{ fontWeight: 'bold', textAlign: 'right' }}>
                                {well.history[well.history.length - 1]?.wl} m
                              </div>
                              <div>{t.drawdown}:</div>
                              <div style={{ fontWeight: 'bold', textAlign: 'right', color: markerColor }}>
                                {well.currentDrawdown.toFixed(2)} m
                              </div>
                              <div>Pumping Q:</div>
                              <div style={{ fontWeight: 'bold', textAlign: 'right' }}>
                                {Math.round((well.history[well.history.length - 1]?.q || 0) / 30)} m³/d
                              </div>
                            </div>
                            <button 
                              className="btn-primary" 
                              onClick={() => {
                                setSelectedWellId(well.id);
                                setActiveTab('overview');
                              }}
                              style={{ width: '100%', marginTop: '12px', fontSize: '11px', padding: '6px' }}
                            >
                              <span>{t.details}</span>
                              <ArrowRight size={12} />
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}

                  {/* Plot Groundwater Flow Vectors */}
                  {showFlowDirections && userRole === 'advanced' && wellsWithCoordinates.map(well => {
                    if (well.flowMagnitude <= 0) return null;

                    // Compute scaled arrow size: magnitude is typically around 0.001 - 0.05.
                    // Scale it to a size between 20px and 44px.
                    const size = Math.round(20 + Math.min(24, well.flowMagnitude * 400));

                    const flowIcon = L.divIcon({
                      html: `<div style="
                        transform: rotate(${well.flowBearing}deg);
                        width: ${size}px;
                        height: ${size}px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                      ">
                        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="flowGrad-${well.id}" x1="0%" y1="100%" x2="0%" y2="0%">
                              <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.3"/>
                              <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0.95"/>
                            </linearGradient>
                          </defs>
                          <path d="M12 20V4M12 4L6 10M12 4L18 10" stroke="url(#flowGrad-${well.id})" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </div>`,
                      className: 'custom-flow-marker',
                      iconSize: [size, size],
                      iconAnchor: [size / 2, size / 2]
                    });

                    return (
                      <Marker 
                        key={`flow-${well.id}`} 
                        position={[well.lat, well.lng]}
                        icon={flowIcon}
                        interactive={false}
                      />
                    );
                  })}
                </MapContainer>

                {/* Floating Map Sidebar Overlay */}
                <div className="map-sidebar-overlay glass-panel">
                  <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>{t.wells} {t.status}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)' }}></span>
                      <span>{t.stable} (&lt; 2m {t.drawdown})</span>
                      <span style={{ marginLeft: isRtl ? '0' : 'auto', marginRight: isRtl ? 'auto' : '0', color: 'var(--text-secondary)' }}>
                        {wellsWithCoordinates.filter(w => w.status === 'stable').length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--warning)' }}></span>
                      <span>{t.warning} (2m - 5m)</span>
                      <span style={{ marginLeft: isRtl ? '0' : 'auto', marginRight: isRtl ? 'auto' : '0', color: 'var(--text-secondary)' }}>
                        {wellsWithCoordinates.filter(w => w.status === 'warning').length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--critical)' }}></span>
                      <span>{t.critical} (&gt; 5m)</span>
                      <span style={{ marginLeft: isRtl ? '0' : 'auto', marginRight: isRtl ? 'auto' : '0', color: 'var(--text-secondary)' }}>
                        {wellsWithCoordinates.filter(w => w.status === 'critical').length}
                      </span>
                    </div>
                  </div>

                  {/* Show loaded well details card */}
                  {selectedWell && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)' }}>{t.well}: {selectedWell.name}</h4>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Z: {selectedWell.z}m | Depth: {selectedWell.history[selectedWell.history.length-1]?.wl}m
                      </p>
                      <button 
                        className="btn-secondary" 
                        onClick={() => {
                          const well = wellsWithCoordinates.find(w => w.id === selectedWellId);
                          if (well) {
                            setMapCenter([well.lat, well.lng]);
                          }
                        }}
                        style={{ width: '100%', marginTop: '10px', padding: '6px', fontSize: '11px' }}
                      >
                        <Maximize2 size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Recenter on map
                      </button>
                    </div>
                  )}

                  {/* Groundwater Flow Overlay Control & Legend */}
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--secondary)' }}>
                      {t.layerControlTitle}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                        <input 
                          type="checkbox" 
                          checked={showWells} 
                          onChange={(e) => setShowWells(e.target.checked)} 
                          style={{ width: '15px', height: '15px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                        <span>{t.showWells}</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                        <input 
                          type="checkbox" 
                          checked={showWellLabels} 
                          onChange={(e) => setShowWellLabels(e.target.checked)} 
                          style={{ width: '15px', height: '15px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                        <span>{t.showWellLabels}</span>
                      </label>


                      {selectedDataset === 'advanced' && (
                        <label 
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}
                          onClick={(e) => {
                            if (userRole === 'simple') {
                              e.preventDefault();
                              setLoginModalOpen(true);
                            }
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={showAquifers && userRole === 'advanced'} 
                            onChange={(e) => {
                              if (userRole === 'advanced') {
                                setShowAquifers(e.target.checked);
                              }
                            }} 
                            disabled={userRole === 'simple'}
                            style={{ width: '15px', height: '15px', accentColor: 'var(--primary)', cursor: userRole === 'simple' ? 'not-allowed' : 'pointer' }}
                          />
                          <span>{t.showAquifers}</span>
                          {userRole === 'simple' && <Lock size={12} style={{ color: '#fb923c', marginLeft: isRtl ? '0' : 'auto', marginRight: isRtl ? 'auto' : '0' }} />}
                        </label>
                      )}

                      <label 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}
                        onClick={(e) => {
                          if (userRole === 'simple') {
                            e.preventDefault();
                            setLoginModalOpen(true);
                          }
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={showFlowDirections && userRole === 'advanced'} 
                          onChange={(e) => {
                            if (userRole === 'advanced') {
                              setShowFlowDirections(e.target.checked);
                            }
                          }}
                          disabled={userRole === 'simple'}
                          style={{ width: '15px', height: '15px', accentColor: 'var(--primary)', cursor: userRole === 'simple' ? 'not-allowed' : 'pointer' }}
                        />
                        <span>{t.showFlowDirections}</span>
                        {userRole === 'simple' && <Lock size={12} style={{ color: '#fb923c', marginLeft: isRtl ? '0' : 'auto', marginRight: isRtl ? 'auto' : '0' }} />}
                      </label>

                      <label 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}
                        onClick={(e) => {
                          if (userRole === 'simple') {
                            e.preventDefault();
                            setLoginModalOpen(true);
                          }
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={showFlowChannels && userRole === 'advanced'} 
                          onChange={(e) => {
                            if (userRole === 'advanced') {
                              setShowFlowChannels(e.target.checked);
                            }
                          }}
                          disabled={userRole === 'simple'}
                          style={{ width: '15px', height: '15px', accentColor: 'var(--primary)', cursor: userRole === 'simple' ? 'not-allowed' : 'pointer' }}
                        />
                        <span>{t.showFlowChannels}</span>
                        {userRole === 'simple' && <Lock size={12} style={{ color: '#fb923c', marginLeft: isRtl ? '0' : 'auto', marginRight: isRtl ? 'auto' : '0' }} />}
                      </label>

                      <label 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}
                        onClick={(e) => {
                          if (userRole === 'simple') {
                            e.preventDefault();
                            setLoginModalOpen(true);
                          }
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={showPotentiometric && userRole === 'advanced'} 
                          onChange={(e) => {
                            if (userRole === 'advanced') {
                              setShowPotentiometric(e.target.checked);
                            }
                          }}
                          disabled={userRole === 'simple'}
                          style={{ width: '15px', height: '15px', accentColor: 'var(--primary)', cursor: userRole === 'simple' ? 'not-allowed' : 'pointer' }}
                        />
                        <span>{t.showPotentiometric}</span>
                        {userRole === 'simple' && <Lock size={12} style={{ color: '#fb923c', marginLeft: isRtl ? '0' : 'auto', marginRight: isRtl ? 'auto' : '0' }} />}
                      </label>

                      <label 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}
                        onClick={(e) => {
                          if (userRole === 'simple') {
                            e.preventDefault();
                            setLoginModalOpen(true);
                          }
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={showDrawdownCones && userRole === 'advanced'} 
                          onChange={(e) => {
                            if (userRole === 'advanced') {
                              setShowDrawdownCones(e.target.checked);
                            }
                          }}
                          disabled={userRole === 'simple'}
                          style={{ width: '15px', height: '15px', accentColor: 'var(--primary)', cursor: userRole === 'simple' ? 'not-allowed' : 'pointer' }}
                        />
                        <span>{t.showDrawdownCones}</span>
                        {userRole === 'simple' && <Lock size={12} style={{ color: '#fb923c', marginLeft: isRtl ? '0' : 'auto', marginRight: isRtl ? 'auto' : '0' }} />}
                      </label>

                      <label 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}
                        onClick={(e) => {
                          if (userRole === 'simple') {
                            e.preventDefault();
                            setLoginModalOpen(true);
                          }
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={showRechargeSinks && userRole === 'advanced'} 
                          onChange={(e) => {
                            if (userRole === 'advanced') {
                              setShowRechargeSinks(e.target.checked);
                            }
                          }}
                          disabled={userRole === 'simple'}
                          style={{ width: '15px', height: '15px', accentColor: 'var(--primary)', cursor: userRole === 'simple' ? 'not-allowed' : 'pointer' }}
                        />
                        <span>{t.showRechargeSinks}</span>
                        {userRole === 'simple' && <Lock size={12} style={{ color: '#fb923c', marginLeft: isRtl ? '0' : 'auto', marginRight: isRtl ? 'auto' : '0' }} />}
                      </label>
                    </div>

                    {userRole === 'advanced' && (showFlowDirections || showFlowChannels || showPotentiometric || showRechargeSinks) && (
                      <div style={{ 
                        marginTop: '12px', 
                        fontSize: '11px', 
                        color: 'var(--text-secondary)', 
                        background: 'rgba(255,255,255,0.02)', 
                        padding: '8px', 
                        borderRadius: 'var(--radius-sm)', 
                        border: '1px solid rgba(255,255,255,0.05)' 
                      }}>
                        <div style={{ 
                          fontWeight: 'bold', 
                          color: 'var(--secondary)', 
                          marginBottom: '6px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px' 
                        }}>
                          <Compass size={12} color="var(--secondary)" />
                          {t.flowLegendTitle}
                        </div>
                        <p style={{ margin: 0, lineHeight: '1.4', textAlign: isRtl ? 'right' : 'left' }}>
                          {t.flowLegendDesc}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ANALYTICAL SIMULATOR */}
        {activeTab === 'simulator' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="header-row">
              <div className="page-title">
                <h2>{t.simTitle}</h2>
                <p>{t.simDesc}</p>
              </div>
              <div>
                <button className="btn-secondary" onClick={loadWellParamsIntoSimulator} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Database size={16} />
                  <span>Load Selected Well Parameters</span>
                </button>
              </div>
            </div>

            <div className="simulator-layout">
              {/* Form Input parameters */}
              <div className="glass-panel sim-form">
                <div className="form-group">
                  <label>{t.modelSelection}</label>
                  <select 
                    value={simModel} 
                    onChange={(e) => setSimModel(e.target.value as any)}
                    className="form-select"
                  >
                    <option value="theis">{t.theisModel}</option>
                    <option value="cooper">{t.cooperJacobModel}</option>
                    <option value="dupuit">{t.dupuitModel}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{t.paramQ} (Q)</label>
                  <input 
                    type="number" 
                    value={simQ} 
                    onChange={(e) => setSimQ(Number(e.target.value))} 
                    className="form-input" 
                  />
                  <p className="help-text">{t.paramQDesc} (m³/day)</p>
                </div>

                {simModel !== 'dupuit' ? (
                  <>
                    <div className="form-group">
                      <label>{t.paramT} (T)</label>
                      <input 
                        type="number" 
                        value={simT} 
                        onChange={(e) => setSimT(Number(e.target.value))} 
                        className="form-input" 
                      />
                      <p className="help-text">{t.paramTDesc} (m²/day)</p>
                    </div>

                    <div className="form-group">
                      <label>{t.paramS} (S)</label>
                      <input 
                        type="number" 
                        step="0.0001"
                        value={simS} 
                        onChange={(e) => setSimS(Number(e.target.value))} 
                        className="form-input" 
                      />
                      <p className="help-text">{t.paramSDesc}</p>
                    </div>

                    <div className="form-group">
                      <label>{t.paramTime} (t)</label>
                      <input 
                        type="number" 
                        value={simTime} 
                        onChange={(e) => setSimTime(Number(e.target.value))} 
                        className="form-input" 
                      />
                      <p className="help-text">{t.paramTimeDesc} (days)</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label>{t.paramK} (K)</label>
                      <input 
                        type="number" 
                        value={simK} 
                        onChange={(e) => setSimK(Number(e.target.value))} 
                        className="form-input" 
                      />
                      <p className="help-text">{t.paramKDesc} (m/day)</p>
                    </div>

                    <div className="form-group">
                      <label>{t.paramH} (H)</label>
                      <input 
                        type="number" 
                        value={simH} 
                        onChange={(e) => setSimH(Number(e.target.value))} 
                        className="form-input" 
                      />
                      <p className="help-text">{t.paramHDesc} (m)</p>
                    </div>

                    <div className="form-group">
                      <label>{t.paramR} (R)</label>
                      <input 
                        type="number" 
                        value={simR} 
                        onChange={(e) => setSimR(Number(e.target.value))} 
                        className="form-input" 
                      />
                      <p className="help-text">{t.paramRDesc} (m)</p>
                    </div>

                    <div className="form-group">
                      <label>{t.aquiferType}</label>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#fff' }}>
                          <input 
                            type="radio" 
                            checked={simIsConfined} 
                            onChange={() => setSimIsConfined(true)} 
                          />
                          {t.confined}
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#fff' }}>
                          <input 
                            type="radio" 
                            checked={!simIsConfined} 
                            onChange={() => setSimIsConfined(false)} 
                          />
                          {t.unconfined}
                        </label>
                      </div>
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label>{t.paramDistance} (r)</label>
                  <input 
                    type="number" 
                    value={simDistance} 
                    onChange={(e) => setSimDistance(Number(e.target.value))} 
                    className="form-input" 
                  />
                  <p className="help-text">{t.paramDistanceDesc} (m)</p>
                </div>
              </div>

              {/* Simulation Output Dashboard */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* ── Source Context Breadcrumb ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderRadius: '8px', background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.25)', fontSize: '13px' }}>
                  <Activity size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span>
                    <strong>Showing: </strong>
                    {selectedDataset === 'advanced' && selectedAquifer
                      ? <><span style={{ color: 'var(--primary)' }}>Aquifer: {selectedAquifer.name}</span> ({selectedAquifer.location}) &mdash; Well: {selectedWell?.name}&nbsp;[{selectedWell?.location}]</>  
                      : <><span style={{ color: 'var(--primary)' }}>Well: {selectedWell?.name}</span> &mdash; {selectedWell?.location}</>}
                  </span>
                </div>

                {/* Result Statistics Banner */}
                <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t.observationPoint} {t.drawdown}</span>
                    <strong style={{ fontSize: '26px', color: 'var(--primary)' }}>{currentObsPointDrawdown.toFixed(2)} {t.m}</strong>
                  </div>
                  {simModel === 'cooper' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>u value (Validity)</span>
                      <strong style={{ fontSize: '20px', color: simulatorJacobU < 0.01 ? 'var(--success)' : 'var(--warning)' }}>
                        {simulatorJacobU.toFixed(6)}
                      </strong>
                    </div>
                  )}
                  {simModel === 'dupuit' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Transmissivity (Calculated)</span>
                      <strong style={{ fontSize: '20px', color: '#fff' }}>{(simK * simH).toFixed(1)} {t.m2day}</strong>
                    </div>
                  )}
                </div>

                {/* Warnings based on calculations */}
                {simModel === 'cooper' && simulatorJacobU >= 0.01 && (
                  <div className="alert-box warning">
                    <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                    <div>
                      {t.validityWarning.replace('{u}', simulatorJacobU.toFixed(4))}
                    </div>
                  </div>
                )}

                {simModel === 'dupuit' && currentObsPointDrawdown >= simH && (
                  <div className="alert-box danger">
                    <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                    <div>
                      {t.dryWellWarning}
                    </div>
                  </div>
                )}

                {/* Spatial Drawdown Chart */}
                <div className="glass-panel">
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>{t.drawdownVsDistance}</h3>
                  <div style={{ height: '260px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={spatialDrawdownData}>
                        <defs>
                          <linearGradient id="drawdownDistGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="distance" label={{ value: 'Distance r (m)', position: 'insideBottom', offset: -5, fill: 'var(--text-secondary)' }} stroke="var(--text-secondary)" />
                        <YAxis label={{ value: 'Drawdown s (m)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }} stroke="var(--text-secondary)" />
                        <Tooltip />
                        <Area type="monotone" dataKey={t.drawdown} stroke="var(--secondary)" fillOpacity={1} fill="url(#drawdownDistGrad)" strokeWidth={2} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Transient Drawdown Chart (only for transient models) */}
                {simModel !== 'dupuit' && (
                  <div className="glass-panel">
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>{t.drawdownVsTime}</h3>
                    <div style={{ height: '260px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={transientDrawdownData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="time" label={{ value: 'Time t (days)', position: 'insideBottom', offset: -5, fill: 'var(--text-secondary)' }} stroke="var(--text-secondary)" />
                          <YAxis label={{ value: 'Drawdown s (m)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }} stroke="var(--text-secondary)" />
                          <Tooltip />
                          <Line type="monotone" dataKey={t.drawdown} stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AI FORECASTING */}
        {activeTab === 'ai' && (
          <div 
            id="ai-report-content" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '24px',
              padding: isExportingPdf ? '32px' : '0',
              background: isExportingPdf ? '#020617' : 'transparent',
              borderRadius: isExportingPdf ? '16px' : '0',
              color: '#ffffff'
            }}
          >
            {/* Custom PDF Header */}
            {isExportingPdf && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                borderBottom: '2px solid rgba(255, 255, 255, 0.1)', 
                paddingBottom: '20px',
                marginBottom: '10px'
              }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>
                    {selectedLanguage === 'ar' ? 'منصة جيومائية - GeoWaterIcs' : selectedLanguage === 'fr' ? 'Plateforme GeoWaterIcs' : 'GeoWaterIcs Platform'}
                  </h1>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
                    {selectedLanguage === 'ar' ? 'تقرير التنبؤ الذكي واستدامة المياه الجوفية' : selectedLanguage === 'fr' ? 'Rapport de Prévision IA & de Durabilité des Nappes' : 'AI-Powered Groundwater Level Forecasting & Sustainability Report'}
                  </p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  <div><strong>{selectedLanguage === 'ar' ? 'التاريخ' : selectedLanguage === 'fr' ? 'Date' : 'Date'}:</strong> {new Date().toLocaleDateString()}</div>
                  <div><strong>{selectedLanguage === 'ar' ? 'نموذج التنبؤ' : selectedLanguage === 'fr' ? 'Modèle' : 'Model'}:</strong> {selectedDataset === 'advanced' ? 'Advanced (Per-Aquifer)' : 'Standard'}</div>
                  <div><strong>{selectedDataset === 'advanced' 
                    ? (selectedLanguage === 'ar' ? 'الطبقة المائية' : selectedLanguage === 'fr' ? 'Aquifère' : 'Aquifer')
                    : (selectedLanguage === 'ar' ? 'البئر' : selectedLanguage === 'fr' ? 'Puits' : 'Well')
                  }:</strong> {selectedDataset === 'advanced' && selectedAquifer ? `${selectedAquifer.name} (${selectedAquifer.location})` : `${selectedWell?.name} (${selectedWell?.location})`}</div>
                </div>
              </div>
            )}

            <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div className="page-title">
                <h2>{t.aiTitle}</h2>
                <p>{t.aiDesc}</p>
              </div>

              {!isExportingPdf && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Model Toggle Buttons */}
                  <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '2px', border: '1px solid var(--panel-border)' }}>
                    <button 
                      onClick={() => {
                        if (userRole === 'simple') {
                          setLoginModalOpen(true);
                        } else {
                          setSelectedDataset('advanced');
                          if (advancedWells.length > 0) {
                            setSelectedWellId(advancedWells[0].id);
                          }
                        }
                      }}
                      className={selectedDataset === 'advanced' ? 'btn-primary' : 'btn-secondary'}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>{t.advancedDataset}</span>
                      {userRole === 'simple' && <Lock size={12} style={{ color: '#fb923c' }} />}
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedDataset('standard');
                        if (standardWells.length > 0) {
                          setSelectedWellId(standardWells[0].id);
                        }
                      }}
                      className={selectedDataset === 'standard' ? 'btn-primary' : 'btn-secondary'}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      {t.standardDataset}
                    </button>
                  </div>

                  {/* Selector Dropdown (Aquifer in advanced, Well in standard) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedDataset === 'advanced' ? (
                      <>
                        <label htmlFor="aquifer-select-ai" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                          {selectedLanguage === 'ar' ? 'اختر الطبقة المائية' : selectedLanguage === 'fr' ? 'Sélectionner Aquifère' : 'Select Aquifer'}:
                        </label>
                        <select
                          id="aquifer-select-ai"
                          value={selectedAquiferId}
                          onChange={(e) => {
                            const aqId = Number(e.target.value);
                            setSelectedAquiferId(aqId);
                            const firstWell = advancedWells.find(w => w.aquiferId === aqId);
                            if (firstWell) setSelectedWellId(firstWell.id);
                          }}
                          className="form-select"
                          style={{
                            padding: '8px 12px',
                            fontSize: '13px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            minWidth: '160px',
                          }}
                        >
                          {advancedAquifers.map(aq => (
                            <option key={aq.id} value={aq.id}>
                              {aq.name} ({aq.location})
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <label htmlFor="well-select-ai" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                          {t.selectWellAI || 'Select Well'}:
                        </label>
                        <select
                          id="well-select-ai"
                          value={selectedWellId}
                          onChange={(e) => setSelectedWellId(Number(e.target.value))}
                          className="form-select"
                          style={{
                            padding: '8px 12px',
                            fontSize: '13px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            minWidth: '160px',
                          }}
                        >
                          {wells.map(w => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.location})
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>

                  {/* Download PDF Button */}
                  <button
                    onClick={exportToPDF}
                    className="btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <Cpu size={16} />
                    {t.downloadReport}
                  </button>
                </div>
              )}
            </div>

            {/* AI Scenario Selection Cards */}
            <div className="ai-scenario-select-bar">
              {SCENARIOS.map(scenario => {
                const isActive = scenario.id === activeScenarioId;
                
                // Get local title
                let title = scenario.nameEn;
                if (selectedLanguage === 'ar') title = scenario.nameAr;
                else if (selectedLanguage === 'fr') title = scenario.nameFr;

                return (
                  <div 
                    key={scenario.id} 
                    className={`scenario-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveScenarioId(scenario.id)}
                  >
                    <span className="scenario-btn-title">{title}</span>
                    <span className="scenario-btn-desc">
                      Pumping: {(scenario.pumpingFactor * 100)}% | Recharge: {(scenario.rechargeFactor * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Main AI Forecast Area */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
              
              {/* Plot Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Forecast warning box */}
                {activeScenarioId === 'intensive' && (
                  <div className="alert-box danger">
                    <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                    <div>{t.alertHighDepletion}</div>
                  </div>
                )}

                {activeScenarioId === 'eco' && (
                  <div className="alert-box success">
                    <CheckCircle size={20} style={{ flexShrink: 0 }} />
                    <div>Groundwater recovery is active. Saturated head will increase, ensuring aquifer longevity.</div>
                  </div>
                )}

                {/* Combined Timeline Chart */}
                <div className="glass-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                        {t.forecast6m} : {selectedDataset === 'advanced' && selectedAquifer ? selectedAquifer.name : selectedWell?.name}
                      </h3>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                        {activeForecastMetric === 'wl' ? t.wlForecast : activeForecastMetric === 'drawdown' ? t.drawdownForecast : t.predictedSaturatedHead}
                      </p>
                    </div>

                    {!isExportingPdf && (
                      <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '2px', border: '1px solid var(--panel-border)' }}>
                        <button 
                          onClick={() => setActiveForecastMetric('wl')}
                          className={activeForecastMetric === 'wl' ? 'btn-primary' : 'btn-secondary'}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          {t.waterLevel.split(' (')[0]}
                        </button>
                        <button 
                          onClick={() => setActiveForecastMetric('drawdown')}
                          className={activeForecastMetric === 'drawdown' ? 'btn-primary' : 'btn-secondary'}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          {t.drawdown.split(' (')[0]}
                        </button>
                        <button 
                          onClick={() => setActiveForecastMetric('head')}
                          className={activeForecastMetric === 'head' ? 'btn-primary' : 'btn-secondary'}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          {t.saturatedHead.split(' (')[0]}
                        </button>
                      </div>
                    )}

                    <div style={{ fontSize: '11px', display: 'flex', gap: '16px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', background: 'var(--primary)', display: 'inline-block', borderRadius: '50%' }}></span>
                        {t.historicalPeriod}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', border: '1px dashed var(--secondary)', display: 'inline-block', borderRadius: '50%' }}></span>
                        {t.forecastPeriod}
                      </span>
                    </div>
                  </div>

                  <div style={{ height: '340px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={aiForecastData}>
                        <defs>
                          <linearGradient id="forecastingWlColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" stroke="var(--text-secondary)" />
                        <YAxis domain={activeForecastMetric === 'drawdown' ? [0, 'dataMax + 1'] : ['dataMin - 2', 'dataMax + 2']} reversed={activeForecastMetric !== 'head'} stroke="var(--text-secondary)" />
                        <Tooltip />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey={historyKey} 
                          name={metricLabel} 
                          stroke="var(--primary)" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#forecastingWlColor)" 
                          connectNulls
                          isAnimationActive={false}
                        />
                        <Area 
                          type="monotone" 
                          dataKey={forecastKey} 
                          name={predictedLabel} 
                          stroke="var(--secondary)" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          fillOpacity={0.5} 
                          fill="url(#forecastingWlColor)" 
                          connectNulls
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Sidebar Gauge & Metrics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Sustainability rating circular gauge */}
                <div className="glass-panel sustainability-gauge-panel">
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    {t.sustainabilityScore}
                  </span>
                  
                  <div className={`sustainability-ring ${sustainabilityScore.color}`}>
                    {sustainabilityScore.rating}
                    <div style={{ 
                      position: 'absolute', bottom: '-8px', fontSize: '11px', fontWeight: 'bold', 
                      background: 'rgba(15,23,42,0.9)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--panel-border)' 
                    }}>
                      {sustainabilityScore.percent}%
                    </div>
                  </div>

                  <strong style={{ fontSize: '16px', color: `var(--${getSustainabilityColorClass(sustainabilityScore.color)})`, marginTop: '8px' }}>
                    {sustainabilityScore.text}
                  </strong>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    {sustainabilityScore.rating === 'A' ? t.statusDescStable : 
                     sustainabilityScore.rating === 'C' ? t.statusDescWarning : 
                     t.statusDescCritical}
                  </p>
                </div>

                {/* Safe Yield Management Card */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} color="var(--success)" />
                    <strong style={{ fontSize: '14px' }}>{t.safeYield}</strong>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--success)' }}>
                    {computedSafeYield.toLocaleString()} {t.m3month}
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {t.safeYieldDesc}
                  </p>
                </div>

                {/* Model Prediction Accuracy Card */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                    <Cpu size={18} color="var(--primary)" />
                    <strong style={{ fontSize: '14px' }}>{t.accuracyMeter}</strong>
                  </div>

                  {currentForecastResult && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Blended / Hybrid Model */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{t.hybridModel}</span>
                          <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                            {currentForecastResult.metrics.wl.accuracyPercent}%
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${currentForecastResult.metrics.wl.accuracyPercent}%`, 
                              height: '100%', 
                              background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                              borderRadius: '3px'
                            }} 
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                          <span>R²: {currentForecastResult.metrics.wl.rSquared}</span>
                          <span>MAE: {currentForecastResult.metrics.wl.mae}m</span>
                          <span>MSE: {currentForecastResult.metrics.wl.mse}m²</span>
                        </div>
                      </div>

                      {/* AI Model */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{t.aiModel}</span>
                          <span style={{ fontWeight: 'bold', color: 'var(--secondary)' }}>
                            {currentForecastResult.metrics.wlAI.accuracyPercent}%
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${currentForecastResult.metrics.wlAI.accuracyPercent}%`, 
                              height: '100%', 
                              background: 'var(--secondary)',
                              borderRadius: '3px'
                            }} 
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                          <span>R²: {currentForecastResult.metrics.wlAI.rSquared}</span>
                          <span>MAE: {currentForecastResult.metrics.wlAI.mae}m</span>
                          <span>MSE: {currentForecastResult.metrics.wlAI.mse}m²</span>
                        </div>
                      </div>

                      {/* Analytical Model */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{t.analyticalModel}</span>
                          <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                            {currentForecastResult.metrics.wlAnalytical.accuracyPercent}%
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${currentForecastResult.metrics.wlAnalytical.accuracyPercent}%`, 
                              height: '100%', 
                              background: 'var(--success)',
                              borderRadius: '3px'
                            }} 
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                          <span>R²: {currentForecastResult.metrics.wlAnalytical.rSquared}</span>
                          <span>MAE: {currentForecastResult.metrics.wlAnalytical.mae}m</span>
                          <span>MSE: {currentForecastResult.metrics.wlAnalytical.mse}m²</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: UPLOAD & ANALYZE */}
        {activeTab === 'upload' && (
          <UploadAnalyze userRole={userRole} selectedLanguage={selectedLanguage} />
        )}

        {/* TAB 6: SETTINGS & DATA SOURCE CONTROL */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="header-row">
              <div className="page-title">
                <h2>{t.tabSettings}</h2>
                <p>Toggle dataset configurations and regional environment variables</p>
              </div>
            </div>

            <div className="glass-panel" style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Dataset selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <strong style={{ fontSize: '16px' }}>{t.dataset}</strong>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t.datasetDesc}</p>
                
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                  <button 
                    onClick={() => {
                      if (userRole === 'simple') {
                        setLoginModalOpen(true);
                      } else {
                        setSelectedDataset('advanced');
                        setSelectedWellId(1);
                      }
                    }}
                    className={selectedDataset === 'advanced' ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <span>{t.advancedDataset}</span>
                    {userRole === 'simple' && <Lock size={14} style={{ color: '#fb923c' }} />}
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedDataset('standard');
                      setSelectedWellId(1);
                    }}
                    className={selectedDataset === 'standard' ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1 }}
                  >
                    {t.standardDataset}
                  </button>
                </div>
              </div>

              <hr style={{ borderColor: 'rgba(255,255,255,0.08)' }} />

              {/* Language selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <strong style={{ fontSize: '16px' }}>{t.selectLanguage}</strong>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button 
                    className={`btn-secondary ${selectedLanguage === 'en' ? 'active' : ''}`}
                    onClick={() => setSelectedLanguage('en')}
                    style={{ flex: 1, borderColor: selectedLanguage === 'en' ? 'var(--primary)' : 'var(--panel-border)' }}
                  >English</button>
                  <button 
                    className={`btn-secondary ${selectedLanguage === 'ar' ? 'active' : ''}`}
                    onClick={() => setSelectedLanguage('ar')}
                    style={{ flex: 1, borderColor: selectedLanguage === 'ar' ? 'var(--primary)' : 'var(--panel-border)' }}
                  >العربية (Arabic)</button>
                  <button 
                    className={`btn-secondary ${selectedLanguage === 'fr' ? 'active' : ''}`}
                    onClick={() => setSelectedLanguage('fr')}
                    style={{ flex: 1, borderColor: selectedLanguage === 'fr' ? 'var(--primary)' : 'var(--panel-border)' }}
                  >Français</button>
                </div>
              </div>

              <hr style={{ borderColor: 'rgba(255,255,255,0.08)' }} />

              {/* System Info */}
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                <p>Location Context: Tébessa, North Algeria (EPSG:30791 - Lambert Conic Conformal Zone Nord)</p>
                <p style={{ marginTop: '4px' }}>AI Predictive Model: Ridge Regularized Polynomial Projection</p>
                <p style={{ marginTop: '4px' }}>GeoWaterIcs Hydrological Dashboard © 2026. Made in pair with DeepMind AI.</p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Login Modal Overlay */}
      {loginModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '400px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: isRtl ? 'right' : 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--primary)',
                padding: '10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Lock size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#fff', fontWeight: 'bold' }}>{t.loginTitle}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{t.loginSubtitle}</p>
              </div>
            </div>

            {/* Error Message */}
            {loginError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#f87171',
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                <span>{loginError}</span>
              </div>
            )}

            {/* Login Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  {t.username}
                </label>
                <input 
                  type="text" 
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="e.g. admin"
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--panel-border)',
                    color: '#fff',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  {t.password}
                </label>
                <input 
                  type="password" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--panel-border)',
                    color: '#fff',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button 
                  type="button"
                  onClick={() => {
                    setLoginModalOpen(false);
                    setLoginError('');
                  }}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '10px', fontSize: '14px', cursor: 'pointer' }}
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '10px', fontSize: '14px', cursor: 'pointer' }}
                >
                  {t.loginButton}
                </button>
              </div>
            </form>

            <div style={{ 
              borderTop: '1px solid rgba(255,255,255,0.08)', 
              paddingTop: '12px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px' 
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
                {t.quickLogin}:
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => handleQuickLogin('simple')}
                  className="btn-secondary"
                  style={{ 
                    flex: 1, 
                    padding: '6px', 
                    fontSize: '11px', 
                    background: 'rgba(255,255,255,0.02)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    cursor: 'pointer'
                  }}
                >
                  {t.userRoleSimple}
                </button>
                <button 
                  onClick={() => handleQuickLogin('advanced')}
                  className="btn-secondary"
                  style={{ 
                    flex: 1, 
                    padding: '6px', 
                    fontSize: '11px', 
                    borderColor: 'var(--primary)',
                    color: 'var(--primary)',
                    cursor: 'pointer'
                  }}
                >
                  {t.userRoleAdvanced}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
