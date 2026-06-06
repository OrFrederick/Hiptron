// webapp/tests/schematicMap.test.ts
import { describe, expect, it } from "vitest";

import {
  PADDING,
  VIEW_SIZE,
  projectPoints,
} from "../src/modes/older-adult/SchematicMap";
import type { SchematicMap } from "../src/shared/types";

function inBounds(x: number, y: number) {
  return (
    x >= PADDING &&
    x <= VIEW_SIZE - PADDING &&
    y >= PADDING &&
    y <= VIEW_SIZE - PADDING
  );
}

const base: SchematicMap = {
  home_lat: 52.52,
  home_lon: 13.405,
  places: [
    {
      place_id: "a",
      label: "bakery",
      centroid_lat: 52.521,
      centroid_lon: 13.406,
    },
    {
      place_id: "b",
      label: "park",
      centroid_lat: 52.519,
      centroid_lon: 13.404,
    },
  ],
  walk_polyline: [
    [52.52, 13.405],
    [52.5215, 13.4065],
    [52.519, 13.404],
  ],
};

describe("projectPoints", () => {
  it("clamps every point inside the padded viewport", () => {
    const { homePx, places, polyline } = projectPoints(base);
    expect(inBounds(homePx[0], homePx[1])).toBe(true);
    for (const p of places) expect(inBounds(p.x, p.y)).toBe(true);
    for (const [x, y] of polyline) expect(inBounds(x, y)).toBe(true);
  });

  it("handles empty polyline and a single place without throwing", () => {
    const firstPlace = base.places[0];
    if (!firstPlace) throw new Error("fixture must include a place");
    const sparse: SchematicMap = {
      ...base,
      places: [firstPlace],
      walk_polyline: [],
    };
    const { places, polyline } = projectPoints(sparse);
    expect(polyline).toEqual([]);
    expect(places).toHaveLength(1);
    const only = places[0];
    if (!only) throw new Error("expected one projected place");
    expect(inBounds(only.x, only.y)).toBe(true);
  });
});
