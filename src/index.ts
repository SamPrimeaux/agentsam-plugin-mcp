import { Hono } from "hono";
import type { Env } from "./types";
import { healthRoute } from "./routes/health";
import { oauthProtectedResourceRoute } from "./routes/oauth-metadata";
import { handleMcp } from "./mcp/transport";
import { privacyRoute, supportRoute, termsRoute } from "./routes/legal";

const app = new Hono<{ Bindings: Env }>();

app.get("/health", healthRoute);
app.get("/.well-known/oauth-protected-resource", oauthProtectedResourceRoute);
app.get("/privacy", privacyRoute);
app.get("/terms", termsRoute);
app.get("/support", supportRoute);

app.all("/mcp", (c) => handleMcp(c, "all"));
app.all("/mcp/brand", (c) => handleMcp(c, "brand"));
app.all("/mcp/campaign", (c) => handleMcp(c, "campaign"));

app.notFound((c) => c.json({ ok: false, error: "not_found" }, 404));

export default app;
