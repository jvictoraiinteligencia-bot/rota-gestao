import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Percent,
  Navigation,
  Gauge,
  ArrowUpRight,
  Truck,
  Award,
} from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { FilterBar } from '../common/FilterBar';
import { MetricCard } from '../common/MetricCard';
import { BarComparisonChart } from '../charts/BarComparisonChart';
import { HorizontalBarChart } from '../charts/HorizontalBarChart';
import { ExpenseBreakdownChart } from '../charts/ExpenseBreakdownChart';
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatKm,
} from '../../utils/formatters';

export const DashboardView: React.FC = () => {
  const {
    kpis,
    monthlyPerformance,
    vehiclesStats,
    expensesByCategory,
    navigateToVehicleAnalysis,
  } = useTransport();

  // Top vehicles by revenue
  const topVehiclesByRevenue = [...vehiclesStats]
    .sort((a, b) => b.faturamento - a.faturamento)
    .map((s) => ({
      id: s.vehicle.id,
      label: s.vehicle.plate,
      subLabel: `${s.vehicle.brandModel} (${s.vehicle.ownershipType})`,
      value: s.faturamento,
    }));

  // Top vehicles by profit
  const topVehiclesByProfit = [...vehiclesStats]
    .sort((a, b) => b.lucro - a.lucro)
    .map((s) => ({
      id: s.vehicle.id,
      label: s.vehicle.plate,
      subLabel: `Margem: ${formatPercent(s.margem)}`,
      value: s.lucro,
      formattedValue: `${formatCurrency(s.lucro)} (${formatPercent(s.margem)})`,
    }));

  // Top vehicles by trip count
  const topVehiclesByTrips = [...vehiclesStats]
    .sort((a, b) => b.viagens - a.viagens)
    .map((s) => ({
      id: s.vehicle.id,
      label: s.vehicle.plate,
      subLabel: `${formatKm(s.km)}`,
      value: s.viagens,
      count: s.viagens,
    }));

  // Best performing vehicle highlight
  const bestVehicle = [...vehiclesStats].sort((a, b) => b.lucro - a.lucro)[0];

  return (
    <div className="space-y-6">
      {/* Global Filter Bar */}
      <FilterBar />

      {/* Primary KPI Cards Grid (8 indicators requested) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Faturamento total */}
        <MetricCard
          label="Faturamento Total"
          value={formatCurrency(kpis.faturamentoTotal)}
          subLabel="receita bruta de fretes"
          variant="primary"
          icon={DollarSign}
        />

        {/* 2. Total de despesas */}
        <MetricCard
          label="Total de Despesas"
          value={formatCurrency(kpis.totalDespesas)}
          subLabel="combustível, manutenção e pedágio"
          variant="danger"
          icon={Receipt}
        />

        {/* 3. Lucro operacional */}
        <MetricCard
          label="Lucro Operacional"
          value={formatCurrency(kpis.lucroOperacional)}
          subValue={kpis.lucroOperacional >= 0 ? '+ Positivo' : '- Prejuízo'}
          subLabel="resultado líquido"
          trend={kpis.lucroOperacional >= 0 ? 'positive' : 'negative'}
          variant={kpis.lucroOperacional >= 0 ? 'success' : 'danger'}
          icon={TrendingUp}
        />

        {/* 4. Margem % */}
        <MetricCard
          label="Margem Operacional %"
          value={formatPercent(kpis.margemPercent)}
          subLabel="lucro / faturamento"
          variant={kpis.margemPercent >= 20 ? 'success' : 'warning'}
          icon={Percent}
        />

        {/* 5. Quantidade de viagens */}
        <MetricCard
          label="Total de Viagens"
          value={`${formatNumber(kpis.quantidadeViagens)}`}
          subLabel={`${formatKm(kpis.kmTotal)} rodados`}
          icon={Navigation}
        />

        {/* 6. Custo por KM */}
        <MetricCard
          label="Custo por KM"
          value={`${formatCurrency(kpis.custoPorKm)}/km`}
          subLabel="gasto médio por quilômetro"
          icon={Gauge}
        />

        {/* 7. Faturamento por KM */}
        <MetricCard
          label="Faturamento por KM"
          value={`${formatCurrency(kpis.faturamentoPorKm)}/km`}
          subLabel="receita média por quilômetro"
          variant="primary"
          icon={ArrowUpRight}
        />

        {/* 8. Faturamento médio por viagem */}
        <MetricCard
          label="Média por Viagem"
          value={formatCurrency(kpis.faturamentoMedioPorViagem)}
          subLabel="ticket médio de frete"
          icon={Truck}
        />
      </div>

      {/* Executive Quick Insight Banner */}
      {bestVehicle && (
        <div className="bg-slate-900 text-white rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/30">
              <Award size={22} />
            </div>
            <div>
              <div className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
                Veículo Mais Rentável no Período
              </div>
              <div className="text-sm sm:text-base font-bold text-white mt-0.5">
                Placa {bestVehicle.vehicle.plate} — {bestVehicle.vehicle.brandModel}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Faturou {formatCurrency(bestVehicle.faturamento)} com lucro líquido de{' '}
                <span className="text-emerald-400 font-semibold font-mono">
                  {formatCurrency(bestVehicle.lucro)}
                </span>{' '}
                ({formatPercent(bestVehicle.margem)} de margem)
              </div>
            </div>
          </div>

          <button
            onClick={() => navigateToVehicleAnalysis(bestVehicle.vehicle.id)}
            className="px-4 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap self-start sm:self-center"
          >
            Ver Análise da Placa {bestVehicle.vehicle.plate} →
          </button>
        </div>
      )}

      {/* Main Charts Section */}
      <div className="space-y-6">
        {/* Chart 1: Faturamento x Despesas por Mês */}
        <BarComparisonChart
          data={monthlyPerformance}
          title="Faturamento x Despesas por Mês (Evolução Operacional)"
        />

        {/* 2-Column Grid: Faturamento por Placa & Lucro por Veículo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HorizontalBarChart
            title="Faturamento por Placa"
            subtitle="Ranking dos veículos que mais geraram receita"
            items={topVehiclesByRevenue}
            valueType="currency"
            barColor="blue"
            onItemClick={(id) => navigateToVehicleAnalysis(id)}
          />

          <HorizontalBarChart
            title="Lucro Líquido por Veículo"
            subtitle="Resultado operacional após dedução de todas as despesas"
            items={topVehiclesByProfit}
            valueType="currency"
            barColor="emerald"
            onItemClick={(id) => navigateToVehicleAnalysis(id)}
          />
        </div>

        {/* 2-Column Grid: Despesas por Tipo & Viagens por Placa */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpenseBreakdownChart
            categories={expensesByCategory}
            totalAmount={kpis.totalDespesas}
          />

          <HorizontalBarChart
            title="Quantidade de Viagens por Placa"
            subtitle="Frequência operacional de fretes por veículo"
            items={topVehiclesByTrips}
            valueType="number"
            barColor="slate"
            onItemClick={(id) => navigateToVehicleAnalysis(id)}
          />
        </div>
      </div>
    </div>
  );
};
