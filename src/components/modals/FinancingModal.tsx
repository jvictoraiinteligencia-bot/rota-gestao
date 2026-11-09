import React, { useEffect, useMemo, useState } from 'react';
import { X, Landmark, Search, AlertCircle, Info } from 'lucide-react';
import { FinancingStatus, VehicleFinancing } from '../../types';
import { useTransport } from '../../context/TransportContext';
import { useFinancing } from '../../context/FinancingContext';
import { buildInstallmentSchedule, firstDayOfMonth, isValidISODate } from '../../utils/financing';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface FinancingModalProps {
  isOpen: boolean;
  onClose: () => void;
  financingToEdit?: VehicleFinancing | null;
}

const inputClassName =
  'w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-indigo-600 disabled:bg-slate-100 disabled:text-slate-500';

const toNumberOrEmpty = (value: string): number | '' => (value === '' ? '' : Number(value));

export const FinancingModal: React.FC<FinancingModalProps> = ({ isOpen, onClose, financingToEdit }) => {
  const { vehicles } = useTransport();
  const { financings, installments, addFinancing, updateFinancing } = useFinancing();

  const [creditor, setCreditor] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [description, setDescription] = useState('');
  const [financedAmount, setFinancedAmount] = useState<number | ''>('');
  const [installmentValue, setInstallmentValue] = useState<number | ''>('');
  const [installmentsCount, setInstallmentsCount] = useState<number | ''>('');
  const [firstInstallmentDate, setFirstInstallmentDate] = useState('');
  const [status, setStatus] = useState<FinancingStatus>('Ativo');
  const [notes, setNotes] = useState('');
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [linkStartDate, setLinkStartDate] = useState('');
  const [linkStartTouched, setLinkStartTouched] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(financingToEdit);

  useEffect(() => {
    if (financingToEdit) {
      setCreditor(financingToEdit.creditor);
      setContractNumber(financingToEdit.contractNumber);
      setDescription(financingToEdit.description);
      setFinancedAmount(financingToEdit.financedAmount ?? '');
      setInstallmentValue(financingToEdit.installmentValue);
      setInstallmentsCount(financingToEdit.installmentsCount);
      setFirstInstallmentDate(financingToEdit.firstInstallmentDate);
      setStatus(financingToEdit.status);
      setNotes(financingToEdit.notes);
    } else {
      setCreditor('');
      setContractNumber('');
      setDescription('');
      setFinancedAmount('');
      setInstallmentValue('');
      setInstallmentsCount('');
      setFirstInstallmentDate('');
      setStatus('Ativo');
      setNotes('');
    }
    setSelectedVehicleIds([]);
    setLinkStartDate('');
    setLinkStartTouched(false);
    setVehicleSearch('');
    setSaving(false);
  }, [financingToEdit, isOpen]);

  // Início do vínculo acompanha o mês da 1ª parcela até o usuário alterá-lo.
  useEffect(() => {
    if (!linkStartTouched && isValidISODate(firstInstallmentDate)) {
      setLinkStartDate(firstDayOfMonth(firstInstallmentDate));
    }
  }, [firstInstallmentDate, linkStartTouched]);

  const hasInstallments = useMemo(
    () => Boolean(financingToEdit) && installments.some((p) => p.financingId === financingToEdit!.id),
    [financingToEdit, installments]
  );

  const schedule = useMemo(
    () =>
      typeof installmentsCount === 'number' && installmentsCount >= 1 && installmentsCount <= 360
        ? buildInstallmentSchedule(firstInstallmentDate, installmentsCount)
        : [],
    [firstInstallmentDate, installmentsCount]
  );

  const duplicate = useMemo(() => {
    const key = (value: string) => value.trim().toUpperCase();
    if (!creditor.trim() || !contractNumber.trim()) return undefined;
    return financings.find(
      (f) =>
        f.id !== financingToEdit?.id &&
        key(f.creditor) === key(creditor) &&
        key(f.contractNumber) === key(contractNumber)
    );
  }, [financings, creditor, contractNumber, financingToEdit]);

  const selectableVehicles = useMemo(() => {
    const q = vehicleSearch.trim().toUpperCase();
    return vehicles
      .filter((v) => v.status === 'Ativo' || selectedVehicleIds.includes(v.id))
      .filter(
        (v) =>
          !q ||
          v.plate.toUpperCase().includes(q) ||
          (v.brandModel || '').toUpperCase().includes(q) ||
          (v.vehicleType || '').toUpperCase().includes(q)
      )
      .sort((a, b) => a.plate.localeCompare(b.plate));
  }, [vehicles, vehicleSearch, selectedVehicleIds]);

  if (!isOpen) return null;

  const toggleVehicle = (id: string) =>
    setSelectedVehicleIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!creditor.trim()) {
      alert('Informe o credor (banco ou financeira).');
      return;
    }
    if (typeof installmentValue !== 'number' || !(installmentValue > 0)) {
      alert('Informe um valor de parcela maior que zero.');
      return;
    }
    if (
      typeof installmentsCount !== 'number' ||
      !Number.isInteger(installmentsCount) ||
      installmentsCount < 1 ||
      installmentsCount > 360
    ) {
      alert('A quantidade de parcelas deve ser um número inteiro entre 1 e 360.');
      return;
    }
    if (!isValidISODate(firstInstallmentDate)) {
      alert('Informe a data de vencimento da 1ª parcela.');
      return;
    }
    if (financedAmount !== '' && !(financedAmount >= 0)) {
      alert('O valor financiado não pode ser negativo.');
      return;
    }
    if (duplicate) {
      alert(`Já existe o contrato "${duplicate.contractNumber}" do credor "${duplicate.creditor}".`);
      return;
    }
    if (!isEditing && selectedVehicleIds.length > 0 && !isValidISODate(linkStartDate)) {
      alert('Informe a data de início do vínculo das placas.');
      return;
    }

    const payload = {
      creditor: creditor.trim(),
      contractNumber: contractNumber.trim().toUpperCase(),
      description: description.trim(),
      financedAmount: financedAmount === '' ? null : Math.round(financedAmount * 100) / 100,
      installmentValue: Math.round(installmentValue * 100) / 100,
      installmentsCount,
      firstInstallmentDate,
      status,
      notes: notes.trim(),
    };

    setSaving(true);
    try {
      if (financingToEdit) {
        // Com parcelas geradas, valor/quantidade/1ª parcela ficam bloqueados para não divergir das parcelas.
        const { installmentValue: _v, installmentsCount: _c, firstInstallmentDate: _d, ...editable } = payload;
        await updateFinancing(financingToEdit.id, hasInstallments ? editable : payload);
      } else {
        await addFinancing(
          payload,
          selectedVehicleIds.map((vehicleId) => ({ vehicleId, startDate: linkStartDate }))
        );
      }
      onClose();
    } catch {
      // erro já informado pelo contexto; mantém o formulário aberto para correção
      setSaving(false);
    }
  };

  const lastScheduleItem = schedule[schedule.length - 1];
  const scheduleTotal =
    typeof installmentValue === 'number' && typeof installmentsCount === 'number'
      ? installmentValue * installmentsCount
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <Landmark size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? 'Editar Financiamento' : 'Cadastrar Novo Financiamento'}
              </h2>
              <p className="text-xs text-slate-500">Contrato de financiamento de uma ou várias placas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Contrato */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Credor (banco / financeira) *</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex: Banco Volvo, Scania Banco"
                value={creditor}
                onChange={(e) => setCreditor(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nº do Contrato</label>
              <input
                type="text"
                placeholder="Ex: 123456789"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value.toUpperCase())}
                className={`${inputClassName} font-mono uppercase`}
              />
            </div>
          </div>

          {duplicate && (
            <div className="p-2 rounded-md text-[11px] border flex items-start gap-1.5 bg-rose-50 border-rose-200 text-rose-800">
              <AlertCircle size={13} className="text-rose-600 shrink-0 mt-0.5" />
              <span>
                Já existe o contrato "{duplicate.contractNumber}" do credor "{duplicate.creditor}" ({duplicate.status}).
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição</label>
            <input
              type="text"
              placeholder="Ex: Financiamento cavalo mecânico + carreta"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClassName}
            />
          </div>

          {/* Valores e parcelas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Valor Financiado (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={financedAmount}
                onChange={(e) => setFinancedAmount(toNumberOrEmpty(e.target.value))}
                className={`${inputClassName} font-mono`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Valor da Parcela (R$) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="0,00"
                value={installmentValue}
                disabled={hasInstallments}
                onChange={(e) => setInstallmentValue(toNumberOrEmpty(e.target.value))}
                className={`${inputClassName} font-mono`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Qtde. de Parcelas *</label>
              <input
                type="number"
                min="1"
                max="360"
                step="1"
                required
                placeholder="Ex: 60"
                value={installmentsCount}
                disabled={hasInstallments}
                onChange={(e) => setInstallmentsCount(toNumberOrEmpty(e.target.value))}
                className={`${inputClassName} font-mono`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vencimento 1ª Parcela *</label>
              <input
                type="date"
                required
                value={firstInstallmentDate}
                disabled={hasInstallments}
                onChange={(e) => setFirstInstallmentDate(e.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          {hasInstallments ? (
            <div className="p-2.5 rounded-md text-[11px] border flex items-start gap-1.5 bg-slate-50 border-slate-200 text-slate-600">
              <Info size={13} className="text-slate-500 shrink-0 mt-0.5" />
              <span>
                As parcelas deste contrato já foram geradas. Valor da parcela, quantidade e 1º vencimento não podem
                mais ser alterados aqui.
              </span>
            </div>
          ) : (
            schedule.length > 0 &&
            lastScheduleItem && (
              <div className="p-2.5 rounded-md text-[11px] border flex items-start gap-1.5 bg-indigo-50 border-indigo-200 text-indigo-800">
                <Info size={13} className="text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  {schedule.length} parcela{schedule.length > 1 ? 's' : ''} de{' '}
                  {formatCurrency(typeof installmentValue === 'number' ? installmentValue : 0)} — 1ª em{' '}
                  {formatDate(schedule[0].dueDate)}, última em {formatDate(lastScheduleItem.dueDate)}. Total:{' '}
                  {formatCurrency(scheduleTotal)}. Vencimentos nos dias 29, 30 e 31 usam o último dia dos meses mais
                  curtos.
                </span>
              </div>
            )
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {isEditing && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as FinancingStatus)}
                  className={`${inputClassName} font-medium`}
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Quitado">Quitado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
            )}
            <div className={isEditing ? 'sm:col-span-2' : 'sm:col-span-3'}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Observações</label>
              <input
                type="text"
                placeholder="Não informe CPF, CNPJ ou dados bancários"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          {/* Placas (somente no cadastro; depois, pelos detalhes do contrato) */}
          {!isEditing && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Placas vinculadas</h3>
                  <p className="text-[11px] text-slate-500">
                    Uma ou várias placas. A parcela será rateada pelos KM rodados de cada placa no mês.
                  </p>
                </div>
                <span className="text-[11px] font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  {selectedVehicleIds.length} selecionada{selectedVehicleIds.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="p-3 space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar placa, modelo ou tipo..."
                      value={vehicleSearch}
                      onChange={(e) => setVehicleSearch(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Início do vínculo</label>
                    <input
                      type="date"
                      value={linkStartDate}
                      onChange={(e) => {
                        setLinkStartDate(e.target.value);
                        setLinkStartTouched(true);
                      }}
                      className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-800 focus:outline-indigo-600"
                    />
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-md divide-y divide-slate-100">
                  {selectableVehicles.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">Nenhum veículo ativo encontrado.</div>
                  ) : (
                    selectableVehicles.map((v) => {
                      const checked = selectedVehicleIds.includes(v.id);
                      return (
                        <label
                          key={v.id}
                          className={`flex items-center gap-3 px-3 py-2 text-xs cursor-pointer transition-colors ${
                            checked ? 'bg-indigo-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleVehicle(v.id)}
                            className="accent-indigo-600"
                          />
                          <span className="font-mono font-bold text-slate-800 w-20">{v.plate}</span>
                          <span className="text-slate-600 truncate">
                            {[v.vehicleType, v.brandModel].filter(Boolean).join(' · ') || '-'}
                          </span>
                          <span className="ml-auto text-[11px] text-slate-400">{v.branch}</span>
                        </label>
                      );
                    })
                  )}
                </div>

                {selectedVehicleIds.length === 0 && (
                  <p className="text-[11px] text-amber-700 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Sem placas vinculadas, a parcela ficará como "não rateada" até que alguma placa seja vinculada.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || Boolean(duplicate)}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors shadow-xs"
            >
              {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Financiamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
