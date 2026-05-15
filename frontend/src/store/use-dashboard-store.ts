import { create } from "zustand";
import type { Poll } from "@/types";

interface DashboardState {
  polls: Poll[];
  setPolls: (polls: Poll[]) => void;
  removePoll: (pollId: string) => void;
  updatePollStatus: (pollId: string, status: Poll["status"]) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  polls: [],
  setPolls: (polls) => set({ polls }),
  removePoll: (pollId) =>
    set((state) => ({
      polls: state.polls.filter((poll) => poll._id !== pollId),
    })),
  updatePollStatus: (pollId, status) =>
    set((state) => ({
      polls: state.polls.map((poll) =>
        poll._id === pollId ? { ...poll, status } : poll
      ),
    })),
}));
