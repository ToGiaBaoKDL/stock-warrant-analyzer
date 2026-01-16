import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  DEFAULT_BUY_FEE_PERCENT,
  DEFAULT_SELL_FEE_PERCENT,
  DEFAULT_SELL_TAX_PERCENT,
} from "@/utils/calculations";

interface StockPosition {
  symbol: string;
  buyPrice: number;
  quantity: number;
  buyFeePercent: number;
}

interface StockScenario {
  id: string;
  sellPrice: number;
  sellFeePercent: number;
  taxPercent: number;
}

interface SymbolData {
  position: StockPosition | null;
  scenarios: StockScenario[];
}

interface StockState {
  // Current stock being analyzed
  currentSymbol: string | null;
  
  // Cache positions and scenarios by symbol
  symbolDataCache: Record<string, SymbolData>;
  
  // Get current symbol data
  position: StockPosition | null;
  scenarios: StockScenario[];
  
  // Actions
  setCurrentSymbol: (symbol: string | null) => void;
  setPosition: (position: StockPosition | null) => void;
  updatePosition: (updates: Partial<StockPosition>) => void;
  
  addScenario: (sellPrice: number) => void;
  updateScenario: (id: string, updates: Partial<StockScenario>) => void;
  removeScenario: (id: string) => void;
  clearScenarios: () => void;
  
  // Reset
  reset: () => void;
}

// Generate unique ID for scenarios
const generateId = () => `stock_scenario_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// Initial state
const initialState = {
  currentSymbol: null,
  symbolDataCache: {},
};

export const useStockStore = create<StockState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Computed values from current symbol cache
      get position() {
        const { currentSymbol, symbolDataCache } = get();
        if (!currentSymbol) return null;
        return symbolDataCache[currentSymbol]?.position || null;
      },
      
      get scenarios() {
        const { currentSymbol, symbolDataCache } = get();
        if (!currentSymbol) return [];
        return symbolDataCache[currentSymbol]?.scenarios || [];
      },
      
      // Set current symbol and load cached data
      setCurrentSymbol: (symbol) => {
        set({ currentSymbol: symbol });
      },
      
      // Set full position for current symbol
      setPosition: (position) => {
        const { currentSymbol, symbolDataCache } = get();
        if (!currentSymbol) return;
        
        const currentData = symbolDataCache[currentSymbol] || { position: null, scenarios: [] };
        set({
          symbolDataCache: {
            ...symbolDataCache,
            [currentSymbol]: { ...currentData, position },
          },
        });
      },
      
      // Update position partially for current symbol
      updatePosition: (updates) => {
        const { currentSymbol, symbolDataCache } = get();
        if (!currentSymbol) return;
        
        const currentData = symbolDataCache[currentSymbol];
        if (!currentData?.position) return;
        
        set({
          symbolDataCache: {
            ...symbolDataCache,
            [currentSymbol]: {
              ...currentData,
              position: { ...currentData.position, ...updates },
            },
          },
        });
      },
      
      // Add a new scenario for current symbol
      addScenario: (sellPrice) => {
        const { currentSymbol, symbolDataCache } = get();
        if (!currentSymbol) return;
        
        const newScenario: StockScenario = {
          id: generateId(),
          sellPrice,
          sellFeePercent: DEFAULT_SELL_FEE_PERCENT,
          taxPercent: DEFAULT_SELL_TAX_PERCENT,
        };
        
        const currentData = symbolDataCache[currentSymbol] || { position: null, scenarios: [] };
        set({
          symbolDataCache: {
            ...symbolDataCache,
            [currentSymbol]: {
              ...currentData,
              scenarios: [...currentData.scenarios, newScenario],
            },
          },
        });
      },
      
      // Update an existing scenario for current symbol
      updateScenario: (id, updates) => {
        const { currentSymbol, symbolDataCache } = get();
        if (!currentSymbol) return;
        
        const currentData = symbolDataCache[currentSymbol];
        if (!currentData) return;
        
        set({
          symbolDataCache: {
            ...symbolDataCache,
            [currentSymbol]: {
              ...currentData,
              scenarios: currentData.scenarios.map((s) =>
                s.id === id ? { ...s, ...updates } : s
              ),
            },
          },
        });
      },
      
      // Remove a scenario for current symbol
      removeScenario: (id) => {
        const { currentSymbol, symbolDataCache } = get();
        if (!currentSymbol) return;
        
        const currentData = symbolDataCache[currentSymbol];
        if (!currentData) return;
        
        set({
          symbolDataCache: {
            ...symbolDataCache,
            [currentSymbol]: {
              ...currentData,
              scenarios: currentData.scenarios.filter((s) => s.id !== id),
            },
          },
        });
      },
      
      // Clear all scenarios for current symbol
      clearScenarios: () => {
        const { currentSymbol, symbolDataCache } = get();
        if (!currentSymbol) return;
        
        const currentData = symbolDataCache[currentSymbol];
        if (!currentData) return;
        
        set({
          symbolDataCache: {
            ...symbolDataCache,
            [currentSymbol]: {
              ...currentData,
              scenarios: [],
            },
          },
        });
      },
      
      // Reset to initial state
      reset: () => set(initialState),
    }),
    {
      name: "stock-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist cache
      partialize: (state) => ({
        symbolDataCache: state.symbolDataCache,
        currentSymbol: state.currentSymbol,
      }),
    }
  )
);
