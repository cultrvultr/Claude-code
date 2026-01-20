import type { BrandDeal } from '../types/calculator';
import { formatCurrency } from '../utils/formatters';

interface BrandDealsSectionProps {
  brandDeals: BrandDeal[];
  totalBrandDeals: number;
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<BrandDeal>) => void;
  onRemove: (id: string) => void;
}

export function BrandDealsSection({
  brandDeals,
  totalBrandDeals,
  onAdd,
  onUpdate,
  onRemove,
}: BrandDealsSectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Brand Deals</h2>
        <span className="text-lg font-semibold text-green-600">
          Total: {formatCurrency(totalBrandDeals)}
        </span>
      </div>

      <button
        onClick={onAdd}
        className="w-full mb-4 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition font-medium"
      >
        + Add Brand Deal
      </button>

      <div className="space-y-3">
        {brandDeals.map((deal) => (
          <div
            key={deal.id}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <input
              type="text"
              value={deal.name}
              onChange={(e) => onUpdate(deal.id, { name: e.target.value })}
              className="flex-1 px-2 py-1 border-2 border-blue-300 rounded bg-blue-50 text-sm"
              placeholder="Brand name"
            />
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                value={deal.amount}
                onChange={(e) => onUpdate(deal.id, { amount: parseFloat(e.target.value) || 0 })}
                className="w-24 pl-6 pr-2 py-1 border-2 border-blue-300 rounded bg-blue-50 text-sm"
                placeholder="Amount"
                min={0}
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600">Month:</span>
              <input
                type="number"
                value={deal.month}
                onChange={(e) => onUpdate(deal.id, { month: parseInt(e.target.value) || 1 })}
                className="w-16 px-2 py-1 border-2 border-blue-300 rounded bg-blue-50 text-sm"
                min={1}
                max={36}
              />
            </div>
            <button
              onClick={() => onRemove(deal.id)}
              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
              title="Remove"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {brandDeals.length === 0 && (
          <p className="text-gray-500 text-center py-4">No brand deals added yet</p>
        )}
      </div>
    </div>
  );
}
