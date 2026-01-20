export interface CalculatorInputs {
  investmentSum: number;
  ownershipPercent: number;
  startingCCU: number;
  earningsPerCCU: number;
  ccuDecayRate: number;
  ccuFloor: number;
}

export interface BrandDeal {
  id: string;
  name: string;
  amount: number;
  month: number;
}

export interface MonthProjection {
  month: number;
  ccu: number;
  ccuChangeMonthly: number;
  ccuChangeTotal: number;
  earningsFull: number;
  earningsOwnership: number;
  cumulativeEarningsFull: number;
  cumulativeEarningsOwnership: number;
  earnedBackNoBrands: number | null;
  brandDealMonthly: number;
  brandDealCumulative: number;
  earningsWithBrands: number;
  earnedBackWithBrands: number | null;
  breakEven: number;
}

export interface CalculatorResults {
  earnBackPeriodSimple: number;
  earnBackPeriodRealistic: number | null;
  totalBrandDeals: number;
  monthlyEarningsAtOwnership: number;
  projections: MonthProjection[];
}

export const DEFAULT_INPUTS: CalculatorInputs = {
  investmentSum: 200000,
  ownershipPercent: 25,
  startingCCU: 2000,
  earningsPerCCU: 50,
  ccuDecayRate: -5,
  ccuFloor: 500,
};
