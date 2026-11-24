import type { KeyCheckResult, Provider } from "@/api/types";

export const providerName: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
  groq: "Groq",
  cerebras: "Cerebras",
  openrouter: "OpenRouter",
  mistral: "Mistral",
  custom: "Custom endpoint",
  mock: "Mock (development)",
};

export function vendorName(vendor: string): string {
  return (providerName as Record<string, string>)[vendor] ?? vendor;
}

export const checkLabel: Record<KeyCheckResult, { text: string; tone: "ok" | "caution" | "fault" }> = {
  ok: { text: "Working", tone: "ok" },
  key_rejected: { text: "Key rejected", tone: "fault" },
  quota_exhausted: { text: "Out of quota", tone: "caution" },
  rate_limited: { text: "Rate limited", tone: "caution" },
  provider_timeout: { text: "Provider timed out", tone: "caution" },
  provider_error: { text: "Provider error", tone: "caution" },
  provider_unavailable: { text: "Provider unavailable", tone: "caution" },
};

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const steps: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "Never";
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function usd(amount: number | null | undefined): string {
  if (amount == null) return "–";
  if (amount !== 0 && Math.abs(amount) < 0.01) return `$${amount.toFixed(4)}`;
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function count(n: number): string {
  return n.toLocaleString(undefined, { notation: n >= 100_000 ? "compact" : "standard" });
}

export function ms(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)} s` : `${n} ms`;
}

/** Calendar days in UTC as YYYY-MM-DD, which is how the usage rollup keys them. */
export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysAgo(n: number, from = new Date()): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - n);
  return isoDay(d);
}
