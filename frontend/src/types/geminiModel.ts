export interface GeminiModelOption {
  id: string;
  label: string;
  tier: "pro" | "flash" | "flash-lite";
  isDefault?: boolean;
}
