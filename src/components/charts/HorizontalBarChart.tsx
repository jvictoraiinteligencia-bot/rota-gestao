import React from 'react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

interface HorizontalBarItem {
  id: string;
  label: string; // e.g. "BRA-2E19"
  subLabel?: string; // e.g. "Volvo FH 540"
  value: number;
  secondaryValue?: number;
  formattedValue?: string;
  count?: number;
}

interface HorizontalBarChartProps {
  title: string;
  subtitle?: string;
  items: HorizontalBarItem[];
  valueType?: 'currency' | 'number';
  barColor?: 'blue' | 'emerald' | 'slate' | 'amber';
  onItemClick?: (id: string) => void;
  emptyMessage?: string;
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  title,
  subtitle,
  items,
  valueType = 'currency',
  barColor = 'blue',
  onItemClick,
  emptyMessage = 'Sem dados para exibir no período selecionado',
}) => {
  const maxValue = Math.max(...items.map((i) => Math.abs(i.value)), 1);

  const getBarBg = (val: number) => {
    if (val < 0) return 'bg-rose-500';
    switch (barColor) {
      case 'emerald':
        return 'bg-emerald-600 hover:bg-emerald-700';
      case 'slate':
        return 'bg-slate-700 hover:bg-slate-800';
      case 'amber':
        return 'bg-amber-600 hover:bg-amber-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
          {items.map((item) => {
            const pct = Math.min((Math.abs(item.value) / maxValue) * 100, 100);
            const isClickable = !!onItemClick;

            return (
              <div
                key={item.id}
                onClick={() => onItemClick && onItemClick(item.id)}
                className={`group ${
                  isClickable ? 'cursor-pointer p-1.5 -mx-1.5 rounded-md hover:bg-slate-50 transition-colors' : ''
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold text-slate-900 font-mono tracking-wide">
                      {item.label}
                    </span>
                    {item.subLabel && (
                      <span className="text-slate-500 text-[11px] truncate hidden sm:inline">
                        {item.subLabel}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0 font-mono font-medium text-slate-800 tabular-nums">
                    {item.formattedValue ||
                      (valueType === 'currency'
                        ? formatCurrency(item.value)
                        : `${formatNumber(item.value)} ${item.count ? 'viagens' : ''}`)}
                  </div>
                </div>

                {/* Progress track */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getBarBg(item.value)}`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
