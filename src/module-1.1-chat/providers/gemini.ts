import type { ChatMessage, ChatTurnResult, McpTool, ToolCaller } from "../types";
import { toGeminiSchema } from "../tool-schema";

type Part = { text?: string; functionCall?: { name: string; args?: unknown }; functionResponse?: { name: string; response: unknown } };

export async function runGeminiConversation(apiKey: string | undefined, model: string, messages: ChatMessage[], systemPrompt: string, tools: McpTool[], callTool?: ToolCaller): Promise<ChatTurnResult> {
  if (!apiKey) return { reply: "ยังไม่ได้ตั้งค่า GEMINI_API_KEY กรุณาตั้งค่าใน Cloudflare ก่อนใช้งาน Gemini", toolTrace: [] };
  const contents: Array<{ role: "user" | "model"; parts: Part[] }> = [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}` }] }];
  const toolTrace = [];
  for (let round = 0; round < 4; round++) {
    const body: Record<string, unknown> = { contents };
    if (tools.length) body.tools = [{ function_declarations: tools.map((t) => ({ name: `${t.serverId}__${t.name}`, description: t.description, parameters: toGeminiSchema(t.inputSchema) })) }];
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) return { reply: `Gemini ตอบกลับด้วยข้อผิดพลาด (${response.status})`, toolTrace };
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Part[] } }> };
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const call = parts.find((part) => part.functionCall)?.functionCall;
    if (!call) return { reply: parts.map((part) => part.text ?? "").join(""), toolTrace };
    if (!callTool) return { reply: "โมเดลร้องขอเครื่องมือ แต่ยังไม่มีเครื่องมือให้ใช้งานในโมดูลนี้", toolTrace };
    const result = await callTool(call.name, call.args ?? {});
    toolTrace.push({ name: call.name, arguments: call.args, result });
    contents.push({ role: "model", parts }, { role: "user", parts: [{ functionResponse: { name: call.name, response: result } }] });
  }
  return { reply: "การเรียกเครื่องมือเกินจำนวนรอบที่กำหนด", toolTrace };
}