import { HttpResponse } from "msw";
export function apiResponse(data: unknown, status = 200) {
  return HttpResponse.json({ code: status, message: "MSW development fixture", data }, { status });
}
