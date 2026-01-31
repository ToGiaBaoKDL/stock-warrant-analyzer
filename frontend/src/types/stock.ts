export interface StockPosition {
    symbol: string;
    buyPrice: number;
    quantity: number;
    buyFeePercent: number;
}

export interface StockScenario {
    id: string;
    sellPrice: number;
    sellFeePercent: number;
    taxPercent: number;
}

export interface StockSymbolData {
    position: StockPosition | null;
    scenarios: StockScenario[];
}
