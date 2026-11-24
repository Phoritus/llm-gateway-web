import { QueryClient, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./client";
import type {
  Credential,
  GatewayKey,
  KeyTestResult,
  LogsPage,
  Me,
  Provider,
  Route,
  RouteSpec,
  Usage,
  WorkspaceSettings,
  Budget,
} from "./types";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
      refetchOnWindowFocus: true,
    },
  },
});

type List<T> = { data: T[] };

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: () => api.get<Me>("/me"),
  staleTime: 60_000,
});

export const credentialsQuery = queryOptions({
  queryKey: ["credentials"],
  queryFn: async () => (await api.get<List<Credential>>("/credentials")).data,
});

export const gatewayKeysQuery = queryOptions({
  queryKey: ["gateway-keys"],
  queryFn: async () => (await api.get<List<GatewayKey>>("/gateway-keys")).data,
});

export const routesQuery = queryOptions({
  queryKey: ["routes"],
  queryFn: async () => (await api.get<List<Route>>("/routes")).data,
});

export type UsageFilter = { from: string; to: string; route?: string };

export const usageQuery = (f: UsageFilter) =>
  queryOptions({
    queryKey: ["usage", f],
    queryFn: () => {
      const q = new URLSearchParams({ from: f.from, to: f.to });
      if (f.route) q.set("route", f.route);
      return api.get<Usage>(`/usage?${q}`);
    },
  });

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: () => api.get<WorkspaceSettings>("/workspace/settings"),
});

export function fetchLogs(filter: { route?: string; cursor?: string }) {
  const q = new URLSearchParams({ limit: "20" });
  if (filter.route) q.set("route", filter.route);
  if (filter.cursor) q.set("cursor", filter.cursor);
  return api.get<LogsPage>(`/logs?${q}`);
}

function useInvalidating<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>, keys: string[][]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey }))),
  });
}

export const useCreateCredential = () =>
  useInvalidating(
    (body: { provider: Provider; name: string; secret: string; base_url?: string }) =>
      api.post<Credential>("/credentials", body),
    [["credentials"]],
  );

export const useTestCredential = () =>
  useInvalidating((id: string) => api.post<KeyTestResult>(`/credentials/${id}/test`), [["credentials"]]);

export const useDeleteCredential = () =>
  useInvalidating((id: string) => api.del(`/credentials/${id}`), [["credentials"]]);

export const useCreateGatewayKey = () =>
  useInvalidating(
    (body: { name: string } & Budget) => api.post<GatewayKey & { key: string }>("/gateway-keys", body),
    [["gateway-keys"]],
  );

export const useSetKeyBudget = () =>
  useInvalidating(
    ({ id, ...budget }: { id: string } & Budget) => api.put<GatewayKey>(`/gateway-keys/${id}/budget`, budget),
    [["gateway-keys"]],
  );

export const useRevokeGatewayKey = () =>
  useInvalidating((id: string) => api.del(`/gateway-keys/${id}`), [["gateway-keys"]]);

export const useSaveRoute = () =>
  useInvalidating(
    ({ id, spec }: { id?: string; spec: RouteSpec }) =>
      id ? api.put<Route>(`/routes/${id}`, spec) : api.post<Route>("/routes", spec),
    [["routes"]],
  );

export const useDeleteRoute = () => useInvalidating((id: string) => api.del(`/routes/${id}`), [["routes"]]);

export const useSaveSettings = () =>
  useInvalidating(
    (s: WorkspaceSettings) => api.put<WorkspaceSettings>("/workspace/settings", s),
    [["settings"], ["usage"], ["logs"]],
  );

export const useDeleteLogs = () => useInvalidating(() => api.del("/logs"), [["logs"]]);
