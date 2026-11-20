import { useState } from "react";
import { Check, Clock } from "lucide-react";
import type { DailyRoutineStep } from "../types/air";

interface DailyRoutineBoardProps {
  routines: DailyRoutineStep[];
  completedIds: string[];
  onToggleComplete: (id: string) => void;
  loading: boolean;
  onGenerate: () => void;
}

type EffortFilter = "All" | "Low" | "Medium" | "High";

export function DailyRoutineBoard({
  routines,
  completedIds,
  onToggleComplete,
  loading,
  onGenerate,
}: DailyRoutineBoardProps) {
  const [filter, setFilter] = useState<EffortFilter>("All");

  const filteredRoutines =
    filter === "All"
      ? routines
      : routines.filter((r) => r.effortLevel.toLowerCase() === filter.toLowerCase());

  const completedRoutines = routines.filter((r) => completedIds.includes(r.id));
  const totalExposureReduction = Math.min(
    85,
    completedRoutines.reduce((sum, r) => sum + (r.pm25ExposureReductionPct || 0), 0)
  );
  const totalPm25Avoided = completedRoutines.reduce(
    (sum, r) => sum + (r.pm25EmissionsAvoidedGrams || 0),
    0
  );
  const totalCo2eSaved = completedRoutines.reduce(
    (sum, r) => sum + (r.co2eSavedKg || 0),
    0
  );

  return (
    <section
      id="daily-plan"
      aria-labelledby="routine-heading"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      <div className="p-6 lg:p-8 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">
            01. Time-Blocked Daily Schedule
          </p>
          <h2
            id="routine-heading"
            className="text-2xl font-semibold tracking-tight text-slate-900"
          >
            Low-emission daily routines
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(["All", "Low", "Medium", "High"] as EffortFilter[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setFilter(level)}
                className={`px-3 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === level
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {level === "All" ? "All Steps" : `${level} Effort`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Checked Impact Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-slate-50/70 border-b border-slate-200">
        <div className="px-6 py-4">
          <div className="text-xs font-medium text-slate-500">
            Today&apos;s Checked Habits
          </div>
          <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-slate-900">
            {completedRoutines.length} / {routines.length}
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="text-xs font-medium text-slate-500">
            Estimated PM2.5 Exposure Cut
          </div>
          <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-emerald-800">
            -{totalExposureReduction}%
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="text-xs font-medium text-slate-500">
            Local Emissions Avoided Today
          </div>
          <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-slate-900">
            {totalPm25Avoided.toFixed(1)} g PM2.5 · {totalCo2eSaved.toFixed(1)} kg CO2e
          </div>
        </div>
      </div>

      {loading ? (
        <div className="divide-y divide-slate-200">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="p-6 lg:px-8 animate-pulse space-y-3">
              <div className="h-4 w-40 bg-slate-200 rounded" />
              <div className="h-5 w-80 bg-slate-200 rounded" />
              <div className="h-4 w-full max-w-2xl bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : routines.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-sm text-slate-600 mb-4 max-w-md mx-auto">
            Select your city and household setup above to generate a time-blocked daily smog routine with direct emission and exposure metrics.
          </p>
          <button
            type="button"
            onClick={onGenerate}
            className="px-5 py-2.5 min-h-[40px] text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
          >
            Generate Tailored Plan
          </button>
        </div>
      ) : filteredRoutines.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-600">
          No routine steps match the selected effort filter.
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {filteredRoutines.map((step) => {
            const checked = completedIds.includes(step.id);
            return (
              <div
                key={step.id}
                className={`p-6 lg:px-8 transition-colors ${
                  checked ? "bg-emerald-50/40" : "bg-white hover:bg-slate-50/50"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <button
                      type="button"
                      onClick={() => onToggleComplete(step.id)}
                      aria-pressed={checked}
                      aria-label={`Mark "${step.title}" as ${
                        checked ? "incomplete" : "complete"
                      }`}
                      className={`mt-0.5 w-6 h-6 min-w-[24px] rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                        checked
                          ? "bg-emerald-800 border-emerald-800 text-white"
                          : "bg-white border-slate-300 text-transparent hover:border-emerald-700"
                      }`}
                    >
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                    </button>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums font-medium text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {step.timeBlock}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{step.effortLevel} effort</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-emerald-800 font-medium">
                          -{step.pm25ExposureReductionPct}% exposure
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-slate-700">
                          -{step.pm25EmissionsAvoidedGrams} g PM2.5 / day
                        </span>
                      </div>

                      <h3
                        className={`text-lg font-semibold ${
                          checked ? "text-slate-600 line-through" : "text-slate-900"
                        }`}
                      >
                        {step.title}
                      </h3>

                      <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">
                        {step.actionSteps.map((action, idx) => (
                          <li key={idx}>{action}</li>
                        ))}
                      </ul>

                      <p className="pt-1 text-sm text-slate-600 leading-relaxed max-w-3xl">
                        <span className="font-semibold text-slate-800">Direct impact: </span>
                        {step.whyThisHelps}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
