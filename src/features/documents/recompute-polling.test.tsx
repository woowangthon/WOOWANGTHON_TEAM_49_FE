// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { http } from "msw";
import type { ReactNode } from "react";
import { AppServicesContext } from "@/hooks/use-app-services";
import { createAppServices } from "@/lib/app-services";
import { managementMocks } from "@/test/management-handlers";
import { apiResponse, server, testApiUrl } from "@/test/server";
import { useRecomputeStatus } from "./queries";
import { businessKeys } from "@/lib/query/business-keys";

const apps: ReturnType<typeof createAppServices>[] = [];
afterEach(() => { cleanup(); apps.splice(0).forEach(app => { app.session.clear(); app.queryClient.clear(); }); });
it("invalidates once when an active job finishes and never again on remount or repeated status fetch", async () => {
  const management = managementMocks();
  let status = "RUNNING";
  server.use(http.get(`${testApiUrl}/cases/:id/recompute-status`, () => apiResponse({caseId:15,currentInputVersion:63,results:{},activeJob:status==="RUNNING"?{jobId:"a",status}:null,latestJob:{jobId:"a",status}})), ...management.handlers);
  const app = createAppServices(); apps.push(app);
  await app.auth.login({email:"worker@example.com", password:"password1234"});
  const wrapper = ({children}: {children: ReactNode}) => <AppServicesContext value={app}><QueryClientProvider client={app.queryClient}>{children}</QueryClientProvider></AppServicesContext>;
  const invalidations = vi.spyOn(app.queryClient, "invalidateQueries");
  const first = renderHook(() => useRecomputeStatus(15), {wrapper});
  await waitFor(() => expect(first.result.current.data?.activeJob?.status).toBe("RUNNING"));
  invalidations.mockClear(); status="PARTIAL";
  await act(async () => { await first.result.current.refetch(); });
  expect(invalidations).toHaveBeenCalledTimes(1);
  expect(invalidations.mock.calls[0][0]?.queryKey).toEqual(businessKeys.case(app.session.getSnapshot().generation,15));
  await act(async () => { await first.result.current.refetch(); });
  first.unmount();
  const second = renderHook(() => useRecomputeStatus(15), {wrapper});
  await act(async () => { await second.result.current.refetch(); });
  expect(invalidations).toHaveBeenCalledTimes(1);
});
