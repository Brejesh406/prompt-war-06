import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowDownRight } from "lucide-react";
import { AqiTrendChart } from "./components/AqiTrendChart";
import { CommunityAndAdvisor } from "./components/CommunityAndAdvisor";
import { DailyRoutineBoard } from "./components/DailyRoutineBoard";
import { ImpactLab } from "./components/ImpactLab";
import { IndoorAirProtocols } from "./components/IndoorAirProtocols";
import { ProfileConfigurator } from "./components/ProfileConfigurator";
import { ResilientImage } from "./components/ResilientImage";
import { TopNav } from "./components/TopNav";
import { CITY_PRESETS } from "./data/presets";
import type {
  AirBriefingResponse,
  AqiTrendResponse,
  HouseholdProfile,
} from "./types/air";

const STORAGE_PROFILE_KEY = "clearhearth_profile_v1";
const STORAGE_BRIEFING_KEY = "clearhearth_briefing_v1";
const STORAGE_COMPLETED_KEY = "clearhearth_completed_v1";

function getAqiStatusTone(aqi: number): {
  label: string;
  textClass: string;
} {
  if (aqi <= 50) return { label: "Good", textClass: "text-emerald-800" };
  if (aqi <= 100) return { label: "Moderate", textClass: "text-amber-700" };
  if (aqi <= 150) return { label: "Sensitive Alert", textClass: "text-amber-800" };
  return { label: "Severe Smog", textClass: "text-red-700" };
}

export default function App() {
  const [profile, setProfile] = useState<HouseholdProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROFILE_KEY);
      if (saved) return JSON.parse(saved) as HouseholdProfile;
    } catch {
      // Ignore storage errors
    }
    return CITY_PRESETS[0].profile;
  });

  const [briefing, setBriefing] = useState<AirBriefingResponse | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BRIEFING_KEY);
      if (saved) return JSON.parse(saved) as AirBriefingResponse;
    } catch {
      // Ignore storage errors
    }
    return null;
  });

  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COMPLETED_KEY);
      if (saved) return JSON.parse(saved) as string[];
    } catch {
      // Ignore storage errors
    }
    return [];
  });

  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [aqiTrend, setAqiTrend] = useState<AqiTrendResponse | null>(null);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);
  const advisorInputRef = useRef<HTMLInputElement | null>(null);
  const initialFetchTriggered = useRef(false);
  const initialTrendLocation = useRef<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage errors
    }
  }, [profile]);

  useEffect(() => {
    try {
      if (briefing) {
        localStorage.setItem(STORAGE_BRIEFING_KEY, JSON.stringify(briefing));
      }
    } catch {
      // Ignore storage errors
    }
  }, [briefing]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(completedIds));
    } catch {
      // Ignore storage errors
    }
  }, [completedIds]);

  const fetchAqiTrend = useCallback(async (location: string) => {
    const trimmed = location.trim();
    if (!trimmed) return;
    setLoadingTrend(true);
    setTrendError(null);
    try {
      const res = await fetch(
        `/api/aqi-trend?location=${encodeURIComponent(trimmed)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to fetch 7-day AQI forecast.");
      }
      setAqiTrend(data as AqiTrendResponse);
    } catch (err) {
      setTrendError(
        err instanceof Error ? err.message : "Failed to load 7-day AQI forecast."
      );
    } finally {
      setLoadingTrend(false);
    }
  }, []);

  const generateBriefing = useCallback(
    async (targetProfile: HouseholdProfile) => {
      setLoadingPlan(true);
      setPlanError(null);
      fetchAqiTrend(targetProfile.location);
      try {
        const res = await fetch("/api/air-briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: targetProfile }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Unable to generate air quality briefing.");
        }
        setBriefing(data as AirBriefingResponse);
        setCompletedIds([]);
      } catch (err) {
        setPlanError(
          err instanceof Error
            ? err.message
            : "Failed to connect to ClearHearth service."
        );
      } finally {
        setLoadingPlan(false);
      }
    },
    [fetchAqiTrend]
  );

  useEffect(() => {
    if (!briefing && !initialFetchTriggered.current) {
      initialFetchTriggered.current = true;
      generateBriefing(profile);
    }
  }, [briefing, generateBriefing, profile]);

  useEffect(() => {
    if (initialTrendLocation.current !== profile.location) {
      // Auto-load 7-day public forecast on initial mount or when switching presets
      if (initialTrendLocation.current === null) {
        initialTrendLocation.current = profile.location;
        fetchAqiTrend(profile.location);
      }
    }
  }, [fetchAqiTrend, profile.location]);

  const handleProfileChange = (next: HouseholdProfile) => {
    const locationChanged = next.location !== profile.location;
    setProfile(next);
    // Immediately refresh 7-day forecast when user selects a preset city
    const isPreset = CITY_PRESETS.some(
      (p) => p.profile.location.toLowerCase() === next.location.toLowerCase()
    );
    if (locationChanged && isPreset) {
      fetchAqiTrend(next.location);
    }
  };

  const handleToggleComplete = (id: string) => {
    setCompletedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleFocusAdvisor = () => {
    const section = document.getElementById("community-advisor");
    section?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => {
      advisorInputRef.current?.focus();
    }, 350);
  };

  const overview = briefing?.locationOverview;
  const aqiStatus = overview ? getAqiStatusTone(overview.estimatedWinterAqi) : null;

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F6F8F9] text-slate-900">
      <TopNav onAskAdvisor={handleFocusAdvisor} />

      <main className="flex-1 max-w-[1320px] w-full mx-auto px-6 lg:px-10 py-10 lg:py-12 space-y-12">
        {/* Hero Split Section */}
        <section aria-labelledby="hero-title" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-8 lg:p-10 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="text-xs font-medium text-slate-500">
                  Winter Smog &amp; Urban Air Assistant · Household &amp; Community Edition
                </div>
                <h1
                  id="hero-title"
                  className="text-4xl lg:text-[2.85rem] font-bold tracking-tight leading-[1.08] text-slate-900 [text-wrap:balance]"
                >
                  Navigate severe winter smog with clear, measurable choices.
                </h1>
                <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                  ClearHearth pairs local inversion timing with your home&apos;s heating, cooking, and commute habits—showing exactly how every daily swap cuts indoor PM2.5 exposure and neighborhood emissions.
                </p>
              </div>

              <div className="pt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#daily-plan"
                  className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  View Daily Routine
                </a>
                <a
                  href="#impact-lab"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Test Choice Impact</span>
                  <ArrowDownRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-6 border border-slate-200 rounded-xl overflow-hidden bg-white min-h-[300px]">
              <ResilientImage
                src="/src/assets/images/winter_home_clean_air_1795158664962.jpg"
                alt="Family living room with HEPA air purifier and indoor plants overlooking a misty winter cityscape"
                fallbackTitle="Protected Indoor Winter Sanctuary"
                className="w-full h-full lg:h-full object-cover"
              />
            </div>
          </div>

          {/* 4-Column Location Briefing Strip */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
              <div className="p-5 lg:p-6">
                <div className="text-xs font-medium text-slate-500">
                  Location &amp; Winter AQI
                </div>
                {loadingPlan && !overview ? (
                  <div className="mt-2 h-7 w-36 bg-slate-200 rounded animate-pulse" />
                ) : overview && aqiStatus ? (
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span
                      className={`text-2xl font-semibold font-mono tabular-nums ${aqiStatus.textClass}`}
                    >
                      {overview.estimatedWinterAqi} AQI
                    </span>
                    <span className={`text-xs font-semibold ${aqiStatus.textClass}`}>
                      {overview.aqiCategory}
                    </span>
                  </div>
                ) : (
                  <div className="mt-1.5 text-lg font-semibold text-slate-800">
                    {profile.location}
                  </div>
                )}
              </div>

              <div className="p-5 lg:p-6">
                <div className="text-xs font-medium text-slate-500">
                  Typical Winter PM2.5
                </div>
                {loadingPlan && !overview ? (
                  <div className="mt-2 h-7 w-28 bg-slate-200 rounded animate-pulse" />
                ) : (
                  <div className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
                    {overview ? `${overview.estimatedPm25UgM3} µg/m³` : "—"}
                  </div>
                )}
              </div>

              <div className="p-5 lg:p-6">
                <div className="text-xs font-medium text-slate-500">
                  Peak Inversion Trap Window
                </div>
                {loadingPlan && !overview ? (
                  <div className="mt-2 h-7 w-40 bg-slate-200 rounded animate-pulse" />
                ) : (
                  <div className="mt-1.5 text-base font-semibold font-mono tabular-nums text-slate-900">
                    {overview?.inversionWindow ?? "Generate plan to inspect"}
                  </div>
                )}
              </div>

              <div className="p-5 lg:p-6">
                <div className="text-xs font-medium text-slate-500">
                  Safest Ventilation Window
                </div>
                {loadingPlan && !overview ? (
                  <div className="mt-2 h-7 w-40 bg-slate-200 rounded animate-pulse" />
                ) : (
                  <div className="mt-1.5 text-base font-semibold font-mono tabular-nums text-emerald-800">
                    {overview?.cleanestVentilationWindow ?? "Generate plan to inspect"}
                  </div>
                )}
              </div>
            </div>

            {briefing?.liveContextSummary && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <p className="text-sm text-slate-700 leading-relaxed max-w-4xl">
                  <span className="font-semibold text-slate-900">Local Smog Briefing: </span>
                  {briefing.liveContextSummary}
                </p>
                {overview && overview.primaryLocalDrivers.length > 0 && (
                  <div className="text-xs text-slate-500 shrink-0">
                    Drivers: {overview.primaryLocalDrivers.slice(0, 3).join(" · ")}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {planError && (
          <div
            role="alert"
            className="p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-red-900"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
              <span>{planError}</span>
            </div>
            <button
              type="button"
              onClick={() => generateBriefing(profile)}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Retry Request
            </button>
          </div>
        )}

        {/* Household & Location Profile Configurator */}
        <ProfileConfigurator
          profile={profile}
          onChange={handleProfileChange}
          onGenerate={() => generateBriefing(profile)}
          loading={loadingPlan}
        />

        {/* 7-Day Public Weather & Air Quality Forecast Trend */}
        <AqiTrendChart
          trend={aqiTrend}
          loading={loadingTrend}
          error={trendError}
          onRefresh={() => fetchAqiTrend(profile.location)}
        />

        {/* Section 1: Low-Emission Daily Routines */}
        <DailyRoutineBoard
          routines={briefing?.dailyRoutines ?? []}
          completedIds={completedIds}
          onToggleComplete={handleToggleComplete}
          loading={loadingPlan}
          onGenerate={() => generateBriefing(profile)}
        />

        {/* Section 2: Indoor Air Quality Hacks & Room Clearance Calculator */}
        <IndoorAirProtocols
          hacks={briefing?.indoorAirHacks ?? []}
          defaultOutdoorPm25={overview?.estimatedPm25UgM3 ?? 115}
          loading={loadingPlan}
        />

        {/* Section 3: Sustainable Swaps & GenAI Choice Analyzer */}
        <ImpactLab
          alternatives={briefing?.sustainableAlternatives ?? []}
          profile={profile}
          loadingPlan={loadingPlan}
        />

        {/* Section 4: Community Playbook & GenAI Advisor */}
        <CommunityAndAdvisor
          playbook={briefing?.communityPlaybook ?? null}
          groundingSources={briefing?.groundingSources ?? []}
          profile={profile}
          advisorInputRef={advisorInputRef}
        />
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1320px] mx-auto px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            ClearHearth · Practical winter air quality &amp; low-emission guidance for families and neighborhoods.
          </div>
          <div className="flex items-center gap-5">
            <a href="#daily-plan" className="hover:text-slate-800">
              Daily Plan
            </a>
            <a href="#indoor-air" className="hover:text-slate-800">
              Indoor Air
            </a>
            <a href="#impact-lab" className="hover:text-slate-800">
              Impact Lab
            </a>
            <a href="#community-advisor" className="hover:text-slate-800">
              Community
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
