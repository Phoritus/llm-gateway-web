import { describe, expect, it } from "vitest";
import type { UsageDay } from "@/api/types";
import { summarizeUsage } from "./summarize";

const row = (o: Partial<UsageDay>): UsageDay => ({
  day: "2026-01-01",
  route: "chat",
  vendor: "groq",
  model: "llama",
  requests: 0,
  errors: 0,
  prompt_tokens: 0,
  completion_tokens: 0,
  avg_latency_ms: 0,
  cache_hits: 0,
  cost_usd: 0,
  unpriced_requests: 0,
  ...o,
});

describe("summarizeUsage", () => {
  it("returns zeros and a dense empty series for no rows", () => {
    const s = summarizeUsage([], "2026-01-01", "2026-01-03");
    expect(s.totals.requests).toBe(0);
    expect(s.totals.avgLatencyMs).toBe(0);
    expect(s.byDay.map((d) => d.day)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
    expect(s.byModel).toEqual([]);
  });

  it("sums totals and weights latency by requests", () => {
    const s = summarizeUsage(
      [
        row({ requests: 1, errors: 1, avg_latency_ms: 100, prompt_tokens: 10, completion_tokens: 5, cost_usd: 0.5, cache_hits: 1, unpriced_requests: 2 }),
        row({ model: "other", requests: 3, avg_latency_ms: 200, prompt_tokens: 1, cost_usd: 0.25 }),
      ],
      "2026-01-01",
      "2026-01-01",
    );
    expect(s.totals).toMatchObject({ requests: 4, errors: 1, promptTokens: 11, completionTokens: 5, costUsd: 0.75, cacheHits: 1, unpricedRequests: 2 });
    expect(s.totals.avgLatencyMs).toBe(175);
  });

  it("fills gaps with zeros and merges rows of the same day", () => {
    const s = summarizeUsage(
      [row({ day: "2026-01-01", requests: 2 }), row({ day: "2026-01-01", model: "b", requests: 1 }), row({ day: "2026-01-03", requests: 4 })],
      "2026-01-01",
      "2026-01-03",
    );
    expect(s.byDay.map((d) => d.requests)).toEqual([3, 0, 4]);
  });

  it("groups by vendor and model, busiest first", () => {
    const s = summarizeUsage(
      [
        row({ day: "2026-01-01", requests: 1 }),
        row({ day: "2026-01-02", requests: 1 }),
        row({ vendor: "gemini", model: "flash", requests: 5 }),
        row({ vendor: "openai", model: "llama", requests: 1 }),
      ],
      "2026-01-01",
      "2026-01-02",
    );
    expect(s.byModel.map((m) => [m.vendor, m.model, m.requests])).toEqual([
      ["gemini", "flash", 5],
      ["groq", "llama", 2],
      ["openai", "llama", 1],
    ]);
  });
});
