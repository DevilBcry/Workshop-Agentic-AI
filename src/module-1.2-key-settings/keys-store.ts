import type { Env } from "../env";
import type { ChatProvider } from "../module-1.1-chat/types";

const PROVIDERS: ChatProvider[] = ["gemini", "openai", "openai-compat"];
const keyName = (provider: ChatProvider) => `secret:${provider}_api_key`;
function kv(env: Env): KVNamespace | undefined { return env.APP_KV; }
function mask(value: string | undefined): string | undefined { return value ? `••••${value.slice(-4)}` : undefined; }

export async function getEffectiveApiKey(env: Env, provider: ChatProvider): Promise<string | undefined> {
  const stored = await kv(env)?.get(keyName(provider));
  if (stored) return stored;
  return provider === "gemini" ? env.GEMINI_API_KEY : provider === "openai" ? env.OPENAI_API_KEY : env.OPENAI_COMPAT_API_KEY;
}
export async function getEffectiveBaseUrl(env: Env): Promise<string | undefined> {
  return (await kv(env)?.get("config:openai_compat_base_url")) || env.OPENAI_COMPAT_BASE_URL;
}
export async function getKeyStatuses(env: Env) {
  return Object.fromEntries(await Promise.all(PROVIDERS.map(async (provider) => {
    const stored = await kv(env)?.get(keyName(provider));
    const fallback = provider === "gemini" ? env.GEMINI_API_KEY : provider === "openai" ? env.OPENAI_API_KEY : env.OPENAI_COMPAT_API_KEY;
    const value = stored || fallback;
    return [provider, { configured: Boolean(value), source: stored ? "kv" : fallback ? "env" : undefined, maskedHint: mask(value) }];
  })));
}
export async function getBaseUrlStatus(env: Env) {
  const stored = await kv(env)?.get("config:openai_compat_base_url");
  const value = stored || env.OPENAI_COMPAT_BASE_URL;
  return { configured: Boolean(value), source: stored ? "kv" : value ? "env" : undefined, maskedHint: value ? `${value.slice(0, 8)}…${value.slice(-12)}` : undefined };
}
async function requireKv(env: Env): Promise<KVNamespace> { if (!env.APP_KV) throw new Error("ยังไม่ได้ผูก APP_KV"); return env.APP_KV; }
export async function setApiKey(env: Env, provider: ChatProvider, value: string): Promise<void> { await (await requireKv(env)).put(keyName(provider), value); }
export async function clearApiKey(env: Env, provider: ChatProvider): Promise<void> { await (await requireKv(env)).delete(keyName(provider)); }
export async function setBaseUrl(env: Env, value: string): Promise<void> { await (await requireKv(env)).put("config:openai_compat_base_url", value); }
export async function clearBaseUrl(env: Env): Promise<void> { await (await requireKv(env)).delete("config:openai_compat_base_url"); }
export function isChatProvider(value: unknown): value is ChatProvider { return typeof value === "string" && PROVIDERS.includes(value as ChatProvider); }