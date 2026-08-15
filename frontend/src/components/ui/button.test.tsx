import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Button } from "./button"

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>Submit Response</Button>)
    expect(screen.getByRole("button", { name: "Submit Response" })).toBeInTheDocument()
  })

  it("fires onClick when pressed", async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)
    await userEvent.click(screen.getByRole("button", { name: "Click me" }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Nope
      </Button>
    )
    await userEvent.click(screen.getByRole("button", { name: "Nope" }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it("reflects the variant via data attribute", () => {
    render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute(
      "data-variant",
      "destructive"
    )
  })
})
