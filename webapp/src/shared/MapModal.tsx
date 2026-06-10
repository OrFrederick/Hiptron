import { useEffect } from "react";
import { createPortal } from "react-dom";

import { LeafletMap } from "./LeafletMap";
import { HIP } from "./theme";
import type { SchematicMap } from "./types";

const c = HIP.c;

interface Props {
  map: SchematicMap;
  title: string;
  lastSeenInitial?: string;
  onClose: () => void;
}

export function MapModal({ map, title, lastSeenInitial, onClose }: Props) {
  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: c.appBg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          height: 56,
          minHeight: 56,
          background: c.white,
          borderBottom: `1px solid ${c.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: "#1A2230",
            letterSpacing: "-0.005em",
          }}
        >
          {title}
        </span>
        <button
          aria-label="Karte schließen"
          onClick={onClose}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: `1px solid ${c.line}`,
            background: c.white,
            color: c.textDark,
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Map body — flex:1 with minHeight:0 so the child div can fill it */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          padding: 0,
        }}
      >
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <LeafletMap
            map={map}
            height="100%"
            interactive
            lastSeenInitial={lastSeenInitial}
          />
        </div>
      </div>

    </div>,
    document.body,
  );
}
