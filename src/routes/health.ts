import type { Context } from "hono";
import type { Env } from "../types";

export async function healthRoute(c: Context<{ Bindings: Env }>) {
  return c.json({
    ok: true,
    service: c.env.SERVICE_NAME || "agentsam-plugin-mcp",
    environment: c.env.SERVICE_ENV || "unknown",
    public_boundary: true,
    plugins: { brand: "scaffolded", campaign: "not_exposed" }
  });
}
