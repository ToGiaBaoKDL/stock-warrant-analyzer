import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { WarrantPosition, WarrantScenario } from "@/types/warrant";
import {
  DEFAULT_BUY_FEE_PERCENT,
  DEFAULT_SELL_FEE_PERCENT,
  DEFAULT_SELL_TAX_PERCENT,
} from "@/utils/calculations";

// Fee settings type
export interface FeeSettings {
  buyFeePercent: number;
  sellFeePercent: number;
  sellTaxPercent: number;
}

interface WarrantState {
  // Current warrant being analyzed
  currentWarrant: string | null;

  // User's position
  position: WarrantPosition | null;

  // What-if scenarios
  scenarios: WarrantScenario[];

  // Screener settings
  targetUnderlyingPrice: number | null;
  selectedUnderlying: string | null;

  // Fee settings
  feeSettings: FeeSettings;

  // Actions
  setCurrentWarrant: (symbol: string | null) => void;
  setPosition: (position: WarrantPosition | null) => void;
  updatePosition: (updates: Partial<WarrantPosition>) => void;

  addScenario: (sellPrice: number) => void;
  updateScenario: (id: string, updates: Partial<WarrantScenario>) => void;
  removeScenario: (id: string) => void;
  clearScenarios: () => void;

  setTargetUnderlyingPrice: (price: number | null) => void;
  setSelectedUnderlying: (symbol: string | null) => void;
  setFeeSettings: (settings: Partial<FeeSettings>) => void;

  // Reset
  reset: () => void;
}

// Generate unique ID for scenarios
const generateId = () => `scenario_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// Initial state
const initialState = {
  currentWarrant: null,
  position: null,
  scenarios: [],
  targetUnderlyingPrice: null,
  selectedUnderlying: null,
  feeSettings: {
    buyFeePercent: DEFAULT_BUY_FEE_PERCENT,
    sellFeePercent: DEFAULT_SELL_FEE_PERCENT,
    sellTaxPercent: DEFAULT_SELL_TAX_PERCENT,
  },
};

export const useWarrantStore = create<WarrantState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Set current warrant symbol
      setCurrentWarrant: (symbol) => set({ currentWarrant: symbol }),

      // Set full position
      setPosition: (position) => set({ position }),

      // Update position partially
      updatePosition: (updates) => {
        const current = get().position;
        if (current) {
          set({ position: { ...current, ...updates } });
        }
      },

      // Add a new scenario
      addScenario: (sellPrice) => {
        const newScenario: WarrantScenario = {
          id: generateId(),
          sellPrice,
          sellFeePercent: DEFAULT_SELL_FEE_PERCENT,
          taxPercent: DEFAULT_SELL_TAX_PERCENT,
        };
        set((state) => ({
          scenarios: [...state.scenarios, newScenario],
        }));
      },

      // Update an existing scenario
      updateScenario: (id, updates) => {
        set((state) => ({
          scenarios: state.scenarios.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },

      // Remove a scenario
      removeScenario: (id) => {
        set((state) => ({
          scenarios: state.scenarios.filter((s) => s.id !== id),
        }));
      },

      // Clear all scenarios
      clearScenarios: () => set({ scenarios: [] }),

      // Screener settings
      setTargetUnderlyingPrice: (price) => set({ targetUnderlyingPrice: price }),
      setSelectedUnderlying: (symbol) => set({ selectedUnderlying: symbol }),

      // Fee settings
      setFeeSettings: (settings) => {
        set((state) => ({
          feeSettings: { ...state.feeSettings, ...settings },
        }));
      },

      // Reset to initial state
      reset: () => set(initialState),
    }),
    {
      name: "warrant-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist certain fields
      partialize: (state) => ({
        position: state.position,
        scenarios: state.scenarios,
        targetUnderlyingPrice: state.targetUnderlyingPrice,
        feeSettings: state.feeSettings,
        // Note: selectedUnderlying is NOT persisted - page starts fresh
      }),
    }
  )
);
