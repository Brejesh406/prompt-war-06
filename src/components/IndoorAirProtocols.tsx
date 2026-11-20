import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { computeRoomFiltration, type RoomFiltrationInputs } from "../data/presets";
import type { IndoorAirHack } from "../types/air";
import { ResilientImage } from "./ResilientImage";

interface IndoorAirProtocolsProps {
  hacks: IndoorAirHack[];
  defaultOutdoorPm25?: number;
  loading: boolean;
}

export function IndoorAirProtocols({
  hacks,
  defaultOutdoorPm25 = 115,
  loading,
}: IndoorAirProtocolsProps) {
  const [inputs, setInputs] = useState<RoomFiltrationInputs>({
    roomAreaSqFt: 320,
    ceilingHeightFt: 9,
    outdoorPm25: defaultOutdoorPm25,
    purifierType: "diy-corsi",
    weatherSealed: true,
  });

  const metrics = computeRoomFiltration(inputs);

  return (
    <section
      id="indoor-air"
      aria-labelledby="indoor-heading"
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">
            02. Home Filtration &amp; Ventilation Physics
          </p>
          <h2
            id="indoor-heading"
            className="text-3xl font-semibold tracking-tight text-slate-900"
          >
            Indoor air quality protocols
          </h2>
        </div>
        <p className="text-sm text-slate-600 max-w-xl">
          Practical room-by-room interventions that trap sub-2.5-micron particulates indoors while preventing cooking and draft spikes.
        </p>
      </div>

      {/* Interactive Room Clearance Calculator + Editorial Visual */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 lg:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Clean-room PM2.5 clearance simulator
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Single-zone steady-state mass-balance estimate
                </p>
              </div>
              <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-5">
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                  <span>Outdoor Smog (PM2.5)</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {inputs.outdoorPm25} µg/m³
                  </span>
                </div>
                <input
                  type="range"
                  min={25}
                  max={350}
                  step={5}
                  value={inputs.outdoorPm25}
                  onChange={(e) =>
                    setInputs({ ...inputs, outdoorPm25: Number(e.target.value) })
                  }
                  aria-label="Outdoor PM2.5 in micrograms per cubic meter"
                  className="w-full accent-emerald-800 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                  <span>Room Floor Area</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {inputs.roomAreaSqFt} sq ft
                  </span>
                </div>
                <input
                  type="range"
                  min={120}
                  max={800}
                  step={20}
                  value={inputs.roomAreaSqFt}
                  onChange={(e) =>
                    setInputs({ ...inputs, roomAreaSqFt: Number(e.target.value) })
                  }
                  aria-label="Room floor area in square feet"
                  className="w-full accent-emerald-800 cursor-pointer"
                />
              </div>

              <div>
                <label
                  htmlFor="purifier-select"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Filtration Setup
                </label>
                <select
                  id="purifier-select"
                  value={inputs.purifierType}
                  onChange={(e) =>
                    setInputs({
                      ...inputs,
                      purifierType: e.target.value as RoomFiltrationInputs["purifierType"],
                    })
                  }
                  className="w-full min-h-[40px] px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-700"
                >
                  <option value="none">No active filter</option>
                  <option value="diy-corsi">DIY Corsi-Rosenthal (4x MERV-13)</option>
                  <option value="hepa-medium">Bedroom HEPA H13 (210 CFM)</option>
                  <option value="hepa-large">Living Room HEPA H13 (400 CFM)</option>
                </select>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-700 mb-1.5">
                  Window &amp; Door Draft Sealing
                </span>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setInputs({ ...inputs, weatherSealed: false })}
                    className={`flex-1 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      !inputs.weatherSealed
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Drafty (0.95 ACH)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputs({ ...inputs, weatherSealed: true })}
                    className={`flex-1 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      inputs.weatherSealed
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Sealed (0.35 ACH)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-slate-500">Projected Indoor PM2.5</div>
              <div
                className={`mt-1 text-2xl font-semibold font-mono tabular-nums ${
                  metrics.estimatedIndoorPm25 <= 15
                    ? "text-emerald-800"
                    : metrics.estimatedIndoorPm25 <= 35
                    ? "text-amber-700"
                    : "text-red-700"
                }`}
              >
                {metrics.estimatedIndoorPm25} µg/m³
              </div>
              <div className="text-xs text-slate-600 mt-0.5">{metrics.whoSafeRatio}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Clean Air Turnover</div>
              <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-slate-900">
                {metrics.airChangesPerHour} ACH
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {metrics.roomVolumeM3} m³ room volume
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Vs. Unsealed Baseline</div>
              <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-emerald-800">
                -{metrics.reductionPct}%
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Fine particulate load cut
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="relative flex-1 min-h-[240px]">
            <ResilientImage
              src="/src/assets/images/indoor_filtration_setup_1795158665006.jpg"
              alt="Clean kitchen induction setup with vented range hood and digital PM2.5 indoor air monitor"
              fallbackTitle="Kitchen Ventilation & PM2.5 Monitoring"
              className="w-full h-full lg:h-full object-cover"
            />
          </div>
          <div className="p-5 border-t border-slate-200">
            <p className="text-xs font-medium text-slate-500 mb-1">
              Indoor Source Control
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              Cooking with unvented gas or high-heat oil spikes indoor PM2.5 above{" "}
              <span className="font-mono tabular-nums font-medium">200 µg/m³</span>. Running a ducted hood or simmering with lids cuts indoor combustion particles before they settle into bedrooms.
            </p>
          </div>
        </div>
      </div>

      {/* GenAI Tailored Indoor Hacks Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse space-y-3"
            >
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-5 w-64 bg-slate-200 rounded" />
              <div className="h-16 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : hacks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hacks.map((hack) => (
            <article
              key={hack.id}
              className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
                  <span>{hack.roomFocus}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-slate-700">
                    Est. {hack.estimatedCost}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-emerald-800 font-medium">
                    {hack.cadrOrPm25Impact}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  {hack.title}
                </h3>

                <ol className="space-y-1.5 text-sm text-slate-700 list-decimal pl-5 mb-4">
                  {hack.steps.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ol>
              </div>

              <div className="pt-4 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                <span className="font-semibold text-slate-800">Why it works: </span>
                {hack.scienceMechanism}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
