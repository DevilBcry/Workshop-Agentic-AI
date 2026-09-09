import type { Env } from "../env";
import { errorJson, json } from "../lib/http";
import { runGeminiConversation } from "./providers/gemini";
import { runOpenAiCompatConversation } from "./providers/openai-compat";
import type { ChatMessage, ChatProvider, ChatTurnResult } from "./types";
import { getEffectiveApiKey, getEffectiveBaseUrl } from "../module-1.2-key-settings/keys-store";

const providers: ChatProvider[] = ["gemini", "openai", "openai-compat"];
export function resolveProvider(value: unknown, env: Env): ChatProvider {
  const selected = typeof value === "string" ? value : env.DEFAULT_CHAT_PROVIDER;
  return providers.includes(selected as ChatProvider) ? selected as ChatProvider : "gemini";
}
export function defaultModelFor(provider: ChatProvider, env: Env): string {
  return provider === "gemini" ? env.GEMINI_MODEL || "gemini-flash-latest" : provider === "openai" ? env.OPENAI_MODEL || "gpt-4o-mini" : env.OPENAI_COMPAT_MODEL || "gpt-4o-mini";
}
export function buildSystemPrompt(): string { return "คุณคือผู้ช่วย AI ของระบบ Workshop Agentic AI ตอบเป็นภาษาไทยอย่างสุภาพ กระชับ และตรงคำถาม"; }
async function resolveApiKey(provider: ChatProvider, env: Env): Promise<string | undefined> { return getEffectiveApiKey(env, provider); }
async function resolveBaseUrl(provider: ChatProvider, env: Env): Promise<string | undefined> { return provider === "openai" ? "https://api.openai.com/v1" : provider === "openai-compat" ? getEffectiveBaseUrl(env) : undefined; }
export async function runChatTurn(provider: ChatProvider, model: string, messages: ChatMessage[], env: Env): Promise<ChatTurnResult> {
  const apiKey = await resolveApiKey(provider, env);
  if (provider === "gemini") return runGeminiConversation(apiKey, model, messages, buildSystemPrompt(), [], undefined);
  return runOpenAiCompatConversation(await resolveBaseUrl(provider, env), apiKey, model, messages, buildSystemPrompt(), [], undefined);
}
export async function handleChatRoute(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return errorJson("ต้องใช้ POST กับ /api/chat", 405);
  try {
    const input = await request.json() as { message?: unknown; history?: unknown; provider?: unknown; model?: unknown };
    if (typeof input.message !== "string" || !input.message.trim()) return errorJson("กรุณาระบุ message", 400);
    const provider = resolveProvider(input.provider, env);
    const history = Array.isArray(input.history) ? input.history.filter((m): m is ChatMessage => !!m && typeof m === "object" && ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") && typeof (m as ChatMessage).content === "string") : [];
    const messages = [...history, { role: "user" as const, content: input.message }];
    const model = typeof input.model === "string" && input.model.trim() ? input.model.trim() : defaultModelFor(provider, env);
    const result = await runChatTurn(provider, model, messages, env);
    return json({ reply: result.reply, provider, model, toolTrace: result.toolTrace });
  } catch { return errorJson("รูปแบบคำขอไม่ถูกต้อง", 400); }
}