import type { CalculatorResults } from '../types/calculator';
import { formatCurrency } from '../utils/formatters';

interface SummaryMetricsProps {
  results: CalculatorResults;
  investmentSum: number;
}

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  highlight?: boolean;
}

function MetricCard({ label, value, sublabel, highlight }: MetricCardProps) {
  return (
    <div className={`p-4 rounded-lg ${highlight ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50'}`}>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-green-600' : 'text-gray-800'}`}>
        {value}
      </p>
      {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
    </div>
  );
}

export function SummaryMetrics({ results, investmentSum }: SummaryMetricsProps) {
  const formatEarnBack = (months: number | null): string => {
    if (months === null) return 'N/A';
    if (months === Infinity) return 'Never';
    return `${months.toFixed(1)} months`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Summary</h2>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Earn-back Period (Simple)"
          value={formatEarnBack(results.earnBackPeriodSimple)}
          sublabel="Without CCU decay or brand deals"
        />

        <MetricCard
          label="Earn-back Period (Realistic)"
          value={formatEarnBack(results.earnBackPeriodRealistic)}
          sublabel="With CCU decay and brand deals"
          highlight={results.earnBackPeriodRealistic !== null}
        />

        <MetricCard
          label="Monthly Earnings (at ownership)"
          value={formatCurrency(results.monthlyEarningsAtOwnership)}
          sublabel="At starting CCU"
        />

        <MetricCard
          label="Total Brand Deals"
          value={formatCurrency(results.totalBrandDeals)}
        />
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Investment:</strong> {formatCurrency(investmentSum)}
        </p>
      </div>
    </div>
  );
}
