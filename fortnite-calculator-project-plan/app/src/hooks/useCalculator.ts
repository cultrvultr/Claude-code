import { useState, useMemo, useEffect } from 'react';
import type { CalculatorInputs, BrandDeal, CalculatorResults } from '../types/calculator';
import { DEFAULT_INPUTS } from '../types/calculator';
import { calculateResults } from '../utils/calculations';
import { getStateFromURL, type ShareableState } from '../utils/export';

const DEFAULT_BRAND_DEALS: BrandDeal[] = [
  { id: '1', name: 'Brand A', amount: 1000, month: 3 },
  { id: '2', name: 'Brand B', amount: 3000, month: 5 },
  { id: '3', name: 'Brand C', amount: 3000, month: 6 },
];

export function useCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS);
  const [brandDeals, setBrandDeals] = useState<BrandDeal[]>(DEFAULT_BRAND_DEALS);
  const [initialized, setInitialized] = useState(false);

  // Load state from URL on mount
  useEffect(() => {
    if (initialized) return;

    const urlState = getStateFromURL();
    if (urlState) {
      setInputs(urlState.inputs);
      setBrandDeals(urlState.brandDeals);
    }
    setInitialized(true);
  }, [initialized]);

  const results: CalculatorResults = useMemo(() => {
    return calculateResults(inputs, brandDeals);
  }, [inputs, brandDeals]);

  const updateInput = <K extends keyof CalculatorInputs>(
    key: K,
    value: CalculatorInputs[K]
  ) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const addBrandDeal = () => {
    const newDeal: BrandDeal = {
      id: Date.now().toString(),
      name: `Brand ${String.fromCharCode(65 + brandDeals.length)}`,
      amount: 0,
      month: 1,
    };
    setBrandDeals(prev => [...prev, newDeal]);
  };

  const updateBrandDeal = (id: string, updates: Partial<BrandDeal>) => {
    setBrandDeals(prev =>
      prev.map(deal => (deal.id === id ? { ...deal, ...updates } : deal))
    );
  };

  const removeBrandDeal = (id: string) => {
    setBrandDeals(prev => prev.filter(deal => deal.id !== id));
  };

  const loadState = (state: ShareableState) => {
    setInputs(state.inputs);
    setBrandDeals(state.brandDeals);
  };

  const resetToDefaults = () => {
    setInputs(DEFAULT_INPUTS);
    setBrandDeals(DEFAULT_BRAND_DEALS);
  };

  return {
    inputs,
    brandDeals,
    results,
    updateInput,
    addBrandDeal,
    updateBrandDeal,
    removeBrandDeal,
    loadState,
    resetToDefaults,
  };
}
