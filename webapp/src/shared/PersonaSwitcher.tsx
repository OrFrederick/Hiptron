// webapp/src/shared/PersonaSwitcher.tsx
import { useSearchParams } from "react-router-dom";

import { Ic } from "./Icon";
import { PERSONAS, personaName, usePersona } from "./persona";
import { HIP } from "./theme";

interface Props {
  variant?: "light" | "navy";
}

export function PersonaSwitcher({ variant = "light" }: Props) {
  const [params, setParams] = useSearchParams();
  const current = usePersona();
  const navy = variant === "navy";

  function onChange(value: string) {
    const next = new URLSearchParams(params);
    next.set("u", value);
    setParams(next, { replace: true });
  }

  return (
    <label
      aria-label={`Person wechseln, aktuell ${personaName(current)}`}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minHeight: navy ? 44 : 36,
        borderRadius: HIP.radius.pill,
        padding: navy ? "9px 12px 9px 16px" : "6px 10px 6px 14px",
        background: navy ? HIP.c.navyGlass : HIP.c.white,
        border: navy ? "none" : `1px solid ${HIP.c.line}`,
        color: navy ? "#fff" : HIP.c.textDark,
        fontSize: navy ? 18 : 14,
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: navy ? "none" : HIP.shadow.soft,
      }}
    >
      <span>{personaName(current)}</span>
      <Ic name="caret" size={navy ? 18 : 15} color={navy ? "rgba(255,255,255,0.8)" : HIP.c.textMuted} sw={2.2} />
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          cursor: "pointer",
          appearance: "none",
        }}
      >
        {PERSONAS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
