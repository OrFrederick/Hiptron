import {
  Fragment,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";

import { useEmbedSuffix } from "./embed";
import { Ic } from "./Icon";
import { LeafletMap } from "./LeafletMap";
import { MapModal } from "./MapModal";
import { usePersona } from "./persona";
import { HIP, type IconName } from "./theme";
import type { SchematicMap } from "./types";

const c = HIP.c;

// ── Section label ("Schnellinfos", "MEINE MOBILITÄT") ──
export function SectionLabel({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: c.textMuted,
        letterSpacing: "0.01em",
        padding: "0 4px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Avatar (initial on a soft fill) ──
export function Avatar({
  name = "H",
  size = 40,
  bg = c.navyGlass,
  color = "#fff",
  ring,
}: {
  name?: string;
  size?: number;
  bg?: string;
  color?: string;
  ring?: string;
}) {
  return (
    <div
      aria-label={`Profil ${name}`}
      role="img"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.42,
        fontWeight: 600,
        flexShrink: 0,
        boxShadow: ring ? `0 0 0 2px ${ring}` : "none",
      }}
    >
      {name.slice(0, 1)}
    </div>
  );
}

// ── White content card ──
export function Card({
  children,
  style,
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      aria-label={ariaLabel}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      style={{
        background: c.white,
        borderRadius: HIP.radius.card,
        boxShadow: HIP.shadow.card,
        border: `1px solid ${c.line}`,
        padding: HIP.space.padLg,
        boxSizing: "border-box",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Status pill ("In Ordnung", "Alles sieht gut aus") ──
export function StatusPill({
  children,
  tone = "green",
  icon = "check",
  size = "md",
}: {
  children: ReactNode;
  tone?: "green" | "amber";
  icon?: IconName;
  size?: "md" | "lg";
}) {
  const map = {
    green: { bg: c.green50, fg: c.green700, dot: c.green500 },
    amber: { bg: c.amber50, fg: c.amber600, dot: c.amber500 },
  }[tone];
  const big = size === "lg";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        background: map.bg,
        color: map.fg,
        borderRadius: HIP.radius.pill,
        padding: big ? "9px 15px 9px 11px" : "6px 12px 6px 9px",
        fontSize: big ? 16 : 14,
        fontWeight: 600,
        letterSpacing: "-0.005em",
      }}
    >
      <span
        style={{
          width: big ? 22 : 19,
          height: big ? 22 : 19,
          borderRadius: "50%",
          background: map.dot,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Ic name={icon} size={big ? 14 : 12} color="#fff" sw={2.4} />
      </span>
      {children}
    </span>
  );
}

// ── Navy hero card (senior) ──
export function HeroCard({
  greeting,
  name,
  statusText = "In Ordnung",
  tagline = "Heute schon alles im Grünen?",
  avatar = "H",
  rightSlot,
  onProfile,
}: {
  greeting: string;
  name: string;
  statusText?: string;
  tagline?: string;
  avatar?: string;
  rightSlot?: ReactNode;
  onProfile?: () => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: HIP.radius.card,
        background: HIP.heroGradient,
        boxShadow: HIP.shadow.hero,
        color: "#fff",
        padding: "18px 20px 20px",
      }}
    >
      <svg
        width="170"
        height="170"
        viewBox="0 0 170 170"
        aria-hidden="true"
        style={{ position: "absolute", top: -26, right: -22, opacity: 0.5 }}
      >
        <circle cx="118" cy="52" r="26" fill="rgba(242,183,5,0.30)" />
        <circle cx="118" cy="52" r="15" fill="rgba(242,183,5,0.45)" />
        <path d="M0 150 Q60 116 110 138 T210 130 V210 H0 Z" fill="rgba(255,255,255,0.06)" />
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: c.onNavy70 }}>{greeting}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 2 }}>
            <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05 }}>{name}</span>
            <Ic name="sun" size={26} color="#F6C84B" sw={2} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {rightSlot}
          <button
            aria-label="Profil"
            onClick={onProfile}
            style={{ width: 44, height: 44, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer", background: "transparent" }}
          >
            <Avatar name={avatar} size={44} bg="rgba(255,255,255,0.22)" ring="rgba(255,255,255,0.35)" />
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, position: "relative" }}>
        <StatusPill tone="green" size="lg">{statusText}</StatusPill>
      </div>

      <div style={{ marginTop: 14, fontSize: 15, color: c.onNavy70, lineHeight: 1.4, maxWidth: 240, position: "relative" }}>
        {tagline}
      </div>
    </div>
  );
}

// ── Navy header (relative) — slimmer, dropdown + avatar + status ──
export function RelativeHeader({
  greeting = "Guten Morgen",
  statusText = "Alles sieht gut aus",
  tone = "green",
  subtext,
  personaSlot,
  onProfile,
  avatarName = "A",
}: {
  greeting?: string;
  statusText?: string;
  tone?: "green" | "amber";
  subtext?: ReactNode;
  personaSlot?: ReactNode;
  onProfile?: () => void;
  avatarName?: string;
}) {
  const profileBtn = (
    <button aria-label="Profil" onClick={onProfile} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
      <Avatar name={avatarName} size={40} bg="rgba(255,255,255,0.22)" ring="rgba(255,255,255,0.35)" />
    </button>
  );

  // Embed mode passes no personaSlot: skip the top row entirely and float the
  // profile avatar top-right so the greeting rises to the top (no navy void).
  const hasSlot = personaSlot != null;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: HIP.radius.card,
        background: HIP.heroGradient,
        boxShadow: HIP.shadow.hero,
        color: "#fff",
        padding: "16px 18px 20px",
      }}
    >
      {hasSlot ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {personaSlot}
          {profileBtn}
        </div>
      ) : (
        <div style={{ position: "absolute", top: 16, right: 18 }}>{profileBtn}</div>
      )}

      <div style={{ marginTop: hasSlot ? 18 : 0, fontSize: 15, color: c.onNavy70, fontWeight: 500 }}>{greeting}</div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <StatusPill tone={tone} size="lg">{statusText}</StatusPill>
      </div>
      {subtext && <div style={{ marginTop: 12, fontSize: 14.5, color: c.onNavy70, lineHeight: 1.45 }}>{subtext}</div>}
    </div>
  );
}

// ── Checklist row (icon circle · label · green check) ──
export function ChecklistRow({
  icon,
  tint,
  iconColor,
  label,
  last,
}: {
  icon: IconName;
  tint: string;
  iconColor: string;
  label: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        minHeight: 56,
        borderBottom: last ? "none" : `1px solid ${c.line}`,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: tint,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Ic name={icon} size={21} color={iconColor} sw={2} />
      </div>
      <div style={{ flex: 1, fontSize: 17, fontWeight: 500, color: c.textDark }}>{label}</div>
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: c.green50,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Ic name="check" size={15} color={c.green600} sw={2.4} />
      </span>
    </div>
  );
}

// ── Stat cell ──
function StatCell({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: c.textDark, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 16, fontWeight: 600, color: c.textMuted }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 14, color: c.textMuted, marginTop: 3, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

// ── Mobility stat card (senior) ──
export function StatCard({
  title = "Bewegung heute",
  cells,
}: {
  title?: string;
  cells: { value: string; unit?: string; label: string }[];
}) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ width: 34, height: 34, borderRadius: "50%", background: c.blue50, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Ic name="walk" size={20} color={c.blue600} sw={2} />
        </span>
        <div style={{ fontSize: 18, fontWeight: 600, color: c.textDark }}>{title}</div>
      </div>
      <div style={{ display: "flex", alignItems: "stretch", gap: 16 }}>
        {cells.map((cell, i) => (
          <Fragment key={i}>
            {i > 0 && <div style={{ width: 1, background: c.line, alignSelf: "stretch" }} />}
            <StatCell {...cell} />
          </Fragment>
        ))}
      </div>
    </Card>
  );
}

// ── Map card (relative) — real OpenStreetMap tiles + the actual GPS route ──
export function MapCard({
  map,
  avatar = "H",
  callout = "Unterwegs",
  mapTitle = "Karte",
  onClick,
}: {
  map: SchematicMap;
  avatar?: string;
  callout?: string;
  mapTitle?: string;
  onClick?: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Card style={{ padding: 8, overflow: "hidden" }} ariaLabel="Karte der heutigen Runde">
        {/* Map area — tapping opens the full-screen overlay */}
        <div
          role="button"
          aria-label="Karte vergrößern"
          tabIndex={0}
          onClick={() => setModalOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setModalOpen(true); }}
          style={{ borderRadius: 18, overflow: "hidden", position: "relative", isolation: "isolate", cursor: "pointer" }}
        >
          <LeafletMap map={map} height={210} lastSeenInitial={avatar} />
          <div style={{ position: "absolute", left: 12, bottom: 12, zIndex: 2, background: c.white, borderRadius: HIP.radius.pill, padding: "7px 13px", boxShadow: HIP.shadow.soft, display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.green500, flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: c.textDark }}>{callout}</span>
          </div>
        </div>
        {/* Caption row — tapping navigates to detail (old onClick behaviour) */}
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 10px 6px", cursor: onClick ? "pointer" : "default" }}
        >
          <div style={{ fontSize: 13.5, color: c.textMuted }}>Wege dieser Woche · zuletzt gesehen</div>
          <Ic name="chevron" size={18} color={c.textMuted} sw={2} />
        </div>
      </Card>

      {modalOpen && (
        <MapModal
          map={map}
          title={mapTitle}
          lastSeenInitial={avatar}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

// ── Activity row (relative) ──
export function ActivityRow({
  icon,
  text,
  time,
  last,
  onClick,
}: {
  icon: IconName;
  text: ReactNode;
  time: string;
  last?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        minHeight: 56,
        cursor: onClick ? "pointer" : "default",
        borderBottom: last ? "none" : `1px solid ${c.line}`,
      }}
    >
      <span style={{ width: 40, height: 40, borderRadius: "50%", background: c.green50, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Ic name={icon} size={20} color={c.green600} sw={2} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: c.textDark }}>{text}</div>
        <div style={{ fontSize: 13.5, color: c.textMuted, marginTop: 2 }}>{time}</div>
      </div>
      <Ic name="chevron" size={18} color={c.textMuted} sw={2} />
    </div>
  );
}

// ── Navy section label ("Meine Woche", "Wo du warst") ──
export function NavyLabel({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: c.navy700,
        padding: "0 4px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Large back button (senior, ≥56px) ──
export function BackButtonBig({
  label = "Zurück",
  onBack,
}: {
  label?: string;
  onBack?: () => void;
}) {
  return (
    <button
      onClick={onBack}
      aria-label={label}
      style={{
        alignSelf: "flex-start",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minHeight: 56,
        padding: "0 20px 0 13px",
        background: c.white,
        border: `1px solid ${c.line}`,
        borderRadius: HIP.radius.pill,
        boxShadow: HIP.shadow.soft,
        color: c.navy700,
        fontSize: 18,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: HIP.font,
      }}
    >
      <Ic name="chevron" size={22} color={c.navy700} sw={2.3} style={{ transform: "scaleX(-1)" }} />
      {label}
    </button>
  );
}

// ── Slim navy header (relative insights — back + title) ──
export function SlimNavyHeader({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return (
    <div
      style={{
        borderRadius: HIP.radius.card,
        background: HIP.heroGradient,
        boxShadow: HIP.shadow.hero,
        color: "#fff",
        padding: "13px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <button
        onClick={onBack}
        aria-label="Zurück"
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "none",
          background: c.navyGlass,
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Ic name="chevron" size={20} color="#fff" sw={2.3} style={{ transform: "scaleX(-1)" }} />
      </button>
      <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</div>
    </div>
  );
}

// ── Calm insight card (Rückblicke language: noun label → headline + trend pill → viz) ──
export function InsightCard({
  label,
  headline,
  pill,
  children,
}: {
  label: ReactNode;
  headline: ReactNode;
  pill?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <SectionLabel>{label}</SectionLabel>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: c.textDark, lineHeight: 1.35 }}>{headline}</div>
          {pill && <div style={{ marginTop: 2 }}>{pill}</div>}
        </div>
        {children && <div style={{ marginTop: 18 }}>{children}</div>}
      </Card>
    </>
  );
}

// ── Bottom tab bar (live nav — every tab routes to a real screen) ──
export function BottomTabBar({
  active = "home",
  mode = "older",
}: {
  active?: string;
  mode?: "older" | "relative";
}) {
  const navigate = useNavigate();
  const userId = usePersona();
  const e = useEmbedSuffix();
  const tabs: { id: string; label: string; icon: IconName; to: string }[] =
    mode === "older"
      ? [
          { id: "home", label: "Start", icon: "house", to: `/older-adult?u=${userId}${e}` },
        ]
      : [
          { id: "home", label: "Start", icon: "house", to: `/relative?u=${userId}${e}` },
          { id: "stats", label: "Einblicke", icon: "bars", to: `/relative/insights?u=${userId}${e}` },
          { id: "profil", label: "Profil", icon: "shield", to: `/profil?u=${userId}&m=relative${e}` },
        ];
  return (
    <div
      style={{
        display: "flex",
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(18px) saturate(160%)",
        WebkitBackdropFilter: "blur(18px) saturate(160%)",
        borderTop: `1px solid ${c.line}`,
        padding: "8px 8px max(10px, env(safe-area-inset-bottom))",
        flexShrink: 0,
      }}
    >
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            aria-label={t.label}
            aria-current={on ? "page" : undefined}
            onClick={() => navigate(t.to)}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "6px 0",
              minHeight: 48,
            }}
          >
            <Ic
              name={t.icon}
              size={25}
              color={on ? c.navy700 : c.textMuted}
              sw={on ? 2.2 : 1.9}
              fill={on && (t.icon === "pin" || t.icon === "shield") ? c.navy700 : undefined}
            />
            <span style={{ fontSize: 11, fontWeight: on ? 700 : 500, color: on ? c.navy700 : c.textMuted, letterSpacing: "0.01em" }}>
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
