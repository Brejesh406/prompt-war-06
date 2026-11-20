import type { HouseholdProfile } from "../types/air";

export interface CityPreset {
  label: string;
  region: string;
  profile: HouseholdProfile;
}

export const CITY_PRESETS: CityPreset[] = [
  {
    label: "Salt Lake City, UT",
    region: "Mountain Basin Inversion",
    profile: {
      location: "Salt Lake City, UT",
      householdSize: 4,
      housingType: "Rowhouse / Townhome",
      heatingSource: "Natural Gas Furnace",
      commuteMode: "Cold-Start Short Trips",
      cookingFuel: "Gas Stove (Range Hood)",
      sensitiveGroups: ["School-Age Children"],
      budgetPriority: "Zero / Low-Cost Hacks",
    },
  },
  {
    label: "New Delhi, India",
    region: "Severe Winter Haze",
    profile: {
      location: "New Delhi, India",
      householdSize: 5,
      housingType: "Apartment",
      heatingSource: "Space Heaters",
      commuteMode: "Public Transit / Rail",
      cookingFuel: "Gas Stove (Range Hood)",
      sensitiveGroups: ["Older Adults (65+)", "School-Age Children"],
      budgetPriority: "Moderate Upgrades",
    },
  },
  {
    label: "Kraków, Poland",
    region: "Winter Heating Valley",
    profile: {
      location: "Kraków, Poland",
      householdSize: 3,
      housingType: "Apartment",
      heatingSource: "District Heating",
      commuteMode: "Public Transit / Rail",
      cookingFuel: "Induction / Electric",
      sensitiveGroups: ["Asthma / Respiratory Sensitivity"],
      budgetPriority: "Community Advocacy",
    },
  },
  {
    label: "Fairbanks, AK",
    region: "Sub-Arctic Ice Fog & Wood Smoke",
    profile: {
      location: "Fairbanks, AK",
      householdSize: 3,
      housingType: "Detached House",
      heatingSource: "Wood Stove / Fireplace",
      commuteMode: "Gasoline / Diesel Car",
      cookingFuel: "Induction / Electric",
      sensitiveGroups: ["Infants / Toddlers"],
      budgetPriority: "Moderate Upgrades",
    },
  },
];

export interface RoomFiltrationInputs {
  roomAreaSqFt: number;
  ceilingHeightFt: number;
  outdoorPm25: number;
  purifierType: "none" | "diy-corsi" | "hepa-medium" | "hepa-large";
  weatherSealed: boolean;
}

export interface RoomFiltrationMetrics {
  roomVolumeM3: number;
  airChangesPerHour: number;
  estimatedIndoorPm25: number;
  reductionPct: number;
  whoSafeRatio: string;
}

/**
 * Single-zone steady-state indoor PM2.5 mass-balance model:
 * C_in = C_out * (P * a) / (a + k_dep + k_cad)
 * Penetration factor P = 0.72 (typical building envelope)
 * Deposition rate k_dep = 0.39 /hr
 * Air infiltration rate a = 0.35 /hr (sealed) or 0.95 /hr (drafty)
 */
export function computeRoomFiltration(inputs: RoomFiltrationInputs): RoomFiltrationMetrics {
  const volumeFt3 = inputs.roomAreaSqFt * inputs.ceilingHeightFt;
  const roomVolumeM3 = Math.max(12, volumeFt3 * 0.0283168);

  const cadrCfmMap: Record<RoomFiltrationInputs["purifierType"], number> = {
    none: 0,
    "diy-corsi": 340,
    "hepa-medium": 210,
    "hepa-large": 400,
  };

  const cadrCfm = cadrCfmMap[inputs.purifierType];
  const cadrM3PerHr = cadrCfm * 1.699;
  const kCad = cadrM3PerHr / roomVolumeM3;
  const infiltrationAch = inputs.weatherSealed ? 0.35 : 0.95;
  const penetration = inputs.weatherSealed ? 0.65 : 0.82;
  const deposition = 0.39;

  const estimatedIndoorPm25 = Math.round(
    inputs.outdoorPm25 *
      ((penetration * infiltrationAch) / (infiltrationAch + deposition + kCad))
  );

  const baselineUnfiltered = Math.round(
    inputs.outdoorPm25 * ((0.82 * 0.95) / (0.95 + deposition))
  );

  const reductionPct =
    baselineUnfiltered > 0
      ? Math.max(0, Math.round(((baselineUnfiltered - estimatedIndoorPm25) / baselineUnfiltered) * 100))
      : 0;

  const totalAch = Number((infiltrationAch + kCad).toFixed(1));
  const whoRatio =
    estimatedIndoorPm25 <= 15
      ? "Within WHO 24h guideline (≤ 15 µg/m³)"
      : estimatedIndoorPm25 <= 35
      ? "Moderate indoor load (16–35 µg/m³)"
      : "Elevated indoor load (> 35 µg/m³)";

  return {
    roomVolumeM3: Math.round(roomVolumeM3),
    airChangesPerHour: totalAch,
    estimatedIndoorPm25,
    reductionPct,
    whoSafeRatio: whoRatio,
  };
}
