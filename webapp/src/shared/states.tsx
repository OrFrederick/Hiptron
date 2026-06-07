// Calm loading / error / skeleton states for the navy/white/green system.
// Never alarm: muted text, soft motion, no red.

import type { CSSProperties, ReactNode } from "react";

import { Ic } from "./Icon";
import { Card } from "./kit";
import { Shell } from "./Shell";
import { HIP } from "./theme";

const c = HIP.c;

function FullScreen({ children }: { children: ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: c.appBg,
        fontFamily: HIP.font,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: "0 40px",
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      {children}
    </main>
  );
}

export function LoadingState({ text = "Lade deinen Tag…" }: { text?: string }) {
  return (
    <FullScreen>
      <div style={{ display: "flex", gap: 9 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: c.navy700,
              animation: "hipPulse 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 17, color: c.textMuted, fontWeight: 500 }}>{text}</div>
    </FullScreen>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <FullScreen>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: c.white,
          border: `1px solid ${c.line}`,
          boxShadow: HIP.shadow.soft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ic name="bulb" size={28} color={c.textMuted} sw={1.8} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: c.textDark, letterSpacing: "-0.01em", marginTop: 4 }}>
        Etwas ist still geworden.
      </div>
      <div style={{ fontSize: 16, color: c.textMuted, lineHeight: 1.5, maxWidth: 270 }}>
        Bitte später erneut versuchen.
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 10,
            minHeight: 52,
            padding: "0 26px",
            borderRadius: HIP.radius.pill,
            border: "none",
            background: HIP.heroGradient,
            color: "#fff",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: HIP.font,
            boxShadow: HIP.shadow.btn,
          }}
        >
          Erneut versuchen
        </button>
      )}
    </FullScreen>
  );
}

// Shimmer block
function Sk({ w, h, r = 8, style }: { w: number | string; h: number; r?: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: "linear-gradient(90deg, #E9EDF3 25%, #F3F6FA 37%, #E9EDF3 63%)",
        backgroundSize: "300% 100%",
        animation: "hipShimmer 1.5s ease infinite",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export function SkeletonHome() {
  return (
    <Shell active="home">
      <Sk w="42%" h={12} r={6} style={{ marginBottom: -2 }} />
      <Sk w="100%" h={170} r={HIP.radius.card} />
      <Card>
        <Sk w="48%" h={18} r={6} style={{ marginBottom: 18 }} />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              minHeight: 56,
              borderBottom: i === 2 ? "none" : `1px solid ${c.line}`,
            }}
          >
            <Sk w={40} h={40} r={20} />
            <Sk w={i === 0 ? "60%" : i === 1 ? "45%" : "52%"} h={15} r={6} />
          </div>
        ))}
      </Card>
      <Card>
        <Sk w="40%" h={18} r={6} style={{ marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 16 }}>
          <Sk w="50%" h={48} r={10} />
          <Sk w="50%" h={48} r={10} />
        </div>
      </Card>
    </Shell>
  );
}
