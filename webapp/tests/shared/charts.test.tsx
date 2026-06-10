import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DeltaRow, RhythmBars, RoutineBar } from "../../src/shared/charts";

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
});
