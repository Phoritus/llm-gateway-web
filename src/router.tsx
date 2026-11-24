import { createRootRoute, createRoute, createRouter, Outlet, redirect } from "@tanstack/react-router";
import { ApiError } from "@/api/client";
import { meQuery, queryClient } from "@/api/queries";
import { AppShell } from "@/shell/AppShell";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { LoginPage, SignupPage, ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from "@/features/auth/pages";
import { OverviewPage } from "@/features/overview/OverviewPage";
import { CredentialsPage } from "@/features/credentials/CredentialsPage";
import { GatewayKeysPage } from "@/features/gateway-keys/GatewayKeysPage";
import { RoutesPage } from "@/features/routes/RoutesPage";
import { RouteEditorPage } from "@/features/routes/RouteEditorPage";
import { UsagePage } from "@/features/usage/UsagePage";
import { LogsPage } from "@/features/logs/LogsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { AccountPage } from "@/features/account/AccountPage";
import { NotFound } from "@/shell/NotFound";

const root = createRootRoute({ component: Outlet, notFoundComponent: NotFound });

const token = (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : "" });

const publicLayout = createRoute({ getParentRoute: () => root, id: "public", component: AuthLayout });

const login = createRoute({
  getParentRoute: () => publicLayout,
  path: "/login",
  validateSearch: (s: Record<string, unknown>) => ({ next: typeof s.next === "string" ? s.next : undefined }),
  component: LoginPage,
});
const signup = createRoute({ getParentRoute: () => publicLayout, path: "/signup", component: SignupPage });
const forgot = createRoute({ getParentRoute: () => publicLayout, path: "/forgot-password", component: ForgotPasswordPage });
const reset = createRoute({ getParentRoute: () => publicLayout, path: "/reset-password", validateSearch: token, component: ResetPasswordPage });
const verify = createRoute({ getParentRoute: () => publicLayout, path: "/verify-email", validateSearch: token, component: VerifyEmailPage });

const app = createRoute({
  getParentRoute: () => root,
  id: "app",
  component: AppShell,
  beforeLoad: async ({ location }) => {
    try {
      return { me: await queryClient.ensureQueryData(meQuery) };
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        throw redirect({ to: "/login", search: { next: location.href } });
      }
      throw err;
    }
  },
});

const page = <P extends string>(path: P, component: () => React.ReactNode) =>
  createRoute({ getParentRoute: () => app, path, component });

const routeEditor = createRoute({ getParentRoute: () => app, path: "/routes/$routeId", component: RouteEditorPage });

const tree = root.addChildren([
  publicLayout.addChildren([login, signup, forgot, reset, verify]),
  app.addChildren([
    page("/", OverviewPage),
    page("/routes", RoutesPage),
    routeEditor,
    page("/provider-keys", CredentialsPage),
    page("/gateway-keys", GatewayKeysPage),
    page("/usage", UsagePage),
    page("/logs", LogsPage),
    page("/settings", SettingsPage),
    page("/account", AccountPage),
  ]),
]);

export const router = createRouter({ routeTree: tree, defaultPreload: "intent", scrollRestoration: true });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
