# ClearHearth — Winter Smog & Urban Air Quality Assistant

**ClearHearth** is a full-stack GenAI-powered assistant that helps families and communities navigate severe winter smog and urban air pollution. It combines real-time local air quality forecasting with household-tailored routines, indoor air quality protocols, sustainable habit swaps, and transparent cause-and-effect impact metrics.

---

## 1. Chosen Vertical

**Environmental Resilience & Family/Community Air Quality Navigation (Severe Winter Smog & Urban Air Pollution)**

Winter temperature inversions trap residential heating smoke, cold-start vehicle exhaust, and industrial particulates close to street level for days at a time. While generic AQI apps only report a single outdoor number, families and neighborhood groups need actionable, context-specific guidance: *When is it safest to ventilate? How much does sealing drafts plus a DIY MERV-13 box fan lower bedroom PM2.5? What happens at the street level if 100 neighbors swap wood fires or car idling for cleaner habits?*

ClearHearth is designed for:
- **Households & Caregivers** managing infants, school-age children, older adults, or asthma/respiratory sensitivities.
- **Neighborhood & School Communities** coordinating anti-idling zones, walking school buses, and shared clean-heat transitions.

---

## 2. Approach and Logic

ClearHearth blends **contextual GenAI reasoning**, **grounded public atmospheric data**, and **deterministic indoor air physics** so recommendations are both personalized and scientifically transparent:

1. **Context-Driven Decision Logic (`HouseholdProfile`)**:
   - Captures city/neighborhood, home type & resident count, primary winter heating source (gas, wood/fireplace, coal, heat pump, district, space heaters), commute mode, cooking fuel, sensitive household members, and budget priority (`Low-Cost Hacks`, `Moderate Upgrades`, or `Community Advocacy`).
   - Adapts every daily schedule block, indoor intervention, and swap to the household's real constraints (e.g., prioritizing zero-cost draft sealing and DIY box-fan filtration for budget-constrained renters, or range-hood ventilation and induction swaps for unvented gas kitchens).

2. **Grounded GenAI Synthesis (`@google/genai` — `gemini-4-hydrogen`)**:
   - **Local Smog Grounding**: Runs Google Search grounding on the server to pull real local inversion patterns, winter pollution drivers, and verifiable web citations.
   - **Structured Action Plans**: Uses strict JSON `responseSchema` enforcement to generate time-blocked daily routines, indoor air hacks, habit-to-alternative swaps, and a community playbook—each paired with quantified PM2.5 exposure/emission reductions and a plain-language physical explanation.
   - **On-Demand Choice Evaluator & Advisor Chat**: Lets users evaluate any daily decision (e.g., *"Burning wood for 3 hours vs. electric heat"*) or ask follow-up questions with live location context.

3. **Advance Smog Anticipation (7-Day Public Weather & AQI Trend)**:
   - Integrates the public **Open-Meteo Geocoding + Air Quality (CAMS)** APIs (`GET /api/aqi-trend`) to retrieve 7 days of hourly `US AQI`, `PM2.5 (µg/m³)`, and `PM10 (µg/m³)` data (2-day recent buildup + 5-day upcoming forecast).
   - Identifies the worst 3-hour smog window and cleanest 3-hour ventilation window for each day, flagging upcoming `AQI 101+` days in advance so families can pre-seal rooms and run filtration ahead of dusk inversions.

4. **Deterministic Indoor Mass-Balance Physics (`computeRoomFiltration`)**:
   - Uses a single-zone steady-state indoor particulate model to show how outdoor PM2.5, room volume, envelope sealing (`0.35` vs `0.95 ACH` infiltration), and filtration `CADR` (`210–400 CFM`) combine to bring indoor PM2.5 below the **WHO 24-hour guideline (`≤ 15 µg/m³`)**.

---

## 3. How the Solution Works

### Architecture
- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 (`src/App.tsx` and modular feature components under `src/components/`).
- **Backend**: Express + TypeScript (`server.ts`) serving the Vite SPA on port `3000` and handling all external API and Gemini calls server-side.

### API Endpoints
| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Service readiness check |
| `/api/aqi-trend?location=...` | `GET` | Geocodes location and aggregates 7 days of hourly Open-Meteo AQI/PM2.5/PM10 data + advance high-smog alerts |
| `/api/air-briefing` | `POST` | Generates grounded local smog briefing + structured daily routines, indoor hacks, swaps, and community playbook |
| `/api/explain-choice` | `POST` | Evaluates any user-submitted winter habit for outdoor PM2.5/NOx, indoor peak `µg/m³`, health mechanism, and better alternative |
| `/api/advisor-chat` | `POST` | Multi-turn conversational advisor grounded with Google Search and aware of the household profile |

### Key User Flows
1. **Configure Location & Lifestyle**: Pick a quick city preset or enter any city worldwide, adjust heating/cooking/commute/sensitive groups, and generate a tailored plan.
2. **Anticipate High-Smog Periods**: Inspect the 7-day `US AQI` / `PM2.5` trend chart, advance high-smog alerts, and click any day to view its 24-hour progression and safest ventilation window.
3. **Track Daily Routines**: Filter routines by effort level and check off completed steps to see real-time daily PM2.5 exposure and emission reductions.
4. **Simulate Indoor Air Clearance**: Adjust outdoor PM2.5, room square footage, filtration tier (including DIY Corsi-Rosenthal box fans), and draft sealing to inspect projected indoor air quality.
5. **Test Any Habit & Ask the Advisor**: Analyze custom habits in the Impact Lab or chat with the grounded advisor for neighborhood and family guidance.

---

## 4. Assumptions Made

- **Single-Zone Indoor Mixing**: The clean-room simulator models a well-mixed single room using standard residential envelope penetration (`0.65` sealed / `0.82` drafty) and particulate deposition (`0.39 /hr`) constants rather than multi-room HVAC airflow CFD.
- **Public Forecast Horizon**: Open-Meteo's global CAMS air quality feed provides a 5-day forward forecast; combining `past_days=2` and `forecast_days=5` yields a continuous 7-day trend showing recent buildup alongside upcoming smog peaks.
- **Health Reference Thresholds**: Air quality classifications follow US EPA AQI bands (`0–50` Good, `51–100` Moderate, `101–150` Sensitive, `151–200` Unhealthy, `>200` Severe) and the WHO 24-hour `PM2.5` guideline (`15 µg/m³`).
- **Client-Side Persistence**: Household profiles, generated briefings, and daily checklist progress are persisted in browser `localStorage` to keep the experience fast and account-free without requiring external database credentials.
- **API Key Management**: `GEMINI_API_KEY` is read strictly on the server from environment variables (`process.env.GEMINI_API_KEY`) and is never bundled into or exposed to client code.

---

## 5. Security, Accessibility & Code Quality

- **Security**: All `@google/genai` SDK calls and API keys remain strictly server-side in `server.ts`. Inputs are validated before upstream calls, and `.gitignore` excludes `.env*` files while keeping `.env.example` as a template.
- **Accessibility**: High-contrast daylight palette meeting WCAG AA, keyboard-focusable controls with visible focus rings, `>= 40px` interactive targets, `prefers-reduced-motion` support, explicit text labels accompanying all semantic status colors, and tabular numerals (`tabular-nums`) across all data readouts.
- **Efficiency & Repo Footprint**: Zero external charting libraries (lightweight custom SVG trend & hourly charts), single-call parallel Gemini + Search grounding, and total repository source size under `3 MB`.

---

## 6. Setup & Verification

### Prerequisites
- Node.js `>= 20`
- A Gemini API key (`GEMINI_API_KEY`)

### Environment Setup
Copy `.env.example` to `.env` and provide your Gemini API key:
```bash
cp .env.example .env
```

### Install & Run
```bash
npm install
npm run dev
```
The app runs at `http://localhost:3000`.

### Build, Lint & Test
```bash
npm run lint     # TypeScript typechecking (tsc --noEmit)
npm run build    # Production Vite client bundle
npm test         # Runs indoor physics & API validation tests
```
