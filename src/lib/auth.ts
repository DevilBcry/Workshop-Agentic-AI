import type { Env } from "../env";
import { errorJson } from "./http";

function timingSafeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export function requireAdminToken(request: Request, env: Env): Response | undefined {
  if (!env.ADMIN_TOKEN) return errorJson("ยังไม่ได้ตั้งค่า ADMIN_TOKEN จึงไม่สามารถใช้งานหน้าตั้งค่าได้", 503);
  const supplied = request.headers.get("X-Admin-Token") || "";
  if (!timingSafeEqual(supplied, env.ADMIN_TOKEN)) return errorJson("Admin token ไม่ถูกต้อง", 401);
  return undefined;
}