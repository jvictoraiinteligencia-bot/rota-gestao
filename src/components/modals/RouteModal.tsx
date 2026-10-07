import React, { useState, useEffect, useMemo } from 'react';
import { X, MapPin } from 'lucide-react';
import { RouteModel, CommonStatus } from '../../types';
import { useTransport } from '../../context/TransportContext';
import { INITIAL_OPERATION_TYPES } from '../../data/initialData';
import { buildRouteKey } from '../../services/routeImportService';
import { findBlockByName, routeBlockIdentity } from '../../utils/blocks';

interface RouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  routeToEdit?: RouteModel | null;
}

export const RouteModal: React.FC<RouteModalProps> = ({
  isOpen,
  onClose,
  routeToEdit,
}) => {
  const { addRoute, updateRoute, branches, routes, clients, activeClients, blocks, activeBlocks } = useTransport();

  const linkedClientId = routeToEdit?.clientId || '';
  const clientOptions = useMemo(() => {
    const linked = linkedClientId ? clients.find((c) => c.id === linkedClientId) : undefined;
    return linked && linked.status !== 'Ativo' ? [...activeClients, linked] : activeClients;
  }, [activeClients, clients, linkedClientId]);

  // Rotas já vinculadas a um bloco inativo mantêm o vínculo na edição; novas rotas só recebem blocos ativos.
  const linkedBlockId = routeToEdit?.blockId || '';
  const blockOptions = useMemo(() => {
    const linked = linkedBlockId ? blocks.find((b) => b.id === linkedBlockId) : undefined;
    return linked && linked.status !== 'Ativo' ? [...activeBlocks, linked] : activeBlocks;
  }, [activeBlocks, blocks, linkedBlockId]);

  // Rota antiga com bloco em texto livre, ainda sem vínculo ao cadastro de blocos.
  const legacyBlockText = routeToEdit && !routeToEdit.blockId ? routeToEdit.block || '' : '';

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [branch, setBranch] = useState('');
  const [clientId, setClientId] = useState('');
  const [blockId, setBlockId] = useState('');
  const [distanceKm, setDistanceKm] = useState<number | ''>('');
  const [operationType, setOperationType] = useState('Carga Fechada (FTL)');
  const [status, setStatus] = useState<CommonStatus>('Ativo');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (routeToEdit) {
      setCode(routeToEdit.code);
      setName(routeToEdit.name);
      setOrigin(routeToEdit.origin);
      setDestination(routeToEdit.destination);
      setBranch(routeToEdit.branch || '');
      setClientId(routeToEdit.clientId || '');
      setBlockId(routeToEdit.blockId || findBlockByName(activeBlocks, routeToEdit.block || '')?.id || '');
      setDistanceKm(routeToEdit.distanceKm);
      setOperationType(routeToEdit.operationType);
      setStatus(routeToEdit.status);
      setNotes(routeToEdit.notes || '');
    } else {
      setCode(`R00${Math.floor(Math.random() * 90 + 10)}`);
      setName('');
      setOrigin('');
      setDestination('');
      setBranch('');
      setClientId('');
      setBlockId('');
      setDistanceKm('');
      setOperationType('Carga Fechada (FTL)');
      setStatus('Ativo');
      setNotes('');
    }
  }, [routeToEdit, isOpen, branches]);

  // Auto-generate name if user types origin and destination
  const handleOriginChange = (val: string) => {
    setOrigin(val);
    if (val && destination && !routeToEdit) {
      setName(`${val.split(' - ')[0]} → ${destination.split(' - ')[0]}`);
    }
  };

  const handleDestinationChange = (val: string) => {
    setDestination(val);
    if (origin && val && !routeToEdit) {
      setName(`${origin.split(' - ')[0]} → ${val.split(' - ')[0]}`);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClient = clientOptions.find((c) => c.id === clientId);
    const selectedBlock = blockOptions.find((b) => b.id === blockId);
    // Na edição de rota antiga sem vínculo, deixar o bloco vazio mantém o texto antigo.
    const keepLegacyBlock = !selectedBlock && Boolean(legacyBlockText);
    const computedName =
      name.trim() ||
      (origin.trim() && destination.trim() ? `${origin.split(' - ')[0]} → ${destination.split(' - ')[0]}` : '');
    if (!code.trim() || !computedName || (!selectedBlock && !keepLegacyBlock) || !selectedClient) {
      alert('Preencha os campos obrigatórios (Cliente, Bloco cadastrado, Nome da Rota e Código).');
      return;
    }
    if (!(Number(distanceKm) > 0)) {
      alert('A distância em KM deve ser maior que zero.');
      return;
    }

    const blockName = selectedBlock ? selectedBlock.name : legacyBlockText;
    const key = buildRouteKey(
      selectedClient.id,
      routeBlockIdentity(selectedBlock?.id, legacyBlockText, blocks),
      computedName
    );
    // Rotas antigas podem já repetir CLIENTE + BLOCO + ROTA (antes a filial as diferenciava); só bloqueia se a identidade mudou.
    const keyChanged =
      !routeToEdit ||
      buildRouteKey(
        routeToEdit.clientId || '',
        routeBlockIdentity(routeToEdit.blockId, routeToEdit.block, blocks),
        routeToEdit.name
      ) !== key;
    const duplicate =
      keyChanged &&
      routes.find(
        (r) =>
          r.id !== routeToEdit?.id &&
          r.clientId &&
          buildRouteKey(r.clientId, routeBlockIdentity(r.blockId, r.block, blocks), r.name) === key
      );
    if (duplicate) {
      alert(
        `Rota duplicada: já existe a rota ${duplicate.code} - ${duplicate.name} para o cliente "${selectedClient.name}" e bloco "${blockName}".`
      );
      return;
    }

    const payload = {
      code: code.trim().toUpperCase(),
      name: computedName,
      origin: origin.trim(),
      destination: destination.trim(),
      branch,
      clientId: selectedClient.id,
      client: selectedClient.name,
      blockId: selectedBlock ? selectedBlock.id : '',
      block: blockName,
      distanceKm: Number(distanceKm) || 0,
      operationType,
      status,
      notes: notes.trim(),
    };

    if (routeToEdit) {
      updateRoute(routeToEdit.id, payload);
    } else {
      addRoute(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <MapPin size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {routeToEdit ? 'Editar Rota de Transporte' : 'Cadastrar Nova Rota'}
              </h2>
              <p className="text-xs text-slate-500">
                Identificação da rota: cliente + bloco + rota + KM
              </p>
            </div>
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
                Cliente *
              </label>
              <select
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={clientOptions.length === 0}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-medium disabled:bg-slate-50"
              >
                <option value="" disabled>
                  {clients.length === 0
                    ? 'Nenhum cliente cadastrado'
                    : clientOptions.length === 0
                    ? 'Nenhum cliente ativo cadastrado'
                    : 'Selecione o cliente'}
                </option>
                {clientOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.status === 'Inativo' ? ' (Inativo)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bloco *
              </label>
              <select
                required={!legacyBlockText}
                value={blockId}
                onChange={(e) => setBlockId(e.target.value)}
                disabled={blockOptions.length === 0 && !legacyBlockText}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-medium disabled:bg-slate-50"
              >
                <option value="" disabled={!legacyBlockText}>
                  {legacyBlockText
                    ? `Manter texto antigo: ${legacyBlockText} (sem vínculo)`
                    : blocks.length === 0
                    ? 'Nenhum bloco cadastrado'
                    : blockOptions.length === 0
                    ? 'Nenhum bloco ativo cadastrado'
                    : 'Selecione o bloco'}
                </option>
                {blockOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.status === 'Inativo' ? ' (Inativo)' : ''}
                  </option>
                ))}
              </select>
              {activeBlocks.length === 0 && (
                <p className="text-[10px] text-amber-700 mt-1">Cadastre os blocos no menu Blocos antes de criar rotas.</p>
              )}
              {legacyBlockText && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Rota antiga com bloco em texto livre ("{legacyBlockText}"). Selecione um bloco cadastrado para vincular.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome da Rota *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: SÃO LUÍS x BACABAL"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-blue-600 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código da Rota *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: R001"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 font-mono uppercase text-slate-900 focus:outline-blue-600 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Origem (Cidade - UF)
              </label>
              <input
                type="text"
                placeholder="Ex: São Luís - MA"
                value={origin}
                onChange={(e) => handleOriginChange(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destino (Cidade - UF)
              </label>
              <input
                type="text"
                placeholder="Ex: Bacabal - MA"
                value={destination}
                onChange={(e) => handleDestinationChange(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Distância em KM *
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                placeholder="Ex: 250"
                value={distanceKm}
                onChange={(e) =>
                  setDistanceKm(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-blue-600 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Filial (opcional)
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              >
                <option value="">Sem filial</option>
                {branch && !branches.some((b) => b.name === branch) && <option value={branch}>{branch}</option>}
                {branches.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Informativa: não interfere na identificação da rota.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Operação
              </label>
              <select
                value={operationType}
                onChange={(e) => setOperationType(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600"
              >
                {INITIAL_OPERATION_TYPES.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status da Rota
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CommonStatus)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-blue-600 font-medium"
              >
                <option value="Ativo">Ativa (Disponível para fretes)</option>
                <option value="Inativo">Inativa</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações do Trajeto
            </label>
            <input
              type="text"
              placeholder="Ex: Condições de pista, praças de pedágio, postos recomendados..."
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
              {routeToEdit ? 'Salvar Rota' : 'Cadastrar Rota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
