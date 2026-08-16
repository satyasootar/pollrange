import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useDashboardOverview } from "./use-dashboard";
import { hookWrapper } from "@/test/utils";
import { server } from "@/test/msw/server";
import { testState } from "@/test/msw/handlers";

const API = "http://localhost:3030/api";

describe("useDashboardOverview", () => {
  it("fetches and unwraps the overview payload", async () => {
    const { Wrapper } = hookWrapper();
    const { result } = renderHook(() => useDashboardOverview("day"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totals.responses).toBe(42);
    expect(result.current.data?.responsesSplit).toEqual({ polls: 30, forms: 12 });
    expect(result.current.data?.timeline).toHaveLength(3);
  });

  it("reflects whatever the (mock) backend returns", async () => {
    testState.overview = { ...testState.overview, totals: { ...testState.overview.totals, forms: 99 } };
    const { Wrapper } = hookWrapper();
    const { result } = renderHook(() => useDashboardOverview("month"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totals.forms).toBe(99);
  });

  it("surfaces an error when the backend fails", async () => {
    server.use(http.get(`${API}/dashboard/overview`, () => new HttpResponse(null, { status: 500 })));
    const { Wrapper } = hookWrapper();
    const { result } = renderHook(() => useDashboardOverview("day"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
