import { describe, it, expect, beforeEach } from "vitest"
import {
  shuffle,
  buildShareUrl,
  getOrCreateSessionToken,
  getApiErrorMessage,
  formatDatetime,
  isPollActive,
} from "./utils"

describe("shuffle", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  it("returns a new array with the same elements", () => {
    const out = shuffle(input)
    expect(out).not.toBe(input)
    expect([...out].sort((a, b) => a - b)).toEqual(input)
  })

  it("does not mutate the input", () => {
    const copy = [...input]
    shuffle(input)
    expect(input).toEqual(copy)
  })

  it("is deterministic for a given seed", () => {
    const a = shuffle(input, "poll-123")
    const b = shuffle(input, "poll-123")
    expect(a).toEqual(b)
  })

  it("produces different orders for different seeds", () => {
    const a = shuffle(input, "seed-a")
    const b = shuffle(input, "seed-b")
    // Extremely unlikely to collide for a 10-element array.
    expect(a).not.toEqual(b)
  })
})

describe("buildShareUrl", () => {
  it("builds a /p/<token> url on the app origin", () => {
    const url = buildShareUrl("abc-token")
    expect(url).toBe(`${window.location.origin}/p/abc-token`)
  })
})

describe("getOrCreateSessionToken", () => {
  beforeEach(() => localStorage.clear())

  it("creates and persists a token per key", () => {
    const first = getOrCreateSessionToken("poll-1")
    const again = getOrCreateSessionToken("poll-1")
    expect(first).toBe(again)
    expect(localStorage.getItem("kollects_session_poll-1")).toBe(first)
  })

  it("returns distinct tokens for distinct keys", () => {
    expect(getOrCreateSessionToken("poll-1")).not.toBe(getOrCreateSessionToken("poll-2"))
  })
})

describe("getApiErrorMessage", () => {
  it("maps known status codes", () => {
    expect(getApiErrorMessage({ response: { status: 401 } })).toBe("Please log in to continue.")
    expect(getApiErrorMessage({ response: { status: 404 } })).toBe("Resource not found.")
    expect(getApiErrorMessage({ response: { status: 410 } })).toBe("This poll has expired.")
  })

  it("prefers the server-provided message", () => {
    const msg = getApiErrorMessage({ response: { status: 400, data: { message: "Bad poll" } } })
    expect(msg).toBe("Bad poll")
  })

  it("falls back for null / unknown errors", () => {
    expect(getApiErrorMessage(null)).toBe("An unexpected error occurred.")
  })
})

describe("formatDatetime", () => {
  it("returns 'Not set' for empty / invalid input", () => {
    expect(formatDatetime(null)).toBe("Not set")
    expect(formatDatetime("not-a-date")).toBe("Not set")
  })
})

describe("isPollActive", () => {
  it("treats no-expiry as always active", () => {
    expect(isPollActive(null)).toBe(true)
  })

  it("returns false for a past expiry", () => {
    expect(isPollActive("2000-01-01T00:00:00.000Z")).toBe(false)
  })
})
