import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { clsx } from "clsx";
import { credentialsQuery, gatewayKeysQuery, routesQuery, usageQuery } from "@/api/queries";
import type { Credential, GatewayKey, Route, Usage } from "@/api/types";
import { count, daysAgo, usd } from "@/ui/format";
import { ErrorNote, Loading, Mono, PageHeader } from "@/ui/primitives";
import { CallSnippet } from "@/features/routes/CallSnippet";

type Setup = { credentials: Credential[]; routes: Route[]; keys: GatewayKey[]; usage: Usage | undefined };

type Step = {
  title: string;
  done: (s: Setup) => boolean;
  doneNote: (s: Setup) => ReactNode;
  todo: (s: Setup) => ReactNode;
};

const link = "font-medium text-relay underline-offset-4 hover:underline";
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const activeKeys = (s: Setup) => s.keys.filter((k) => !k.revoked_at);
const okCall = (s: Setup) => s.usage?.recent.find((e) => e.outcome === "ok" && e.status < 400);

const steps: Step[] = [
  {
    title: "Add a provider key",
    done: (s) => s.credentials.length > 0,
    doneNote: (s) => plural(s.credentials.length, "provider key"),
    todo: () => (
      <>
        Paste a key from OpenAI, Groq, Gemini or another provider. The gateway calls the provider with it.{" "}
        <Link to="/provider-keys" className={link}>
          Add provider key
        </Link>
      </>
    ),
  },
  {
    title: "Create a route",
    done: (s) => s.routes.length > 0,
    doneNote: (s) => (
      <>
        {s.routes.slice(0, 3).map((r, i) => (
          <span key={r.id}>
            {i > 0 && ", "}
            <Mono>{r.alias}</Mono>
          </span>
        ))}
        {s.routes.length > 3 && ` and ${s.routes.length - 3} more`}
      </>
    ),
    todo: () => (
      <>
        A route is the model name your app sends, and the providers it tries in order.{" "}
        <Link to="/routes/$routeId" params={{ routeId: "new" }} className={link}>
          New route
        </Link>
      </>
    ),
  },
  {
    title: "Create a gateway key",
    done: (s) => activeKeys(s).length > 0,
    doneNote: (s) => plural(activeKeys(s).length, "active key"),
    todo: () => (
      <>
        Your app sends this key instead of a provider's. You see it once, so copy it when it appears.{" "}
        <Link to="/gateway-keys" className={link}>
          Create gateway key
        </Link>
      </>
    ),
  },
  {
    title: "Make your first call",
    done: (s) => okCall(s) !== undefined,
    doneNote: (s) => (
      <>
        Last answered on <Mono>{okCall(s)?.route}</Mono>
      </>
    ),
    todo: (s) => (
      <>
        <p>Put your gateway key in <Mono>$GATEWAY_KEY</Mono> and run this. The call shows up here once it lands.</p>
        {s.routes[0] && (
          <div className="mt-3">
            <CallSnippet alias={s.routes[0].alias} />
          </div>
        )}
      </>
    ),
  },
];

export function OverviewPage() {
  const credentials = useQuery(credentialsQuery);
  const routes = useQuery(routesQuery);
  const keys = useQuery(gatewayKeysQuery);
  const setupWith = (usage: Usage | undefined): Setup | undefined =>
    credentials.data && routes.data && keys.data
      ? { credentials: credentials.data, routes: routes.data, keys: keys.data, usage }
      : undefined;
  const usage = useQuery({
    ...usageQuery({ from: daysAgo(6), to: daysAgo(0) }),
    refetchInterval: (q) => {
      const setup = setupWith(q.state.data);
      return setup && currentStep(setup) === steps.length - 1 ? 5_000 : false;
    },
  });

  const error = [credentials, routes, keys].find((q) => q.error)?.error;
  const setup = setupWith(usage.data);

  let body: ReactNode;
  if (error) body = <ErrorNote error={error} />;
  else if (!setup || usage.isPending) body = <Loading />;
  else {
    const current = currentStep(setup);
    body = (
      <>
        {current !== -1 && <GetStarted setup={setup} current={current} />}
        {setup.usage ? <WeekSummary usage={setup.usage} /> : <ErrorNote error={usage.error} />}
        {current === -1 && setup.routes[0] && (
          <section className="mt-12">
            <h2 className="text-base">Call a route</h2>
            <p className="mt-1 mb-4 text-muted">
              Any OpenAI-compatible client works. Set its base URL to{" "}
              <Mono className="text-ink">{window.location.origin}/v1</Mono> and send a route's name as the model.
            </p>
            <CallSnippet alias={setup.routes[0].alias} />
          </section>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader title="Overview" description="Where your gateway stands, and what it handled this week." />
      {body}
    </>
  );
}

function currentStep(setup: Setup): number {
  return steps.findIndex((s) => !s.done(setup));
}

function GetStarted({ setup, current }: { setup: Setup; current: number }) {
  return (
    <section className="mb-12">
      <h2 className="text-base">Get started</h2>
      <p className="mt-1 mb-5 text-muted">Four steps from a provider key to your app's first call.</p>
      <ol className="relative">
        {steps.map((step, i) => {
          const done = step.done(setup);
          const active = i === current;
          return (
            <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
              {i < steps.length - 1 && (
                <span aria-hidden className={clsx("absolute top-7 bottom-1 left-3.25 w-px", done ? "bg-relay" : "bg-line")} />
              )}
              <span
                aria-hidden
                className={clsx(
                  "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                  done && "border-relay bg-relay text-on-relay",
                  active && "border-relay bg-surface text-relay",
                  !done && !active && "border-line bg-surface text-muted",
                )}
              >
                {done ? <Check size={14} /> : i + 1}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className={clsx("font-medium", !done && !active && "text-muted")}>
                  {step.title}
                  <span className="sr-only">{done ? " (done)" : active ? " (next)" : ""}</span>
                </p>
                {done ? (
                  <p className="mt-0.5 text-sm text-muted">{step.doneNote(setup)}</p>
                ) : active ? (
                  <div className="mt-1 max-w-[70ch] text-muted">{step.todo(setup)}</div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function WeekSummary({ usage }: { usage: Usage }) {
  const t = usage.days.reduce(
    (a, d) => ({
      requests: a.requests + d.requests,
      errors: a.errors + d.errors,
      tokens: a.tokens + d.prompt_tokens + d.completion_tokens,
      cacheHits: a.cacheHits + d.cache_hits,
      cost: a.cost + d.cost_usd,
      unpriced: a.unpriced + d.unpriced_requests,
    }),
    { requests: 0, errors: 0, tokens: 0, cacheHits: 0, cost: 0, unpriced: 0 },
  );
  const { budget } = usage;
  const facts: [string, string][] = [
    ["Requests", count(t.requests)],
    ["Errors", t.requests ? `${count(t.errors)} (${((t.errors / t.requests) * 100).toFixed(1)}%)` : "0"],
    ["Tokens", count(t.tokens)],
    ["Cache hits", count(t.cacheHits)],
    ["Cost", usd(t.unpriced === t.requests ? null : t.cost)],
  ];

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base">Last 7 days</h2>
        <Link to="/usage" className={clsx(link, "text-sm")}>
          See usage
        </Link>
      </div>
      {t.requests === 0 ? (
        <p className="mt-1 text-muted">No requests yet. Calls through your routes are counted here.</p>
      ) : (
        <dl className="mt-3 flex flex-wrap gap-x-10 gap-y-3 border-y border-line py-4">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {t.unpriced > 0 && (
        <p className="mt-2 text-sm text-muted">
          {plural(t.unpriced, "request")} used a model with no known price, so the cost leaves them out.
        </p>
      )}
      {budget.monthly_budget_usd != null && (
        <p className="mt-3 text-sm text-muted">
          {usd(budget.spent_this_month_usd)} of the {usd(budget.monthly_budget_usd)} monthly budget spent. It resets{" "}
          {new Date(budget.resets_at).toLocaleDateString(undefined, { month: "long", day: "numeric" })}.
        </p>
      )}
    </section>
  );
}
