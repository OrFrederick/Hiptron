import type { ReactNode } from "react";

import { BottomTabBar } from "./kit";
import { HIP } from "./theme";

interface Props {
  children: ReactNode;
  active?: string;
  mode?: "older" | "relative";
}

// Light app background, scrollable card stack, pinned bottom tab bar.
export function Shell({ children, active = "home", mode = "older" }: Props) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: HIP.c.appBg,
        fontFamily: HIP.font,
        color: HIP.c.textDark,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            maxWidth: 420,
            margin: "0 auto",
            padding: "20px 16px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxSizing: "border-box",
          }}
        >
          {children}
        </div>
      </div>
      {mode !== "older" && (
        <div style={{ position: "sticky", bottom: 0, maxWidth: 420, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
          <BottomTabBar active={active} mode={mode} />
        </div>
      )}
    </div>
  );
}
