import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  subLabel?: string;
  trend?: 'positive' | 'negative' | 'neutral';
  icon?: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  subLabel,
  trend = 'neutral',
  icon: Icon,
  variant = 'default',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'border-l-4 border-l-blue-600 bg-white';
      case 'success':
        return 'border-l-4 border-l-emerald-600 bg-white';
      case 'danger':
        return 'border-l-4 border-l-rose-500 bg-white';
      case 'warning':
        return 'border-l-4 border-l-amber-500 bg-white';
      default:
        return 'border-l-4 border-l-slate-300 bg-white';
    }
  };

  const getTrendColor = () => {
    if (trend === 'positive') return 'text-emerald-700 font-medium';
    if (trend === 'negative') return 'text-rose-700 font-medium';
    return 'text-slate-500';
  };

  return (
    <div
      className={`rounded-lg border border-slate-200 p-4 shadow-xs transition-shadow hover:shadow-sm ${getVariantStyles()}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <span className="p-1.5 rounded-md bg-slate-100 text-slate-600">
            <Icon size={16} />
          </span>
        )}
      </div>

      <div className="mt-1">
        <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
          {value}
        </span>
      </div>

      {(subValue || subLabel) && (
        <div className="mt-2 text-xs flex items-center gap-1.5 pt-2 border-t border-slate-100">
          {subValue && <span className={getTrendColor()}>{subValue}</span>}
          {subLabel && <span className="text-slate-500">{subLabel}</span>}
        </div>
      )}
    </div>
  );
};
