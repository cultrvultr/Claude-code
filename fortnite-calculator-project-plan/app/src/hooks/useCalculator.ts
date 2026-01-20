import { useState, useMemo } from 'react';
import type { CalculatorInputs, BrandDeal, CalculatorResults } from '../types/calculator';
import { DEFAULT_INPUTS } from '../types/calculator';
import { calculateResults } from '../utils/calculations';

export function useCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS);
  const [brandDeals, setBrandDeals] = useState<BrandDeal[]>([
    { id: '1', name: 'Brand A', amount: 1000, month: 3 },
    { id: '2', name: 'Brand B', amount: 3000, month: 5 },
    { id: '3', name: 'Brand C', amount: 3000, month: 6 },
  ]);

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

  return {
    inputs,
    brandDeals,
    results,
    updateInput,
    addBrandDeal,
    updateBrandDeal,
    removeBrandDeal,
  };
}
