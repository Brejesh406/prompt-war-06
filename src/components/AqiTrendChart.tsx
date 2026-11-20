import { useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { AqiTrendResponse, DailyAqiTrendPoint } from "../types/air";

interface AqiTrendChartProps {
  trend: AqiTrendResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

type MetricMode = "aqi" | "pm25";

function getSeverityColor(severity: DailyAqiTrendPoint["severityLabel"]): {
  stroke: string;
  fill: string;
  text: string;
} {
  switch (severity) {
    case "Good":
      return {
        stroke: "#16A34A",
        fill: "#16A34A",
        text: "text-emerald-800",
      };
    case "Moderate":
      return {
        stroke: "#D97706",
        fill: "#D97706",
        text: "text-amber-700",
      };
    case "Sensitive":
      return {
        stroke: "#EA580C",
        fill: "#EA580C",
        text: "text-orange-700",
      };
    default:
      return {
        stroke: "#DC2626",
        fill: "#DC2626",
        text: "text-red-700",
      };
  }
}

export function AqiTrendChart({
  trend,
  loading,
  error,
  onRefresh,
}: AqiTrendChartProps) {
  const [metric, setMetric] = useState<MetricMode>("aqi");
  const [selectedIdx, setSelectedIdx] = useState<number>(2);

  const days = trend?.days ?? [];
  const safeSelectedIdx =
    days.length > 0 ? Math.min(selectedIdx, days.length - 1) : 0;
  const selectedDay = days[safeSelectedIdx] ?? null;

  // Compute SVG chart geometry (720 x 230 viewBox)
  const chartW = 760;
  const chartH = 220;
  const padLeft = 48;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 34;
  const innerW = chartW - padLeft - padRight;
  const innerH = chartH - padTop - padBottom;

  const rawMax =
    days.length > 0
      ? Math.max(
          ...days.map((d) => (metric === "aqi" ? d.peakAqi : d.peakPm25)),
          metric === "aqi" ? 120 : 40
        )
      : metric === "aqi"
      ? 150
      : 50;
  const yMax = Math.ceil(rawMax / 25) * 25;

  const getX = (idx: number) => {
    if (days.length <= 1) return padLeft + innerW / 2;
    return padLeft + (idx / (days.length - 1)) * innerW;
  };

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(yMax, val));
    return padTop + innerH - (clamped / yMax) * innerH;
  };

  const peakPoints = days
    .map((d, i) => {
      const val = metric === "aqi" ? d.peakAqi : d.peakPm25;
      return `${getX(i).toFixed(1)},${getY(val).toFixed(1)}`;
    })
    .join(" ");

  const avgPoints = days
    .map((d, i) => {
      const val = metric === "aqi" ? d.avgAqi : d.avgPm25;
      return `${getX(i).toFixed(1)},${getY(val).toFixed(1)}`;
    })
    .join(" ");

  const areaPath =
    days.length > 1
      ? `M ${getX(0).toFixed(1)},${(padTop + innerH).toFixed(1)} ` +
        days
          .map((d, i) => {
            const val = metric === "aqi" ? d.peakAqi : d.peakPm25;
            return `L ${getX(i).toFixed(1)},${getY(val).toFixed(1)}`;
          })
          .join(" ") +
        ` L ${getX(days.length - 1).toFixed(1)},${(padTop + innerH).toFixed(1)} Z`
      : "";

  const thresholdValue = metric === "aqi" ? 100 : 15;
  const thresholdLabel =
    metric === "aqi" ? "100 AQI Sensitive" : "15 µg/m³ WHO 24h";
  const showThreshold = thresholdValue <= yMax;

  const yTicks = [0, Math.round(yMax * 0.33), Math.round(yMax * 0.66), yMax];

  return (
    <section
      id="aqi-trend"
      aria-labelledby="aqi-trend-heading"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 lg:p-8 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">
            Public Weather &amp; Air Quality Forecast
          </p>
          <h2
            id="aqi-trend-heading"
            className="text-2xl font-semibold tracking-tight text-slate-900"
          >
            7-day local AQI trend
          </h2>
          {trend && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>
                {trend.resolvedLocation}
                {trend.country ? `, ${trend.country}` : ""}
              </span>
              <span aria-hidden="true">·</span>
              <span>{trend.source}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {trend.latitude.toFixed(2)}, {trend.longitude.toFixed(2)} ({trend.timezone})
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setMetric("aqi")}
              className={`px-3 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metric === "aqi"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              US AQI
            </button>
            <button
              type="button"
              onClick={() => setMetric("pm25")}
              className={`px-3 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metric === "pm25"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              PM2.5 (µg/m³)
            </button>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Loading..." : "Refresh Forecast"}</span>
          </button>
        </div>
      </div>

      {/* Advance High-Smog Alert Strip */}
      {trend && (
        <div
          className={`px-6 lg:px-8 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm ${
            trend.highSmogAlert.hasElevatedDays
              ? "bg-amber-50/70 text-amber-950"
              : "bg-emerald-50/50 text-emerald-950"
          }`}
        >
          <div className="flex items-start sm:items-center gap-2.5">
            {trend.highSmogAlert.hasElevatedDays && (
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <p className="leading-snug">
              <span className="font-semibold">
                {trend.highSmogAlert.hasElevatedDays
                  ? "High-Smog Anticipation Alert: "
                  : "7-Day Air Outlook: "}
              </span>
              {trend.highSmogAlert.summary}
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums font-medium shrink-0">
            Peak {trend.highSmogAlert.highestPeakAqi} AQI · {trend.highSmogAlert.highestDayLabel}
          </span>
        </div>
      )}

      {error ? (
        <div className="p-8 text-center space-y-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={onRefresh}
            className="px-4 py-2 min-h-[40px] text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Retry 7-Day Forecast
          </button>
        </div>
      ) : loading && days.length === 0 ? (
        <div className="p-6 lg:p-8 space-y-4 animate-pulse">
          <div className="h-[220px] w-full bg-slate-100 rounded-lg" />
          <div className="grid grid-cols-7 gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-lg" />
            ))}
          </div>
        </div>
      ) : days.length > 0 ? (
        <div className="p-6 lg:p-8 space-y-6">
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-5">
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-0.5 bg-slate-900 inline-block" />
                Daily Peak ({metric === "aqi" ? "US AQI" : "µg/m³"})
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-emerald-700 inline-block" />
                Daily Mean
              </span>
              {showThreshold && (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-0.5 border-t border-dashed border-amber-600 inline-block" />
                  {thresholdLabel}
                </span>
              )}
            </div>
            <span className="text-slate-500">
              Select any day below to inspect 24-hour smog timing
            </span>
          </div>

          {/* Responsive SVG Chart */}
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              role="img"
              aria-label={`7-day ${
                metric === "aqi" ? "US AQI" : "PM2.5"
              } forecast trend chart for ${trend?.resolvedLocation}`}
              className="w-full min-w-[540px] h-auto select-none"
            >
              {/* Horizontal Y Gridlines */}
              {yTicks.map((tick) => {
                const y = getY(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={chartW - padRight}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-500 text-[11px]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* Threshold Reference Line */}
              {showThreshold && (
                <g>
                  <line
                    x1={padLeft}
                    y1={getY(thresholdValue)}
                    x2={chartW - padRight}
                    y2={getY(thresholdValue)}
                    stroke="#D97706"
                    strokeWidth="1.25"
                    strokeDasharray="4 4"
                  />
                </g>
              )}

              {/* Area under Peak Curve */}
              {areaPath && (
                <path d={areaPath} fill="#0F172A" fillOpacity="0.05" />
              )}

              {/* Daily Average Dashed Line */}
              {days.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#047857"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  points={avgPoints}
                />
              )}

              {/* Daily Peak Solid Line */}
              {days.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#0F172A"
                  strokeWidth="2.5"
                  points={peakPoints}
                />
              )}

              {/* Interactive Day Stems & Nodes */}
              {days.map((d, idx) => {
                const x = getX(idx);
                const peakVal = metric === "aqi" ? d.peakAqi : d.peakPm25;
                const avgVal = metric === "aqi" ? d.avgAqi : d.avgPm25;
                const yPeak = getY(peakVal);
                const yAvg = getY(avgVal);
                const colors = getSeverityColor(d.severityLabel);
                const isSelected = idx === safeSelectedIdx;

                return (
                  <g
                    key={d.date}
                    onClick={() => setSelectedIdx(idx)}
                    className="cursor-pointer"
                  >
                    {/* Wide invisible hit target */}
                    <rect
                      x={x - 36}
                      y={padTop}
                      width={72}
                      height={innerH + padBottom}
                      fill="transparent"
                    />

                    {/* Selected highlight column */}
                    {isSelected && (
                      <rect
                        x={x - 24}
                        y={padTop}
                        width={48}
                        height={innerH}
                        rx={6}
                        fill="#0F172A"
                        fillOpacity="0.04"
                      />
                    )}

                    {/* Range stem from average to peak */}
                    <line
                      x1={x}
                      y1={yPeak}
                      x2={x}
                      y2={yAvg}
                      stroke={colors.stroke}
                      strokeWidth="2"
                      strokeOpacity="0.45"
                    />

                    {/* Average point */}
                    <circle
                      cx={x}
                      cy={yAvg}
                      r={3.5}
                      fill="#FFFFFF"
                      stroke="#047857"
                      strokeWidth="2"
                    />

                    {/* Peak point */}
                    <circle
                      cx={x}
                      cy={yPeak}
                      r={isSelected ? 6.5 : 5}
                      fill={colors.fill}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />

                    {/* Peak numeric readout above dot */}
                    <text
                      x={x}
                      y={Math.max(12, yPeak - 10)}
                      textAnchor="middle"
                      className="fill-slate-900 text-[11px] font-semibold"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {peakVal}
                    </text>

                    {/* Day X-axis label */}
                    <text
                      x={x}
                      y={chartH - 10}
                      textAnchor="middle"
                      className={`text-[11px] ${
                        isSelected ? "fill-slate-900 font-semibold" : "fill-slate-500"
                      }`}
                    >
                      {d.shortDay}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* 7-Day Selector Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {days.map((d, idx) => {
              const isSelected = idx === safeSelectedIdx;
              const colors = getSeverityColor(d.severityLabel);
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelectedIdx(idx)}
                  aria-pressed={isSelected}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50/80 text-slate-900 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <div
                    className={`text-xs font-medium ${
                      isSelected ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {d.shortDay}
                  </div>
                  <div className="mt-1 text-base font-semibold font-mono tabular-nums">
                    {metric === "aqi" ? `${d.peakAqi} AQI` : `${d.peakPm25} µg`}
                  </div>
                  <div
                    className={`mt-0.5 text-xs font-medium ${
                      isSelected ? "text-emerald-300" : colors.text
                    }`}
                  >
                    {d.severityLabel}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Day 24-Hour Timing Breakdown */}
          {selectedDay && (
            <div className="pt-6 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-5 space-y-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    24-Hour Smog Timing · {selectedDay.dayLabel}
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900 mt-0.5">
                    {selectedDay.severityLabel} peak expected ({selectedDay.peakAqi} AQI)
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-slate-500">Worst Smog Window</div>
                    <div className="mt-0.5 font-mono tabular-nums font-semibold text-red-700">
                      {selectedDay.peakHourWindow}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Cleanest Air Window</div>
                    <div className="mt-0.5 font-mono tabular-nums font-semibold text-emerald-800">
                      {selectedDay.cleanestHourWindow}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Daily Avg / Peak PM2.5</div>
                    <div className="mt-0.5 font-mono tabular-nums font-medium text-slate-900">
                      {selectedDay.avgPm25} / {selectedDay.peakPm25} µg/m³
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Daily Avg PM10</div>
                    <div className="mt-0.5 font-mono tabular-nums font-medium text-slate-900">
                      {selectedDay.avgPm10} µg/m³
                    </div>
                  </div>
                </div>
              </div>

              {/* 24-Hour Mini Bar Strip */}
              <div className="lg:col-span-7 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Hourly {metric === "aqi" ? "US AQI" : "PM2.5 (µg/m³)"} progression
                  </span>
                  <span className="font-mono tabular-nums">
                    Min {metric === "aqi" ? selectedDay.minAqi : Math.min(...selectedDay.hourlyPoints.map((h) => h.pm25))} – Peak{" "}
                    {metric === "aqi" ? selectedDay.peakAqi : selectedDay.peakPm25}
                  </span>
                </div>

                <div
                  className="h-24 flex items-end gap-1 pt-2 border-b border-slate-200"
                  aria-label={`Hourly profile for ${selectedDay.dayLabel}`}
                >
                  {selectedDay.hourlyPoints.map((hp) => {
                    const val = metric === "aqi" ? hp.aqi : hp.pm25;
                    const dayMax = Math.max(
                      1,
                      ...selectedDay.hourlyPoints.map((p) =>
                        metric === "aqi" ? p.aqi : p.pm25
                      )
                    );
                    const pct = Math.max(10, Math.round((val / dayMax) * 100));
                    const barColor =
                      hp.aqi <= 50
                        ? "bg-emerald-600"
                        : hp.aqi <= 100
                        ? "bg-amber-500"
                        : hp.aqi <= 150
                        ? "bg-orange-600"
                        : "bg-red-600";

                    return (
                      <div
                        key={hp.hourLabel}
                        title={`${hp.hourLabel}: ${hp.aqi} AQI · ${hp.pm25} µg/m³ PM2.5`}
                        className="flex-1 h-full flex items-end"
                      >
                        <div
                          style={{ height: `${pct}%` }}
                          className={`w-full rounded-t-xs ${barColor} opacity-85 hover:opacity-100 transition-opacity`}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-500">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>23:00</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
