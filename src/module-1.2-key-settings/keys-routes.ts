import type { Env } from "../env";
import { requireAdminToken } from "../lib/auth";
import { errorJson, json } from "../lib/http";
import { clearApiKey, clearBaseUrl, getBaseUrlStatus, getKeyStatuses, isChatProvider, setApiKey, setBaseUrl } from "./keys-store";

export async function handleKeysRoute(request: Request, env: Env): Promise<Response> {
  const authError = requireAdminToken(request, env);
  if (authError) return authError;
  try {
    if (request.method === "GET") return json({ keys: await getKeyStatuses(env), baseUrl: await getBaseUrlStatus(env) });
    const url = new URL(request.url);
    if (request.method === "DELETE") {
      const provider = url.searchParams.get("provider");
      if (provider) {
        if (!isChatProvider(provider)) return errorJson("provider ไม่ถูกต้อง", 400);
        await clearApiKey(env, provider);
        return json({ ok: true });
      }
      if (url.searchParams.get("field") === "baseUrl") {
        await clearBaseUrl(env);
        return json({ ok: true });
      }
      return errorJson("ระบุ provider หรือ field=baseUrl", 400);
    }
    if (request.method !== "POST") return errorJson("รองรับเฉพาะ GET, POST และ DELETE", 405);
    const input = await request.json() as { provider?: unknown; apiKey?: unknown; baseUrl?: unknown };
    if (input.apiKey !== undefined) {
      if (!isChatProvider(input.provider) || typeof input.apiKey !== "string" || !input.apiKey.trim()) return errorJson("การตั้ง API key ต้องระบุ provider ที่ถูกต้องและ apiKey", 400);
      await setApiKey(env, input.provider, input.apiKey.trim());
    } else if (input.baseUrl !== undefined) {
      if (typeof input.baseUrl !== "string" || !/^https?:\/\//i.test(input.baseUrl.trim())) return errorJson("baseUrl ต้องขึ้นต้นด้วย http:// หรือ https://", 400);
      await setBaseUrl(env, input.baseUrl.trim());
    } else return errorJson("ต้องระบุ apiKey หรือ baseUrl", 400);
    return json({ ok: true, keys: await getKeyStatuses(env), baseUrl: await getBaseUrlStatus(env) });
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "ไม่สามารถบันทึกค่าได้", 503);
  }
}