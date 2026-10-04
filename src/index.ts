import { Hono } from "hono";
import type { Env } from "./types";
import { healthRoute } from "./routes/health";
import { oauthProtectedResourceRoute } from "./routes/oauth-metadata";
import { handleMcp } from "./mcp/transport";

const app = new Hono<{ Bindings: Env }>();

app.get("/health", healthRoute);
app.get("/.well-known/oauth-protected-resource", oauthProtectedResourceRoute);
app.all("/mcp", handleMcp);

app.notFound((c) => c.json({ ok: false, error: "not_found" }, 404));

export default app;
