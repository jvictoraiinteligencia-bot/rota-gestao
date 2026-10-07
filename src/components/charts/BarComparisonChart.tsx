import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

interface MonthlyDataPoint {
  monthKey: string;
  monthLabel: string;
  faturamento: number;
  despesas: number;
  lucro: number;
  margem: number;
  viagens: number;
}

interface BarComparisonChartProps {
  data: MonthlyDataPoint[];
  title?: string;
}

export const BarComparisonChart: React.FC<BarComparisonChartProps> = ({
  data,
  title = 'Faturamento x Despesas por Mês',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.faturamento, d.despesas)),
    10000
  );

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">
            Comparativo operacional mensal com receita, custos e margem
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
            <span className="text-slate-700">Faturamento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-slate-400 inline-block" />
            <span className="text-slate-700">Despesas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
            <span className="text-slate-700">Lucro</span>
          </div>
        </div>
      </div>

      {/* SVG Chart area */}
      <div className="relative h-64 w-full flex items-end gap-3 sm:gap-6 pt-6 pb-6 px-2 border-b border-slate-100">
        {/* Horizontal grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
          <div className="border-b border-dashed border-slate-200 w-full" />
          <div className="border-b border-dashed border-slate-200 w-full" />
          <div className="border-b border-dashed border-slate-200 w-full" />
          <div className="border-b border-dashed border-slate-200 w-full" />
        </div>

        {data.map((item, index) => {
          const fatHeight = Math.max((item.faturamento / maxVal) * 100, 4);
          const despHeight = Math.max((item.despesas / maxVal) * 100, 4);
          const lucroHeight = Math.max((Math.max(item.lucro, 0) / maxVal) * 100, 2);
          const isHovered = hoveredIndex === index;

          return (
            <div
              key={item.monthKey}
              className="relative flex-1 h-full flex items-end justify-center group cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full max-w-[80px]">
                {/* Faturamento Bar */}
                <div
                  className="w-1/3 bg-blue-600 rounded-t transition-all group-hover:bg-blue-700"
                  style={{ height: `${fatHeight}%` }}
                />

                {/* Despesas Bar */}
                <div
                  className="w-1/3 bg-slate-400 rounded-t transition-all group-hover:bg-slate-500"
                  style={{ height: `${despHeight}%` }}
                />

                {/* Lucro Bar */}
                <div
                  className="w-1/3 bg-emerald-500 rounded-t transition-all group-hover:bg-emerald-600"
                  style={{ height: `${lucroHeight}%` }}
                />
              </div>

              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-full mb-3 z-30 bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs min-w-[180px] pointer-events-none">
                  <div className="font-semibold text-slate-100 pb-1 mb-1.5 border-b border-slate-800 flex justify-between">
                    <span>{item.monthLabel}</span>
                    <span className="text-slate-400">{item.viagens} viagens</span>
                  </div>
                  <div className="space-y-1 font-mono">
                    <div className="flex justify-between text-blue-300">
                      <span>Faturamento:</span>
                      <span>{formatCurrency(item.faturamento)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Despesas:</span>
                      <span>{formatCurrency(item.despesas)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-semibold pt-1 border-t border-slate-800">
                      <span>Lucro:</span>
                      <span>{formatCurrency(item.lucro)}</span>
                    </div>
                    <div className="text-right text-[11px] text-slate-400 font-sans">
                      Margem: {item.margem.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Month Labels */}
      <div className="flex justify-between gap-3 sm:gap-6 px-2 pt-2 text-xs font-medium text-slate-600">
        {data.map((item) => (
          <div key={item.monthKey} className="flex-1 text-center">
            {item.monthLabel}
          </div>
        ))}
      </div>
    </div>
  );
};
