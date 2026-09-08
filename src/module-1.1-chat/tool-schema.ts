export function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (!schema || typeof schema !== "object") return schema;
  const source = schema as Record<string, unknown>;
  const output: Record<string, unknown> = { ...source };
  if (typeof source.type === "string") output.type = source.type.toUpperCase();
  if (source.properties && typeof source.properties === "object") {
    output.properties = Object.fromEntries(Object.entries(source.properties as Record<string, unknown>).map(([key, value]) => [key, toGeminiSchema(value)]));
  }
  if ("items" in source) output.items = toGeminiSchema(source.items);
  return output;
}