import React from 'react';
import { X, User, Phone, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import {
  CNH_EXPIRY_ALERT_DAYS,
  formatCurrency,
  formatCpf,
  formatDate,
  formatKm,
  getISODateDaysFromNow,
} from '../../utils/formatters';

interface DriverDetailModalProps {
  driverId: string | null;
  onClose: () => void;
}

export const DriverDetailModal: React.FC<DriverDetailModalProps> = ({
  driverId,
  onClose,
}) => {
  const { drivers, driversStats, trips, expenses } = useTransport();

  if (!driverId) return null;

  const driver = drivers.find((d) => d.id === driverId);
  const stats = driversStats.find((s) => s.driver.id === driverId);

  if (!driver || !stats) return null;

  const driverTrips = trips.filter((t) => t.driverId === driver.id);
  const driverExpenses = expenses.filter((e) => e.driverId === driver.id);

  const isExpiringSoon = driver.cnhExpiry <= getISODateDaysFromNow(CNH_EXPIRY_ALERT_DAYS);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              {driver.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{driver.name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{driver.driverType}</span>
                <span>·</span>
                <span>{driver.branch}</span>
                <span>·</span>
                <span className={driver.status === 'Ativo' ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                  {driver.status}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Driver Document info row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">CPF:</span>
              <span className="font-mono font-medium text-slate-800">
                {formatCpf(driver.cpf)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Telefone:</span>
              <span className="font-medium text-slate-800">{driver.phone || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">CNH (Cat. {driver.cnhCategory}):</span>
              <span className="font-mono font-medium text-slate-800">{driver.cnh}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Validade CNH:</span>
              <span className={`font-mono font-semibold ${isExpiringSoon ? 'text-rose-600 flex items-center gap-1' : 'text-slate-800'}`}>
                {isExpiringSoon && <AlertCircle size={12} />}
                {formatDate(driver.cnhExpiry)}
              </span>
            </div>
          </div>

          {/* Key Metrics requested by user */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Viagens
              </span>
              <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                {stats.viagens}
              </div>
              <span className="text-[11px] text-slate-400">{formatKm(stats.km)} rodados</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg border-l-4 border-l-blue-600">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Faturamento
              </span>
              <div className="text-lg font-bold text-blue-700 font-mono mt-1">
                {formatCurrency(stats.faturamento)}
              </div>
              <span className="text-[11px] text-slate-400">Total gerado</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg border-l-4 border-l-slate-400">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Despesas
              </span>
              <div className="text-lg font-bold text-slate-700 font-mono mt-1">
                {formatCurrency(stats.despesas)}
              </div>
              <span className="text-[11px] text-slate-400">Custos diretos</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg border-l-4 border-l-emerald-600">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Média / Viagem
              </span>
              <div className="text-lg font-bold text-emerald-700 font-mono mt-1">
                {formatCurrency(stats.faturamentoMedioViagem)}
              </div>
              <span className="text-[11px] text-slate-400">Receita média</span>
            </div>
          </div>

          {/* Notes if any */}
          {driver.notes && (
            <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-lg text-xs text-amber-900">
              <span className="font-semibold">Observações: </span>
              {driver.notes}
            </div>
          )}

          {/* Recent Trips table */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Histórico Recente de Viagens ({driverTrips.length})
            </h4>
            {driverTrips.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3">
                Nenhuma viagem registrada para este condutor.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-56">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">Placa</th>
                      <th className="py-2 px-3">Rota</th>
                      <th className="py-2 px-3">Cliente</th>
                      <th className="py-2 px-3 text-right">Frete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {driverTrips.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 text-slate-700">{formatDate(t.date)}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{t.plate}</td>
                        <td className="py-2 px-3 font-sans text-slate-700">
                          {t.origin.split(' - ')[0]} → {t.destination.split(' - ')[0]}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-600">{t.client}</td>
                        <td className="py-2 px-3 text-right font-bold text-blue-700">
                          {formatCurrency(t.freightValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
