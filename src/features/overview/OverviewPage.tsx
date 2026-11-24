import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Check } from "lucide-react";
import { credentialsQuery, gatewayKeysQuery, routesQuery, usageQuery } from "@/api/queries";
import { summarizeUsage } from "@/features/usage/summarize";
import { count, daysAgo, usd } from "@/ui/format";
import { CopyButton, ErrorNote, Loading, Mono, PageHeader } from "@/ui/primitives";

type Step = {
  title: string;
  body: string;
  done: boolean;
  link: { to: "/provider-keys" | "/routes" | "/gateway-keys" | "/usage"; label: string };
};

function curlFor(alias: string) {
  return `curl ${location.origin}/v1/chat/completions \
  -H "Authorization: Bearer $GATEWAY_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "${alias}", "messages": [{"role": "user", "content": "Say hello"}]}'`;
}

export function OverviewPage() {
  const credentials = useQuery(credentialsQuery);
  const routes = useQuery(routesQuery);
  const keys = useQuery(gatewayKeysQuery);
  const from = daysAgo(6);
  const to = daysAgo(0);
  const usage = useQuery(usageQuery({ from, to }));

  const queries = [credentials, routes, keys, usage];
  const failed = queries.find((q) => q.error)?.error;
  const loading = queries.some((q) => q.isPending) && !failed;

  const summary = usage.data ? summarizeUsage(usage.data.days, from, to) : null;
  const firstAlias = routes.data?.[0]?.alias;

  const steps: Step[] = [
    {
      title: "Add a provider key",
      body: "Paste a key from OpenAI, Groq, Gemini or any other provider you already use.",
      done: !!credentials.data?.length,
      link: { to: "/provider-keys", label: "Add provider key" },
    },
    {
      title: "Create a route",
      body: "A route is the model name your app sends, backed by providers tried in order.",
      done: !!routes.data?.length,
      link: { to: "/routes", label: "Create route" },
    },
    {
      title: "Create a gateway key",
      body: "Your app uses this key instead of the provider key.",
      done: !!keys.data?.some((k) => !k.revoked_at),
      link: { to: "/gateway-keys", label: "Create gateway key" },
    },
    {
      title: "Make your first call",
      body: "Send a request through the gateway. It shows up under Usage.",
      done: (summary?.totals.requests ?? 0) > 0 || (usage.data?.recent.length ?? 0) > 0,
      link: { to: "/usage", label: "See usage" },
    },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <>
      <PageHeader title="Overview" description="What to set up next, and how the last seven days went." />
      {failed ? (
        <ErrorNote error={failed} />
      ) : loading ? (
        <Loading />
      ) : (
        <div className="flex flex-col gap-12">
          <ol className="flex flex-col">
            {steps.map((step, i) => {
              const isCurrent = i === current;
              return (
                <li key={step.title} className="relative flex gap-4 pb-8 last:pb-0" aria-current={isCurrent ? "step" : undefined}>
                  {i < steps.length - 1 && <span aria-hidden className="absolute left-3 top-7 bottom-1 w-px bg-line" />}
                  <span
                    className={clsx(
                      "relative z-[1] grid size-6 shrink-0 place-items-center rounded-full border text-xs font-medium",
                      step.done && "border-relay bg-relay text-on-relay",
                      isCurrent && "border-relay bg-surface text-relay",
                      !step.done && !isCurrent && "border-line bg-surface text-muted",
                    )}
                  >
                    {step.done ? <Check size={14} aria-hidden /> : i + 1}
                    {step.done && <span className="sr-only">Done</span>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className={clsx("text-base", !isCurrent && !step.done && "text-muted")}>{step.title}</h2>
                    {(isCurrent || !step.done) && <p className="mt-0.5 max-w-[60ch] text-muted">{step.body}</p>}
                    {isCurrent && (
                      <>
                        {i === 3 && firstAlias ? (
                          <div className="mt-3 max-w-2xl rounded-panel border border-line bg-surface">
                            <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs text-muted">
                              Replace $GATEWAY_KEY with your gateway key.
                              <CopyButton value={curlFor(firstAlias)} />
                            </div>
                            <pre className="overflow-x-auto p-4 font-mono text-[13px]">{curlFor(firstAlias)}</pre>
                          </div>
                        ) : (
                          <Link
                            to={step.link.to}
                            className="mt-3 inline-flex h-9 items-center rounded-control bg-relay px-3.5 text-sm font-medium text-on-relay hover:brightness-110"
                          >
                            {step.link.label}
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {summary && (
            <section aria-labelledby="week">
              <h2 id="week" className="text-base">
                Last 7 days
              </h2>
              {summary.totals.requests === 0 ? (
                <p className="mt-1 text-muted">No requests yet.</p>
              ) : (
                <p className="mt-1 max-w-[70ch]">
                  <span className="font-medium">{count(summary.totals.requests)}</span> requests,{" "}
                  <span className="font-medium">{count(summary.totals.errors)}</span> errors,{" "}
                  <span className="font-medium">{usd(summary.totals.costUsd)}</span> spent,{" "}
                  <span className="font-medium">{count(summary.totals.cacheHits)}</span> answered from cache.{" "}
                  <Link to="/usage" className="text-relay underline-offset-4 hover:underline">
                    Full usage
                  </Link>
                </p>
              )}
              {firstAlias && current !== 3 && (
                <p className="mt-3 text-sm text-muted">
                  Calling <Mono>{firstAlias}</Mono> through <Mono>{location.origin}/v1</Mono>.
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </>
  );
}
