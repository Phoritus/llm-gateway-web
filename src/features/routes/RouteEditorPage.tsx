import { useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowLeft, ArrowUp, Plus, X } from "lucide-react";
import { clsx } from "clsx";
import { credentialsQuery, routesQuery, useDeleteRoute, useSaveRoute } from "@/api/queries";
import type { CacheMode, Credential, HandoffMode, Route, RouteSpec, RouteTarget } from "@/api/types";
import { checkLabel, providerName } from "@/ui/format";
import {
  Button,
  ConfirmDialog,
  CopyButton,
  Dot,
  ErrorNote,
  Field,
  Input,
  Loading,
  Mono,
  Panel,
  Select,
  Switch,
  TextField,
  fieldError,
} from "@/ui/primitives";

const blank: RouteSpec = { alias: "", free_first: false, cache: "auto", context_handoff: "reorder", max_hops: 3, targets: [] };

export function RouteEditorPage() {
  const { routeId } = useParams({ from: "/app/routes/$routeId" });
  const routes = useQuery(routesQuery);
  const creds = useQuery(credentialsQuery);

  if (routes.isPending || creds.isPending) return <Loading />;
  if (routes.error || creds.error) return <ErrorNote error={routes.error ?? creds.error} />;

  const existing = routeId === "new" ? undefined : routes.data.find((r) => r.id === routeId);
  if (routeId !== "new" && !existing) {
    return (
      <div>
        <BackLink />
        <p className="mt-6">This route no longer exists.</p>
      </div>
    );
  }
  return <RouteEditor key={routeId} route={existing} credentials={creds.data} />;
}

function BackLink() {
  return (
    <Link to="/routes" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
      <ArrowLeft size={14} aria-hidden /> Routes
    </Link>
  );
}

function RouteEditor({ route, credentials }: { route?: Route; credentials: Credential[] }) {
  const [spec, setSpec] = useState<RouteSpec>(route ? toSpec(route) : blank);
  const [drawn, setDrawn] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const save = useSaveRoute();
  const del = useDeleteRoute();
  const navigate = useNavigate();
  const byId = new Map(credentials.map((c) => [c.id, c]));
  const dirty = JSON.stringify(spec) !== JSON.stringify(route ? toSpec(route) : blank);

  const set = <K extends keyof RouteSpec>(k: K, v: RouteSpec[K]) => setSpec((s) => ({ ...s, [k]: v }));
  const setTargets = (targets: RouteTarget[]) => set("targets", targets);
  const move = (i: number, by: number) => {
    const next = [...spec.targets];
    const [t] = next.splice(i, 1);
    next.splice(i + by, 0, t!);
    setTargets(next);
  };

  const submit = () =>
    save.mutate(
      { id: route?.id, spec },
      {
        onSuccess: (saved) => {
          toast.success(route ? "Route saved" : "Route created");
          setDrawn((n) => n + 1);
          if (!route) void navigate({ to: "/routes/$routeId", params: { routeId: saved.id }, replace: true });
        },
      },
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <BackLink />
      <header className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 max-w-md">
          <h1 className="sr-only">{route ? `Route ${route.alias}` : "New route"}</h1>
          <TextField
            label="Model name"
            mono
            required
            autoFocus={!route}
            placeholder="chat"
            value={spec.alias}
            onChange={(e) => set("alias", e.target.value.trim())}
            hint="Your app sends this as model. Letters, digits and . _ - : /"
            error={fieldError(save.error, "alias")}
          />
        </div>
        <div className="flex gap-2 pt-6">
          {route && (
            <Button variant="ghost" onClick={() => setDeleting(true)}>
              Delete
            </Button>
          )}
          <Button type="submit" variant="primary" busy={save.isPending} disabled={!!route && !dirty}>
            {route ? "Save route" : "Create route"}
          </Button>
        </div>
      </header>

      <h2 className="text-base">Providers, in order</h2>
      <p className="mt-1 mb-4 text-muted max-w-[62ch]">
        Each request starts at the top. When a provider fails or is rate limited before it starts answering, the next one
        is tried.
      </p>

      <Relay
        targets={spec.targets}
        byId={byId}
        drawn={drawn}
        error={fieldError(save.error, "targets")}
        onChange={(i, t) => setTargets(spec.targets.map((x, j) => (j === i ? t : x)))}
        onRemove={(i) => setTargets(spec.targets.filter((_, j) => j !== i))}
        onMove={move}
      />
      <AddTarget credentials={credentials} existing={spec.targets} onAdd={(t) => setTargets([...spec.targets, t])} />

      <h2 className="mt-12 text-base">Options</h2>
      <Panel className="mt-4 divide-y divide-line">
        <div className="p-5">
          <Switch
            checked={spec.free_first}
            onChange={(v) => set("free_first", v)}
            label="Free tiers first"
            description="Try providers whose free quota has room before the order above, keeping that order within each group."
          />
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-3">
          <Field label="Cache answers" hint={cacheHint[spec.cache]}>
            {({ id, describedBy }) => (
              <Select id={id} aria-describedby={describedBy} value={spec.cache} onChange={(e) => set("cache", e.target.value as CacheMode)}>
                <option value="auto">Auto</option>
                <option value="always">Always</option>
                <option value="off">Off</option>
              </Select>
            )}
          </Field>
          <Field label="Long conversations" hint={handoffHint[spec.context_handoff]}>
            {({ id, describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={spec.context_handoff}
                onChange={(e) => set("context_handoff", e.target.value as HandoffMode)}
              >
                <option value="reorder">Reorder</option>
                <option value="trim">Trim to fit</option>
                <option value="off">Off</option>
              </Select>
            )}
          </Field>
          <Field label="Most providers tried" hint="Per request, 1 to 10." error={fieldError(save.error, "max_hops")}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                type="number"
                min={1}
                max={10}
                value={spec.max_hops}
                onChange={(e) => set("max_hops", Number(e.target.value))}
              />
            )}
          </Field>
        </div>
      </Panel>

      <div className="mt-6">
        <ErrorNote error={save.error} fields={["alias", "targets", "max_hops"]} />
      </div>

      {route && <TryIt alias={route.alias} />}

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete route?"
        description={
          <>
            Apps sending <Mono className="text-ink">{route?.alias}</Mono> as the model will get an error.
          </>
        }
        confirmLabel="Delete route"
        busy={del.isPending}
        error={del.error}
        onConfirm={() =>
          route &&
          del.mutate(route.id, {
            onSuccess: () => {
              toast.success("Route deleted");
              void navigate({ to: "/routes" });
            },
          })
        }
      />
    </form>
  );
}

const cacheHint: Record<CacheMode, string> = {
  auto: "Repeats of a request with temperature 0 get the stored answer. Requests that use tools are never cached.",
  always: "Repeats get the stored answer at any temperature. Requests that use tools are never cached.",
  off: "Every request reaches a provider.",
};

const handoffHint: Record<HandoffMode, string> = {
  reorder: "Try providers that fit the conversation first.",
  trim: "Also shorten old turns to fit a smaller window.",
  off: "Always use the order above.",
};

function toSpec(r: Route): RouteSpec {
  return {
    alias: r.alias,
    free_first: r.free_first,
    cache: r.cache,
    context_handoff: r.context_handoff,
    max_hops: r.max_hops,
    targets: r.targets.map((t) => ({ ...t })),
  };
}

/** The chain drawn as stops on one line: the order is the meaning. */
function Relay({
  targets,
  byId,
  drawn,
  error,
  onChange,
  onRemove,
  onMove,
}: {
  targets: RouteTarget[];
  byId: Map<string, Credential>;
  drawn: number;
  error: string | null;
  onChange: (i: number, t: RouteTarget) => void;
  onRemove: (i: number) => void;
  onMove: (i: number, by: number) => void;
}) {
  if (targets.length === 0) {
    return (
      <p className={clsx("rounded-panel border border-dashed px-5 py-6 text-muted", error ? "border-fault" : "border-line")}>
        Add the first provider below. {error && <span className="block text-fault">{error}</span>}
      </p>
    );
  }
  return (
    <div className="relative">
      {targets.length > 1 && (
        <span
          key={drawn}
          aria-hidden
          className={clsx("absolute left-[15px] top-8 bottom-8 w-0.5 bg-relay", drawn > 0 && "relay-line-drawn")}
        />
      )}
      <ol className="flex flex-col gap-3" aria-label="Providers, in order">
        {targets.map((t, i) => {
          const cred = byId.get(t.credential_id);
          const health = cred?.last_check ? checkLabel[cred.last_check.result] : null;
          return (
            <li key={`${t.credential_id}:${t.model}:${i}`} className="relative flex items-start gap-4">
              <span
                aria-hidden
                className="relative z-[1] mt-4 grid size-8 shrink-0 place-items-center rounded-full border-2 border-relay bg-surface text-xs font-semibold text-relay"
              >
                {i + 1}
              </span>
              <Panel className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {cred ? `${providerName[cred.provider]}${cred.name ? ` · ${cred.name}` : ""}` : "Deleted key"}
                  </p>
                  <label className="sr-only" htmlFor={`model-${i}`}>
                    Model for provider {i + 1}
                  </label>
                  <input
                    id={`model-${i}`}
                    value={t.model}
                    onChange={(e) => onChange(i, { ...t, model: e.target.value.trim() })}
                    className="mt-0.5 w-full bg-transparent font-mono text-[13px] text-muted focus:text-ink focus:outline-none"
                  />
                </div>
                <span className="inline-flex items-center gap-2 text-xs text-muted">
                  <Dot tone={health?.tone ?? "idle"} />
                  {health?.text ?? "Not checked"}
                </span>
                <label className="inline-flex items-center gap-2 text-xs text-muted">
                  First answer within
                  <input
                    type="number"
                    min={1}
                    max={300}
                    placeholder="30"
                    value={t.first_byte_timeout_seconds ?? ""}
                    onChange={(e) =>
                      onChange(i, { ...t, first_byte_timeout_seconds: e.target.value === "" ? null : Number(e.target.value) })
                    }
                    className="h-7 w-14 rounded-control border border-line bg-surface px-2 text-ink"
                  />
                  s
                </label>
                <div className="flex gap-0.5">
                  <IconButton label={`Move provider ${i + 1} up`} disabled={i === 0} onClick={() => onMove(i, -1)}>
                    <ArrowUp size={15} />
                  </IconButton>
                  <IconButton label={`Move provider ${i + 1} down`} disabled={i === targets.length - 1} onClick={() => onMove(i, 1)}>
                    <ArrowDown size={15} />
                  </IconButton>
                  <IconButton label={`Remove provider ${i + 1}`} onClick={() => onRemove(i)}>
                    <X size={15} />
                  </IconButton>
                </div>
              </Panel>
            </li>
          );
        })}
      </ol>
      {error && <p className="mt-2 text-xs text-fault">{error}</p>}
    </div>
  );
}

function IconButton({ label, children, ...rest }: { label: string; children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="rounded-control p-1.5 text-muted hover:bg-ink/5 hover:text-ink disabled:opacity-30 disabled:pointer-events-none"
      {...rest}
    >
      {children}
    </button>
  );
}

function AddTarget({ credentials, existing, onAdd }: { credentials: Credential[]; existing: RouteTarget[]; onAdd: (t: RouteTarget) => void }) {
  const [credentialId, setCredentialId] = useState(credentials[0]?.id ?? "");
  const [model, setModel] = useState("");
  const duplicate = existing.some((t) => t.credential_id === credentialId && t.model === model);

  if (credentials.length === 0) {
    return (
      <p className="mt-4 text-muted">
        <Link to="/provider-keys" className="font-medium text-relay underline-offset-4 hover:underline">
          Add a provider key
        </Link>{" "}
        to choose providers for this route.
      </p>
    );
  }
  const add = () => {
    if (!model || duplicate) return;
    onAdd({ credential_id: credentialId, model, first_byte_timeout_seconds: null });
    setModel("");
  };
  return (
    <div className="mt-3 flex items-start gap-4">
      <span aria-hidden className="mt-1.5 grid size-8 shrink-0 place-items-center rounded-full border-2 border-dashed border-line text-muted">
        <Plus size={14} />
      </span>
      <div className="flex flex-1 flex-wrap items-end gap-2">
        <div className="w-56">
          <Field label="Provider key">
            {({ id }) => (
              <Select id={id} value={credentialId} onChange={(e) => setCredentialId(e.target.value)}>
                {credentials.map((c) => (
                  <option key={c.id} value={c.id}>
                    {providerName[c.provider]}
                    {c.name ? ` · ${c.name}` : ` …${c.last4}`}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="min-w-48 flex-1">
          <Field label="Model" error={duplicate ? "This provider key and model are already in the chain." : null}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                mono
                aria-describedby={describedBy}
                aria-invalid={invalid}
                placeholder={modelPlaceholder(credentials.find((c) => c.id === credentialId)?.provider)}
                value={model}
                onChange={(e) => setModel(e.target.value.trim())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add();
                  }
                }}
              />
            )}
          </Field>
        </div>
        <Button onClick={add} disabled={!model || duplicate}>
          Add to chain
        </Button>
      </div>
    </div>
  );
}

function modelPlaceholder(provider?: string) {
  switch (provider) {
    case "openai":
      return "gpt-5-mini";
    case "anthropic":
      return "claude-haiku-5-5";
    case "groq":
      return "llama-3.3-70b-versatile";
    case "gemini":
      return "gemini-2.5-flash";
    case "mock":
      return "echo";
    default:
      return "model id at the provider";
  }
}

function TryIt({ alias }: { alias: string }) {
  const curl = `curl ${window.location.origin}/v1/chat/completions \\
  -H "Authorization: Bearer $GATEWAY_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "${alias}", "messages": [{"role": "user", "content": "Hello"}]}'`;
  return (
    <section className="mt-12">
      <h2 className="text-base">Call it</h2>
      <p className="mt-1 mb-4 text-muted">
        Any OpenAI-compatible client works: set its base URL to <Mono className="text-ink">{window.location.origin}/v1</Mono> and
        use a{" "}
        <Link to="/gateway-keys" className="font-medium text-relay underline-offset-4 hover:underline">
          gateway key
        </Link>
        .
      </p>
      <div className="relative rounded-panel border border-line bg-surface">
        <pre className="overflow-x-auto p-4 pr-24 font-mono text-[13px] leading-relaxed">{curl}</pre>
        <div className="absolute top-3 right-3">
          <CopyButton value={curl} />
        </div>
      </div>
    </section>
  );
}

