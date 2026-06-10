import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SchematicMap } from "../../src/modes/older-adult/SchematicMap";

const MAP = {
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
  ] as [number, number][],
};

describe("SchematicMap", () => {
  it("renders the 'Deine Karte' card with the real map container", () => {
    render(<SchematicMap map={MAP} />);
    // The live map (OpenStreetMap tiles) renders into an aria-labelled container.
    // Markers/tiles themselves are drawn by Leaflet at runtime (not in jsdom).
    expect(screen.getByText("Deine Karte")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Karte mit Zuhause, Orten und der letzten Route"),
    ).toBeInTheDocument();
  });

  it("clicking the map area opens the MapModal overlay", () => {
    render(<SchematicMap map={MAP} />);
    const mapArea = screen.getByRole("button", { name: "Karte vergrößern" });
    fireEvent.click(mapArea);
    // Modal title is rendered (portal renders into jsdom document.body)
    expect(screen.getByRole("dialog", { name: "Deine Karte" })).toBeInTheDocument();
    // Close button is accessible
    expect(screen.getByRole("button", { name: "Karte schließen" })).toBeInTheDocument();
  });

  it("clicking close button dismisses the modal", () => {
    render(<SchematicMap map={MAP} />);
    fireEvent.click(screen.getByRole("button", { name: "Karte vergrößern" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Karte schließen" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicking the navigation row fires the onClick callback", () => {
    const onClick = vi.fn();
    render(<SchematicMap map={MAP} onClick={onClick} />);
    // The caption row text "Deine Woche ansehen" triggers navigation
    const navRow = screen.getByText("Deine Woche ansehen").closest('[role="button"]');
    expect(navRow).toBeTruthy();
    fireEvent.click(navRow!);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
