import type { ChatMessage, ChatTurnResult, McpTool, ToolCaller } from "../types";

export async function runOpenAiCompatConversation(baseUrl: string | undefined, apiKey: string | undefined, model: string, messages: ChatMessage[], systemPrompt: string, tools: McpTool[], callTool?: ToolCaller): Promise<ChatTurnResult> {
  if (!baseUrl) return { reply: "ยังไม่ได้ตั้งค่า base URL ของ OpenAI-compatible gateway กรุณาตั้งค่า OPENAI_COMPAT_BASE_URL", toolTrace: [] };
  if (!apiKey) return { reply: "ยังไม่ได้ตั้งค่า API key ของ provider นี้ กรุณาตั้งค่า OPENAI_API_KEY หรือ OPENAI_COMPAT_API_KEY", toolTrace: [] };
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const apiMessages: Array<Record<string, unknown>> = [{ role: "system", content: systemPrompt }, ...messages.map((m) => ({ role: m.role, content: m.content }))];
  const trace = [];
  for (let round = 0; round < 4; round++) {
    const body: Record<string, unknown> = { model, messages: apiMessages };
    if (tools.length) { body.tools = tools.map((t) => ({ type: "function", function: { name: `${t.serverId}__${t.name}`, description: t.description, parameters: t.inputSchema } })); body.tool_choice = "auto"; }
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body) });
    if (!response.ok) return { reply: `AI provider ตอบกลับด้วยข้อผิดพลาด (${response.status})`, toolTrace: trace };
    const data = await response.json() as { choices?: Array<{ message?: { content?: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }> };
    const message = data.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];
    if (!toolCall) return { reply: message?.content ?? "โมเดลไม่ส่งข้อความตอบกลับ", toolTrace: trace };
    if (!callTool) return { reply: "โมเดลร้องขอเครื่องมือ แต่ยังไม่มีเครื่องมือให้ใช้งานในโมดูลนี้", toolTrace: trace };
    const args = JSON.parse(toolCall.function.arguments || "{}"); const result = await callTool(toolCall.function.name, args);
    trace.push({ name: toolCall.function.name, arguments: args, result });
    apiMessages.push({ role: "assistant", content: message?.content ?? "", tool_calls: message?.tool_calls }, { role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
  }
  return { reply: "การเรียกเครื่องมือเกินจำนวนรอบที่กำหนด", toolTrace: trace };
}