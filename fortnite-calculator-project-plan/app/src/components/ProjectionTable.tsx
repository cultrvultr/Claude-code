import type { MonthProjection } from '../types/calculator';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';

interface ProjectionTableProps {
  projections: MonthProjection[];
}

export function ProjectionTable({ projections }: ProjectionTableProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 overflow-hidden">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">36-Month Projection</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Month</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">CCU</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">Change %</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">Earnings (100%)</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">Earnings (Own%)</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">Cumulative</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">Brand Deal</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">Total + Brands</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-200">Earned Back</th>
            </tr>
          </thead>
          <tbody>
            {projections.map((row) => {
              const isEarnedBack = row.earnedBackWithBrands !== null || row.earnedBackNoBrands !== null;
              return (
                <tr
                  key={row.month}
                  className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isEarnedBack ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
                >
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{row.month}</td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{formatNumber(row.ccu)}</td>
                  <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">
                    {formatPercent(row.ccuChangeTotal)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(row.earningsFull)}</td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(row.earningsOwnership)}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">
                    {formatCurrency(row.cumulativeEarningsOwnership)}
                  </td>
                  <td className="px-3 py-2 text-right text-purple-600 dark:text-purple-400">
                    {row.brandDealMonthly > 0 ? formatCurrency(row.brandDealMonthly) : '-'}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-blue-600 dark:text-blue-400">
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
