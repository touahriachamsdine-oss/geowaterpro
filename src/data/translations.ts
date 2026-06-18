export interface TranslationSet {
  title: string;
  subtitle: string;
  tabDashboard: string;
  tabMap: string;
  tabSimulator: string;
  tabAI: string;
  tabSettings: string;
  tabData: string;
  userRoleSimple: string;
  userRoleAdvanced: string;
  addWell: string;
  editWell: string;
  addAquifer: string;
  editAquifer: string;
  deleteWell: string;
  deleteAquifer: string;
  saveChanges: string;
  cancel: string;
  xCoord: string;
  yCoord: string;
  zCoord: string;
  initialWL: string;
  pumpingRateQ: string;
  aquiferSelect: string;
  manageTitle: string;
  manageDesc: string;
  
  // Settings
  language: string;
  selectLanguage: string;
  unitSystem: string;
  metric: string;
  dataset: string;
  standardDataset: string;
  advancedDataset: string;
  datasetDesc: string;
  
  // Dashboard & General
  well: string;
  aquifer: string;
  wells: string;
  aquifers: string;
  pumpingRate: string;
  waterLevel: string;
  recharge: string;
  drawdown: string;
  elevation: string;
  location: string;
  coordinates: string;
  wellName: string;
  status: string;
  actions: string;
  details: string;
  selectWell: string;
  month: string;
  metrics: string;
  trend: string;
  correlation: string;

  // Well Statuses
  stable: string;
  warning: string;
  critical: string;
  statusDescStable: string;
  statusDescWarning: string;
  statusDescCritical: string;

  // Simulator
  simTitle: string;
  simDesc: string;
  modelSelection: string;
  theisModel: string;
  cooperJacobModel: string;
  dupuitModel: string;
  paramQ: string;
  paramQDesc: string;
  paramT: string;
  paramTDesc: string;
  paramS: string;
  paramSDesc: string;
  paramK: string;
  paramKDesc: string;
  paramH: string;
  paramHDesc: string;
  paramR: string;
  paramRDesc: string;
  paramDistance: string;
  paramDistanceDesc: string;
  paramTime: string;
  paramTimeDesc: string;
  aquiferType: string;
  confined: string;
  unconfined: string;
  runSimulation: string;
  simResultTitle: string;
  drawdownVsDistance: string;
  drawdownVsTime: string;
  observationPoint: string;
  dryWellWarning: string;
  validityWarning: string;

  // AI & Forecasting
  aiTitle: string;
  aiDesc: string;
  selectScenario: string;
  historicalPeriod: string;
  forecastPeriod: string;
  simulationPeriod: string;
  forecast6m: string;
  sustainabilityScore: string;
  safeYield: string;
  safeYieldDesc: string;
  alertHighDepletion: string;
  scenarioComparison: string;
  wlForecast: string;
  drawdownForecast: string;
  predictedWL: string;
  predictedDrawdown: string;
  saturatedHead: string;
  predictedSaturatedHead: string;
  accuracyMeter: string;

  // Units
  m: string;
  m3day: string;
  m3month: string;
  mday: string;
  m2day: string;
  days: string;
  percent: string;
  
  // Groundwater Flow
  showFlowDirections: string;
  flowVelocity: string;
  flowLegendTitle: string;
  flowLegendDesc: string;
  showFlowChannels: string;
  showPotentiometric: string;
  showDrawdownCones: string;
  showRechargeSinks: string;
  showWellLabels: string;
  layerControlTitle: string;
  showWells: string;
  showAquifers: string;
  theme: string;
  lightMode: string;
  darkMode: string;
  nightMode: string;
  selectWellAI: string;
  observationDistance: string;
  spatialDrawdown: string;
  transientDrawdown: string;
  exportingPDF: string;
  modelAccuracy: string;
  analyticalModel: string;
  aiModel: string;
  hybridModel: string;
  accuracyBlended: string;
  technicalSpecs: string;
  specDoc: string;
  downloadReport: string;
  loginTitle: string;
  loginSubtitle: string;
  username: string;
  password: string;
  loginButton: string;
  invalidCredentials: string;
  quickLogin: string;
  logout: string;
  roleRestricted: string;
  roleRestrictedDesc: string;
  userRoleLabel: string;
  locked: string;
}

export type LanguageCode = 'en' | 'ar' | 'fr';

export const translations: Record<LanguageCode, TranslationSet> = {
  en: {
    title: 'GeoWater Platform',
    subtitle: 'Groundwater Monitoring, Analytical Modeling & AI Forecasting',
    tabDashboard: 'Overview & Charts',
    tabMap: 'Interactive Map',
    tabSimulator: 'Analytical Simulator',
    tabAI: 'AI Forecasting',
    tabSettings: 'Control & Data Source',
    tabData: 'Data Management',
    userRoleSimple: 'Simple User',
    userRoleAdvanced: 'Advanced User',
    addWell: 'Add New Well',
    editWell: 'Edit Well',
    addAquifer: 'Add New Aquifer',
    editAquifer: 'Edit Aquifer',
    deleteWell: 'Delete Well',
    deleteAquifer: 'Delete Aquifer',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    xCoord: 'X Coordinate (Lambert)',
    yCoord: 'Y Coordinate (Lambert)',
    zCoord: 'Z Elevation (m)',
    initialWL: 'Initial WL Depth (m)',
    pumpingRateQ: 'Pumping Rate Q (m³/month)',
    aquiferSelect: 'Select Aquifer',
    manageTitle: 'Dynamic Aquifer & Well Data Management',
    manageDesc: 'Replace static system values with live groundwater parameters. Add, edit, or remove monitoring wells and aquifer properties.',

    language: 'Language',
    selectLanguage: 'Select Platform Language',
    unitSystem: 'Unit System',
    metric: 'Metric (SI)',
    dataset: 'Current Dataset',
    standardDataset: 'Standard Dataset (10 Wells)',
    advancedDataset: 'Advanced Dataset (30 Wells, 3 Aquifers)',
    datasetDesc: 'Switch between the standard pumping/drawdown dataset or the advanced dataset with detailed aquifer properties and recharge dynamics.',

    well: 'Well',
    aquifer: 'Aquifer',
    wells: 'Wells',
    aquifers: 'Aquifers',
    pumpingRate: 'Pumping Rate (Q)',
    waterLevel: 'Water Table Depth (WL)',
    recharge: 'Recharge (R)',
    drawdown: 'Drawdown (s)',
    elevation: 'Elevation (Z)',
    location: 'Geographic Location',
    coordinates: 'Lambert Coordinates (X, Y)',
    wellName: 'Well Name',
    status: 'Aquifer Status',
    actions: 'Actions',
    details: 'Hydrological Details',
    selectWell: 'Select a Well to Analyze',
    month: 'Month',
    metrics: 'Key Hydrological Metrics',
    trend: 'Historical Trends',
    correlation: 'Pumping vs. Water Level Correlation',

    stable: 'Stable',
    warning: 'Caution',
    critical: 'Critical Alert',
    statusDescStable: 'Drawdown is within sustainable recharge limits. Water table is balanced.',
    statusDescWarning: 'Drawdown is accelerating. Pumping rate should be optimized.',
    statusDescCritical: 'Critical drawdown detected. Risk of aquifer depletion and well drying!',

    simTitle: 'Analytical Drawdown Simulator',
    simDesc: 'Compute spatial and transient drawdown profiles in aquifers using standard hydraulic equations (Theis, Cooper-Jacob, Dupuit-Thiem).',
    modelSelection: 'Select Mathematical Formulation',
    theisModel: 'Theis Equation (Unsteady Flow / Confined)',
    cooperJacobModel: 'Cooper-Jacob Approximation (Simplified Transient)',
    dupuitModel: 'Dupuit-Thiem Model (Steady State)',
    paramQ: 'Pumping Discharge (Q)',
    paramQDesc: 'Volumetric rate of water pumped from the well.',
    paramT: 'Transmissivity (T)',
    paramTDesc: 'Rate at which water is transmitted through a unit width of the aquifer.',
    paramS: 'Storativity / S',
    paramSDesc: 'Volume of water released from storage per unit area per unit decline in head.',
    paramK: 'Hydraulic Conductivity (K)',
    paramKDesc: 'Ease with which water can move through pore spaces or fractures.',
    paramH: 'Aquifer Saturated Thickness (H)',
    paramHDesc: 'The saturated height of the aquifer prior to pumping.',
    paramR: 'Radius of Influence (R)',
    paramRDesc: 'The radial distance from the well where drawdown becomes zero.',
    paramDistance: 'Observation Distance (r)',
    paramDistanceDesc: 'Distance from the pumping well to the observation point.',
    paramTime: 'Duration of Pumping (t)',
    paramTimeDesc: 'Total time the pump has been running continuously.',
    aquiferType: 'Aquifer Configuration',
    confined: 'Confined (Captive)',
    unconfined: 'Unconfined (Libre)',
    runSimulation: 'Run Hydrogeological Simulation',
    simResultTitle: 'Theoretical Drawdown Response Curves',
    drawdownVsDistance: 'Spatial Drawdown Profile: s(r)',
    drawdownVsTime: 'Transient Drawdown Curve: s(t)',
    observationPoint: 'Observation Point Drawdown',
    dryWellWarning: 'Critical Warning: The calculated drawdown exceeds the aquifer thickness! The well will run dry.',
    validityWarning: 'Assumption Warning: Cooper-Jacob log approximation requires u < 0.01. Calculated u = {u}. Results may be mathematically inaccurate.',

    aiTitle: 'AI Predictor & Management Scenarios',
    aiDesc: 'Simulate the impact of climate variations and water abstraction policies using an AI model trained on historical local groundwater data.',
    selectScenario: 'Water Management Scenario',
    historicalPeriod: 'Historical Data (2024)',
    forecastPeriod: 'AI Projection (2025)',
    simulationPeriod: '6-Month Simulation Timeline',
    forecast6m: '6-Month Water Table Forecast',
    sustainabilityScore: 'Aquifer Sustainability Rating',
    safeYield: 'Sustainable Yield Limit',
    safeYieldDesc: 'Recommended maximum monthly pumping volume to prevent long-term decline.',
    alertHighDepletion: 'WARNING: Selected pumping levels will lead to severe groundwater depletion by mid-2025.',
    scenarioComparison: 'Abundant Scenarios Comparison',
    wlForecast: 'Water Table Depth Forecast (m)',
    drawdownForecast: 'Drawdown Trend Prediction (m)',
    predictedWL: 'Predicted WL',
    predictedDrawdown: 'Predicted Drawdown',
    saturatedHead: 'Saturated Head (H)',
    predictedSaturatedHead: 'Predicted Saturated Head',
    accuracyMeter: 'Model Prediction Accuracy',

    m: 'm',
    m3day: 'm³/day',
    m3month: 'm³/month',
    mday: 'm/day',
    m2day: 'm²/day',
    days: 'days',
    percent: '%',

    // Groundwater Flow
    showFlowDirections: 'Show Flow Vectors',
    flowVelocity: 'Flow Gradient (Magnitude)',
    flowLegendTitle: 'Groundwater Flow Dynamics',
    flowLegendDesc: 'Arrows indicate the direction of water flow, which goes from areas of high hydraulic head (elevation Z minus water depth WL) to areas of low head. Arrow size represents the relative flow gradient.',
    showFlowChannels: 'Show Flow Channels (Paths)',
    showPotentiometric: 'Show Potentiometric Surface (Head Map)',
    showDrawdownCones: 'Show Drawdown Cones of Influence',
    showRechargeSinks: 'Highlight Recharge & Sink Zones',
    showWellLabels: 'Show Well Labels',
    layerControlTitle: 'Map Layers & Controls',
    showWells: 'Show Monitoring Wells',
    showAquifers: 'Show Aquifer Boundaries',
    theme: 'Theme',
    lightMode: 'Light',
    darkMode: 'Dark',
    nightMode: 'Night',
    selectWellAI: 'Select Well for Prediction',
    observationDistance: 'Observation Distance',
    spatialDrawdown: 'AI predicted Spatial Drawdown',
    transientDrawdown: 'AI predicted Transient Drawdown',
    downloadReport: 'Download PDF Report',
    exportingPDF: 'Exporting PDF...',
    modelAccuracy: 'Model Accuracy',
    analyticalModel: 'Analytical Model',
    aiModel: 'AI Model',
    hybridModel: 'Hybrid Model',
    accuracyBlended: 'Blended Accuracy Score',
    technicalSpecs: 'Technical Specifications',
    specDoc: 'Technical Specifications Document',
    loginTitle: 'GeoWater Platform Login',
    loginSubtitle: 'Enter credentials or use quick select to access dashboard tools.',
    username: 'Username',
    password: 'Password',
    loginButton: 'Sign In',
    invalidCredentials: 'Invalid username or password.',
    quickLogin: 'Quick Login',
    logout: 'Log Out',
    roleRestricted: 'Access Restricted',
    roleRestrictedDesc: 'This feature is restricted to Advanced Users. Please switch roles to access.',
    userRoleLabel: 'User Profile',
    locked: 'Locked'
  },
  ar: {
    title: 'منصة جيومائية - GeoWater',
    subtitle: 'مراقبة المياه الجوفية، النمذجة التحليلية والتنبؤ بالذكاء الاصطناعي',
    tabDashboard: 'نظرة عامة ورسوم بيانية',
    tabMap: 'الخريطة التفاعلية',
    tabSimulator: 'المحاكي الهيدروليكي',
    tabAI: 'التنبؤ الذكي',
    tabSettings: 'التحكم ومصادر البيانات',
    tabData: 'إدارة البيانات',
    userRoleSimple: 'مستخدم بسيط',
    userRoleAdvanced: 'مستخدم متقدم',
    addWell: 'إضافة بئر جديد',
    editWell: 'تعديل البئر',
    addAquifer: 'إضافة حوض جوفي جديد',
    editAquifer: 'تعديل الحوض الجوفي',
    deleteWell: 'حذف البئر',
    deleteAquifer: 'حذف الحوض الجوفي',
    saveChanges: 'حفظ التغييرات',
    cancel: 'إلغاء',
    xCoord: 'إحداثي X (لامبرت)',
    yCoord: 'إحداثي Y (لامبرت)',
    zCoord: 'الارتفاع Z (م)',
    initialWL: 'عمق مستوى الماء الأولي (م)',
    pumpingRateQ: 'معدل الضخ Q (م³/شهر)',
    aquiferSelect: 'اختر الحوض الجوفي',
    manageTitle: 'إدارة بيانات الآبار والأحواض الجوفية',
    manageDesc: 'استبدل قيم النظام الساكنة بمعلمات المياه الجوفية الحية. قم بإضافة أو تعديل أو إزالة آبار المراقبة وخصائص الأحواض الجوفية.',

    language: 'اللغة',
    selectLanguage: 'اختر لغة المنصة',
    unitSystem: 'نظام الوحدات',
    metric: 'المتري (SI)',
    dataset: 'مجموعة البيانات الحالية',
    standardDataset: 'مجموعة البيانات القياسية (10 آبار)',
    advancedDataset: 'مجموعة البيانات المتقدمة (30 بئراً، 3 أحواض)',
    datasetDesc: 'التبديل بين البيانات القياسية للضخ والهبوط أو مجموعة البيانات المتقدمة التي تشمل الخصائص الهيدروليكية للأحواض وديناميكيات التغذية الجوفية.',

    well: 'بئر',
    aquifer: 'حوض مائي',
    wells: 'الآبار',
    aquifers: 'الأحواض الجوفية',
    pumpingRate: 'معدل الضخ (Q)',
    waterLevel: 'عمق منسوب المياه (WL)',
    recharge: 'تغذية الحوض (R)',
    drawdown: 'الهبوط (s)',
    elevation: 'الارتفاع (Z)',
    location: 'الموقع الجغرافي',
    coordinates: 'إحداثيات لامبرت (X, Y)',
    wellName: 'اسم البئر',
    status: 'حالة الحوض الجوفي',
    actions: 'إجراءات',
    details: 'التفاصيل الهيدرولوجية',
    selectWell: 'اختر بئراً للتحليل',
    month: 'الشهر',
    metrics: 'المؤشرات الهيدرولوجية الرئيسية',
    trend: 'الاتجاهات التاريخية',
    correlation: 'علاقة الضخ بمنسوب المياه',

    stable: 'مستقر',
    warning: 'حذر',
    critical: 'تنبيه حرج',
    statusDescStable: 'الهبوط يقع ضمن الحدود المستدامة لتغذية الحوض. منسوب المياه متوازن.',
    statusDescWarning: 'الهبوط يتسارع. يجب تحسين معدل الضخ وتجنب الإفراط.',
    statusDescCritical: 'تم رصد هبوط حرج للغاية! خطر نضوب الحوض وجفاف البئر!',

    simTitle: 'محاكي هبوط المياه التحليلي',
    simDesc: 'حساب توزيع الهبوط المكاني والزمني في الأحواض الجوفية باستخدام المعادلات القياسية (ثايس، كوبر-جاكوب، ودوبوي-ثيم).',
    modelSelection: 'اختر الصيغة الرياضية',
    theisModel: 'معادلة ثايس (تدفق غير مستقر / محصور)',
    cooperJacobModel: 'تقريب كوبر-جاكوب (عابر مبسط)',
    dupuitModel: 'نموذج دوبوي-ثيم (تدفق مستقر)',
    paramQ: 'معدل تدفق البئر (Q)',
    paramQDesc: 'الحجم الإجمالي للمياه المضخوخة من البئر يومياً.',
    paramT: 'معامل الناقلية (T)',
    paramTDesc: 'المعدل الذي تنتقل به المياه عبر عرض وحدة الحوض الجوفي.',
    paramS: 'معامل التخزين (S)',
    paramSDesc: 'حجم المياه الصادر من الخزان لكل وحدة مساحة لكل وحدة انخفاض في المنسوب.',
    paramK: 'النفاذية الهيدروليكية (K)',
    paramKDesc: 'سهولة حركة المياه عبر الفتحات والمسامات أو الشقوق الصخرية.',
    paramH: 'السمك المشبع للحوض (H)',
    paramHDesc: 'الارتفاع المشبع للطبقة الجوفية الحاملة للمياه قبل بدء الضخ.',
    paramR: 'نصف قطر التأثير (R)',
    paramRDesc: 'المسافة القطرية من البئر التي يصبح عندها الهبوط صفراً.',
    paramDistance: 'مسافة الملاحظة (r)',
    paramDistanceDesc: 'المسافة من بئر الضخ إلى نقطة القياس/المراقبة.',
    paramTime: 'زمن الضخ (t)',
    paramTimeDesc: 'إجمالي الوقت المستمر لتشغيل المضخة بالبيانات الجوفية.',
    aquiferType: 'نوع الحوض المائي',
    confined: 'حوض محصور (Captive)',
    unconfined: 'حوض غير محصور (Libre)',
    runSimulation: 'تشغيل محاكاة المياه الجوفية',
    simResultTitle: 'منحنيات استجابة الهبوط النظرية',
    drawdownVsDistance: 'الهبوط بدلالة المسافة: s(r)',
    drawdownVsTime: 'الهبوط بدلالة الزمن: s(t)',
    observationPoint: 'الهبوط عند نقطة المراقبة',
    dryWellWarning: 'تحذير حرج: الهبوط المحسوب يتجاوز السمك الكلي للطبقة المائية! البئر سيجف.',
    validityWarning: 'تحذير الفرضية: يتطلب تقريب كوبر-جاكوب أن يكون u < 0.01. قيمة u المحسوبة = {u}. النتائج قد تكون غير دقيقة رياضياً.',

    aiTitle: 'التنبؤ الذكي وسيناريوهات الإدارة المائية',
    aiDesc: 'محاكاة تأثير تغير المناخ وسياسات سحب المياه باستخدام نموذج ذكاء اصطناعي مدرب على البيانات التاريخية المحلية للمياه الجوفية.',
    selectScenario: 'سيناريو إدارة المياه الجوفية',
    historicalPeriod: 'البيانات التاريخية (2024)',
    forecastPeriod: 'توقعات الذكاء الاصطناعي (2025)',
    simulationPeriod: 'الجدول الزمني للمحاكاة (6 أشهر)',
    forecast6m: 'منسوب المياه المتوقع لـ 6 أشهر القادمة',
    sustainabilityScore: 'تقييم استدامة الحوض الجوفي',
    safeYield: 'الضخ المستدام الآمن',
    safeYieldDesc: 'الحجم الأقصى الموصى به للضخ شهرياً لتفادي تدهور منسوب المياه على المدى الطويل.',
    alertHighDepletion: 'تحذير: مستويات الضخ المحددة ستؤدي إلى استنزاف حاد للمياه الجوفية بحلول منتصف عام 2025.',
    scenarioComparison: 'مقارنة سيناريوهات الضخ المختلفة',
    wlForecast: 'منسوب عمق المياه المتوقع (م)',
    drawdownForecast: 'توقع اتجاه الهبوط المتراكم (م)',
    predictedWL: 'منسوب WL المتوقع',
    predictedDrawdown: 'الهبوط المتنبأ به',
    saturatedHead: 'المنسوب المشبع (H)',
    predictedSaturatedHead: 'المنسوب المشبع المتنبأ به',
    accuracyMeter: 'دقة نموذج التنبؤ',

    m: 'متر',
    m3day: 'م³/يوم',
    m3month: 'م³/شهر',
    mday: 'متر/يوم',
    m2day: 'متر²/يوم',
    days: 'أيام',
    percent: '٪',

    // Groundwater Flow
    showFlowDirections: 'عرض أسهم التدفق',
    flowVelocity: 'تدرج التدفق (الشدة)',
    flowLegendTitle: 'ديناميكيات تدفق المياه الجوفية',
    flowLegendDesc: 'توضح الأسهم اتجاه تدفق المياه، والذي ينتقل من المناطق ذات المنسوب الهيدروليكي المرتفع (الارتفاع Z ناقص عمق المياه WL) إلى المناطق المنخفضة. يمثل حجم السهم شدة تدرج التدفق.',
    showFlowChannels: 'عرض قنوات التدفق (المسارات)',
    showPotentiometric: 'عرض السطح البيزومتري (خريطة المنسوب)',
    showDrawdownCones: 'عرض مخاريط تأثير الهبوط',
    showRechargeSinks: 'تمييز مناطق التغذية والتصريف',
    showWellLabels: 'عرض تسميات الآبار',
    layerControlTitle: 'طبقات وعناصر تحكم الخريطة',
    showWells: 'عرض آبار المراقبة',
    showAquifers: 'عرض حدود الطبقة الجوفية',
    theme: 'المظهر',
    lightMode: 'مضيء',
    darkMode: 'داكن',
    nightMode: 'ليلي',
    selectWellAI: 'اختر البئر للتنبؤ',
    observationDistance: 'مسافة الملاحظة',
    spatialDrawdown: 'الهبوط المكاني المتوقع بالذكاء الاصطناعي',
    transientDrawdown: 'الهبوط العابر المتوقع بالذكاء الاصطناعي',
    downloadReport: 'تحميل التقرير بصيغة PDF',
    exportingPDF: 'جاري تصدير PDF...',
    modelAccuracy: 'دقة النموذج',
    analyticalModel: 'النموذج التحليلي',
    aiModel: 'نموذج الذكاء الاصطناعي',
    hybridModel: 'النموذج الهجين المشترك',
    accuracyBlended: 'معدل الدقة المشترك',
    technicalSpecs: 'المواصفات الفنية',
    specDoc: 'وثيقة المواصفات الفنية للمنصة',
    loginTitle: 'تسجيل الدخول إلى منصة GeoWater',
    loginSubtitle: 'أدخل بيانات الاعتماد أو استخدم الدخول السريع للوصول إلى أدوات المنصة.',
    username: 'اسم المستخدم',
    password: 'كلمة المرور',
    loginButton: 'تسجيل الدخول',
    invalidCredentials: 'اسم المستخدم أو كلمة المرور غير صالحة.',
    quickLogin: 'تسجيل الدخول السريع',
    logout: 'تسجيل الخروج',
    roleRestricted: 'الوصول مقيد',
    roleRestrictedDesc: 'هذه الميزة مقتصرة على المستخدمين المتقدمين. يرجى تبديل الدور للوصول إليها.',
    userRoleLabel: 'ملف المستخدم',
    locked: 'مغلق'
  },
  fr: {
    title: 'Plateforme GeoWater',
    subtitle: 'Suivi des Nappes, Modélisation Analytique & Prédictions IA',
    tabDashboard: 'Aperçu & Graphiques',
    tabMap: 'Carte Interactive',
    tabSimulator: 'Simulateur Analytique',
    tabAI: 'IA Prédictive & Scénarios',
    tabSettings: 'Contrôle & Source de Données',
    tabData: 'Gestion des Données',
    userRoleSimple: 'Utilisateur Simple',
    userRoleAdvanced: 'Utilisateur Avancé',
    addWell: 'Ajouter un nouveau puits',
    editWell: 'Modifier le puits',
    addAquifer: 'Ajouter un nouvel aquifère',
    editAquifer: 'Modifier l\'aquifère',
    deleteWell: 'Supprimer le puits',
    deleteAquifer: 'Supprimer l\'aquifère',
    saveChanges: 'Enregistrer',
    cancel: 'Annuler',
    xCoord: 'Coordonnée X (Lambert)',
    yCoord: 'Coordonnée Y (Lambert)',
    zCoord: 'Altitude Z (m)',
    initialWL: 'Profondeur WL Initiale (m)',
    pumpingRateQ: 'Débit Q (m³/mois)',
    aquiferSelect: 'Sélectionner l\'aquifère',
    manageTitle: 'Gestion des Données Puits & Aquifères',
    manageDesc: 'Remplacez les paramètres statiques par vos propres mesures de terrain.',

    language: 'Langue',
    selectLanguage: 'Sélectionner la langue de la plateforme',
    unitSystem: 'Système d\'unités',
    metric: 'Métrique (SI)',
    dataset: 'Jeu de données actuel',
    standardDataset: 'Jeu de Données Standard (10 Puits)',
    advancedDataset: 'Jeu de Données Avancé (30 Puits, 3 Aquifères)',
    datasetDesc: 'Basculez entre le jeu de données de pompage/rabattement standard ou le jeu de données avancé comprenant les propriétés hydrauliques des aquifères et la recharge.',

    well: 'Puits',
    aquifer: 'Aquifère',
    wells: 'Puits',
    aquifers: 'Aquifères',
    pumpingRate: 'Débit de Pompage (Q)',
    waterLevel: 'Profondeur de la Nappe (WL)',
    recharge: 'Recharge (R)',
    drawdown: 'Rabattement (s)',
    elevation: 'Altitude (Z)',
    location: 'Localisation Géographique',
    coordinates: 'Coordonnées Lambert (X, Y)',
    wellName: 'Nom du Puits',
    status: 'Statut de l\'Aquifère',
    actions: 'Actions',
    details: 'Détails Hydrologiques',
    selectWell: 'Sélectionnez un puits à analyser',
    month: 'Mois',
    metrics: 'Indicateurs Hydrologiques Clés',
    trend: 'Historique & Évolution',
    correlation: 'Corrélation Pompage vs. Niveau d\'Eau',

    stable: 'Stable',
    warning: 'Précaution',
    critical: 'Alerte Critique',
    statusDescStable: 'Le rabattement se situe dans les limites de recharge durable. La nappe est équilibrée.',
    statusDescWarning: 'Le rabattement s\'accélère. Le débit de pompage devrait être optimisé.',
    statusDescCritical: 'Rabattement critique détecté ! Risque d\'épuisement de l\'aquifère et de tarissement du puits.',

    simTitle: 'Simulateur Analytique de Rabattement',
    simDesc: 'Calculez les profils de rabattement spatiaux et temporels à l\'aide des équations hydrogéologiques standards (Theis, Cooper-Jacob, Dupuit-Thiem).',
    modelSelection: 'Sélectionner la Formulation Mathématique',
    theisModel: 'Équation de Theis (Régime Transitoire / Nappe Captive)',
    cooperJacobModel: 'Approximation de Cooper-Jacob (Transitoire Simplifié)',
    dupuitModel: 'Modèle de Dupuit-Thiem (Régime Permanent)',
    paramQ: 'Débit de Pompage (Q)',
    paramQDesc: 'Débit volumétrique d\'eau extrait du puits de pompage.',
    paramT: 'Transmissivité (T)',
    paramTDesc: 'Débit d\'eau transmis à travers une largeur unitaire de l\'aquifère.',
    paramS: 'Coefficient de Stockage (S)',
    paramSDesc: 'Volume d\'eau libéré par unité de surface de l\'aquifère pour une baisse unitaire de charge.',
    paramK: 'Conductivité Hydraulique (K)',
    paramKDesc: 'Aptitude d\'un milieu poreux ou fracturé à transmettre l\'eau.',
    paramH: 'Épaisseur Saturée de l\'Aquifère (H)',
    paramHDesc: 'Hauteur saturée initiale de l\'aquifère avant pompage.',
    paramR: 'Rayon d\'Influence (R)',
    paramRDesc: 'Distance radiale à partir du puits où le rabattement devient nul.',
    paramDistance: 'Distance d\'Observation (r)',
    paramDistanceDesc: 'Distance entre le puits de pompage et le point d\'observation.',
    paramTime: 'Temps de Pompage (t)',
    paramTimeDesc: 'Temps total durant lequel le pompage s\'est effectué de façon continue.',
    aquiferType: 'Type d\'Aquifère',
    confined: 'Nappe Captive (Confined)',
    unconfined: 'Nappe Libre (Unconfined)',
    runSimulation: 'Lancer la Simulation Hydrogéologique',
    simResultTitle: 'Courbes de Rabattement Théoriques',
    drawdownVsDistance: 'Profil Spatial du Rabattement: s(r)',
    drawdownVsTime: 'Courbe de Rabattement Temporelle: s(t)',
    observationPoint: 'Rabattement au Point d\'Observation',
    dryWellWarning: 'Alerte Critique : Le rabattement calculé dépasse l\'épaisseur de l\'aquifère ! Le puits sera à sec.',
    validityWarning: 'Alerte d\'hypothèse : Cooper-Jacob requiert u < 0.01. Calculé u = {u}. Les résultats peuvent être mathématiquement imprécis.',

    aiTitle: 'IA Prédictive & Scénarios de Gestion',
    aiDesc: 'Simulez l\'impact des variations climatiques et des politiques de prélèvement à l\'aide d\'un modèle d\'IA entraîné sur les données historiques locales.',
    selectScenario: 'Scénario de Gestion de l\'Eau',
    historicalPeriod: 'Données Historiques (2024)',
    forecastPeriod: 'Prédiction IA (2025)',
    simulationPeriod: 'Timeline de Simulation (6 Mois)',
    forecast6m: 'Prédiction du Niveau d\'Eau sur 6 Mois',
    sustainabilityScore: 'Score de Durabilité de l\'Aquifère',
    safeYield: 'Seuil de Prélèvement Durable',
    safeYieldDesc: 'Volume maximal mensuel recommandé pour éviter un déclin à long terme de la nappe.',
    alertHighDepletion: 'ATTENTION : Les débits de pompage sélectionnés provoqueront un épuisement sévère d\'ici mi-2025.',
    scenarioComparison: 'Comparaison des Scénarios de Gestion',
    wlForecast: 'Prévision de la Profondeur de la Nappe (m)',
    drawdownForecast: 'Tendance du Rabattement Prédictif (m)',
    predictedWL: 'WL Prédit',
    predictedDrawdown: 'Rabattement Prédit',
    saturatedHead: 'Charge Saturée (H)',
    predictedSaturatedHead: 'Charge Saturée Prédite',
    accuracyMeter: 'Précision de Prédiction',

    m: 'm',
    m3day: 'm³/j',
    m3month: 'm³/mois',
    mday: 'm/j',
    m2day: 'm²/j',
    days: 'jours',
    percent: '%',

    // Groundwater Flow
    showFlowDirections: "Afficher les flèches d'écoulement",
    flowVelocity: "Gradient d'écoulement (Magnitude)",
    flowLegendTitle: "Dynamique d'écoulement",
    flowLegendDesc: "Les flèches indiquent la direction de l'écoulement, qui se fait des zones de charge hydraulique élevée (altitude Z moins profondeur WL) vers les zones de charge faible. La taille de la flèche représente la magnitude du gradient.",
    showFlowChannels: "Afficher les canaux d'écoulement",
    showPotentiometric: "Afficher la surface piézométrique",
    showDrawdownCones: "Afficher les cônes de rabattement",
    showRechargeSinks: "Distinguer recharges et exutoires",
    showWellLabels: "Afficher les étiquettes des puits",
    layerControlTitle: "Couches de la carte",
    showWells: "Afficher les puits de surveillance",
    showAquifers: "Afficher la limite d'aquifère",
    theme: 'Thème',
    lightMode: 'Clair',
    darkMode: 'Sombre',
    nightMode: 'Nuit',
    selectWellAI: 'Sélectionner le Puits pour Prédiction',
    observationDistance: "Distance d'Observation",
    spatialDrawdown: 'Profil de Rabattement Spatial IA',
    transientDrawdown: "Évolution Temporelle du Rabattement IA",
    downloadReport: 'Télécharger le rapport PDF',
    exportingPDF: 'Exportation PDF...',
    modelAccuracy: 'Précision du Modèle',
    analyticalModel: 'Modèle Analytique',
    aiModel: 'Modèle IA',
    hybridModel: 'Modèle Hybride',
    accuracyBlended: 'Précision Globale Combinée',
    technicalSpecs: 'Spécifications Techniques',
    specDoc: 'Document des Spécifications Techniques',
    loginTitle: 'Connexion Plateforme GeoWater',
    loginSubtitle: 'Saisissez vos identifiants ou utilisez la sélection rapide pour accéder aux outils.',
    username: "Nom d'utilisateur",
    password: 'Mot de passe',
    loginButton: 'Se connecter',
    invalidCredentials: "Nom d'utilisateur ou mot de passe incorrect.",
    quickLogin: 'Connexion Rapide',
    logout: 'Se Déconnecter',
    roleRestricted: 'Accès Limité',
    roleRestrictedDesc: 'Cette fonctionnalité est réservée aux Utilisateurs Avancés. Veuillez changer de rôle pour y accéder.',
    userRoleLabel: 'Profil Utilisateur',
    locked: 'Verrouillé'
  }
};
