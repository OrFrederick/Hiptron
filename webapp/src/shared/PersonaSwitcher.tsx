// webapp/src/shared/PersonaSwitcher.tsx
import { useSearchParams } from "react-router-dom";

import { PERSONAS, usePersona } from "./persona";

export function PersonaSwitcher() {
  const [params, setParams] = useSearchParams();
  const current = usePersona();
  return (
    <label className="flex items-center justify-end gap-2 text-xs text-warm-800/60">
      <span className="uppercase tracking-wide">Demo-Person</span>
      <select
        className="rounded-lg border border-warm-200 bg-white px-2 py-1 text-sm text-warm-900"
        value={current}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          next.set("u", e.target.value);
          setParams(next, { replace: true });
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
