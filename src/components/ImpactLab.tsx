import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import type {
  ChoiceImpactAnalysis,
  HouseholdProfile,
  SustainableAlternative,
} from "../types/air";

interface ImpactLabProps {
  alternatives: SustainableAlternative[];
  profile: HouseholdProfile;
  loadingPlan: boolean;
}

const SAMPLE_CHOICES = [
  "Burning dry wood in a fireplace for 3 hours vs electric heat pump",
  "Idling my car for 10 minutes to defrost vs 30-second gentle drive",
  "Stir-frying on a gas stove without running the exhaust hood",
  "Opening bedroom windows at 8 PM during a cold winter inversion",
];

export function ImpactLab({
  alternatives,
  profile,
  loadingPlan,
}: ImpactLabProps) {
  const [choiceText, setChoiceText] = useState(SAMPLE_CHOICES[0]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ChoiceImpactAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (promptToRun?: string) => {
    const query = (promptToRun ?? choiceText).trim();
    if (!query) return;

    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/explain-choice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: query, profile }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to analyze this choice.");
      }
      setAnalysis(data as ChoiceImpactAnalysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze choice.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <section
      id="impact-lab"
      aria-labelledby="impact-heading"
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">
            03. Direct Cause-and-Effect Ledger
          </p>
          <h2
            id="impact-heading"
            className="text-3xl font-semibold tracking-tight text-slate-900"
          >
            Sustainable swaps &amp; impact analyzer
          </h2>
        </div>
        <p className="text-sm text-slate-600 max-w-xl">
          Compare everyday habits against low-emission alternatives and see the exact outdoor emissions and indoor particle changes for your family and street.
        </p>
      </div>

      {/* Sustainable Alternatives Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-slate-900">
            Tailored habit-to-alternative swaps
          </h3>
          <span className="text-xs text-slate-500">
            Household &amp; 100-neighbor scale
          </span>
        </div>

        {loadingPlan ? (
          <div className="p-6 space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded" />
            ))}
          </div>
        ) : alternatives.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-6">Domain</th>
                  <th className="py-3 px-6">Current Habit</th>
                  <th className="py-3 px-6">Low-Emission Alternative</th>
                  <th className="py-3 px-6 text-right">PM2.5 Cut / Day</th>
                  <th className="py-3 px-6 text-right">CO2e Saved / Mo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {alternatives.map((alt) => (
                  <tr key={alt.id} className="hover:bg-slate-50/70 align-top">
                    <td className="py-4 px-6 font-medium text-slate-900 whitespace-nowrap">
                      {alt.category}
                    </td>
                    <td className="py-4 px-6 text-slate-600 min-w-[200px]">
                      {alt.currentHabit}
                    </td>
                    <td className="py-4 px-6 text-slate-900 min-w-[260px]">
                      <div className="font-medium text-slate-900">
                        {alt.sustainableAlternative}
                      </div>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        {alt.directHouseholdImpact}
                      </p>
                      <p className="mt-1 text-xs text-emerald-800 leading-relaxed">
                        Neighborhood ripple: {alt.communityMultiplierImpact}
                      </p>
                    </td>
                    <td className="py-4 px-6 text-right font-mono tabular-nums font-medium text-emerald-800 whitespace-nowrap">
                      -{alt.pm25ReductionGramsPerDay} g
                    </td>
                    <td className="py-4 px-6 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                      -{alt.monthlyCo2eSavedKg} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-600">
            Generate your tailored plan above to populate habit-to-alternative impact comparisons.
          </div>
        )}
      </div>

      {/* GenAI "Explain Any Choice" Analyzer */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Evaluate any daily choice with GenAI
            </h3>
            <p className="text-sm text-slate-600 mt-0.5">
              Test a real winter decision to see its outdoor PM2.5 output, indoor concentration spike, and lung health mechanism.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAnalyze();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={choiceText}
              onChange={(e) => setChoiceText(e.target.value)}
              placeholder="Describe a heating, cooking, commuting, or ventilation choice..."
              aria-label="Daily choice to evaluate"
              className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            />
          </div>
          <button
            type="submit"
            disabled={analyzing || !choiceText.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>{analyzing ? "Evaluating..." : "Analyze Impact"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Examples:</span>
          {SAMPLE_CHOICES.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setChoiceText(sample);
                handleAnalyze(sample);
              }}
              className="px-3 py-1.5 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-left cursor-pointer"
            >
              {sample}
            </button>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            className="p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg"
          >
            {error}
          </div>
        )}

        {analysis && (
          <div className="pt-6 border-t border-slate-200 space-y-6">
            <div>
              <p className="text-xs font-medium text-slate-500">Evaluated Choice</p>
              <h4 className="text-lg font-semibold text-slate-900 mt-0.5">
                {analysis.choiceSummary}
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-slate-500">
                  Outdoor Smog Contribution
                </div>
                <div className="text-xl font-semibold font-mono tabular-nums text-slate-900">
                  {analysis.outdoorImpact.pm25Grams} g PM2.5 · {analysis.outdoorImpact.noxLevel} NOx
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {analysis.outdoorImpact.explanation}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-medium text-slate-500">
                  Indoor Air Concentration
                </div>
                <div className="text-xl font-semibold font-mono tabular-nums text-amber-700">
                  Peak {analysis.indoorImpact.peakPm25UgM3} µg/m³ · {analysis.indoorImpact.clearanceMinutes} min decay
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {analysis.indoorImpact.explanation}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-medium text-slate-500">
                  Lower-Emission Alternative
                </div>
                <div className="text-xl font-semibold font-mono tabular-nums text-emerald-800">
                  -{analysis.betterAlternative.pm25ReductionPct}% PM2.5 · -{analysis.betterAlternative.co2eSavedKg} kg CO2e
                </div>
                <p className="text-sm text-slate-900 font-medium">
                  {analysis.betterAlternative.action}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  100-home ripple: {analysis.betterAlternative.communityRipple100Homes}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-sm text-slate-700 leading-relaxed">
              <span className="font-semibold text-slate-900">Respiratory mechanism: </span>
              {analysis.healthMechanism}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
