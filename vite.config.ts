import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const gateway = process.env.GATEWAY_URL ?? "http://localhost:8080";

// Port 3000 is the gateway's default ALLOWED_ORIGINS and PUBLIC_BASE_URL, and
// the proxy keeps /api on this origin so its SameSite cookies are sent.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": "/src" } },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": { target: gateway },
      "/v1": { target: gateway },
    },
  },
  test: { environment: "jsdom" },
});
