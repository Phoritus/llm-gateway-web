import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { setUnauthorizedHandler } from "@/api/client";
import { queryClient } from "@/api/queries";
import { router } from "@/router";
import "./styles.css";

const publicPaths = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

// A session that ends mid-use (expiry, sign-out elsewhere, a password reset)
// sends the person to sign in and back to where they were.
setUnauthorizedHandler(() => {
  const here = router.state.location;
  if (publicPaths.includes(here.pathname)) return;
  queryClient.clear();
  void router.navigate({ to: "/login", search: { next: here.href } });
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" toastOptions={{ className: "!font-sans !text-sm" }} />
    </QueryClientProvider>
  </StrictMode>,
);
