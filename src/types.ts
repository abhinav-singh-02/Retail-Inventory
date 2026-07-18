export interface StoreMaster {
  storeId: string;
  storeName: string;
  region: string;
  city: string;
  storeFormat: string;
}

export interface WeeklyTransaction {
  storeId: string;
  week: string; // e.g. "Week 1", "W1", or date
  category: string;
  footfall: number;
  transactions: number;
  unitsSold: number;
  grossSales: number;
  discountAmount: number;
  target: number;
  inventory: number;
  returns: number;
  marketingSpend: number;
}

export interface MergedRow extends StoreMaster, WeeklyTransaction {
  netSales: number; // calculated: grossSales - discountAmount - returns
}

export interface FilterState {
  weeks: string[];
  regions: string[];
  cities: string[];
  storeFormats: string[];
  categories: string[];
  stores: string[];
}

export interface DashboardMetrics {
  totalGrossSales: number;
  totalDiscounts: number;
  totalReturns: number;
  totalNetSales: number;
  totalTarget: number;
  targetAchievement: number; // ratio
  totalTransactions: number;
  totalFootfall: number;
  averageTransactionValue: number;
  conversionRate: number; // ratio
  returnRate: number; // ratio of returns / gross
  discountRate: number; // ratio of discounts / gross
  totalMarketingSpend: number;
  totalUnitsSold: number;
}

export interface StockoutRiskItem {
  storeId: string;
  storeName: string;
  category: string;
  inventory: number;
  unitsSold: number;
  ratio: number; // unitsSold / inventory
  riskLevel: 'High' | 'Medium' | 'Low';
}

export interface AIRecommendationRequest {
  metrics: DashboardMetrics;
  topCategories: Array<{ category: string; netSales: number }>;
  bottomCategories: Array<{ category: string; netSales: number }>;
  regionalPerformance: Array<{ region: string; netSales: number; conversionRate: number }>;
  stockoutRisks: Array<StockoutRiskItem>;
  filterContext: {
    weeks: string[];
    regions: string[];
    categories: string[];
  };
}

export interface AIRecommendationResponse {
  insights: string;
}
