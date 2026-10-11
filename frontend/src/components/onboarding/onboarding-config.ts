import type { OnboardingUsage, OnboardingIntent, OnboardingFirstAction } from "@/types";

export const USAGE_OPTIONS: { value: OnboardingUsage; label: string }[] = [
  { value: "company", label: "Company" },
  { value: "education", label: "Educational institution" },
  { value: "public_sector", label: "Public sector" },
  { value: "non_profit", label: "Non-profit" },
  { value: "student", label: "I am a student" },
  { value: "other", label: "Other" },
];

export const USAGE_DETAIL_CONFIG: Record<
  OnboardingUsage,
  { question: string; options?: string[]; freeText?: boolean }
> = {
  company: {
    question: "What's your company size?",
    options: ["1–10", "11–50", "51–200", "201–1000", "1000+"],
  },
  education: {
    question: "What's your role there?",
    options: ["Teacher/Instructor", "Administrator", "Researcher", "Other"],
  },
  public_sector: {
    question: "What type of organization?",
    options: ["Government agency", "Municipality/Local govt", "Healthcare", "Other"],
  },
  non_profit: {
    question: "What's your organization size?",
    options: ["1–10", "11–50", "50+"],
  },
  student: {
    question: "What will you use polls for?",
    options: ["Class assignments", "Student clubs/organizations", "Personal projects", "Research"],
  },
  other: {
    question: "Tell us a bit more",
    freeText: true,
  },
};

export const INTENT_OPTIONS: { value: OnboardingIntent; label: string }[] = [
  { value: "explore", label: "I want to explore Kollects" },
  { value: "create_polls", label: "I am here to create polls" },
  { value: "other", label: "I am here for other reasons" },
];

export const FIRST_ACTION_OPTIONS: { value: OnboardingFirstAction; label: string }[] = [
  { value: "word_cloud", label: "Word Cloud" },
  { value: "polls", label: "Polls" },
  { value: "quiz", label: "Quiz" },
  { value: "open_ended", label: "Open Ended" },
];
