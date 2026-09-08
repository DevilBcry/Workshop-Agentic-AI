import type { Env } from "./env";
import { errorJson, json } from "./lib/http";
import { handleChatRoute } from "./module-1.1-chat/chat-routes";
export async function route(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === "/healthz") return json({ ok: true });
  if (path === "/api/chat") return handleChatRoute(request, env);
  if (env.ASSETS) return env.ASSETS.fetch(request);
  return errorJson("ไม่พบเส้นทาง", 404);
}