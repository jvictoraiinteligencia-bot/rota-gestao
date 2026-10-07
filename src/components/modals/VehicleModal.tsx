import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Vehicle, OwnershipType, VehicleStatus } from '../../types';
import { useTransport } from '../../context/TransportContext';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleToEdit?: Vehicle | null;
}

export const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  onClose,
  vehicleToEdit,
}) => {
  const { addVehicle, updateVehicle, branches, vehicleTypes } = useTransport();

  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState(vehicleTypes[0]?.name || '');
  const [brandModel, setBrandModel] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [owner, setOwner] = useState('');
  const [ownershipType, setOwnershipType] = useState<OwnershipType>('Próprio');
  const [branch, setBranch] = useState(branches[0]?.name || '');
  const [status, setStatus] = useState<VehicleStatus>('Ativo');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (vehicleToEdit) {
      setPlate(vehicleToEdit.plate);
      setVehicleType(vehicleToEdit.vehicleType);
      setBrandModel(vehicleToEdit.brandModel);
      setYear(vehicleToEdit.year);
      setOwner(vehicleToEdit.owner);
      setOwnershipType(vehicleToEdit.ownershipType);
      setBranch(vehicleToEdit.branch);
      setStatus(vehicleToEdit.status);
      setNotes(vehicleToEdit.notes || '');
    } else {
      setPlate('');
      setVehicleType(vehicleTypes[0]?.name || '');
      setBrandModel('');
      setYear(new Date().getFullYear());
      setOwner('');
      setOwnershipType('Próprio');
      setBranch(branches[0]?.name || '');
      setStatus('Ativo');
      setNotes('');
    }
  }, [vehicleToEdit, isOpen, branches, vehicleTypes]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim() || !brandModel.trim() || !owner.trim()) {
      alert('Preencha os campos obrigatórios (Placa, Marca/Modelo e Proprietário).');
      return;
    }

    const cleanPlate = plate.toUpperCase().replace(/\s+/g, '');

    const payload = {
      plate: cleanPlate,
      vehicleType,
      brandModel,
      year: Number(year) || new Date().getFullYear(),
      owner,
      ownershipType,
      branch,
      status,
      notes,
    };

    if (vehicleToEdit) {
      updateVehicle(vehicleToEdit.id, payload);
    } else {
      addVehicle(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {vehicleToEdit ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}
            </h2>
            <p className="text-xs text-slate-500">
              Controle de frota própria, agregados e terceiros
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Placa do Veículo *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: BRA-2E19 ou ABC-1234"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 font-mono uppercase tracking-wider text-slate-900 focus:outline-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo do Veículo *
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              >
                {vehicleTypes.length === 0 && <option value="">Nenhum tipo cadastrado</option>}
                {vehicleTypes.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
                {vehicleType && !vehicleTypes.some((t) => t.name === vehicleType) && (
                  <option value={vehicleType}>{vehicleType}</option>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Marca / Modelo *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Volvo FH 540, Scania R450"
                value={brandModel}
                onChange={(e) => setBrandModel(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ano Fab. / Mod. *
              </label>
              <input
                type="number"
                min="1990"
                max="2030"
                required
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 font-mono text-slate-800 focus:outline-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Proprietário (Razão Social / Nome) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: TransRota Logística ou Nome Agregado"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vínculo Operacional *
              </label>
              <select
                value={ownershipType}
                onChange={(e) => setOwnershipType(e.target.value as OwnershipType)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-medium"
              >
                <option value="Próprio">Próprio (Frota da Empresa)</option>
                <option value="Agregado">Agregado (Contrato Fixo)</option>
                <option value="Terceiro">Terceiro (Spot / Avulso)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Filial de Alocação
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Operacional
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              >
                <option value="Ativo">Ativo (Em circulação)</option>
                <option value="Inativo">Inativo (Oficina / Parado)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Rastreamento Omnilink, seguro apólice 123..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
            />
          </div>

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
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-xs"
            >
              {vehicleToEdit ? 'Salvar Veículo' : 'Cadastrar Veículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
