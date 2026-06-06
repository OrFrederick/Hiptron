import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SchematicMap } from "../../src/modes/older-adult/SchematicMap";

describe("SchematicMap", () => {
  it("renders home dot, place dots, and walk polyline", () => {
    render(
      <SchematicMap
        map={{
          home_lat: 52.52,
          home_lon: 13.4,
          places: [
            {
              place_id: "p1",
              label: "bakery",
              centroid_lat: 52.521,
              centroid_lon: 13.4006,
            },
            {
              place_id: "p2",
              label: "park",
              centroid_lat: 52.5198,
              centroid_lon: 13.4012,
            },
          ],
          walk_polyline: [
            [52.52, 13.4],
            [52.5205, 13.4002],
            [52.521, 13.4006],
          ],
        }}
      />,
    );
    // aria-labels and place text are German per LABEL_DE map in SchematicMap.tsx
    expect(screen.getByLabelText("Zuhause")).toBeInTheDocument();
    expect(screen.getByText("Bäckerei")).toBeInTheDocument();
    expect(screen.getByText("Park")).toBeInTheDocument();
    expect(screen.getByLabelText("Spazierweg")).toBeInTheDocument();
  });
});
