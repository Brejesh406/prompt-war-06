export type SmogSeverity = 'Moderate' | 'Unhealthy' | 'Severe Inversion';

export type HeatingSource =
  | 'Natural Gas Furnace'
  | 'Wood Stove / Fireplace'
  | 'Coal / Solid Fuel'
  | 'Electric Heat Pump'
  | 'District Heating'
  | 'Space Heaters';

export type CommuteMode =
  | 'Gasoline / Diesel Car'
  | 'Cold-Start Short Trips'
  | 'Public Transit / Rail'
  | 'E-Bike / Cargo Bike'
  | 'Walking / Carpool';

export type CookingFuel =
  | 'Gas Stove (Unvented)'
  | 'Gas Stove (Range Hood)'
  | 'Induction / Electric'
  | 'Biomass / Solid Fuel';

export interface HouseholdProfile {
  location: string;
  householdSize: number;
  housingType: 'Apartment' | 'Rowhouse / Townhome' | 'Detached House';
  heatingSource: HeatingSource;
  commuteMode: CommuteMode;
  cookingFuel: CookingFuel;
  sensitiveGroups: string[];
  budgetPriority: 'Zero / Low-Cost Hacks' | 'Moderate Upgrades' | 'Community Advocacy';
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface LocationOverview {
  city: string;
  estimatedWinterAqi: number;
  aqiCategory: string;
  estimatedPm25UgM3: number;
  inversionWindow: string;
  cleanestVentilationWindow: string;
  primaryLocalDrivers: string[];
}

export interface DailyRoutineStep {
  id: string;
  timeBlock: string;
  title: string;
  actionSteps: string[];
  whyThisHelps: string;
  pm25ExposureReductionPct: number;
  pm25EmissionsAvoidedGrams: number;
  co2eSavedKg: number;
  effortLevel: 'Low' | 'Medium' | 'High';
}

export interface IndoorAirHack {
  id: string;
  title: string;
  roomFocus: string;
  estimatedCost: string;
  cadrOrPm25Impact: string;
  steps: string[];
  scienceMechanism: string;
}

export interface SustainableAlternative {
  id: string;
  category: string;
  currentHabit: string;
  sustainableAlternative: string;
  directHouseholdImpact: string;
  communityMultiplierImpact: string;
  monthlyCo2eSavedKg: number;
  pm25ReductionGramsPerDay: number;
}

export interface CommunityPlaybook {
  title: string;
  neighborhoodAction: string;
  schoolOrTransitTip: string;
  collectiveImpactSummary: string;
}

export interface AirBriefingResponse {
  locationOverview: LocationOverview;
  dailyRoutines: DailyRoutineStep[];
  indoorAirHacks: IndoorAirHack[];
  sustainableAlternatives: SustainableAlternative[];
  communityPlaybook: CommunityPlaybook;
  liveContextSummary: string;
  groundingSources: GroundingSource[];
  generatedAt: string;
}

export interface ChoiceImpactAnalysis {
  choiceSummary: string;
  outdoorImpact: {
    pm25Grams: number;
    noxLevel: string;
    explanation: string;
  };
  indoorImpact: {
    peakPm25UgM3: number;
    clearanceMinutes: number;
    explanation: string;
  };
  healthMechanism: string;
  betterAlternative: {
    action: string;
    pm25ReductionPct: number;
    co2eSavedKg: number;
    communityRipple100Homes: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: GroundingSource[];
  timestamp: string;
}

export interface HourlyAqiPoint {
  hourLabel: string;
  aqi: number;
  pm25: number;
  pm10: number;
}

export interface DailyAqiTrendPoint {
  date: string;
  dayLabel: string;
  shortDay: string;
  avgAqi: number;
  peakAqi: number;
  minAqi: number;
  avgPm25: number;
  peakPm25: number;
  avgPm10: number;
  peakHourWindow: string;
  cleanestHourWindow: string;
  severityLabel: 'Good' | 'Moderate' | 'Sensitive' | 'Unhealthy' | 'Severe';
  hourlyPoints: HourlyAqiPoint[];
}

export interface AqiTrendResponse {
  resolvedLocation: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  source: string;
  days: DailyAqiTrendPoint[];
  highSmogAlert: {
    hasElevatedDays: boolean;
    highestDayLabel: string;
    highestPeakAqi: number;
    highestPeakWindow: string;
    summary: string;
  };
  fetchedAt: string;
}
