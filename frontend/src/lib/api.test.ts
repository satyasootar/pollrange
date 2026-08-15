import { describe, it, expect, vi, beforeEach } from "vitest"
import axios from "axios"
import api from "./api"

// Regression test for the random-logout bug: concurrent 401s must trigger a
// single refresh, not one per request (which races the rotating refresh token).
describe("api 401 refresh", () => {
  beforeEach(() => vi.restoreAllMocks())

  it("shares one refresh call across concurrent 401s, then retries", async () => {
    const refresh = vi.spyOn(axios, "post").mockResolvedValue({ data: {} } as never)

    // First attempt for a request 401s; the retried attempt (_retry) succeeds.
    api.defaults.adapter = (async (config: { _retry?: boolean }) => {
      if (config._retry) {
        return { data: "ok", status: 200, statusText: "OK", headers: {}, config }
      }
      const err = Object.assign(new Error("401"), {
        isAxiosError: true,
        response: { status: 401, data: {} },
        config,
      })
      throw err
    }) as never

    const results = await Promise.all([api.get("/a"), api.get("/b"), api.get("/c")])

    expect(results.map((r) => r.data)).toEqual(["ok", "ok", "ok"])
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("does not refresh on a failed login (401 from an auth endpoint)", async () => {
    const refresh = vi.spyOn(axios, "post").mockResolvedValue({ data: {} } as never)

    api.defaults.adapter = (async (config: unknown) => {
      const err = Object.assign(new Error("401"), {
        isAxiosError: true,
        response: { status: 401, data: {} },
        config,
      })
      throw err
    }) as never

    await expect(api.post("/auth/login", {})).rejects.toBeTruthy()
    expect(refresh).not.toHaveBeenCalled()
  })
})
