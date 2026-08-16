import "@testing-library/jest-dom/vitest"
import { afterEach, afterAll, beforeAll } from "vitest"
import { cleanup } from "@testing-library/react"
import { server } from "./msw/server"
import { resetTestState } from "./msw/handlers"

// Start the mock backend once; fail loudly on any request we forgot to mock so
// tests can't silently pass against a real (absent) server.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))

// Unmount React trees and reset request handlers + mock state between tests to
// avoid cross-test leakage.
afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetTestState()
})

afterAll(() => server.close())
