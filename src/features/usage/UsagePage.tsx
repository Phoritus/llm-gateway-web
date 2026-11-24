import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { routesQuery, usageQuery } from "@/api/queries";
import type { Outcome, UsageEvent, WorkspaceBudget } from "@/api/types";
import { count, dateTime, daysAgo, ms, usd, vendorName } from "@/ui/format";
import { Dot, Empty, ErrorNote, Loading, Mono, PageHeader, Select, Table } from "@/ui/primitives";
import { summarizeUsage, type DayPoint } from "./summarize";

const RANGES = [7, 30, 90] as const;

const outcomeLabel: Record<Outcome, { text: string; tone: "ok" | "caution" | "fault" | "idle" }> = {
  ok: { text: "Completed", tone: "ok" },
  stream_error: { text: "Stream failed", tone: "fault" },
  client_gone: { text: "Client left", tone: "idle" },
  budget_exceeded: { text: "Over budget", tone: "caution" },
};

export function UsagePage() {
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [route, setRoute] = useState("");
  const from = daysAgo(range - 1);
  const to = daysAgo(0);
  const routes = useQuery(routesQuery);
  const { data, isPending, error } = useQuery(usageQuery({ from, to, route: route || undefined }));
  const summary = data ? summarizeUsage(data.days, from, to) : null;

  return (
    <>
      <PageHeader title="Usage" description="Requests, spend and speed through your routes. Days are counted in UTC." />
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div role="group" aria-label="Date range" className="inline-flex rounded-control border border-line bg-surface p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={clsx(
                "h-8 rounded-[4px] px-3 text-sm",
                range === r ? "bg-relay font-medium text-on-relay" : "text-muted hover:text-ink",
              )}
            >
              {r} days
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          Route
          <Select value={route} onChange={(e) => setRoute(e.target.value)} className="w-auto min-w-40">
            <option value="">All routes</option>
            {routes.data?.map((r) => (
              <option key={r.id} value={r.alias}>
                {r.alias}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorNote error={error} />
      ) : (
        <div className="flex flex-col gap-10">
          <BudgetMeter budget={data.budget} />

          {summary && summary.totals.requests === 0 ? (
            <Empty title="No requests in this range">Send a request through the gateway and it will appear here.</Empty>
          ) : (
            summary && (
              <>
                <p className="max-w-[70ch]">
                  <span className="font-medium">{count(summary.totals.requests)}</span> requests,{" "}
                  <span className="font-medium">{count(summary.totals.errors)}</span> errors,{" "}
                  <span className="font-medium">{count(summary.totals.promptTokens + summary.totals.completionTokens)}</span> tokens,{" "}
                  <span className="font-medium">{usd(summary.totals.costUsd)}</span> spent,{" "}
                  <span className="font-medium">{count(summary.totals.cacheHits)}</span> from cache, average{" "}
                  <span className="font-medium">{ms(Math.round(summary.totals.avgLatencyMs))}</span>.
                  {summary.totals.unpricedRequests > 0 && (
                    <span className="text-muted"> {count(summary.totals.unpricedRequests)} requests have no known price and count as $0.</span>
                  )}
                </p>
                <DailyChart points={summary.byDay} />
                <section>
                  <h2 className="mb-3 text-base">By model</h2>
                  <Table>
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th className="text-right">Requests</th>
                        <th className="text-right">Errors</th>
                        <th className="text-right">Tokens</th>
                        <th className="text-right">Average</th>
                        <th className="text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.byModel.map((m) => (
                        <tr key={`${m.vendor}/${m.model}`}>
                          <td>
                            <Mono>{m.model}</Mono> <span className="text-muted">{vendorName(m.vendor)}</span>
                          </td>
                          <td className="text-right tabular-nums">{count(m.requests)}</td>
                          <td className="text-right tabular-nums">{count(m.errors)}</td>
                          <td className="text-right tabular-nums">{count(m.tokens)}</td>
                          <td className="text-right tabular-nums">{ms(Math.round(m.avgLatencyMs))}</td>
                          <td className="text-right tabular-nums">{usd(m.costUsd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </section>
              </>
            )
          )}

          <section>
            <h2 className="mb-1 text-base">Recent requests</h2>
            <p className="mb-3 text-sm text-muted">The 50 newest, whatever the filters above.</p>
            {data.recent.length === 0 ? <p className="text-muted">Nothing yet.</p> : <RecentTable events={data.recent} />}
          </section>
        </div>
      )}
    </>
  );
}

function DailyChart({ points }: { points: DayPoint[] }) {
  const label = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
  return (
    <section aria-labelledby="daily">
      <h2 id="daily" className="mb-3 text-base">
        Requests per day
      </h2>
      <div className="h-56 w-full" role="img" aria-label={`Bar chart of requests per day over ${points.length} days. A table with the same numbers is below.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis
              dataKey="day"
              tickFormatter={label}
              tickLine={false}
              axisLine={{ stroke: "var(--color-line)" }}
              tick={{ fill: "var(--color-muted)", fontSize: 12 }}
              minTickGap={24}
            />
            <YAxis allowDecimals={false} width={40} tickLine={false} axisLine={false} tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: "var(--color-ink)", fillOpacity: 0.06 }}
              labelFormatter={(day) => label(String(day))}
              formatter={(v) => [count(Number(v)), "Requests"]}
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-line)",
                borderRadius: 6,
                color: "var(--color-ink)",
                fontSize: 13,
              }}
              labelStyle={{ color: "var(--color-muted)" }}
              itemStyle={{ color: "var(--color-ink)" }}
            />
            <Bar dataKey="requests" fill="var(--color-relay)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-sm text-muted">
        <summary className="cursor-pointer">Show as table</summary>
        <div className="mt-2 text-ink">
          <Table>
            <thead>
              <tr>
                <th>Day</th>
                <th className="text-right">Requests</th>
                <th className="text-right">Errors</th>
                <th className="text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.day}>
                  <td>{label(p.day)}</td>
                  <td className="text-right tabular-nums">{count(p.requests)}</td>
                  <td className="text-right tabular-nums">{count(p.errors)}</td>
                  <td className="text-right tabular-nums">{usd(p.costUsd)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </details>
    </section>
  );
}

function BudgetMeter({ budget }: { budget: WorkspaceBudget }) {
  const spent = budget.spent_this_month_usd ?? 0;
  const limit = budget.monthly_budget_usd;
  if (limit == null) {
    return (
      <section aria-labelledby="budget">
        <h2 id="budget" className="text-base">
          Workspace budget
        </h2>
        <p className="mt-1 text-muted">No budget. {usd(spent)} spent this month. Set one in Settings.</p>
      </section>
    );
  }
  const ratio = limit > 0 ? spent / limit : spent > 0 ? 1 : 0;
  const tone = ratio >= 1 ? "fault" : ratio >= 0.8 ? "caution" : "ok";
  const resets = new Date(budget.resets_at).toLocaleDateString(undefined, { dateStyle: "medium" });
  const status =
    tone === "fault"
      ? budget.budget_action === "block"
        ? "Over budget, so paid models are blocked."
        : "Over budget, and requests continue."
      : tone === "caution"
        ? "Nearly used up."
        : "";
  return (
    <section aria-labelledby="budget" className="max-w-xl">
      <h2 id="budget" className="text-base">
        Workspace budget
      </h2>
      <div
        role="meter"
        aria-label="Spent this month"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(spent, limit)}
        aria-valuetext={`${usd(spent)} of ${usd(limit)}`}
        className="mt-2 h-2 overflow-hidden rounded-full bg-line"
      >
        <div
          className={clsx("h-full rounded-full", tone === "ok" && "bg-relay", tone === "caution" && "bg-caution", tone === "fault" && "bg-fault")}
          style={{ width: `${Math.min(ratio, 1) * 100}%` }}
        />
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm">
        <Dot tone={tone} />
        <span>
          {usd(spent)} <span className="text-muted">of {usd(limit)} this month</span>
        </span>
        <span className="text-muted">
          {status} Resets {resets}.
        </span>
      </p>
    </section>
  );
}

function RecentTable({ events }: { events: UsageEvent[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <th>When</th>
          <th>Route</th>
          <th>Model</th>
          <th>Status</th>
          <th>Outcome</th>
          <th className="text-right">Tries</th>
          <th>Cache</th>
          <th className="text-right">Latency</th>
          <th className="text-right">Cost</th>
        </tr>
      </thead>
      <tbody>
        {events.map((e, i) => {
          const outcome = outcomeLabel[e.outcome];
          return (
            <tr key={`${e.created_at}-${i}`}>
              <td className="whitespace-nowrap">{dateTime(e.created_at)}</td>
              <td>
                <Mono>{e.route}</Mono>
              </td>
              <td>
                <Mono>{e.model}</Mono> <span className="text-muted">{vendorName(e.vendor)}</span>
              </td>
              <td className="tabular-nums">{e.status}</td>
              <td>
                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                  <Dot tone={outcome.tone} />
                  {outcome.text}
                </span>
              </td>
              <td className="text-right tabular-nums">{e.attempts}</td>
              <td>{e.cached ? "Hit" : "Miss"}</td>
              <td className="text-right tabular-nums">{ms(e.latency_ms)}</td>
              <td className="text-right tabular-nums">{usd(e.cost_usd)}</td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
