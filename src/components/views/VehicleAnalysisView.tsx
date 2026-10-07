import React, { useState } from 'react';
import {
  Truck,
  TrendingUp,
  TrendingDown,
  Navigation,
  Receipt,
  DollarSign,
  Fuel,
  Wrench,
  Gauge,
  Percent,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { MetricCard } from '../common/MetricCard';
import { BarComparisonChart } from '../charts/BarComparisonChart';
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatKm,
  formatDate,
  formatMonthLabel,
  getRecentMonthKeys,
} from '../../utils/formatters';

export const VehicleAnalysisView: React.FC = () => {
  const {
    vehicles,
    trips,
    expenses,
    selectedVehicleIdForAnalysis,
    setSelectedVehicleIdForAnalysis,
  } = useTransport();

  const [periodSelection, setPeriodSelection] = useState<string>('all');
  const periodMonthOptions = getRecentMonthKeys(3).reverse();

  // Currently selected vehicle
  const currentVehicle =
    vehicles.find((v) => v.id === selectedVehicleIdForAnalysis) || vehicles[0];

  if (!currentVehicle) {
    return (
      <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-slate-500 text-xs">
        Nenhum veículo cadastrado no sistema.
      </div>
    );
  }

  // Filter trips and expenses for this vehicle
  const vehicleTrips = trips.filter((t) => {
    const match =
      t.vehicleId === currentVehicle.id ||
      t.plate.toUpperCase() === currentVehicle.plate.toUpperCase();
    if (!match) return false;
    if (periodSelection !== 'all' && !t.date.startsWith(periodSelection)) return false;
    return true;
  });

  const vehicleExpenses = expenses.filter((e) => {
    const match =
      e.vehicleId === currentVehicle.id ||
      e.plate.toUpperCase() === currentVehicle.plate.toUpperCase();
    if (!match) return false;
    if (periodSelection !== 'all' && !e.date.startsWith(periodSelection)) return false;
    return true;
  });

  // FATURAMENTO
  const totalFretes = vehicleTrips.reduce((acc, t) => acc + (t.freightValue || 0), 0);
  const quantidadeViagens = vehicleTrips.reduce((acc, t) => acc + (t.tripCount || 1), 0);
  const kmRodado = vehicleTrips.reduce((acc, t) => acc + (t.distanceKm || 0), 0);
  const faturamentoMedioPorViagem = quantidadeViagens > 0 ? totalFretes / quantidadeViagens : 0;
  const faturamentoPorKm = kmRodado > 0 ? totalFretes / kmRodado : 0;

  // CUSTOS
  const custoCombustivel = vehicleExpenses
    .filter((e) => e.category === 'Combustível')
    .reduce((acc, e) => acc + e.amount, 0);

  const custoManutencao = vehicleExpenses
    .filter((e) => e.category === 'Manutenção')
    .reduce((acc, e) => acc + e.amount, 0);

  const custoPecas = vehicleExpenses
    .filter((e) => e.category === 'Peças')
    .reduce((acc, e) => acc + e.amount, 0);

  const custoPneus = vehicleExpenses
    .filter((e) => e.category === 'Pneus')
    .reduce((acc, e) => acc + e.amount, 0);

  const custoPedagio = vehicleExpenses
    .filter((e) => e.category === 'Pedágio')
    .reduce((acc, e) => acc + e.amount, 0);

  const outrosCustos = vehicleExpenses
    .filter(
      (e) =>
        !['Combustível', 'Manutenção', 'Peças', 'Pneus', 'Pedágio'].includes(e.category)
    )
    .reduce((acc, e) => acc + e.amount, 0);

  const custoTotal = vehicleExpenses.reduce((acc, e) => acc + e.amount, 0);

  // RESULTADO
  const lucro = totalFretes - custoTotal;
  const margemPercent = totalFretes > 0 ? (lucro / totalFretes) * 100 : 0;
  const custoPorKm = kmRodado > 0 ? custoTotal / kmRodado : 0;
  const lucroPorKm = kmRodado > 0 ? lucro / kmRodado : 0;

  // Monthly progression chart specifically for this vehicle
  const months = getRecentMonthKeys(5);

  const vehicleMonthlyData = months.map((m) => {
    const mTrips = trips.filter(
      (t) =>
        (t.vehicleId === currentVehicle.id || t.plate.toUpperCase() === currentVehicle.plate.toUpperCase()) &&
        t.date.startsWith(m)
    );
    const mExp = expenses.filter(
      (e) =>
        (e.vehicleId === currentVehicle.id || e.plate.toUpperCase() === currentVehicle.plate.toUpperCase()) &&
        e.date.startsWith(m)
    );

    const fat = mTrips.reduce((acc, t) => acc + (t.freightValue || 0), 0);
    const desp = mExp.reduce((acc, e) => acc + (e.amount || 0), 0);
    const luc = fat - desp;
    const mg = fat > 0 ? (luc / fat) * 100 : 0;
    const vgs = mTrips.reduce((acc, t) => acc + (t.tripCount || 1), 0);

    return {
      monthKey: m,
      monthLabel: formatMonthLabel(m, 'short'),
      faturamento: fat,
      despesas: desp,
      lucro: luc,
      margem: mg,
      viagens: vgs,
    };
  });

  return (
    <div className="space-y-6">
      {/* Vehicle Selector Banner */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-base shadow-xs shrink-0">
            {currentVehicle.plate.slice(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-xl text-slate-900 tracking-wide">
                {currentVehicle.plate}
              </span>
              <span className="text-xs text-slate-500 font-medium">·</span>
              <span className="text-xs font-semibold text-slate-700">
                {currentVehicle.brandModel} ({currentVehicle.year})
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                  currentVehicle.status === 'Ativo'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {currentVehicle.status}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span>{currentVehicle.vehicleType}</span>
              <span>·</span>
              <span>Vínculo: <strong>{currentVehicle.ownershipType}</strong></span>
              <span>·</span>
              <span>Proprietário: {currentVehicle.owner}</span>
              <span>·</span>
              <span>{currentVehicle.branch}</span>
            </div>
          </div>
        </div>

        {/* Plate Selector Dropdown & Period */}
        <div className="flex items-center gap-3 self-start md:self-center flex-wrap">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
              Trocar Veículo:
            </label>
            <select
              value={currentVehicle.id}
              onChange={(e) => setSelectedVehicleIdForAnalysis(e.target.value)}
              className="text-xs border border-slate-300 rounded-md px-3 py-1.5 bg-white font-mono font-bold text-slate-900 focus:outline-blue-600 shadow-xs"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} - {v.brandModel} ({v.ownershipType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
              Filtro de Período:
            </label>
            <select
              value={periodSelection}
              onChange={(e) => setPeriodSelection(e.target.value)}
              className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-800 focus:outline-blue-600"
            >
              <option value="all">Todo o Histórico</option>
              {periodMonthOptions.map((m, index) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m, 'full')}
                  {index === 0 ? ' (Atual)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3 Principal Sections: FATURAMENTO, CUSTOS, RESULTADO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* BLOCO 1: FATURAMENTO */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col justify-between border-t-4 border-t-blue-600">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                <DollarSign size={15} />
                FATURAMENTO
              </h3>
              <span className="text-xs font-mono font-semibold text-slate-500">
                {quantidadeViagens} viagens
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600">Total de Fretes:</span>
                <span className="font-mono font-bold text-blue-700 text-sm tabular-nums">
                  {formatCurrency(totalFretes)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600">Quantidade de Viagens:</span>
                <span className="font-mono font-semibold text-slate-800 tabular-nums">
                  {formatNumber(quantidadeViagens)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600">Quilometragem Rodada:</span>
                <span className="font-mono font-semibold text-slate-800 tabular-nums">
                  {formatKm(kmRodado)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600">Faturamento Médio / Viagem:</span>
                <span className="font-mono font-semibold text-slate-800 tabular-nums">
                  {formatCurrency(faturamentoMedioPorViagem)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Faturamento por KM:</span>
                <span className="font-mono font-bold text-blue-800 tabular-nums">
                  {formatCurrency(faturamentoPorKm)}/km
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 bg-blue-50/60 p-2.5 rounded text-xs text-blue-900">
            Média de <strong>{formatKm(quantidadeViagens > 0 ? kmRodado / quantidadeViagens : 0)}</strong> por rota realizada
          </div>
        </div>

        {/* BLOCO 2: CUSTOS */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col justify-between border-t-4 border-t-rose-500">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                <Receipt size={15} />
                CUSTOS OPERACIONAIS
              </h3>
              <span className="text-xs font-mono font-semibold text-slate-500">
                {vehicleExpenses.length} custos
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600 flex items-center gap-1">
                  <Fuel size={12} className="text-blue-500" />
                  Combustível (Diesel):
                </span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(custoCombustivel)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600 flex items-center gap-1">
                  <Wrench size={12} className="text-amber-500" />
                  Manutenção:
                </span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(custoManutencao)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600">Peças de Reposição:</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(custoPecas)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600">Pneus e Recapagens:</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(custoPneus)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600">Pedágios / Tags:</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(custoPedagio)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Outros Custos (Seguro, Doc, Lavagem):</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(outrosCustos)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-900 uppercase">Custo Total:</span>
            <span className="font-mono font-bold text-rose-600 text-sm tabular-nums">
              {formatCurrency(custoTotal)}
            </span>
          </div>
        </div>

        {/* BLOCO 3: RESULTADO */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col justify-between border-t-4 border-t-emerald-600">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <TrendingUp size={15} />
                RESULTADO DO VEÍCULO
              </h3>
              <span
                className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                  lucro >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {lucro >= 0 ? 'LUCRO' : 'PREJUÍZO'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600">Faturamento Bruto:</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(totalFretes)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600">Custo Total Deduzido:</span>
                <span className="font-mono font-semibold text-rose-600 tabular-nums">
                  - {formatCurrency(custoTotal)}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 bg-slate-50 px-2 rounded">
                <span className="text-slate-900 font-bold">LUCRO LÍQUIDO:</span>
                <span
                  className={`font-mono font-bold text-base tabular-nums ${
                    lucro >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {formatCurrency(lucro)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600">Margem Operacional %:</span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    margemPercent >= 20
                      ? 'text-emerald-700'
                      : margemPercent > 0
                      ? 'text-blue-700'
                      : 'text-rose-600'
                  }`}
                >
                  {formatPercent(margemPercent)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Custo por KM Rodado:</span>
                <span className="font-mono font-bold text-slate-800 tabular-nums">
                  {formatCurrency(custoPorKm)}/km
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs flex justify-between items-center text-slate-500">
            <span>Resultado por KM:</span>
            <span
              className={`font-mono font-bold ${
                lucroPorKm >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {formatCurrency(lucroPorKm)}/km
            </span>
          </div>
        </div>
      </div>

      {/* Gráfico Mensal Específico da Placa */}
      <BarComparisonChart
        data={vehicleMonthlyData}
        title={`Evolução Mensal da Placa ${currentVehicle.plate} (Faturamento x Custos x Lucro)`}
      />

      {/* 2 Tabs/Tables: Viagens Recentes deste Veículo & Despesas deste Veículo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Viagens deste Veículo */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Viagens Deste Veículo ({vehicleTrips.length})
            </h4>
            <span className="text-xs font-mono font-semibold text-blue-700">
              {formatCurrency(totalFretes)}
            </span>
          </div>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Data</th>
                  <th className="py-2 px-3">Rota</th>
                  <th className="py-2 px-3">Motorista</th>
                  <th className="py-2 px-3 text-right">KM</th>
                  <th className="py-2 px-3 text-right">Frete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicleTrips.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Nenhuma viagem para este caminhão no período.
                    </td>
                  </tr>
                ) : (
                  vehicleTrips.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 font-mono">
                      <td className="py-2.5 px-3 text-slate-700">{formatDate(t.date)}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-800 truncate max-w-[150px]">
                        {t.origin.split(' - ')[0]} → {t.destination.split(' - ')[0]}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600 truncate max-w-[120px]">
                        {t.driverName}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {formatKm(t.distanceKm)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                        {formatCurrency(t.freightValue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Despesas deste Veículo */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Despesas Deste Veículo ({vehicleExpenses.length})
            </h4>
            <span className="text-xs font-mono font-semibold text-rose-600">
              {formatCurrency(custoTotal)}
            </span>
          </div>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Data</th>
                  <th className="py-2 px-3">Categoria</th>
                  <th className="py-2 px-3">Descrição</th>
                  <th className="py-2 px-3">Fornecedor</th>
                  <th className="py-2 px-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicleExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Nenhuma despesa lançada para este veículo no período.
                    </td>
                  </tr>
                ) : (
                  vehicleExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 font-mono">
                      <td className="py-2.5 px-3 text-slate-700">{formatDate(e.date)}</td>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                        {e.category}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600 truncate max-w-[150px]">
                        {e.description}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-500 truncate max-w-[120px]">
                        {e.supplier}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(e.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
