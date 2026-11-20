import { MapPin, RefreshCw } from "lucide-react";
import { CITY_PRESETS } from "../data/presets";
import type {
  CommuteMode,
  CookingFuel,
  HeatingSource,
  HouseholdProfile,
} from "../types/air";

interface ProfileConfiguratorProps {
  profile: HouseholdProfile;
  onChange: (next: HouseholdProfile) => void;
  onGenerate: () => void;
  loading: boolean;
}

const HEATING_OPTIONS: HeatingSource[] = [
  "Natural Gas Furnace",
  "Wood Stove / Fireplace",
  "Coal / Solid Fuel",
  "Electric Heat Pump",
  "District Heating",
  "Space Heaters",
];

const COMMUTE_OPTIONS: CommuteMode[] = [
  "Cold-Start Short Trips",
  "Gasoline / Diesel Car",
  "Public Transit / Rail",
  "E-Bike / Cargo Bike",
  "Walking / Carpool",
];

const COOKING_OPTIONS: CookingFuel[] = [
  "Gas Stove (Unvented)",
  "Gas Stove (Range Hood)",
  "Induction / Electric",
  "Biomass / Solid Fuel",
];

const SENSITIVE_OPTIONS = [
  "Infants / Toddlers",
  "School-Age Children",
  "Asthma / Respiratory Sensitivity",
  "Older Adults (65+)",
];

const BUDGET_OPTIONS: HouseholdProfile["budgetPriority"][] = [
  "Zero / Low-Cost Hacks",
  "Moderate Upgrades",
  "Community Advocacy",
];

export function ProfileConfigurator({
  profile,
  onChange,
  onGenerate,
  loading,
}: ProfileConfiguratorProps) {
  const toggleSensitive = (group: string) => {
    const exists = profile.sensitiveGroups.includes(group);
    const next = exists
      ? profile.sensitiveGroups.filter((g) => g !== group)
      : [...profile.sensitiveGroups, group];
    onChange({ ...profile, sensitiveGroups: next });
  };

  return (
    <section
      aria-labelledby="profile-heading"
      className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">
            Household &amp; Location Context
          </p>
          <h2
            id="profile-heading"
            className="text-2xl font-semibold tracking-tight text-slate-900"
          >
            Tailor your winter air plan
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 mr-1">Quick cities:</span>
          {CITY_PRESETS.map((preset) => {
            const active =
              profile.location.toLowerCase() === preset.profile.location.toLowerCase();
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange(preset.profile)}
                className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? "bg-emerald-800 text-white border-emerald-800"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onGenerate();
        }}
        className="pt-6 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div>
            <label
              htmlFor="location-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              City or Neighborhood
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="location-input"
                type="text"
                required
                value={profile.location}
                onChange={(e) => onChange({ ...profile, location: e.target.value })}
                placeholder="e.g., Salt Lake City, UT"
                className="w-full min-h-[42px] pl-9 pr-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="housing-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Home Type &amp; Residents
            </label>
            <div className="flex gap-2">
              <select
                id="housing-select"
                value={profile.housingType}
                onChange={(e) =>
                  onChange({
                    ...profile,
                    housingType: e.target.value as HouseholdProfile["housingType"],
                  })
                }
                className="flex-1 min-w-0 min-h-[42px] px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-700"
              >
                <option value="Apartment">Apartment</option>
                <option value="Rowhouse / Townhome">Rowhouse / Townhome</option>
                <option value="Detached House">Detached House</option>
              </select>
              <input
                type="number"
                min={1}
                max={12}
                aria-label="Household residents"
                value={profile.householdSize}
                onChange={(e) =>
                  onChange({
                    ...profile,
                    householdSize: Math.max(1, Math.min(12, Number(e.target.value) || 1)),
                  })
                }
                className="w-16 min-h-[42px] px-2.5 py-2 text-sm font-mono tabular-nums text-center text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="heating-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Primary Winter Heating
            </label>
            <select
              id="heating-select"
              value={profile.heatingSource}
              onChange={(e) =>
                onChange({ ...profile, heatingSource: e.target.value as HeatingSource })
              }
              className="w-full min-h-[42px] px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-700"
            >
              {HEATING_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="commute-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Daily Commute &amp; School Run
            </label>
            <select
              id="commute-select"
              value={profile.commuteMode}
              onChange={(e) =>
                onChange({ ...profile, commuteMode: e.target.value as CommuteMode })
              }
              className="w-full min-h-[42px] px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-700"
            >
              {COMMUTE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 items-start">
          <div className="lg:col-span-3">
            <label
              htmlFor="cooking-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Cooking Setup
            </label>
            <select
              id="cooking-select"
              value={profile.cookingFuel}
              onChange={(e) =>
                onChange({ ...profile, cookingFuel: e.target.value as CookingFuel })
              }
              className="w-full min-h-[42px] px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-700"
            >
              {COOKING_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-5">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Sensitive Household Members
            </span>
            <div className="flex flex-wrap gap-2">
              {SENSITIVE_OPTIONS.map((group) => {
                const selected = profile.sensitiveGroups.includes(group);
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => toggleSensitive(group)}
                    aria-pressed={selected}
                    className={`px-3 py-1.5 min-h-[38px] text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      selected
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {group}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-4">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Action Priority
            </span>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {BUDGET_OPTIONS.map((opt) => {
                const active = profile.budgetPriority === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onChange({ ...profile, budgetPriority: opt })}
                    className={`flex-1 px-2.5 py-2 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate cursor-pointer ${
                      active
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title={opt}
                  >
                    {opt === "Zero / Low-Cost Hacks"
                      ? "Low-Cost"
                      : opt === "Moderate Upgrades"
                      ? "Upgrades"
                      : "Community"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Generates location-grounded smog timing, indoor air protocols, and direct PM2.5 impact calculations.
          </p>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Analyzing Local Air..." : "Generate Tailored Plan"}
          </button>
        </div>
      </form>
    </section>
  );
}
