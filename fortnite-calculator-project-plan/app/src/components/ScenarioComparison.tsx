import { useState } from 'react';
import type { CalculatorInputs, BrandDeal, CalculatorResults } from '../types/calculator';
import { calculateResults } from '../utils/calculations';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface Scenario {
  id: string;
  name: string;
  inputs: CalculatorInputs;
  brandDeals: BrandDeal[];
  results: CalculatorResults;
}

interface ScenarioComparisonProps {
  currentInputs: CalculatorInputs;
  currentBrandDeals: BrandDeal[];
  currentResults: CalculatorResults;
}

export function ScenarioComparison({
  currentInputs,
  currentBrandDeals,
  currentResults,
}: ScenarioComparisonProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addCurrentAsScenario = () => {
    const newScenario: Scenario = {
      id: Date.now().toString(),
      name: `Scenario ${scenarios.length + 1}`,
      inputs: { ...currentInputs },
      brandDeals: [...currentBrandDeals],
      results: calculateResults(currentInputs, currentBrandDeals),
    };
    setScenarios((prev) => [...prev, newScenario]);
  };

  const removeScenario = (id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  };

  const updateScenarioName = (id: string, name: string) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name } : s))
    );
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Compare Scenarios
      </button>
    );
  }

  const allScenarios: Scenario[] = [
    {
      id: 'current',
      name: 'Current',
      inputs: currentInputs,
      brandDeals: currentBrandDeals,
      results: currentResults,
    },
    ...scenarios,
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Scenario Comparison</h2>
        <div className="flex gap-2">
          <button
            onClick={addCurrentAsScenario}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition"
          >
            + Add Current as Scenario
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>

      {allScenarios.length === 1 && scenarios.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          Click "Add Current as Scenario" to save the current configuration for comparison.
          <br />
          Modify inputs and add more scenarios to compare different investment options.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Metric</th>
                {allScenarios.map((scenario) => (
                  <th key={scenario.id} className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200 min-w-[150px]">
                    {scenario.id === 'current' ? (
                      <span className="text-indigo-600 dark:text-indigo-400">Current</span>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="text"
                          value={scenario.name}
                          onChange={(e) => updateScenarioName(scenario.id, e.target.value)}
                          className="w-24 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                        />
                        <button
                          onClick={() => removeScenario(scenario.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <tr className="bg-gray-50 dark:bg-gray-750">
                <td colSpan={allScenarios.length + 1} className="px-4 py-2 font-semibold text-gray-600 dark:text-gray-300">
                  Investment Parameters
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Investment</td>
                {allScenarios.map((s) => (
                  <td key={s.id} className="px-4 py-2 text-center dark:text-gray-200">{formatCurrency(s.inputs.investmentSum)}</td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Ownership</td>
                {allScenarios.map((s) => (
                  <td key={s.id} className="px-4 py-2 text-center dark:text-gray-200">{s.inputs.ownershipPercent}%</td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Starting CCU</td>
                {allScenarios.map((s) => (
                  <td key={s.id} className="px-4 py-2 text-center dark:text-gray-200">{s.inputs.startingCCU.toLocaleString()}</td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">CCU Decay</td>
                {allScenarios.map((s) => (
                  <td key={s.id} className="px-4 py-2 text-center dark:text-gray-200">{formatPercent(s.inputs.ccuDecayRate)}</td>
                ))}
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-750">
                <td colSpan={allScenarios.length + 1} className="px-4 py-2 font-semibold text-gray-600 dark:text-gray-300">
                  Results
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Earn-back (Simple)</td>
                {allScenarios.map((s) => (
                  <td key={s.id} className="px-4 py-2 text-center dark:text-gray-200">
                    {s.results.earnBackPeriodSimple === Infinity ? 'Never' : `${s.results.earnBackPeriodSimple.toFixed(1)} mo`}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Earn-back (Realistic)</td>
                {allScenarios.map((s) => {
                  const val = s.results.earnBackPeriodRealistic;
                  const isBest = val !== null && allScenarios.every(
                    (other) => other.results.earnBackPeriodRealistic === null || val <= other.results.earnBackPeriodRealistic
                  );
                  return (
                    <td
                      key={s.id}
                      className={`px-4 py-2 text-center font-medium ${isBest && scenarios.length > 0 ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'dark:text-gray-200'}`}
                    >
                      {val === null ? 'N/A' : `${val} mo`}
                      {isBest && scenarios.length > 0 && ' ✓'}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Monthly Earnings</td>
                {allScenarios.map((s) => (
                  <td key={s.id} className="px-4 py-2 text-center dark:text-gray-200">{formatCurrency(s.results.monthlyEarningsAtOwnership)}</td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Brand Deals</td>
                {allScenarios.map((s) => (
                  <td key={s.id} className="px-4 py-2 text-center dark:text-gray-200">{formatCurrency(s.results.totalBrandDeals)}</td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">12-Month Earnings</td>
                {allScenarios.map((s) => {
                  const month12 = s.results.projections.find((p) => p.month === 12);
                  return (
                    <td key={s.id} className="px-4 py-2 text-center dark:text-gray-200">
                      {month12 ? formatCurrency(month12.earningsWithBrands) : 'N/A'}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">36-Month Earnings</td>
                {allScenarios.map((s) => {
                  const month36 = s.results.projections.find((p) => p.month === 36);
                  const isBest = month36 && allScenarios.every((other) => {
                    const other36 = other.results.projections.find((p) => p.month === 36);
                    return !other36 || month36.earningsWithBrands >= other36.earningsWithBrands;
                  });
                  return (
                    <td
                      key={s.id}
                      className={`px-4 py-2 text-center font-medium ${isBest && scenarios.length > 0 ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'dark:text-gray-200'}`}
                    >
                      {month36 ? formatCurrency(month36.earningsWithBrands) : 'N/A'}
                      {isBest && scenarios.length > 0 && ' ✓'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
