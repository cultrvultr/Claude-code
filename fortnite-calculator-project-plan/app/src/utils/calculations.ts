import type { CalculatorInputs, BrandDeal, MonthProjection, CalculatorResults } from '../types/calculator';

export function calculateCCU(
  startingCCU: number,
  decayRatePercent: number,
  month: number,
  floor: number
): number {
  const decayRate = decayRatePercent / 100;
  const decayedCCU = startingCCU * Math.pow(1 + decayRate, month - 1);
  return Math.max(Math.round(decayedCCU), floor);
}

export function calculateMonthlyEarnings(
  ccu: number,
  earningsPerCCU: number,
  ownershipPercent: number
): { full: number; ownership: number } {
  const full = ccu * earningsPerCCU;
  return {
    full,
    ownership: full * (ownershipPercent / 100),
  };
}

export function calculateSimpleEarnBack(
  investment: number,
  monthlyEarnings: number
): number {
  if (monthlyEarnings <= 0) return Infinity;
  return investment / monthlyEarnings;
}

export function getBrandDealForMonth(brandDeals: BrandDeal[], month: number): number {
  return brandDeals
    .filter(deal => deal.month === month)
    .reduce((sum, deal) => sum + deal.amount, 0);
}

export function generateProjections(
  inputs: CalculatorInputs,
  brandDeals: BrandDeal[],
  months: number = 36
): MonthProjection[] {
  const projections: MonthProjection[] = [];
  let cumulativeEarningsFull = 0;
  let cumulativeEarningsOwnership = 0;
  let brandDealCumulative = 0;
  let earnedBackNoBrandsMonth: number | null = null;
  let earnedBackWithBrandsMonth: number | null = null;

  for (let month = 1; month <= months; month++) {
    const ccu = calculateCCU(
      inputs.startingCCU,
      inputs.ccuDecayRate,
      month,
      inputs.ccuFloor
    );

    const ccuChangeTotal = ((ccu - inputs.startingCCU) / inputs.startingCCU) * 100;
    const ccuChangeMonthly = month === 1 ? inputs.ccuDecayRate : inputs.ccuDecayRate;

    const earnings = calculateMonthlyEarnings(
      ccu,
      inputs.earningsPerCCU,
      inputs.ownershipPercent
    );

    cumulativeEarningsFull += earnings.full;
    cumulativeEarningsOwnership += earnings.ownership;

    const brandDealMonthly = getBrandDealForMonth(brandDeals, month);
    brandDealCumulative += brandDealMonthly;

    const earningsWithBrands = cumulativeEarningsOwnership + brandDealCumulative;

    // Check earn-back milestones
    let earnedBackNoBrands: number | null = null;
    if (earnedBackNoBrandsMonth === null && cumulativeEarningsOwnership >= inputs.investmentSum) {
      earnedBackNoBrandsMonth = month;
      earnedBackNoBrands = month;
    }

    let earnedBackWithBrands: number | null = null;
    if (earnedBackWithBrandsMonth === null && earningsWithBrands >= inputs.investmentSum) {
      earnedBackWithBrandsMonth = month;
      earnedBackWithBrands = month;
    }

    projections.push({
      month,
      ccu,
      ccuChangeMonthly,
      ccuChangeTotal: Math.round(ccuChangeTotal),
      earningsFull: earnings.full,
      earningsOwnership: earnings.ownership,
      cumulativeEarningsFull,
      cumulativeEarningsOwnership,
      earnedBackNoBrands,
      brandDealMonthly,
      brandDealCumulative,
      earningsWithBrands,
      earnedBackWithBrands,
      breakEven: inputs.investmentSum,
    });
  }

  return projections;
}

export function calculateResults(
  inputs: CalculatorInputs,
  brandDeals: BrandDeal[]
): CalculatorResults {
  const projections = generateProjections(inputs, brandDeals);

  const initialEarnings = calculateMonthlyEarnings(
    inputs.startingCCU,
    inputs.earningsPerCCU,
    inputs.ownershipPercent
  );

  const earnBackPeriodSimple = calculateSimpleEarnBack(
    inputs.investmentSum,
    initialEarnings.ownership
  );

  const earnBackWithBrandsProjection = projections.find(p => p.earnedBackWithBrands !== null);

  const totalBrandDeals = brandDeals.reduce((sum, deal) => sum + deal.amount, 0);

  return {
    earnBackPeriodSimple,
    earnBackPeriodRealistic: earnBackWithBrandsProjection?.month ?? null,
    totalBrandDeals,
    monthlyEarningsAtOwnership: initialEarnings.ownership,
    projections,
  };
}
