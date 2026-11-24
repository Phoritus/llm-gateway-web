import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, csrfToken, request, setUnauthorizedHandler } from "./client";

function respond(status: number, body?: unknown, headers: Record<string, string> = {}) {
  const fetchMock = vi.fn(async () =>
    new Response(body === undefined ? null : JSON.stringify(body), { status, headers }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "gw_csrf=; max-age=0";
});

describe("csrfToken", () => {
  it("reads whichever prefix the deployment uses", () => {
    expect(csrfToken("a=1; __Host-gw_csrf=prod")).toBe("prod");
    expect(csrfToken("__Secure-gw_csrf=sub")).toBe("sub");
    expect(csrfToken("gw_csrf=dev%3D")).toBe("dev=");
    expect(csrfToken("other=1")).toBeNull();
  });
});

describe("request", () => {
  it("sends the CSRF header on a write but not on a read", async () => {
    document.cookie = "gw_csrf=tok";
    const fetchMock = respond(200, {});
    await request("POST", "/routes", { alias: "a" });
    await request("GET", "/routes");
    const [, write] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const [, read] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect((write.headers as Record<string, string>)["X-CSRF-Token"]).toBe("tok");
    expect((read.headers as Record<string, string>)["X-CSRF-Token"]).toBeUndefined();
  });

  it("turns the OpenAI error shape into an ApiError with its field", async () => {
    respond(400, { error: { message: "alias must be short.", type: "invalid_request_error", param: "alias", code: "invalid_value" } });
    const err = await request("POST", "/routes", {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, code: "invalid_value", param: "alias", message: "alias must be short." });
  });

  it("reports a lost session", async () => {
    const lost = vi.fn();
    setUnauthorizedHandler(lost);
    respond(401, { error: { message: "Sign in.", type: "authentication_error", param: null, code: "not_authenticated" } });
    await request("GET", "/me").catch(() => {});
    expect(lost).toHaveBeenCalledOnce();
  });

  it("does not treat a wrong password as a lost session", async () => {
    const lost = vi.fn();
    setUnauthorizedHandler(lost);
    respond(401, { error: { message: "Wrong.", type: "authentication_error", param: null, code: "invalid_credentials" } });
    await request("POST", "/auth/login", {}).catch(() => {});
    expect(lost).not.toHaveBeenCalled();
  });

  it("reads Retry-After on a 429", async () => {
    respond(429, { error: { message: "Slow down.", type: "rate_limit_error", param: null, code: "rate_limit_exceeded" } }, { "Retry-After": "7" });
    const err = (await request("GET", "/usage").catch((e: unknown) => e)) as ApiError;
    expect(err.retryAfter).toBe(7);
  });

  it("answers a 204 with nothing", async () => {
    respond(204);
    await expect(request("DELETE", "/routes/1")).resolves.toBeUndefined();
  });
});
