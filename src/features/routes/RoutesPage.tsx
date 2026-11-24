import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { credentialsQuery, routesQuery } from "@/api/queries";
import { vendorName } from "@/ui/format";
import { Empty, ErrorNote, Loading, Mono, PageHeader, Table } from "@/ui/primitives";

const newRoute = (
  <Link
    to="/routes/$routeId"
    params={{ routeId: "new" }}
    className="inline-flex h-9 items-center gap-1.5 rounded-control bg-relay px-3.5 text-sm font-medium text-on-relay hover:brightness-110"
  >
    <Plus size={16} aria-hidden /> New route
  </Link>
);

export function RoutesPage() {
  const routes = useQuery(routesQuery);
  const creds = useQuery(credentialsQuery);
  const vendorOf = new Map(creds.data?.map((c) => [c.id, c.provider]));

  return (
    <>
      <PageHeader
        title="Routes"
        description="A route is the model name your app sends. The gateway tries its providers in order until one answers."
        action={routes.data?.length ? newRoute : undefined}
      />
      {routes.isPending ? (
        <Loading />
      ) : routes.error ? (
        <ErrorNote error={routes.error} />
      ) : routes.data.length === 0 ? (
        <Empty
          title="No routes yet"
          action={
            creds.data?.length ? (
              newRoute
            ) : (
              <Link to="/provider-keys" className="font-medium text-relay underline-offset-4 hover:underline">
                Add a provider key first
              </Link>
            )
          }
        >
          Create one to give your app a single model name, like <Mono>chat</Mono>, backed by one or more providers.
        </Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Model name</th>
              <th>Tries, in order</th>
              <th>Cache</th>
            </tr>
          </thead>
          <tbody>
            {routes.data.map((r) => (
              <tr key={r.id} className="hover:bg-paper/60">
                <td>
                  <Link to="/routes/$routeId" params={{ routeId: r.id }} className="font-mono text-[13px] font-medium hover:text-relay">
                    {r.alias}
                  </Link>
                </td>
                <td>
                  <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-muted">
                    {r.targets.map((t, i) => (
                      <li key={`${t.credential_id}:${t.model}`} className="flex items-center gap-1.5">
                        {i > 0 && <span aria-hidden>→</span>}
                        <span>
                          <span className="text-ink">{vendorName(vendorOf.get(t.credential_id) ?? "")}</span>{" "}
                          <Mono>{t.model}</Mono>
                        </span>
                      </li>
                    ))}
                  </ol>
                </td>
                <td className="text-muted">{r.cache === "off" ? "Off" : r.cache === "always" ? "Always" : "Auto"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
