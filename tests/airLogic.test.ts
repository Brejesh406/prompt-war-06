import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CITY_PRESETS, computeRoomFiltration } from "../src/data/presets.ts";

describe("Indoor PM2.5 Mass-Balance Physics", () => {
  it("reduces indoor PM2.5 substantially when sealing drafts and running DIY Corsi-Rosenthal filtration", () => {
    const unfilteredDrafty = computeRoomFiltration({
      roomAreaSqFt: 300,
      ceilingHeightFt: 9,
      outdoorPm25: 150,
      purifierType: "none",
      weatherSealed: false,
    });

    const filteredSealed = computeRoomFiltration({
      roomAreaSqFt: 300,
      ceilingHeightFt: 9,
      outdoorPm25: 150,
      purifierType: "diy-corsi",
      weatherSealed: true,
    });

    assert.ok(
      filteredSealed.estimatedIndoorPm25 < unfilteredDrafty.estimatedIndoorPm25,
      "Filtered & sealed room must have lower PM2.5 than unfiltered drafty room"
    );
    assert.ok(
      filteredSealed.estimatedIndoorPm25 <= 15,
      `Expected <= 15 µg/m³ WHO guideline, got ${filteredSealed.estimatedIndoorPm25}`
    );
    assert.ok(filteredSealed.reductionPct >= 80);
    assert.ok(filteredSealed.airChangesPerHour > unfilteredDrafty.airChangesPerHour);
  });

  it("scales air changes per hour inversely with room volume", () => {
    const smallRoom = computeRoomFiltration({
      roomAreaSqFt: 150,
      ceilingHeightFt: 8,
      outdoorPm25: 120,
      purifierType: "hepa-medium",
      weatherSealed: true,
    });

    const largeRoom = computeRoomFiltration({
      roomAreaSqFt: 600,
      ceilingHeightFt: 10,
      outdoorPm25: 120,
      purifierType: "hepa-medium",
      weatherSealed: true,
    });

    assert.ok(smallRoom.airChangesPerHour > largeRoom.airChangesPerHour);
    assert.ok(smallRoom.estimatedIndoorPm25 < largeRoom.estimatedIndoorPm25);
  });
});

describe("City Presets Integrity", () => {
  it("provides valid household profiles for all quick city presets", () => {
    assert.ok(CITY_PRESETS.length >= 4);
    for (const preset of CITY_PRESETS) {
      assert.ok(preset.label.length > 0);
      assert.ok(preset.profile.location.length > 0);
      assert.ok(preset.profile.householdSize >= 1);
      assert.ok(Array.isArray(preset.profile.sensitiveGroups));
    }
  });
});
