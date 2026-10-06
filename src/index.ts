import { Hono } from "hono";
import type { Env } from "./types";
import { healthRoute } from "./routes/health";
import { oauthProtectedResourceRoute } from "./routes/oauth-metadata";
import { handleMcp } from "./mcp/transport";
import { privacyRoute, supportRoute, termsRoute } from "./routes/legal";
import { PUBLIC_PLUGIN_CATALOG, PUBLIC_PLUGIN_ICONS } from "./generated/plugin-catalog";

const app = new Hono<{ Bindings: Env }>();

app.get("/health", healthRoute);
// Public, manifest-driven discovery only; installation and connection are host-owned.
app.get("/catalog/plugins", (c) => c.json(PUBLIC_PLUGIN_CATALOG, 200, {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=120",
  "X-Content-Type-Options": "nosniff",
}));
app.get("/catalog/icons/:file", (c) => {
  const file = c.req.param("file");
  const id = file.endsWith(".png") ? file.slice(0, -4) : "";
  const bytes = Object.prototype.hasOwnProperty.call(PUBLIC_PLUGIN_ICONS,id)
    ? PUBLIC_PLUGIN_ICONS[id] : null;
  if (!bytes) return c.json({ok:false,error:"icon_not_found"},404);
  return new Response(Uint8Array.from(atob(bytes), char=>char.charCodeAt(0)), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
app.get("/.well-known/oauth-protected-resource", oauthProtectedResourceRoute);
app.get("/privacy", privacyRoute);
app.get("/terms", termsRoute);
app.get("/support", supportRoute);

app.all("/mcp", (c) => handleMcp(c, "all"));
app.all("/mcp/brand", (c) => handleMcp(c, "brand"));
app.all("/mcp/campaign", (c) => handleMcp(c, "campaign"));

app.notFound((c) => c.json({ ok: false, error: "not_found" }, 404));

export default app;
