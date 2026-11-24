import type { UsageDay } from "@/api/types";

export type UsageTotals = {
  requests: number;
  errors: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  cacheHits: number;
  unpricedRequests: number;
  avgLatencyMs: number;
};

export type DayPoint = { day: string; requests: number; errors: number; costUsd: number };
export type ModelRow = { vendor: string; model: string; requests: number; errors: number; tokens: number; costUsd: number; avgLatencyMs: number };

export type UsageSummary = { totals: UsageTotals; byDay: DayPoint[]; byModel: ModelRow[] };

const DAY_MS = 86_400_000;

function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let t = Date.parse(from); t <= Date.parse(to); t += DAY_MS) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

export function summarizeUsage(days: UsageDay[], from: string, to: string): UsageSummary {
  const totals: UsageTotals = {
    requests: 0,
    errors: 0,
    promptTokens: 0,
    completionTokens: 0,
    costUsd: 0,
    cacheHits: 0,
    unpricedRequests: 0,
    avgLatencyMs: 0,
  };
  let latencyWeighted = 0;
  const byDay = new Map<string, DayPoint>(daysBetween(from, to).map((day) => [day, { day, requests: 0, errors: 0, costUsd: 0 }]));
  const byModel = new Map<string, ModelRow & { weighted: number }>();

  for (const d of days) {
    totals.requests += d.requests;
    totals.errors += d.errors;
    totals.promptTokens += d.prompt_tokens;
    totals.completionTokens += d.completion_tokens;
    totals.costUsd += d.cost_usd;
    totals.cacheHits += d.cache_hits;
    totals.unpricedRequests += d.unpriced_requests;
    latencyWeighted += d.avg_latency_ms * d.requests;

    const point = byDay.get(d.day);
    if (point) {
      point.requests += d.requests;
      point.errors += d.errors;
      point.costUsd += d.cost_usd;
    }

    const key = `${d.vendor}\u0000${d.model}`;
    const row = byModel.get(key) ?? { vendor: d.vendor, model: d.model, requests: 0, errors: 0, tokens: 0, costUsd: 0, avgLatencyMs: 0, weighted: 0 };
    row.requests += d.requests;
    row.errors += d.errors;
    row.tokens += d.prompt_tokens + d.completion_tokens;
    row.costUsd += d.cost_usd;
    row.weighted += d.avg_latency_ms * d.requests;
    byModel.set(key, row);
  }

  totals.avgLatencyMs = totals.requests ? latencyWeighted / totals.requests : 0;

  return {
    totals,
    byDay: [...byDay.values()],
    byModel: [...byModel.values()]
      .map(({ weighted, ...row }) => ({ ...row, avgLatencyMs: row.requests ? weighted / row.requests : 0 }))
      .sort((a, b) => b.requests - a.requests),
  };
}
