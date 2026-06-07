import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import App from "../src/App";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("Mode chooser", () => {
  it("shows the wordmark, both mode buttons, and a persona control", () => {
    renderAt("/");
    expect(screen.getByText("Hiptron")).toBeInTheDocument();
    expect(screen.getByText("Senior-Modus")).toBeInTheDocument();
    expect(screen.getByText("Angehörigen-Modus")).toBeInTheDocument();
    // Demo persona switcher (defaults to Helga)
    expect(
      screen.getByLabelText(/Person wechseln/i),
    ).toBeInTheDocument();
  });

  it("routes mode buttons with the selected persona", () => {
    renderAt("/?u=otto");
    const senior = screen.getByText("Senior-Modus").closest("a");
    const relative = screen.getByText("Angehörigen-Modus").closest("a");
    expect(senior).toHaveAttribute("href", "/older-adult?u=otto");
    expect(relative).toHaveAttribute("href", "/relative?u=otto");
  });
});
