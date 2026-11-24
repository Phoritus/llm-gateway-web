// The one door to /api. It sends the CSRF header, turns the gateway's OpenAI
// error shape into ApiError, and reports a lost session to whoever listens.

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly param: string | null;
  readonly retryAfter: number | null;

  constructor(status: number, code: string, message: string, param: string | null = null, retryAfter: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.param = param;
    this.retryAfter = retryAfter;
  }
}

// The deployment decides the prefix: none over http, __Host- in production,
// __Secure- when the gateway sets a cookie domain.
const CSRF_COOKIES = ["__Host-gw_csrf", "__Secure-gw_csrf", "gw_csrf"];

export function csrfToken(cookie: string = document.cookie): string | null {
  const jar = new Map(
    cookie
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const eq = part.indexOf("=");
        return [part.slice(0, eq), decodeURIComponent(part.slice(eq + 1))] as const;
      }),
  );
  for (const name of CSRF_COOKIES) {
    const value = jar.get(name);
    if (value) return value;
  }
  return null;
}

let onUnauthorized: () => void = () => {};

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

type Method = "GET" | "POST" | "PUT" | "DELETE";

export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") {
    const token = csrfToken();
    if (token) headers["X-CSRF-Token"] = token;
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: "same-origin",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network_error", "The gateway could not be reached. Check that it is running.");
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data: unknown = text ? safeParse(text) : undefined;

  if (!res.ok) {
    const err = errorFrom(res, data);
    if (err.code === "not_authenticated") onUnauthorized();
    throw err;
  }
  return data as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function errorFrom(res: Response, data: unknown): ApiError {
  const retry = Number(res.headers.get("Retry-After"));
  const retryAfter = Number.isFinite(retry) && retry > 0 ? retry : null;
  const detail = (data as { error?: { message?: string; code?: string; param?: string | null } } | undefined)?.error;
  if (detail?.message) {
    return new ApiError(res.status, detail.code ?? "unknown", detail.message, detail.param ?? null, retryAfter);
  }
  return new ApiError(res.status, "unknown", `The gateway answered ${res.status} ${res.statusText}.`, null, retryAfter);
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  del: (path: string) => request<void>("DELETE", path),
};
