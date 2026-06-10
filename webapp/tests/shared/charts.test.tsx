import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DeltaRow, PauseStat, RhythmBars, RoutineBar, SpeedTrendLine, TimeOutdoorsStat } from "../../src/shared/charts";

describe("new chart primitives", () => {
  it("RhythmBars renders one row per bucket with percent", () => {
    const { getByText } = render(
      <RhythmBars buckets={[
        { label: "Vormittags", share: 0.6 },
        { label: "Nachmittags", share: 0.3 },
        { label: "Abends", share: 0.1 },
      ]} />
    );
    expect(getByText("Vormittags")).toBeTruthy();
    expect(getByText("60%")).toBeTruthy();
  });

  it("DeltaRow shows abs percent for negative", () => {
    const { getByText, container } = render(
      <DeltaRow label="Ausgänge" pct={-22} direction="down" />
    );
    expect(getByText("Ausgänge")).toBeTruthy();
    expect(container.textContent).toContain("22%");
  });

  it("RoutineBar shows band label", () => {
    const { getByText } = render(<RoutineBar score={78} band="stabil" />);
    expect(getByText("stabil")).toBeTruthy();
  });

  it("TimeOutdoorsStat formats minutes as hours+minutes", () => {
    const { getByText } = render(<TimeOutdoorsStat avgMin={147} direction="flat" />);
    expect(getByText("2 Std 27 Min")).toBeTruthy();
    expect(getByText("etwa gleich")).toBeTruthy();
  });

  it("TimeOutdoorsStat shows Vormonat label when changed", () => {
    const { getByText } = render(<TimeOutdoorsStat avgMin={45} direction="down" />);
    expect(getByText("45 Min")).toBeTruthy();
    expect(getByText("Vormonat")).toBeTruthy();
  });

  it("SpeedTrendLine renders a polyline and km/h ticks", () => {
    const { container } = render(
      <SpeedTrendLine points={[
        { week_start: "2026-04-06", kmh: 4.1 },
        { week_start: "2026-04-13", kmh: 4.0 },
        { week_start: "2026-04-20", kmh: 3.6 },
        { week_start: "2026-04-27", kmh: 3.4 },
      ]} />
    );
    expect(container.querySelector("polyline")).toBeTruthy();
    expect(container.textContent).toContain("km/h");
  });

  it("SpeedTrendLine renders nothing with fewer than 2 points", () => {
    const { container } = render(<SpeedTrendLine points={[{ week_start: "2026-04-06", kmh: 4.1 }]} />);
    expect(container.querySelector("svg")).toBeFalsy();
  });

  it("PauseStat formats average with German comma", () => {
    const { container } = render(<PauseStat avg={2.5} direction="up" />);
    expect(container.textContent).toContain("2,5");
    expect(container.textContent).toContain("Pausen");
    expect(container.textContent).toContain("Vormonat");
  });
});
