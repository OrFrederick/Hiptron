// webapp/src/shared/persona.ts
import { useSearchParams } from "react-router-dom";

export const PERSONAS = [
  { id: "helga", name: "Helga" },
  { id: "otto", name: "Otto" },
  { id: "margarete", name: "Margarete" },
  { id: "ingrid", name: "Ingrid" },
] as const;

export function usePersona(): string {
  const [params] = useSearchParams();
  const u = params.get("u");
  return PERSONAS.some((p) => p.id === u) ? (u as string) : "helga";
}
