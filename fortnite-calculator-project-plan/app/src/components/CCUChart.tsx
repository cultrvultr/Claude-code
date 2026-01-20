import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { MonthProjection } from '../types/calculator';
import { formatNumber } from '../utils/formatters';

interface CCUChartProps {
  projections: MonthProjection[];
  startingCCU: number;
  ccuFloor: number;
}

export function CCUChart({ projections, startingCCU, ccuFloor }: CCUChartProps) {
  const data = projections.map((p) => ({
    month: p.month,
    CCU: p.ccu,
  }));

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">CCU Decay Over Time</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="ccuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              label={{ value: 'Month', position: 'insideBottom', offset: -5 }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={[0, 'auto']}
              tickFormatter={(value) => formatNumber(value)}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => [formatNumber(value as number), 'CCU']}
              labelFormatter={(label) => `Month ${label}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <ReferenceLine
              y={startingCCU}
              stroke="#3b82f6"
              strokeDasharray="5 5"
              label={{
                value: `Start: ${formatNumber(startingCCU)}`,
                position: 'right',
                fill: '#3b82f6',
                fontSize: 11,
              }}
            />
            <ReferenceLine
              y={ccuFloor}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={{
                value: `Floor: ${formatNumber(ccuFloor)}`,
                position: 'right',
                fill: '#f59e0b',
                fontSize: 11,
              }}
            />
            <Area
              type="monotone"
              dataKey="CCU"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#ccuGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-purple-500 rounded opacity-60"></div>
          <span className="text-gray-600">Concurrent Users</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-dashed border-t-2 border-amber-500"></div>
          <span className="text-gray-600">CCU Floor</span>
        </div>
      </div>
    </div>
  );
}
