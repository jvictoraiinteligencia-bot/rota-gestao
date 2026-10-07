import React from 'react';
import { ExpenseCategory } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface ExpenseBreakdownChartProps {
  categories: Array<{
    category: ExpenseCategory;
    total: number;
    percentage: number;
    count: number;
  }>;
  totalAmount: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Combustível: '#2563eb', // blue
  Manutenção: '#d97706', // amber
  Peças: '#ea580c', // orange
  Pneus: '#475569', // slate
  'Óleo/Lubrificantes': '#0891b2', // cyan
  Pedágio: '#059669', // emerald
  Lavagem: '#0284c7', // sky
  Seguro: '#4f46e5', // indigo
  Documentação: '#7c3aed', // violet
  Multas: '#e11d48', // rose
  Outros: '#64748b', // cool slate
};

export const ExpenseBreakdownChart: React.FC<ExpenseBreakdownChartProps> = ({
  categories,
  totalAmount,
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Despesas por Categoria</h3>
          <p className="text-xs text-slate-500">Distribuição percentual dos custos operacionais</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 block">Total Despesas</span>
          <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400">
          Nenhuma despesa registrada para o filtro atual.
        </div>
      ) : (
        <>
          {/* Segmented Color Bar */}
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 mb-5">
            {categories.map((cat) => (
              <div
                key={cat.category}
                style={{
                  width: `${cat.percentage}%`,
                  backgroundColor: CATEGORY_COLORS[cat.category] || '#94a3b8',
                }}
                title={`${cat.category}: ${formatPercent(cat.percentage)} (${formatCurrency(cat.total)})`}
              />
            ))}
          </div>

          {/* List of items */}
          <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
            {categories.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#94a3b8' }}
                  />
                  <span className="font-medium text-slate-800">{cat.category}</span>
                  <span className="text-slate-400 text-[11px]">({cat.count} lanç.)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-600 tabular-nums">
                    {formatPercent(cat.percentage)}
                  </span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums w-24 text-right">
                    {formatCurrency(cat.total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
