/**
 * Company Data Types - SSI iBoard API
 * 
 * Types for company profile, subsidiaries, leadership, shareholders, and capital/dividend data
 */

// ============================================
// Company Profile
// ============================================

export interface CompanyProfile {
    symbol: string;
    companyName: string;
    industryName: string;
    superSector: string;
    sector: string;
    subSector: string;
    foundingDate: string;
    charterCapital: string;
    numberOfEmployee: number;
    companyProfile: string; // HTML description
    listingDate: string;
    exchange: string;
    firstPrice: string;
    issueShare: string;
    listedValue: string;
    quantity: number;
    stockType: string;
    freeFloatRate: string;
    updateDate: string;
    address: string;
    website: string;
    telephone: string;
    email: string;
    fax: string | null;
}

// ============================================
// Subsidiaries
// ============================================

export interface SubCompany {
    parentSymbol: string;
    parentCompanyName: string;
    childSymbol: string;
    childCompanyName: string;
    charterCapital: string | null;
    percentage: string | null;
    roleId: string;
    roleName: string;
}

// ============================================
// Leadership
// ============================================

export interface LeadershipMember {
    symbol: string;
    fullName: string;
    positionName: string;
    positionLevel: string;
    positionId: string;
    personId: string;
}

// ============================================
// Shareholders
// ============================================

/** Individual shareholder details */
export interface ShareholderDetail {
    symbol: string;
    name: string;
    quantity: number;
    percentage: number;
    publicDate: string;
    ownerShipTypeCode: "NGOAI" | "CNNHAN" | "KHAC" | string;
    type: "I" | "C"; // Individual / Corporation
    totalPage: number;
    totalRow: number;
}

/** Summary of shareholder structure (for pie chart) */
export interface ShareholderSummary {
    symbol: string;
    foreignerVolume: string;
    foreignerPercentage: string;
    stateVolume: string;
    statePercentage: string;
    otherVolume: string;
    otherPercentage: string;
    publicDate: string;
}

// ============================================
// Capital & Dividend
// ============================================

export interface AssetYearly {
    year: string;
    asset: string;
}

export interface CashDividendYearly {
    year: string;
    valuePershare: string;
}

export interface CapAndDividend {
    assetList: AssetYearly[];
    cashDividendList: CashDividendYearly[];
}

// ============================================
// API Response Wrappers
// ============================================

export interface CompanyApiResponse<T> {
    code: string;
    message: string;
    data: T;
    paging: { page: number; pageSize: number; totalPage: number; totalRow: number } | null;
    status: string;
}
