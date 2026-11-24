import { Outlet } from "@tanstack/react-router";

export function AuthLayout() {
  return (
    <div className="min-h-dvh grid place-items-center px-5 py-12">
      <div className="w-full max-w-[380px]">
        <div className="mb-10 flex items-center gap-2.5 font-semibold">
          <img src="/favicon.svg" alt="" className="size-7" />
          LLM Gateway
        </div>
        <Outlet />
      </div>
    </div>
  );
}

export function AuthHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h1 className="text-xl">{title}</h1>
      {children && <p className="mt-2 text-muted">{children}</p>}
    </div>
  );
}
