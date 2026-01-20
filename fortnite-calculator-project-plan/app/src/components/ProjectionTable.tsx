import type { MonthProjection } from '../types/calculator';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';

interface ProjectionTableProps {
  projections: MonthProjection[];
}

export function ProjectionTable({ projections }: ProjectionTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 overflow-hidden">
      <h2 className="text-xl font-bold text-gray-800 mb-4">36-Month Projection</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Month</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">CCU</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Change %</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Earnings (100%)</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Earnings (Own%)</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Cumulative</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Brand Deal</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Total + Brands</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700">Earned Back</th>
            </tr>
          </thead>
          <tbody>
            {projections.map((row) => {
              const isEarnedBack = row.earnedBackWithBrands !== null || row.earnedBackNoBrands !== null;
              return (
                <tr
                  key={row.month}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${isEarnedBack ? 'bg-green-50' : ''}`}
                >
                  <td className="px-3 py-2 font-medium">{row.month}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(row.ccu)}</td>
                  <td className="px-3 py-2 text-right text-red-600">
                    {formatPercent(row.ccuChangeTotal)}
                  </td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.earningsFull)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.earningsOwnership)}</td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatCurrency(row.cumulativeEarningsOwnership)}
                  </td>
                  <td className="px-3 py-2 text-right text-purple-600">
                    {row.brandDealMonthly > 0 ? formatCurrency(row.brandDealMonthly) : '-'}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-blue-600">
                    {formatCurrency(row.earningsWithBrands)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {row.earnedBackWithBrands && (
                      <span className="inline-block px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                        {row.earnedBackWithBrands}
                      </span>
                    )}
                    {row.earnedBackNoBrands && !row.earnedBackWithBrands && (
                      <span className="inline-block px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                        {row.earnedBackNoBrands}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
