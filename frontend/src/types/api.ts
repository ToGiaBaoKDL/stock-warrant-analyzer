// API Response Types for SSI iBoard API

// ================== Stock Types ==================

export interface StockItem {
  symbol: string;
  name: string;
  name_en: string;
  exchange: string;
  board_id: string;
  current_price: number;
  ref_price: number;
  ceiling: number;
  floor: number;
  open_price: number;
  high_price: number;
  low_price: number;
  avg_price: number;
  change: number;
  change_percent: number;
  volume: number;
  value: number;
  bid1_price: number;
  bid1_vol: number;
  bid2_price: number;
  bid2_vol: number;
  bid3_price: number;
  bid3_vol: number;
  ask1_price: number;
  ask1_vol: number;
  ask2_price: number;
  ask2_vol: number;
  ask3_price: number;
  ask3_vol: number;
  foreign_buy_vol: number;
  foreign_sell_vol: number;
  foreign_remain: number;
  session: string;
  trading_date: string;
}

export interface StockListResponse {
  stocks: StockItem[];
  total: number;
  exchange?: string | null;
}

export interface StockDetailResponse {
  stock: StockItem;
}

export interface StockPriceResponse {
  symbol: string;
  current_price: number;
  ref_price: number;
  change: number;
  change_percent: number;
  volume: number;
  ceiling: number;
  floor: number;
  high_price: number;
  low_price: number;
  session: string;
}

export interface ExchangeSummary {
  exchange: string;
  total_stocks: number;
  total_volume: number;
  total_value: number;
  advances: number;
  declines: number;
  unchanged: number;
}

// ================== Warrant Types ==================

export interface WarrantItem {
  symbol: string;
  underlying_symbol: string;
  issuer_name: string;
  warrant_type: string;
  current_price: number;
  ref_price: number;
  ceiling: number;
  floor: number;
  open_price: number;
  high_price: number;
  low_price: number;
  avg_price: number;
  change: number;
  change_percent: number;
  volume: number;
  value: number;
  exercise_price: number;
  exercise_ratio: number;
  maturity_date: string;
  last_trading_date: string;
  days_to_maturity: number;
  bid1_price: number;
  bid1_vol: number;
  bid2_price: number;
  bid2_vol: number;
  bid3_price: number;
  bid3_vol: number;
  ask1_price: number;
  ask1_vol: number;
  ask2_price: number;
  ask2_vol: number;
  ask3_price: number;
  ask3_vol: number;
  foreign_remain: number;
  session: string;
  trading_date: string;
  conversion_ratio: number;  // Alias for exercise_ratio
}

export interface UnderlyingInfo {
  symbol: string;
  current_price: number;
  ref_price: number;
  ceiling: number;
  floor: number;
  change: number;
  change_percent: number;
}

export interface WarrantListResponse {
  warrants: WarrantItem[];
  total: number;
  exchange?: string | null;
  underlying?: Record<string, UnderlyingInfo> | null;
}

export interface WarrantsByUnderlyingResponse {
  warrants: WarrantItem[];
  total: number;
  underlying?: UnderlyingInfo | null;
}

export interface WarrantDetailResponse {
  warrant: WarrantItem;
  underlying?: UnderlyingInfo | null;
}

// ================== Market Types ==================

export interface MarketOverview {
  stocks: Record<string, ExchangeSummary>;
  warrants: {
    total_warrants: number;
    total_underlying: number;
    total_volume: number;
    total_value: number;
    advances: number;
    declines: number;
    unchanged: number;
  };
  total_stocks: number;
  total_warrants: number;
}

export interface TopStock {
  symbol: string;
  name: string;
  exchange: string;
  current_price: number;
  change_percent: number;
  volume: number;
  value?: number;
}

export interface TopStocksResponse {
  stocks: TopStock[];
  total: number;
}

export interface TopWarrant {
  symbol: string;
  underlying_symbol: string;
  issuer: string;
  current_price: number;
  change_percent: number;
  volume: number;
  days_to_maturity: number;
  exercise_price?: number;
  maturity_date?: string;
}

export interface TopWarrantsResponse {
  warrants: TopWarrant[];
  total: number;
}

// ================== Legacy Types (Backward Compatibility) ==================

export interface WarrantInfo {
  symbol: string;
  underlying_symbol: string;
  issuer_name: string;
  expiration_date: string;
  conversion_ratio: number;
  exercise_price: number;
  current_price: number;
  underlying_price: number;
  days_to_maturity: number;
  volume?: number;
  open_interest?: number;
}

export interface WarrantListItem {
  symbol: string;
  underlying_symbol: string;
  issuer_name: string;
  expiration_date: string;
  conversion_ratio: number;
  exercise_price: number;
  current_price: number;
  days_to_maturity: number;
  volume: number;
  change: number;
  change_percent: number;
  underlying_price: number;
}

export interface StockInfo {
  symbol: string;
  name: string;
  exchange: string;
}

export interface ApiError {
  detail: string;
}
