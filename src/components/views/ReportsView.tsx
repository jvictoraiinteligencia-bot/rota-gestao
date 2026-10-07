import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Truck,
  TrendingUp,
  Receipt,
  Users,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatKm,
  formatDate,
  downloadCSV,
} from '../../utils/formatters';

type ReportTab =
  | 'lucro-placa'
  | 'resultado-filial'
  | 'faturamento-placa'
  | 'despesas-placa'
  | 'faturamento-motorista'
  | 'despesas-categoria'
  | 'viagens-periodo'
  | 'resultado-mensal';

export const ReportsView: React.FC = () => {
  const {
    vehiclesStats,
    driversStats,
    branchesStats,
    expensesByCategory,
    monthlyPerformance,
    filteredTrips,
    kpis,
    navigateToVehicleAnalysis,
  } = useTransport();

  const [activeTab, setActiveTab] = useState<ReportTab>('lucro-placa');

  const reportTabs: Array<{ id: ReportTab; label: string; icon: any }> = [
    { id: 'lucro-placa', label: 'Lucro por Placa', icon: TrendingUp },
    { id: 'resultado-filial', label: 'Resultado por Filial', icon: Building2 },
    { id: 'faturamento-placa', label: 'Faturamento por Placa', icon: Truck },
    { id: 'despesas-placa', label: 'Despesas por Placa', icon: Receipt },
    { id: 'faturamento-motorista', label: 'Faturamento por Motorista', icon: Users },
    { id: 'despesas-categoria', label: 'Despesas por Categoria', icon: Layers },
    { id: 'viagens-periodo', label: 'Viagens por Período', icon: Calendar },
    { id: 'resultado-mensal', label: 'Resultado Mensal Consolidado', icon: FileSpreadsheet },
  ];

  // Export handlers for each specific report
  const handleExport = () => {
    const today = new Date().toISOString().split('T')[0];

    switch (activeTab) {
      case 'lucro-placa': {
        const headers = ['Placa', 'Modelo', 'Vínculo', 'Viagens', 'KM Total', 'Faturamento (R$)', 'Despesas (R$)', 'Lucro Líquido (R$)', 'Margem (%)', 'Lucro/KM'];
        const rows = vehiclesStats.map((s) => [
          s.vehicle.plate,
          s.vehicle.brandModel,
          s.vehicle.ownershipType,
          s.viagens,
          s.km,
          s.faturamento.toFixed(2),
          s.despesas.toFixed(2),
          s.lucro.toFixed(2),
          s.margem.toFixed(2),
          s.lucroPorKm.toFixed(2),
        ]);
        downloadCSV(`relatorio_lucro_por_placa_${today}`, headers, rows);
        break;
      }
      case 'resultado-filial': {
        const headers = ['Filial', 'Código', 'Cidade', 'UF', 'Gerente', 'Veículos', 'Motoristas', 'Viagens', 'KM Total', 'Faturamento (R$)', 'Despesas (R$)', 'Lucro Líquido (R$)', 'Margem (%)'];
        const rows = branchesStats.map((s) => [
          s.branch.name,
          s.branch.code,
          s.branch.city,
          s.branch.state,
          s.branch.manager,
          s.veiculosCount,
          s.motoristasCount,
          s.viagensCount,
          s.kmTotal,
          s.faturamento.toFixed(2),
          s.despesas.toFixed(2),
          s.lucro.toFixed(2),
          s.margem.toFixed(2),
        ]);
        downloadCSV(`relatorio_resultado_filiais_${today}`, headers, rows);
        break;
      }
      case 'faturamento-placa': {
        const headers = ['Placa', 'Modelo', 'Tipo', 'Proprietário', 'Viagens', 'KM', 'Faturamento (R$)', 'R$/KM', 'R$/Viagem'];
        const rows = vehiclesStats.map((s) => [
          s.vehicle.plate,
          s.vehicle.brandModel,
          s.vehicle.vehicleType,
          s.vehicle.owner,
          s.viagens,
          s.km,
          s.faturamento.toFixed(2),
          s.faturamentoPorKm.toFixed(2),
          s.faturamentoMedioViagem.toFixed(2),
        ]);
        downloadCSV(`relatorio_faturamento_por_placa_${today}`, headers, rows);
        break;
      }
      case 'despesas-placa': {
        const headers = ['Placa', 'Modelo', 'Vínculo', 'Total Despesas (R$)', 'KM', 'Custo/KM (R$)'];
        const rows = vehiclesStats.map((s) => [
          s.vehicle.plate,
          s.vehicle.brandModel,
          s.vehicle.ownershipType,
          s.despesas.toFixed(2),
          s.km,
          s.custoPorKm.toFixed(2),
        ]);
        downloadCSV(`relatorio_despesas_por_placa_${today}`, headers, rows);
        break;
      }
      case 'faturamento-motorista': {
        const headers = ['Motorista', 'Vínculo', 'Filial', 'Viagens', 'KM', 'Faturamento (R$)', 'Despesas (R$)', 'Média/Viagem (R$)'];
        const rows = driversStats.map((s) => [
          s.driver.name,
          s.driver.driverType,
          s.driver.branch,
          s.viagens,
          s.km,
          s.faturamento.toFixed(2),
          s.despesas.toFixed(2),
          s.faturamentoMedioViagem.toFixed(2),
        ]);
        downloadCSV(`relatorio_motoristas_${today}`, headers, rows);
        break;
      }
      case 'despesas-categoria': {
        const headers = ['Categoria', 'Qtd Lançamentos', 'Total (R$)', 'Participação (%)'];
        const rows = expensesByCategory.map((c) => [
          c.category,
          c.count,
          c.total.toFixed(2),
          c.percentage.toFixed(2),
        ]);
        downloadCSV(`relatorio_despesas_categoria_${today}`, headers, rows);
        break;
      }
      case 'viagens-periodo': {
        const headers = ['Data', 'Placa', 'Motorista', 'Cliente', 'Origem', 'Destino', 'KM', 'Valor Frete (R$)', 'R$/KM'];
        const rows = filteredTrips.map((t) => [
          t.date,
          t.plate,
          t.driverName,
          t.client,
          t.origin,
          t.destination,
          t.distanceKm,
          t.freightValue.toFixed(2),
          (t.distanceKm > 0 ? t.freightValue / t.distanceKm : 0).toFixed(2),
        ]);
        downloadCSV(`relatorio_viagens_periodo_${today}`, headers, rows);
        break;
      }
      case 'resultado-mensal': {
        const headers = ['Mês', 'Viagens', 'Faturamento (R$)', 'Despesas (R$)', 'Lucro Líquido (R$)', 'Margem (%)'];
        const rows = monthlyPerformance.map((m) => [
          m.monthLabel,
          m.viagens,
          m.faturamento.toFixed(2),
          m.despesas.toFixed(2),
          m.lucro.toFixed(2),
          m.margem.toFixed(2),
        ]);
        downloadCSV(`relatorio_resultado_mensal_${today}`, headers, rows);
        break;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Central de Relatórios Financeiros e Operacionais
          </h3>
          <p className="text-xs text-slate-500">
            Exportação em formato CSV/Excel compatível com planilhas e softwares contábeis
          </p>
        </div>

        <button
          onClick={handleExport}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-xs"
        >
          <Download size={15} />
          <span>Exportar Relatório Atual (Excel / CSV)</span>
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report Content Panels */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {/* TAB 1: Lucro por Placa */}
        {activeTab === 'lucro-placa' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Placa / Veículo</th>
                  <th className="py-3 px-3">Vínculo</th>
                  <th className="py-3 px-3 text-right">Viagens</th>
                  <th className="py-3 px-3 text-right">KM Total</th>
                  <th className="py-3 px-3 text-right">Faturamento</th>
                  <th className="py-3 px-3 text-right">Despesas</th>
                  <th className="py-3 px-3 text-right">Lucro Líquido</th>
                  <th className="py-3 px-3 text-right">Margem %</th>
                  <th className="py-3 px-3 text-right">Lucro / KM</th>
                  <th className="py-3 px-4 text-center">Ver Análise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {vehiclesStats.map((s) => (
                  <tr key={s.vehicle.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {s.vehicle.plate}{' '}
                      <span className="font-sans font-normal text-slate-500 text-[11px] block">
                        {s.vehicle.brandModel}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-700">
                      {s.vehicle.ownershipType}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">{s.viagens}</td>
                    <td className="py-3 px-3 text-right text-slate-700">{formatKm(s.km)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-blue-700">
                      {formatCurrency(s.faturamento)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      {formatCurrency(s.despesas)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-bold text-sm ${
                        s.lucro >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(s.lucro)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-semibold ${
                        s.margem >= 20
                          ? 'text-emerald-700'
                          : s.margem > 0
                          ? 'text-blue-700'
                          : 'text-rose-600'
                      }`}
                    >
                      {formatPercent(s.margem)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {formatCurrency(s.lucroPorKm)}/km
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => navigateToVehicleAnalysis(s.vehicle.id)}
                        className="text-blue-600 hover:text-blue-800 font-sans text-xs font-semibold"
                      >
                        Detalhes →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: Resultado por Filial */}
        {activeTab === 'resultado-filial' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Filial / Unidade</th>
                  <th className="py-3 px-3">Localização</th>
                  <th className="py-3 px-3">Responsável</th>
                  <th className="py-3 px-3 text-center">Veículos</th>
                  <th className="py-3 px-3 text-center">Motoristas</th>
                  <th className="py-3 px-3 text-right">Viagens</th>
                  <th className="py-3 px-3 text-right">KM Total</th>
                  <th className="py-3 px-3 text-right">Faturamento</th>
                  <th className="py-3 px-3 text-right">Despesas</th>
                  <th className="py-3 px-3 text-right">Lucro Líquido</th>
                  <th className="py-3 px-3 text-right">Margem %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {branchesStats.map((s) => (
                  <tr key={s.branch.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900 font-sans">
                      {s.branch.name}{' '}
                      {s.branch.code && (
                        <span className="font-mono text-[10px] text-slate-500 font-normal ml-1">
                          ({s.branch.code})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-700">
                      {s.branch.city} - {s.branch.state}
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-800">
                      {s.branch.manager}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-800 font-semibold">
                      {s.veiculosCount}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-800 font-semibold">
                      {s.motoristasCount}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">{s.viagensCount}</td>
                    <td className="py-3 px-3 text-right text-slate-700">{formatKm(s.kmTotal)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-blue-700">
                      {formatCurrency(s.faturamento)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      {formatCurrency(s.despesas)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-bold text-sm ${
                        s.lucro >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(s.lucro)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-semibold ${
                        s.margem >= 20
                          ? 'text-emerald-700'
                          : s.margem > 0
                          ? 'text-blue-700'
                          : 'text-rose-600'
                      }`}
                    >
                      {formatPercent(s.margem)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Faturamento por Placa */}
        {activeTab === 'faturamento-placa' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Placa</th>
                  <th className="py-3 px-3">Modelo</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3 text-right">Viagens</th>
                  <th className="py-3 px-3 text-right">KM Rodados</th>
                  <th className="py-3 px-3 text-right">Faturamento Total</th>
                  <th className="py-3 px-3 text-right">R$ / KM</th>
                  <th className="py-3 px-3 text-right">R$ / Viagem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {vehiclesStats.map((s) => (
                  <tr key={s.vehicle.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{s.vehicle.plate}</td>
                    <td className="py-3 px-3 font-sans text-slate-700">{s.vehicle.brandModel}</td>
                    <td className="py-3 px-3 font-sans text-slate-600">{s.vehicle.vehicleType}</td>
                    <td className="py-3 px-3 text-right text-slate-800">{s.viagens}</td>
                    <td className="py-3 px-3 text-right text-slate-800">{formatKm(s.km)}</td>
                    <td className="py-3 px-3 text-right font-bold text-blue-700 text-sm">
                      {formatCurrency(s.faturamento)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-800">
                      {formatCurrency(s.faturamentoPorKm)}/km
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {formatCurrency(s.faturamentoMedioViagem)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: Despesas por Placa */}
        {activeTab === 'despesas-placa' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Placa</th>
                  <th className="py-3 px-3">Modelo</th>
                  <th className="py-3 px-3">Vínculo</th>
                  <th className="py-3 px-3 text-right">KM Rodado</th>
                  <th className="py-3 px-3 text-right">Despesas Totais</th>
                  <th className="py-3 px-3 text-right">Custo / KM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {vehiclesStats.map((s) => (
                  <tr key={s.vehicle.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{s.vehicle.plate}</td>
                    <td className="py-3 px-3 font-sans text-slate-700">{s.vehicle.brandModel}</td>
                    <td className="py-3 px-3 font-sans text-slate-600">{s.vehicle.ownershipType}</td>
                    <td className="py-3 px-3 text-right text-slate-800">{formatKm(s.km)}</td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600 text-sm">
                      {formatCurrency(s.despesas)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-800">
                      {formatCurrency(s.custoPorKm)}/km
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: Faturamento por Motorista */}
        {activeTab === 'faturamento-motorista' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Nome do Motorista</th>
                  <th className="py-3 px-3">Vínculo</th>
                  <th className="py-3 px-3">Filial</th>
                  <th className="py-3 px-3 text-right">Viagens</th>
                  <th className="py-3 px-3 text-right">KM Rodados</th>
                  <th className="py-3 px-3 text-right">Faturamento Gerado</th>
                  <th className="py-3 px-3 text-right">Despesas Vinculadas</th>
                  <th className="py-3 px-3 text-right">Média / Viagem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {driversStats.map((s) => (
                  <tr key={s.driver.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-bold text-slate-900">{s.driver.name}</td>
                    <td className="py-3 px-3 font-sans text-slate-600">{s.driver.driverType}</td>
                    <td className="py-3 px-3 font-sans text-slate-600">{s.driver.branch}</td>
                    <td className="py-3 px-3 text-right text-slate-800">{s.viagens}</td>
                    <td className="py-3 px-3 text-right text-slate-800">{formatKm(s.km)}</td>
                    <td className="py-3 px-3 text-right font-bold text-blue-700 text-sm">
                      {formatCurrency(s.faturamento)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      {formatCurrency(s.despesas)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                      {formatCurrency(s.faturamentoMedioViagem)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: Despesas por Categoria */}
        {activeTab === 'despesas-categoria' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Categoria de Custo</th>
                  <th className="py-3 px-3 text-right">Qtd Lançamentos</th>
                  <th className="py-3 px-3 text-right">Total Acumulado (R$)</th>
                  <th className="py-3 px-3 text-right">Participação no Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {expensesByCategory.map((c) => (
                  <tr key={c.category} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-bold text-slate-900">{c.category}</td>
                    <td className="py-3 px-3 text-right text-slate-700">{c.count} lançamentos</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 text-sm">
                      {formatCurrency(c.total)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-blue-700">
                      {formatPercent(c.percentage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: Viagens por Período */}
        {activeTab === 'viagens-periodo' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-3">Placa</th>
                  <th className="py-3 px-3">Motorista</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Trajeto</th>
                  <th className="py-3 px-3 text-right">KM</th>
                  <th className="py-3 px-3 text-right">Valor Frete</th>
                  <th className="py-3 px-3 text-right">R$/KM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredTrips.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-700">{formatDate(t.date)}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{t.plate}</td>
                    <td className="py-3 px-3 font-sans text-slate-700">{t.driverName}</td>
                    <td className="py-3 px-3 font-sans text-slate-800">{t.client}</td>
                    <td className="py-3 px-3 font-sans text-slate-600">
                      {t.origin.split(' - ')[0]} → {t.destination.split(' - ')[0]}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">{formatKm(t.distanceKm)}</td>
                    <td className="py-3 px-3 text-right font-bold text-blue-700">
                      {formatCurrency(t.freightValue)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {formatCurrency(t.distanceKm > 0 ? t.freightValue / t.distanceKm : 0)}/km
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 7: Resultado Mensal Consolidado */}
        {activeTab === 'resultado-mensal' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Competência / Mês</th>
                  <th className="py-3 px-3 text-right">Viagens</th>
                  <th className="py-3 px-3 text-right">Faturamento Bruto</th>
                  <th className="py-3 px-3 text-right">Despesas Operacionais</th>
                  <th className="py-3 px-3 text-right">Lucro Líquido</th>
                  <th className="py-3 px-3 text-right">Margem %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {monthlyPerformance.map((m) => (
                  <tr key={m.monthKey} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-sans text-sm">
                      {m.monthLabel}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">{m.viagens}</td>
                    <td className="py-3 px-3 text-right font-bold text-blue-700 text-sm">
                      {formatCurrency(m.faturamento)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      {formatCurrency(m.despesas)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-bold text-sm ${
                        m.lucro >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(m.lucro)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-semibold ${
                        m.margem >= 20
                          ? 'text-emerald-700'
                          : m.margem > 0
                          ? 'text-blue-700'
                          : 'text-rose-600'
                      }`}
                    >
                      {formatPercent(m.margem)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
