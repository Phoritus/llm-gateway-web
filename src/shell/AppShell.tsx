import { useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import {
  Activity,
  Gauge,
  KeyRound,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Split,
  UserRound,
  Waypoints,
  X,
} from "lucide-react";
import { api } from "@/api/client";
import { meQuery, queryClient } from "@/api/queries";
import { VerifyGate } from "@/features/auth/VerifyGate";

const primary = [
  { to: "/", label: "Overview", icon: Gauge },
  { to: "/routes", label: "Routes", icon: Split },
  { to: "/provider-keys", label: "Provider keys", icon: Waypoints },
  { to: "/gateway-keys", label: "Gateway keys", icon: KeyRound },
  { to: "/usage", label: "Usage", icon: Activity },
  { to: "/logs", label: "Logs", icon: ScrollText },
] as const;

const secondary = [
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/account", label: "Account", icon: UserRound },
] as const;

export function AppShell() {
  const { data: me } = useQuery(meQuery);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => setMenuOpen(false), [pathname]);

  const signOut = useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSettled: () => {
      queryClient.clear();
      void navigate({ to: "/login", search: { next: undefined } });
    },
  });

  if (!me) return null;
  const gated = !me.user.email_verified && pathname !== "/account";

  const nav = (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-6">
      <ul className="flex flex-col gap-0.5">
        {primary.map((item) => (
          <NavItem key={item.to} {...item} active={isActive(pathname, item.to)} />
        ))}
      </ul>
      <ul className="mt-auto flex flex-col gap-0.5">
        {secondary.map((item) => (
          <NavItem key={item.to} {...item} active={isActive(pathname, item.to)} />
        ))}
      </ul>
    </nav>
  );

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[224px_1fr]">
      <aside className="hidden md:flex sticky top-0 h-dvh flex-col border-r border-line px-3 py-5">
        <Workspace name={me.workspace.name} />
        <div className="mt-8 flex flex-1 flex-col">{nav}</div>
        <Who email={me.user.email} onSignOut={() => signOut.mutate()} busy={signOut.isPending} />
      </aside>

      <header className="md:hidden sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <Workspace name={me.workspace.name} />
        <button
          type="button"
          className="rounded-control p-1.5 text-muted hover:text-ink"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      {menuOpen && (
        <div id="mobile-nav" className="md:hidden flex flex-col gap-6 border-b border-line bg-paper px-3 py-4">
          {nav}
          <Who email={me.user.email} onSignOut={() => signOut.mutate()} busy={signOut.isPending} />
        </div>
      )}

      <main className="min-w-0 px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-[1040px]">{gated ? <VerifyGate email={me.user.email} /> : <Outlet />}</div>
      </main>
    </div>
  );
}

function isActive(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}

function NavItem({ to, label, icon: Icon, active }: { to: string; label: string; icon: typeof Gauge; active: boolean }) {
  return (
    <li>
      <Link
        to={to}
        aria-current={active ? "page" : undefined}
        className={clsx(
          "relative flex items-center gap-2.5 rounded-control px-2.5 py-1.5 text-sm transition-colors",
          active ? "bg-surface text-ink font-medium" : "text-muted hover:text-ink",
        )}
      >
        {active && <span aria-hidden className="absolute -left-3 top-1.5 bottom-1.5 w-0.5 rounded-full bg-relay" />}
        <Icon size={16} aria-hidden className={active ? "text-relay" : undefined} />
        {label}
      </Link>
    </li>
  );
}

function Workspace({ name }: { name: string }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-2.5 font-semibold">
      <img src="/favicon.svg" alt="" className="size-6" />
      <span className="truncate">{name}</span>
    </Link>
  );
}

function Who({ email, onSignOut, busy }: { email: string; onSignOut: () => void; busy: boolean }) {
  return (
    <div className="mt-6 flex items-center justify-between gap-2 border-t border-line px-2.5 pt-4">
      <span className="truncate text-xs text-muted" title={email}>
        {email}
      </span>
      <button
        type="button"
        onClick={onSignOut}
        disabled={busy}
        className="rounded-control p-1 text-muted hover:text-ink"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
