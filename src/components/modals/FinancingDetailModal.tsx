import React, { useEffect, useMemo, useState } from 'react';
import { X, Landmark, Truck, CalendarClock, Plus, Edit2, AlertCircle, ListChecks, Info } from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { useFinancing } from '../../context/FinancingContext';
import { FinancingInstallmentStatus, FinancingStatus } from '../../types';
import {
  buildInstallmentSchedule,
  findOverlappingLink,
  isLinkActiveOn,
  isValidISODate,
} from '../../utils/financing';
import { formatCurrency, formatDate, formatMonthLabel, formatNumber, getTodayISO } from '../../utils/formatters';
import { InstallmentAllocation } from '../../utils/financingAllocation';

interface FinancingDetailModalProps {
  financingId: string | null;
  onClose: () => void;
  onEdit: (financingId: string) => void;
}

export const FINANCING_STATUS_STYLES: Record<FinancingStatus, { badge: string; dot: string }> = {
  Ativo: { badge: 'text-emerald-700 bg-emerald-50', dot: 'bg-emerald-600' },
  Quitado: { badge: 'text-blue-700 bg-blue-50', dot: 'bg-blue-600' },
  Cancelado: { badge: 'text-slate-500 bg-slate-100', dot: 'bg-slate-400' },
};

const INSTALLMENT_STATUS_STYLES: Record<FinancingInstallmentStatus, string> = {
  Aberta: 'text-amber-700 bg-amber-50',
  Paga: 'text-emerald-700 bg-emerald-50',
  Cancelada: 'text-slate-500 bg-slate-100',
};

const AllocationCell: React.FC<{ allocation?: InstallmentAllocation; plateOf: (vehicleId: string) => string }> = ({
  allocation,
  plateOf,
}) => {
  if (!allocation) return <span className="text-[11px] text-slate-400">Fora do custo</span>;
  if (allocation.shares.length === 0) {
    return (
      <span
        className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded"
        title={
          allocation.linkedVehicleIds.length === 0
            ? 'Nenhuma placa vinculada no mês'
            : 'Nenhuma placa vinculada rodou no mês'
        }
      >
        Não rateada
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {allocation.shares.map((s) => (
        <span
          key={s.vehicleId}
          title={`${formatNumber(s.km, 2)} km de ${formatNumber(allocation.totalKm, 2)} km`}
          className="text-[11px] font-mono text-indigo-800 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded whitespace-nowrap"
        >
          {plateOf(s.vehicleId)} {formatCurrency(s.amount)}
        </span>
      ))}
    </div>
  );
};

const smallInputClassName =
  'text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-800 focus:outline-indigo-600';

export const FinancingDetailModal: React.FC<FinancingDetailModalProps> = ({ financingId, onClose, onEdit }) => {
  const { vehicles } = useTransport();
  const {
    financings,
    financingVehicles,
    installments,
    allocations,
    addFinancingVehicle,
    endFinancingVehicle,
    generateInstallments,
  } = useFinancing();

  const today = getTodayISO();
  const [newVehicleId, setNewVehicleId] = useState('');
  const [newStartDate, setNewStartDate] = useState(today);
  const [endingLinkId, setEndingLinkId] = useState<string | null>(null);
  const [endDate, setEndDate] = useState(today);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNewVehicleId('');
    setNewStartDate(getTodayISO());
    setEndingLinkId(null);
    setBusy(false);
  }, [financingId]);

  const financing = financings.find((f) => f.id === financingId) || null;

  const links = useMemo(
    () =>
      financingVehicles
        .filter((l) => l.financingId === financingId)
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [financingVehicles, financingId]
  );

  const contractInstallments = useMemo(
    () => installments.filter((p) => p.financingId === financingId).sort((a, b) => a.number - b.number),
    [installments, financingId]
  );

  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const allocationByInstallment = useMemo(
    () => new Map(allocations.filter((a) => a.financingId === financingId).map((a) => [a.installmentId, a])),
    [allocations, financingId]
  );

  const availableVehicles = useMemo(
    () =>
      vehicles
        .filter((v) => v.status === 'Ativo')
        .filter((v) => !links.some((l) => l.vehicleId === v.id && (l.endDate === null || l.endDate >= today)))
        .sort((a, b) => a.plate.localeCompare(b.plate)),
    [vehicles, links, today]
  );

  if (!financingId || !financing) return null;

  const schedule = buildInstallmentSchedule(financing.firstInstallmentDate, financing.installmentsCount);
  const activeLinksCount = links.filter((l) => isLinkActiveOn(l, today)).length;
  const statusStyle = FINANCING_STATUS_STYLES[financing.status];

  const handleAddVehicle = async () => {
    if (!newVehicleId) {
      alert('Selecione a placa a ser vinculada.');
      return;
    }
    if (!isValidISODate(newStartDate)) {
      alert('Informe a data de início do vínculo.');
      return;
    }
    const overlap = findOverlappingLink(financingVehicles, financing.id, newVehicleId, newStartDate, null);
    if (overlap) {
      alert(
        `Esta placa já está vinculada a este contrato no período de ${formatDate(overlap.startDate)} a ${
          overlap.endDate ? formatDate(overlap.endDate) : 'hoje (vigente)'
        }. Informe um início posterior ao término do vínculo anterior.`
      );
      return;
    }
    setBusy(true);
    try {
      await addFinancingVehicle(financing.id, { vehicleId: newVehicleId, startDate: newStartDate });
      setNewVehicleId('');
    } catch {
      // erro já informado pelo contexto
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmEnd = async (linkId: string, startDate: string) => {
    if (!isValidISODate(endDate)) {
      alert('Informe a data de término do vínculo.');
      return;
    }
    if (endDate < startDate) {
      alert(`A data de término não pode ser anterior ao início do vínculo (${formatDate(startDate)}).`);
      return;
    }
    const link = links.find((l) => l.id === linkId);
    const plate = link ? vehicleById.get(link.vehicleId)?.plate || 'placa' : 'placa';
    if (
      !window.confirm(
        `Encerrar o vínculo da placa ${plate} em ${formatDate(endDate)}? A partir do dia seguinte ela deixa de participar do rateio deste contrato. O histórico é mantido.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await endFinancingVehicle(linkId, endDate);
      setEndingLinkId(null);
    } catch {
      // erro já informado pelo contexto
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    const last = schedule[schedule.length - 1];
    if (
      !window.confirm(
        `Gerar ${financing.installmentsCount} parcela(s) de ${formatCurrency(financing.installmentValue)}?\n\n` +
          `1ª parcela: ${formatDate(schedule[0]?.dueDate || financing.firstInstallmentDate)}\n` +
          `Última parcela: ${formatDate(last?.dueDate || '')}\n\n` +
          'As parcelas não podem ser excluídas depois de geradas (apenas editadas ou canceladas).'
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await generateInstallments(financing.id);
    } catch {
      // erro já informado pelo contexto
    } finally {
      setBusy(false);
    }
  };

  const totalInstallments = contractInstallments.reduce((acc, p) => acc + (p.status === 'Cancelada' ? 0 : p.amount), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <Landmark size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">{financing.creditor}</h2>
              <p className="text-xs text-slate-500 truncate">
                Contrato <span className="font-mono">{financing.contractNumber || 'sem número'}</span>
                {financing.description ? ` · ${financing.description}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(financing.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              <Edit2 size={12} />
              Editar
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Parcela', value: formatCurrency(financing.installmentValue) },
              { label: 'Parcelas', value: `${financing.installmentsCount}x` },
              { label: '1º Vencimento', value: formatDate(financing.firstInstallmentDate) },
              {
                label: 'Valor Financiado',
                value: financing.financedAmount === null ? '—' : formatCurrency(financing.financedAmount),
              },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-200 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{item.label}</div>
                <div className="text-sm font-bold font-mono text-slate-900 tabular-nums mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full ${statusStyle.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
              {financing.status}
            </span>
            {financing.notes && <span className="text-slate-500">Obs.: {financing.notes}</span>}
          </div>

          {/* Placas vinculadas */}
          <section className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Truck size={14} className="text-indigo-600" />
                Placas vinculadas
              </h3>
              <span className="text-[11px] text-slate-500">
                {activeLinksCount} vigente{activeLinksCount === 1 ? '' : 's'} · {links.length} no histórico
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-white border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2 px-4">Placa</th>
                    <th className="py-2 px-3">Início</th>
                    <th className="py-2 px-3">Término</th>
                    <th className="py-2 px-3 text-center">Situação</th>
                    <th className="py-2 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {links.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-5 text-center text-slate-400">
                        Nenhuma placa vinculada. Sem placas, a parcela fica como "não rateada".
                      </td>
                    </tr>
                  ) : (
                    links.map((link) => {
                      const vehicle = vehicleById.get(link.vehicleId);
                      const active = isLinkActiveOn(link, today);
                      const future = link.startDate > today;
                      const isEnding = endingLinkId === link.id;
                      return (
                        <tr key={link.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4">
                            <span className="font-mono font-bold text-slate-800">{vehicle?.plate || 'Veículo removido'}</span>
                            {vehicle?.brandModel && (
                              <span className="ml-2 text-[11px] text-slate-400">{vehicle.brandModel}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{formatDate(link.startDate)}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            {link.endDate ? formatDate(link.endDate) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                active
                                  ? 'text-emerald-700 bg-emerald-50'
                                  : future
                                    ? 'text-blue-700 bg-blue-50'
                                    : 'text-slate-500 bg-slate-100'
                              }`}
                            >
                              {active ? 'Vigente' : future ? 'Futuro' : 'Encerrado'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {link.endDate === null &&
                              (isEnding ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <input
                                    type="date"
                                    value={endDate}
                                    min={link.startDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={smallInputClassName}
                                  />
                                  <button
                                    disabled={busy}
                                    onClick={() => handleConfirmEnd(link.id, link.startDate)}
                                    className="px-2 py-1 text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 rounded transition-colors"
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    onClick={() => setEndingLinkId(null)}
                                    className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                                  >
                                    Voltar
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEndingLinkId(link.id);
                                    setEndDate(today < link.startDate ? link.startDate : today);
                                  }}
                                  className="px-2 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded transition-colors"
                                >
                                  Encerrar vínculo
                                </button>
                              ))}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {financing.status === 'Ativo' && (
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/60 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Vincular placa</label>
                  <select
                    value={newVehicleId}
                    onChange={(e) => setNewVehicleId(e.target.value)}
                    className={`${smallInputClassName} w-full`}
                  >
                    <option value="">Selecione uma placa ativa...</option>
                    {availableVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} — {[v.vehicleType, v.brandModel].filter(Boolean).join(' · ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Início do vínculo</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className={smallInputClassName}
                  />
                </div>
                <button
                  disabled={busy || !newVehicleId}
                  onClick={handleAddVehicle}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 rounded-md transition-colors shadow-xs"
                >
                  <Plus size={13} />
                  Vincular
                </button>
              </div>
            )}
          </section>

          {/* Parcelas */}
          <section className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ListChecks size={14} className="text-indigo-600" />
                Parcelas
              </h3>
              {contractInstallments.length > 0 && (
                <span className="text-[11px] text-slate-500">
                  {contractInstallments.length} gerada{contractInstallments.length === 1 ? '' : 's'} · total{' '}
                  {formatCurrency(totalInstallments)}
                </span>
              )}
            </div>

            {contractInstallments.length === 0 ? (
              <div className="p-4 space-y-3">
                <div className="p-2.5 rounded-md text-[11px] border flex items-start gap-1.5 bg-amber-50 border-amber-200 text-amber-800">
                  <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    As parcelas ainda não foram geradas. Serão {financing.installmentsCount} parcela(s) de{' '}
                    {formatCurrency(financing.installmentValue)}, de {formatDate(schedule[0]?.dueDate || '')} a{' '}
                    {formatDate(schedule[schedule.length - 1]?.dueDate || '')}.
                  </span>
                </div>
                {financing.status === 'Ativo' ? (
                  <button
                    disabled={busy}
                    onClick={handleGenerate}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 rounded-md transition-colors shadow-xs"
                  >
                    <CalendarClock size={14} />
                    {busy ? 'Gerando...' : `Gerar ${financing.installmentsCount} parcelas`}
                  </button>
                ) : (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Info size={12} />
                    Contratos {financing.status.toLowerCase()}s não geram parcelas.
                  </p>
                )}
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 bg-white border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2 px-4 w-14">Nº</th>
                      <th className="py-2 px-3">Competência</th>
                      <th className="py-2 px-3">Vencimento</th>
                      <th className="py-2 px-3 text-right">Valor</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-4">Rateio por KM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contractInstallments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-4 font-mono font-bold text-slate-700">{p.number}</td>
                        <td className="py-2 px-3 text-slate-700">{formatMonthLabel(p.competence.slice(0, 7), 'long')}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{formatDate(p.dueDate)}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${INSTALLMENT_STATUS_STYLES[p.status]}`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2 px-4">
                          <AllocationCell
                            allocation={allocationByInstallment.get(p.id)}
                            plateOf={(id) => vehicleById.get(id)?.plate || '?'}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
