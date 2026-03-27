import { create } from "zustand";

interface StreakState {
  currentStreak: number;
  longestStreak: number;
  totalXP: number;
  weeklyXP: number;
  lastStudyDate: string | null;
  streakFreezes: number;
  setStreak: (data: Partial<StreakState>) => void;
  addXP: (amount: number) => void;
}

export const useStreakStore = create<StreakState>((set) => ({
  currentStreak: 0,
  longestStreak: 0,
  totalXP: 0,
  weeklyXP: 0,
  lastStudyDate: null,
  streakFreezes: 0,
  setStreak: (data) => set((state) => ({ ...state, ...data })),
  addXP: (amount) =>
    set((state) => ({
      totalXP: state.totalXP + amount,
      weeklyXP: state.weeklyXP + amount,
    })),
}));
