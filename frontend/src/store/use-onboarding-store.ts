import { create } from "zustand";
import type {
  OnboardingUsage,
  OnboardingIntent,
  OnboardingPlan,
  OnboardingFirstAction,
} from "@/types";

export interface OnboardingForm {
  usage?: OnboardingUsage;
  usageDetail?: string;
  intent?: OnboardingIntent;
  plan?: OnboardingPlan;
  firstAction?: OnboardingFirstAction;
}

interface OnboardingState {
  step: 1 | 2 | 3 | 4;
  form: OnboardingForm;
  nextStep: () => void;
  prevStep: () => void;
  setField: <K extends keyof OnboardingForm>(key: K, value: OnboardingForm[K]) => void;
  reset: () => void;
}

const defaultForm: OnboardingForm = {};

export const useOnboardingStore = create<OnboardingState>()((set) => ({
  step: 1,
  form: { ...defaultForm },

  nextStep: () => set((s) => ({ step: Math.min(4, s.step + 1) as 1 | 2 | 3 | 4 })),
  prevStep: () => set((s) => ({ step: Math.max(1, s.step - 1) as 1 | 2 | 3 | 4 })),
  setField: (key, value) => set((s) => ({ form: { ...s.form, [key]: value } })),
  reset: () => set({ step: 1, form: { ...defaultForm } }),
}));
