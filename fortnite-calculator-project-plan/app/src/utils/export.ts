import type { CalculatorInputs, BrandDeal, CalculatorResults } from '../types/calculator';

export function generateCSV(
  inputs: CalculatorInputs,
  brandDeals: BrandDeal[],
  results: CalculatorResults
): string {
  const lines: string[] = [];

  // Header section
  lines.push('Fortnite Map Acquisition Calculator Export');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  // Input parameters
  lines.push('=== Investment Parameters ===');
  lines.push(`Investment Sum (USD),${inputs.investmentSum}`);
  lines.push(`Ownership Percentage,${inputs.ownershipPercent}%`);
  lines.push(`Starting CCU,${inputs.startingCCU}`);
  lines.push(`Earnings per CCU (USD),${inputs.earningsPerCCU}`);
  lines.push(`CCU Decay Rate,${inputs.ccuDecayRate}%`);
  lines.push(`CCU Floor,${inputs.ccuFloor}`);
  lines.push('');

  // Summary metrics
  lines.push('=== Summary ===');
  lines.push(`Earn-back Period (Simple),${results.earnBackPeriodSimple.toFixed(1)} months`);
  lines.push(`Earn-back Period (Realistic),${results.earnBackPeriodRealistic ?? 'N/A'} months`);
  lines.push(`Monthly Earnings at Ownership,${results.monthlyEarningsAtOwnership}`);
  lines.push(`Total Brand Deals,${results.totalBrandDeals}`);
  lines.push('');

  // Brand deals
  lines.push('=== Brand Deals ===');
  lines.push('Name,Amount (USD),Month');
  brandDeals.forEach((deal) => {
    lines.push(`${deal.name},${deal.amount},${deal.month}`);
  });
  lines.push('');

  // Projection table
  lines.push('=== 36-Month Projection ===');
  lines.push('Month,CCU,Change %,Earnings (100%),Earnings (Ownership),Cumulative,Brand Deal,Total + Brands,Earned Back');

  results.projections.forEach((row) => {
    const earnedBack = row.earnedBackWithBrands
      ? `Month ${row.earnedBackWithBrands}`
      : (row.earnedBackNoBrands ? `Month ${row.earnedBackNoBrands}` : '');

    lines.push([
      row.month,
      row.ccu,
      `${row.ccuChangeTotal}%`,
      row.earningsFull,
      row.earningsOwnership,
      row.cumulativeEarningsOwnership,
      row.brandDealMonthly || '',
      row.earningsWithBrands,
      earnedBack,
    ].join(','));
  });

  return lines.join('\n');
}

export function downloadCSV(
  inputs: CalculatorInputs,
  brandDeals: BrandDeal[],
  results: CalculatorResults
): void {
  const csv = generateCSV(inputs, brandDeals, results);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fortnite-calculator-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// URL encoding/decoding for shareable links
export interface ShareableState {
  inputs: CalculatorInputs;
  brandDeals: BrandDeal[];
}

export function encodeStateToURL(state: ShareableState): string {
  const compressed = JSON.stringify(state);
  const encoded = btoa(compressed);
  return encoded;
}

export function decodeStateFromURL(encoded: string): ShareableState | null {
  try {
    const decoded = atob(encoded);
    const state = JSON.parse(decoded) as ShareableState;
    return state;
  } catch {
    return null;
  }
}

export function getShareableURL(state: ShareableState): string {
  const encoded = encodeStateToURL(state);
  const baseURL = window.location.origin + window.location.pathname;
  return `${baseURL}?data=${encoded}`;
}

export function getStateFromURL(): ShareableState | null {
  const params = new URLSearchParams(window.location.search);
  const data = params.get('data');
  if (!data) return null;
  return decodeStateFromURL(data);
}

// localStorage save/load
const STORAGE_KEY = 'fortnite-calculator-scenarios';

export interface SavedScenario {
  id: string;
  name: string;
  createdAt: string;
  state: ShareableState;
}

export function getSavedScenarios(): SavedScenario[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as SavedScenario[];
  } catch {
    return [];
  }
}

export function saveScenario(name: string, state: ShareableState): SavedScenario {
  const scenarios = getSavedScenarios();
  const newScenario: SavedScenario = {
    id: Date.now().toString(),
    name,
    createdAt: new Date().toISOString(),
    state,
  };
  scenarios.push(newScenario);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  return newScenario;
}

export function deleteScenario(id: string): void {
  const scenarios = getSavedScenarios();
  const filtered = scenarios.filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function loadScenario(id: string): ShareableState | null {
  const scenarios = getSavedScenarios();
  const scenario = scenarios.find((s) => s.id === id);
  return scenario?.state ?? null;
}
