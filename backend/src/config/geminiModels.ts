// Verified against ai.google.dev/gemini-api/docs/models (Aug 2026). Google ships new
// model IDs often — this array is the single place to add/remove/re-default one.
export interface GeminiModelOption {
  id: string;
  label: string;
  tier: "pro" | "flash" | "flash-lite";
  isDefault?: boolean;
}

export const GEMINI_MODELS: GeminiModelOption[] = [
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview) — deepest reasoning, slower", tier: "pro" },
  { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash — recommended", tier: "flash", isDefault: true },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", tier: "flash" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite — fastest, lowest cost", tier: "flash-lite" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (stable fallback)", tier: "pro" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (stable fallback)", tier: "flash" },
];

export function getDefaultModel(): string {
  return GEMINI_MODELS.find((m) => m.isDefault)?.id ?? GEMINI_MODELS[0].id;
}

export function isKnownModel(id: string): boolean {
  return GEMINI_MODELS.some((m) => m.id === id);
}
