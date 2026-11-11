import type { z } from "zod";
import type { loginResponseSchema } from "./schemas";
import { protocolError } from "@/lib/api/response";

// Application usability policy, separate from the P0 wire contract.
export function requireUsableSession(dto: z.infer<typeof loginResponseSchema>) {
  if (!dto.accessToken.trim() || /\s/.test(dto.accessToken) || dto.expiresIn <= 0) throw protocolError();
  return dto;
}
