import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import { logsInfiniteQuery, routesQuery, useDeleteLogs } from "@/api/queries";
import type { Outcome, RequestLog } from "@/api/types";
import { dateTime } from "@/ui/format";
import { Button, ConfirmDialog, Dot, Empty, ErrorNote, Loading, Mono, PageHeader, Select } from "@/ui/primitives";

const outcomeTone: Record<Outcome, "ok" | "caution" | "fault" | "idle"> = {
  ok: "ok",
  stream_error: "fault",
  client_gone: "idle",
  budget_exceeded: "caution",
};

function pretty(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export function LogsPage() {
  const [route, setRoute] = useState("");
  const [deleting, setDeleting] = useState(false);
  const routes = useQuery(routesQuery);
  const logs = useInfiniteQuery(logsInfiniteQuery(route || undefined));
  const del = useDeleteLogs();

  const logging = logs.data?.pages[0]?.logging;
  const rows = logs.data?.pages.flatMap((p) => p.logs) ?? [];

  const closeDelete = () => {
    del.reset();
    setDeleting(false);
  };

  return (
    <>
      <PageHeader
        title="Logs"
        description="The redacted request and response of recent calls, kept only while prompt logging is on."
        action={
          rows.length > 0 ? (
            <Button variant="secondary" onClick={() => setDeleting(true)}>
              Delete all logs
            </Button>
          ) : undefined
        }
      />
      {logs.isPending ? (
        <Loading />
      ) : logs.isError && !logs.data ? (
        <ErrorNote error={logs.error} />
      ) : (
        <>
          {logging && (
            <p className="mb-5 flex w-fit items-center gap-2 text-sm">
              <Dot tone={logging.enabled ? "ok" : "idle"} />
              {logging.enabled ? (
                <span>Prompt logging is on. Logs are deleted after {logging.retention_days} days.</span>
              ) : (
                <span>
                  Prompt logging is off, so new calls are not recorded.{" "}
                  <Link to="/settings" className="text-relay underline-offset-4 hover:underline">
                    Turn it on in Settings
                  </Link>
                </span>
              )}
            </p>
          )}
          <label className="mb-5 flex items-center gap-2 text-sm text-muted">
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
          {rows.length === 0 ? (
            <Empty title="No logs">
              {logging?.enabled ? "Calls through the gateway will appear here." : "Turn on prompt logging in Settings to record calls."}
            </Empty>
          ) : (
            <>
              <ul className="overflow-hidden rounded-panel border border-line bg-surface">
                {rows.map((l) => (
                  <LogRow key={l.id} log={l} />
                ))}
              </ul>
              {logs.isError && (
                <div className="mt-4">
                  <ErrorNote error={logs.error} />
                </div>
              )}
              {logs.hasNextPage && (
                <div className="mt-4">
                  <Button onClick={() => void logs.fetchNextPage()} busy={logs.isFetchingNextPage}>
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
      <ConfirmDialog
        open={deleting}
        onClose={closeDelete}
        title="Delete all logs?"
        description="Every stored request and response is removed now. This cannot be undone."
        confirmLabel="Delete all logs"
        busy={del.isPending}
        error={del.error}
        onConfirm={() =>
          del.mutate(undefined, {
            onSuccess: () => {
              toast.success("Logs deleted");
              closeDelete();
            },
          })
        }
      />
    </>
  );
}

function LogRow({ log }: { log: RequestLog }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-t border-line first:border-t-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left text-sm hover:bg-paper/60"
      >
        <ChevronRight size={14} aria-hidden className={open ? "rotate-90" : undefined} />
        <span className="w-40 shrink-0 text-muted">{dateTime(log.created_at)}</span>
        <Mono>{log.route}</Mono>
        <span className="text-muted">{log.model}</span>
        <span className="ml-auto inline-flex items-center gap-2">
          <Dot tone={outcomeTone[log.outcome]} />
          <span className="tabular-nums">{log.status}</span>
        </span>
      </button>
      {open && (
        <div className="grid gap-4 border-t border-line px-4 py-4 lg:grid-cols-2">
          <Body title="Request" text={log.request} truncated={log.request_truncated} />
          <Body title="Response" text={log.response} truncated={log.response_truncated} />
        </div>
      )}
    </li>
  );
}

function Body({ title, text, truncated }: { title: string; text: string; truncated: boolean }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-1.5 text-sm">
        {title}
        {truncated && <span className="ml-2 font-normal text-caution">Truncated</span>}
      </h3>
      <pre className="max-h-96 overflow-auto rounded-control border border-line bg-paper p-3 font-mono text-[13px] whitespace-pre-wrap break-words">
        {text ? pretty(text) : "Empty"}
      </pre>
    </div>
  );
}
