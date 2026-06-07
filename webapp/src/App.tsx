import type { ReactNode } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";

import OlderAdultHome from "./modes/older-adult/Home";
import OlderAdultWeekView from "./modes/older-adult/WeekView";
import RelativeHome from "./modes/relative/Home";
import InsightsDetail from "./modes/relative/InsightsDetail";
import { Ic } from "./shared/Icon";
import { PersonaSwitcher } from "./shared/PersonaSwitcher";
import { usePersona } from "./shared/persona";
import { HIP } from "./shared/theme";

const c = HIP.c;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ModeChooser />} />
      <Route path="/older-adult" element={<OlderAdultHome />} />
      <Route path="/older-adult/week" element={<OlderAdultWeekView />} />
      <Route path="/relative" element={<RelativeHome />} />
      <Route path="/relative/insights" element={<InsightsDetail />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ModeButton({
  to,
  filled,
  title,
  sub,
}: {
  to: string;
  filled?: boolean;
  title: string;
  sub: string;
}) {
  return (
    <Link
      to={to}
      style={{
        width: "100%",
        minHeight: 72,
        borderRadius: 20,
        boxSizing: "border-box",
        textDecoration: "none",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 18px",
        background: filled ? HIP.heroGradient : c.white,
        color: filled ? "#fff" : c.navy700,
        border: filled ? "none" : `1.5px solid ${c.navy700}`,
        boxShadow: filled ? HIP.shadow.btn : "none",
      }}
    >
      <span
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          flexShrink: 0,
          background: filled ? "rgba(255,255,255,0.16)" : c.appBg,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ic name={filled ? "person" : "heart"} size={22} color={filled ? "#fff" : c.navy700} sw={2} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</span>
        <span style={{ display: "block", fontSize: 14, fontWeight: 500, marginTop: 2, color: filled ? "rgba(255,255,255,0.72)" : c.textMuted }}>
          {sub}
        </span>
      </span>
      <Ic name="chevron" size={20} color={filled ? "rgba(255,255,255,0.7)" : c.textMuted} sw={2.2} />
    </Link>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: c.appBg,
        fontFamily: HIP.font,
        color: c.textDark,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          padding: "64px 24px 26px",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </main>
  );
}

function ModeChooser() {
  const userId = usePersona();
  return (
    <Centered>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: 74,
            height: 74,
            borderRadius: 22,
            flexShrink: 0,
            background: HIP.heroGradient,
            boxShadow: HIP.shadow.hero,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <svg width="74" height="74" viewBox="0 0 74 74" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
            <circle cx="55" cy="20" r="11" fill="rgba(242,183,5,0.30)" />
            <circle cx="55" cy="20" r="6" fill="rgba(242,183,5,0.5)" />
          </svg>
          <Ic name="walk" size={38} color="#fff" sw={2} style={{ position: "relative" }} />
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 22 }}>Hiptron</div>
        <div style={{ fontSize: 16.5, color: c.textMuted, marginTop: 10, textAlign: "center", lineHeight: 1.5, maxWidth: 270 }}>
          Ein ruhiges Auge auf den Alltag — in Verbindung, ohne Überwachung.
        </div>

        <div style={{ width: "100%", marginTop: 38, display: "flex", flexDirection: "column", gap: 14 }}>
          <ModeButton filled to={`/older-adult?u=${userId}`} title="Senior-Modus" sub="Für mich selbst" />
          <ModeButton to={`/relative?u=${userId}`} title="Angehörigen-Modus" sub="Für jemanden, den ich begleite" />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 24 }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: c.textMuted }}>
          Demo
        </span>
        <PersonaSwitcher />
      </div>
    </Centered>
  );
}
