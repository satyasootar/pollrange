import { describe, it, expect, beforeEach } from "vitest"
import { usePollBuilderStore } from "./use-poll-builder-store"

const store = () => usePollBuilderStore.getState()

describe("usePollBuilderStore", () => {
  beforeEach(() => store().reset())

  it("starts with one blank question and two options", () => {
    expect(store().form.questions).toHaveLength(1)
    expect(store().form.questions[0].options).toHaveLength(2)
    expect(store().step).toBe(1)
  })

  it("adds and removes questions", () => {
    store().addQuestion()
    expect(store().form.questions).toHaveLength(2)
    const id = store().form.questions[1].id
    store().removeQuestion(id)
    expect(store().form.questions).toHaveLength(1)
  })

  it("updates an option's text immutably", () => {
    const q = store().form.questions[0]
    store().updateOption(q.id, q.options[0].id, "First option")
    expect(store().form.questions[0].options[0].text).toBe("First option")
  })

  it("caps options at 10", () => {
    const id = store().form.questions[0].id
    for (let i = 0; i < 20; i++) store().addOption(id)
    expect(store().form.questions[0].options.length).toBe(10)
  })

  it("reorders questions", () => {
    store().addQuestion()
    const [a, b] = store().form.questions.map((q) => q.id)
    store().reorderQuestions(0, 1)
    expect(store().form.questions.map((q) => q.id)).toEqual([b, a])
  })

  it("setForm replaces questions (used by the edit flow)", () => {
    store().setForm({
      title: "Edited",
      questions: [
        { id: "x", text: "Q", type: "open_ended", isMandatory: false, options: [] },
      ],
    })
    expect(store().form.title).toBe("Edited")
    expect(store().form.questions).toHaveLength(1)
    expect(store().form.questions[0].id).toBe("x")
  })

  it("reset restores defaults", () => {
    store().addQuestion()
    store().setStep(3)
    store().reset()
    expect(store().form.questions).toHaveLength(1)
    expect(store().step).toBe(1)
  })
})
