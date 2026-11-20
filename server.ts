import "dotenv/config";
import express, { type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import type {
  AirBriefingResponse,
  AqiTrendResponse,
  ChoiceImpactAnalysis,
  DailyAqiTrendPoint,
  GroundingSource,
  HourlyAqiPoint,
  HouseholdProfile,
} from "./src/types/air.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function extractGroundingSources(response: unknown): GroundingSource[] {
  const candidate = (
    response as {
      candidates?: Array<{
        groundingMetadata?: {
          groundingChunks?: Array<{
            web?: { uri?: string; title?: string };
          }>;
        };
      }>;
    }
  )?.candidates?.[0];

  const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];

  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title;
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      sources.push({
        uri,
        title: title || new URL(uri).hostname,
      });
    }
  }
  return sources.slice(0, 6);
}

function formatGeminiError(error: unknown): { status: number; message: string } {
  const errObj = error as { status?: number; message?: string };
  const msg = errObj?.message || "Unexpected AI service error.";

  if (msg.includes("GEMINI_API_KEY is not configured")) {
    return { status: 400, message: msg };
  }
  if (msg.includes("API_KEY_INVALID") || msg.includes("PERMISSION_DENIED") || errObj?.status === 403) {
    return {
      status: 403,
      message: "Gemini API key was rejected. Please verify GEMINI_API_KEY in Settings > Secrets.",
    };
  }
  if (msg.includes("RESOURCE_EXHAUSTED") || errObj?.status === 429) {
    return {
      status: 429,
      message: "Gemini API rate limit reached. Please retry in a few moments.",
    };
  }
  return { status: 500, message: msg };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true, service: "clearhearth" });
  });

  app.get("/api/aqi-trend", async (req: Request, res: Response) => {
    try {
      const rawLocation = String(req.query.location || "").trim();
      if (!rawLocation) {
        res.status(400).json({ error: "A city or location query parameter is required." });
        return;
      }

      const geocodeSearch = async (query: string) => {
        const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
        geoUrl.searchParams.set("name", query);
        geoUrl.searchParams.set("count", "1");
        geoUrl.searchParams.set("language", "en");
        geoUrl.searchParams.set("format", "json");
        const geoResp = await fetch(geoUrl.toString());
        if (!geoResp.ok) {
          throw new Error(`Geocoding service responded with status ${geoResp.status}`);
        }
        const geoJson = (await geoResp.json()) as {
          results?: Array<{
            name: string;
            country?: string;
            admin1?: string;
            latitude: number;
            longitude: number;
            timezone?: string;
          }>;
        };
        return geoJson.results?.[0] ?? null;
      };

      let place = await geocodeSearch(rawLocation);
      if (!place && rawLocation.includes(",")) {
        const primaryCity = rawLocation.split(",")[0].trim();
        if (primaryCity) {
          place = await geocodeSearch(primaryCity);
        }
      }

      if (!place) {
        res.status(404).json({
          error: `Could not resolve coordinates for "${rawLocation}". Try a nearby major city name.`,
        });
        return;
      }

      const aqiUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
      aqiUrl.searchParams.set("latitude", String(place.latitude));
      aqiUrl.searchParams.set("longitude", String(place.longitude));
      aqiUrl.searchParams.set("hourly", "pm2_5,pm10,us_aqi");
      aqiUrl.searchParams.set("timezone", "auto");
      aqiUrl.searchParams.set("past_days", "2");
      aqiUrl.searchParams.set("forecast_days", "5");

      const aqiResp = await fetch(aqiUrl.toString());
      if (!aqiResp.ok) {
        throw new Error(`Air quality forecast service responded with status ${aqiResp.status}`);
      }

      const aqiJson = (await aqiResp.json()) as {
        timezone?: string;
        hourly?: {
          time?: string[];
          pm2_5?: Array<number | null>;
          pm10?: Array<number | null>;
          us_aqi?: Array<number | null>;
        };
      };

      const times = aqiJson.hourly?.time ?? [];
      const pm25Arr = aqiJson.hourly?.pm2_5 ?? [];
      const pm10Arr = aqiJson.hourly?.pm10 ?? [];
      const aqiArr = aqiJson.hourly?.us_aqi ?? [];

      if (times.length === 0) {
        throw new Error("Air quality forecast returned no hourly data.");
      }

      const dayBuckets = new Map<
        string,
        Array<{ hourNum: number; hourLabel: string; aqi: number; pm25: number; pm10: number }>
      >();

      for (let i = 0; i < times.length; i++) {
        const iso = times[i];
        const [datePart, timePart] = iso.split("T");
        if (!datePart || !timePart) continue;
        const hourNum = Number(timePart.slice(0, 2));
        const aqiVal = aqiArr[i];
        const pm25Val = pm25Arr[i];
        const pm10Val = pm10Arr[i];
        if (aqiVal == null && pm25Val == null) continue;

        const bucket = dayBuckets.get(datePart) ?? [];
        bucket.push({
          hourNum,
          hourLabel: timePart.slice(0, 5),
          aqi: Math.round(aqiVal ?? 0),
          pm25: Number((pm25Val ?? 0).toFixed(1)),
          pm10: Number((pm10Val ?? 0).toFixed(1)),
        });
        dayBuckets.set(datePart, bucket);
      }

      const getSeverityLabel = (
        peakAqi: number
      ): DailyAqiTrendPoint["severityLabel"] => {
        if (peakAqi <= 50) return "Good";
        if (peakAqi <= 100) return "Moderate";
        if (peakAqi <= 150) return "Sensitive";
        if (peakAqi <= 200) return "Unhealthy";
        return "Severe";
      };

      const formatHourRange = (startHour: number): string => {
        const endHour = (startHour + 3) % 24;
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${pad(startHour)}:00 – ${pad(endHour)}:00`;
      };

      const days: DailyAqiTrendPoint[] = Array.from(dayBuckets.entries())
        .slice(0, 7)
        .map(([date, hours]) => {
          const aqis = hours.map((h) => h.aqi);
          const pm25s = hours.map((h) => h.pm25);
          const pm10s = hours.map((h) => h.pm10);

          const avgAqi = Math.round(aqis.reduce((a, b) => a + b, 0) / aqis.length);
          const peakAqi = Math.max(...aqis);
          const minAqi = Math.min(...aqis);
          const avgPm25 = Number(
            (pm25s.reduce((a, b) => a + b, 0) / pm25s.length).toFixed(1)
          );
          const peakPm25 = Number(Math.max(...pm25s).toFixed(1));
          const avgPm10 = Number(
            (pm10s.reduce((a, b) => a + b, 0) / pm10s.length).toFixed(1)
          );

          // Find 3-hour rolling window with highest average AQI and cleanest average AQI
          let peakStart = hours[0].hourNum;
          let peakWindowAvg = -1;
          let cleanStart = hours[0].hourNum;
          let cleanWindowAvg = Infinity;

          for (let idx = 0; idx < hours.length; idx++) {
            const slice = hours.slice(idx, Math.min(idx + 3, hours.length));
            const mean = slice.reduce((acc, item) => acc + item.aqi, 0) / slice.length;
            if (mean > peakWindowAvg) {
              peakWindowAvg = mean;
              peakStart = hours[idx].hourNum;
            }
            if (mean < cleanWindowAvg) {
              cleanWindowAvg = mean;
              cleanStart = hours[idx].hourNum;
            }
          }

          const parsedDate = new Date(`${date}T12:00:00Z`);
          const dayLabel = parsedDate.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          });
          const shortDay = parsedDate.toLocaleDateString("en-US", {
            weekday: "short",
            day: "numeric",
            timeZone: "UTC",
          });

          const hourlyPoints: HourlyAqiPoint[] = hours.map((h) => ({
            hourLabel: h.hourLabel,
            aqi: h.aqi,
            pm25: h.pm25,
            pm10: h.pm10,
          }));

          return {
            date,
            dayLabel,
            shortDay,
            avgAqi,
            peakAqi,
            minAqi,
            avgPm25,
            peakPm25,
            avgPm10,
            peakHourWindow: formatHourRange(peakStart),
            cleanestHourWindow: formatHourRange(cleanStart),
            severityLabel: getSeverityLabel(peakAqi),
            hourlyPoints,
          };
        });

      const upcomingDays = days.length > 2 ? days.slice(2) : days;
      const highestDay = upcomingDays.reduce(
        (max, d) => (d.peakAqi > max.peakAqi ? d : max),
        upcomingDays[0]
      );
      const elevatedCount = upcomingDays.filter((d) => d.peakAqi >= 101).length;

      const resolvedName = place.admin1
        ? `${place.name}, ${place.admin1}`
        : place.name;

      const payload: AqiTrendResponse = {
        resolvedLocation: resolvedName,
        country: place.country || "",
        latitude: place.latitude,
        longitude: place.longitude,
        timezone: aqiJson.timezone || place.timezone || "UTC",
        source: "Open-Meteo Air Quality (2-Day History + 5-Day CAMS Forecast)",
        days,
        highSmogAlert: {
          hasElevatedDays: elevatedCount > 0,
          highestDayLabel: highestDay.dayLabel,
          highestPeakAqi: highestDay.peakAqi,
          highestPeakWindow: highestDay.peakHourWindow,
          summary:
            elevatedCount > 0
              ? `${elevatedCount} of the next ${upcomingDays.length} forecast days reach AQI 101+ (sensitive or unhealthy). Highest upcoming peak of ${highestDay.peakAqi} AQI is expected on ${highestDay.dayLabel} (${highestDay.peakHourWindow}). Pre-seal windows and run indoor filtration ahead of dusk.`
              : `No upcoming days above 100 AQI in the ${upcomingDays.length}-day forecast window. Highest upcoming peak of ${highestDay.peakAqi} AQI is expected on ${highestDay.dayLabel} (${highestDay.peakHourWindow}).`,
        },
        fetchedAt: new Date().toISOString(),
      };

      res.json(payload);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to fetch 7-day AQI forecast.";
      res.status(500).json({ error: msg });
    }
  });

  app.post("/api/air-briefing", async (req: Request, res: Response) => {
    try {
      const profile = req.body?.profile as HouseholdProfile | undefined;
      if (!profile || !profile.location?.trim()) {
        res.status(400).json({ error: "A valid city or neighborhood location is required." });
        return;
      }

      const ai = getGenAIClient();

      const profileSummary = `
Location: ${profile.location}
Household Size: ${profile.householdSize} people
Housing Type: ${profile.housingType}
Primary Heating: ${profile.heatingSource}
Primary Commute: ${profile.commuteMode}
Cooking Setup: ${profile.cookingFuel}
Sensitive Household Members: ${
        profile.sensitiveGroups.length > 0 ? profile.sensitiveGroups.join(", ") : "None specified"
      }
Budget & Action Focus: ${profile.budgetPriority}
      `.trim();

      const groundingPromise = ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Check typical and current winter smog, PM2.5 air pollution patterns, temperature inversion timing, and primary local urban pollution drivers for ${profile.location}. Provide a concise 3-4 sentence briefing grounded in real local air quality context.`,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const structuredPromise = ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Design a hyper-practical, science-grounded winter smog survival and low-emission action plan for this household:\n\n${profileSummary}\n\nMake all numbers realistic and grounded in EPA/WHO PM2.5 exposure and emission science. Clearly explain the direct physical/health mechanism behind each recommendation (why a choice cuts personal PM2.5 inhalation or lowers neighborhood emissions during winter inversions).`,
        config: {
          systemInstruction:
            "You are ClearHearth, an atmospheric science and public health advisor helping families and communities reduce urban winter smog exposure and cut emissions. Avoid vague clichés; give concrete timings, filter ratings (MERV-13 / HEPA H13), ventilation physics, and realistic quantified impacts.",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              locationOverview: {
                type: Type.OBJECT,
                properties: {
                  city: { type: Type.STRING },
                  estimatedWinterAqi: { type: Type.INTEGER },
                  aqiCategory: { type: Type.STRING },
                  estimatedPm25UgM3: { type: Type.NUMBER },
                  inversionWindow: { type: Type.STRING },
                  cleanestVentilationWindow: { type: Type.STRING },
                  primaryLocalDrivers: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: [
                  "city",
                  "estimatedWinterAqi",
                  "aqiCategory",
                  "estimatedPm25UgM3",
                  "inversionWindow",
                  "cleanestVentilationWindow",
                  "primaryLocalDrivers",
                ],
              },
              dailyRoutines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    timeBlock: { type: Type.STRING },
                    title: { type: Type.STRING },
                    actionSteps: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    whyThisHelps: { type: Type.STRING },
                    pm25ExposureReductionPct: { type: Type.NUMBER },
                    pm25EmissionsAvoidedGrams: { type: Type.NUMBER },
                    co2eSavedKg: { type: Type.NUMBER },
                    effortLevel: { type: Type.STRING },
                  },
                  required: [
                    "id",
                    "timeBlock",
                    "title",
                    "actionSteps",
                    "whyThisHelps",
                    "pm25ExposureReductionPct",
                    "pm25EmissionsAvoidedGrams",
                    "co2eSavedKg",
                    "effortLevel",
                  ],
                },
              },
              indoorAirHacks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    roomFocus: { type: Type.STRING },
                    estimatedCost: { type: Type.STRING },
                    cadrOrPm25Impact: { type: Type.STRING },
                    steps: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    scienceMechanism: { type: Type.STRING },
                  },
                  required: [
                    "id",
                    "title",
                    "roomFocus",
                    "estimatedCost",
                    "cadrOrPm25Impact",
                    "steps",
                    "scienceMechanism",
                  ],
                },
              },
              sustainableAlternatives: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    category: { type: Type.STRING },
                    currentHabit: { type: Type.STRING },
                    sustainableAlternative: { type: Type.STRING },
                    directHouseholdImpact: { type: Type.STRING },
                    communityMultiplierImpact: { type: Type.STRING },
                    monthlyCo2eSavedKg: { type: Type.NUMBER },
                    pm25ReductionGramsPerDay: { type: Type.NUMBER },
                  },
                  required: [
                    "id",
                    "category",
                    "currentHabit",
                    "sustainableAlternative",
                    "directHouseholdImpact",
                    "communityMultiplierImpact",
                    "monthlyCo2eSavedKg",
                    "pm25ReductionGramsPerDay",
                  ],
                },
              },
              communityPlaybook: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  neighborhoodAction: { type: Type.STRING },
                  schoolOrTransitTip: { type: Type.STRING },
                  collectiveImpactSummary: { type: Type.STRING },
                },
                required: [
                  "title",
                  "neighborhoodAction",
                  "schoolOrTransitTip",
                  "collectiveImpactSummary",
                ],
              },
            },
            required: [
              "locationOverview",
              "dailyRoutines",
              "indoorAirHacks",
              "sustainableAlternatives",
              "communityPlaybook",
            ],
          },
        },
      });

      const [groundingRes, structuredRes] = await Promise.all([
        groundingPromise,
        structuredPromise,
      ]);

      const parsed = JSON.parse((structuredRes.text ?? "{}").trim()) as Omit<
        AirBriefingResponse,
        "liveContextSummary" | "groundingSources" | "generatedAt"
      >;

      const payload: AirBriefingResponse = {
        ...parsed,
        liveContextSummary:
          groundingRes.text?.trim() ||
          `Seasonal winter smog guidance tailored for ${profile.location}.`,
        groundingSources: extractGroundingSources(groundingRes),
        generatedAt: new Date().toISOString(),
      };

      res.json(payload);
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post("/api/explain-choice", async (req: Request, res: Response) => {
    try {
      const { choice, profile } = req.body as {
        choice?: string;
        profile?: HouseholdProfile;
      };

      if (!choice || !choice.trim()) {
        res.status(400).json({ error: "Please enter a daily habit or choice to evaluate." });
        return;
      }

      const ai = getGenAIClient();

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Analyze this daily winter choice for a household in ${
          profile?.location || "an urban winter city"
        } (${profile?.housingType || "apartment"}, ${
          profile?.householdSize || 3
        } people):\n\n"${choice.trim()}"\n\nQuantify the realistic outdoor PM2.5 grams emitted, indoor PM2.5 spike in µg/m³, respiratory health mechanism, and the exact measurable benefit of switching to a practical low-emission alternative.`,
        config: {
          systemInstruction:
            "You are an environmental health engineer. Provide realistic, scientifically grounded estimates without exaggeration.",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              choiceSummary: { type: Type.STRING },
              outdoorImpact: {
                type: Type.OBJECT,
                properties: {
                  pm25Grams: { type: Type.NUMBER },
                  noxLevel: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
                required: ["pm25Grams", "noxLevel", "explanation"],
              },
              indoorImpact: {
                type: Type.OBJECT,
                properties: {
                  peakPm25UgM3: { type: Type.NUMBER },
                  clearanceMinutes: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                },
                required: ["peakPm25UgM3", "clearanceMinutes", "explanation"],
              },
              healthMechanism: { type: Type.STRING },
              betterAlternative: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING },
                  pm25ReductionPct: { type: Type.NUMBER },
                  co2eSavedKg: { type: Type.NUMBER },
                  communityRipple100Homes: { type: Type.STRING },
                },
                required: [
                  "action",
                  "pm25ReductionPct",
                  "co2eSavedKg",
                  "communityRipple100Homes",
                ],
              },
            },
            required: [
              "choiceSummary",
              "outdoorImpact",
              "indoorImpact",
              "healthMechanism",
              "betterAlternative",
            ],
          },
        },
      });

      const data = JSON.parse((response.text ?? "{}").trim()) as ChoiceImpactAnalysis;
      res.json(data);
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post("/api/advisor-chat", async (req: Request, res: Response) => {
    try {
      const { message, history, profile } = req.body as {
        message?: string;
        history?: Array<{ role: "user" | "assistant"; content: string }>;
        profile?: HouseholdProfile;
      };

      if (!message || !message.trim()) {
        res.status(400).json({ error: "Message cannot be empty." });
        return;
      }

      const ai = getGenAIClient();

      const recentHistory = (history ?? [])
        .slice(-6)
        .map((m) => `${m.role === "user" ? "Family" : "ClearHearth"}: ${m.content}`)
        .join("\n");

      const prompt = `
Household Context:
- Location: ${profile?.location || "Urban winter region"}
- Housing: ${profile?.housingType || "Apartment"}, ${profile?.householdSize || 3} residents
- Heating: ${profile?.heatingSource || "Natural Gas Furnace"}
- Commute: ${profile?.commuteMode || "Public Transit / Rail"}
- Cooking: ${profile?.cookingFuel || "Gas Stove (Range Hood)"}
- Sensitive Groups: ${profile?.sensitiveGroups?.join(", ") || "General family"}

Recent Conversation:
${recentHistory || "(New conversation)"}

Current Question from User:
${message.trim()}

Answer concisely and practically. Always include:
1. Immediate practical action steps.
2. Why it works (direct impact on PM2.5 inhalation or local emissions).
3. A quick community or neighbor-level tip if relevant.
      `.trim();

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          systemInstruction:
            "You are ClearHearth, a warm, evidence-based winter air quality and low-emission living advisor for families and neighborhood groups. Keep answers structured, concise (under 220 words), empathetic, and grounded in atmospheric physics and public health.",
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      res.json({
        reply: response.text?.trim() || "I could not generate a response right now.",
        sources: extractGroundingSources(response),
      });
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ClearHearth server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
