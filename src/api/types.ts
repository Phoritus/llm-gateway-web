// Shapes of the gateway's control plane, as docs/01-api-contract.md records them.

export type Me = {
  user: { id: string; email: string; email_verified: boolean; email_verified_at?: string };
  workspace: { id: string; name: string };
  session: { expires_at: string };
};

export const PROVIDERS = [
  "openai",
  "anthropic",
  "gemini",
  "groq",
  "cerebras",
  "openrouter",
  "mistral",
  "custom",
  "mock",
] as const;
export type Provider = (typeof PROVIDERS)[number];

export type KeyCheckResult =
  | "ok"
  | "key_rejected"
  | "quota_exhausted"
  | "rate_limited"
  | "provider_timeout"
  | "provider_error"
  | "provider_unavailable";

export type Credential = {
  id: string;
  provider: Provider;
  name: string;
  last4: string;
  base_url: string | null;
  created_at: string;
  last_check: { result: KeyCheckResult; checked_at: string } | null;
};

export type KeyTestResult = { ok: boolean; code?: string; message?: string };

export type BudgetAction = "block" | "warn";

export type Budget = {
  monthly_budget_usd: number | null;
  budget_action: BudgetAction;
};

export type GatewayKey = Budget & {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  spent_this_month_usd: number | null;
};

export type CacheMode = "auto" | "always" | "off";
export type HandoffMode = "off" | "reorder" | "trim";

export type RouteTarget = {
  credential_id: string;
  model: string;
  first_byte_timeout_seconds: number | null;
};

export type RouteSpec = {
  alias: string;
  free_first: boolean;
  cache: CacheMode;
  context_handoff: HandoffMode;
  max_hops: number;
  targets: RouteTarget[];
};

export type Route = RouteSpec & { id: string; created_at: string; updated_at: string };

export type Outcome = "ok" | "stream_error" | "client_gone" | "budget_exceeded";

export type UsageDay = {
  day: string;
  route: string;
  vendor: string;
  model: string;
  requests: number;
  errors: number;
  prompt_tokens: number;
  completion_tokens: number;
  avg_latency_ms: number;
  cache_hits: number;
  cost_usd: number;
  unpriced_requests: number;
};

export type UsageEvent = {
  created_at: string;
  route: string;
  vendor: string;
  model: string;
  status: number;
  outcome: Outcome;
  attempts: number;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  ttft_ms: number;
  cached: boolean;
  context_handoff: "reordered" | "trimmed" | null;
  cost_usd: number | null;
};

export type WorkspaceBudget = Budget & {
  spent_this_month_usd: number | null;
  period: string;
  resets_at: string;
};

export type Usage = { days: UsageDay[]; recent: UsageEvent[]; budget: WorkspaceBudget };

export type RequestLog = {
  id: string;
  created_at: string;
  key_id: string;
  route: string;
  vendor: string;
  model: string;
  status: number;
  outcome: Outcome;
  request: string;
  response: string;
  request_truncated: boolean;
  response_truncated: boolean;
};

export type LogsPage = {
  logging: { enabled: boolean; retention_days: number; on_disable: string };
  logs: RequestLog[];
  next_cursor: string | null;
};

export type WorkspaceSettings = Budget & {
  cache_enabled: boolean;
  semantic_cache_enabled: boolean;
  prompt_logging_enabled: boolean;
  prompt_log_retention_days: number;
};
