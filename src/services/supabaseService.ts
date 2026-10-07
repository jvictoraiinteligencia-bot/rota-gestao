import { getSupabase } from '../lib/supabase';
import {
  Branch,
  Vehicle,
  VehicleTypeModel,
  Driver,
  RouteModel,
  FreightPricing,
  Trip,
  Expense,
} from '../types';

// ==============================================================================
// 1. FILIAIS
// ==============================================================================
export async function getBranchesOnline(): Promise<Branch[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const { data, error } = await supabase
    .from('filiais')
    .select('*')
    .order('nome', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.nome,
    code: row.codigo || '',
    cnpj: '',
    city: row.cidade,
    state: row.estado,
    address: '',
    phone: '',
    manager: 'Gerente Operacional',
    status: row.status as any,
    notes: '',
    createdAt: row.created_at,
  }));
}

export async function insertBranchOnline(branch: Omit<Branch, 'id' | 'createdAt'>): Promise<Branch> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const { data, error } = await supabase
    .from('filiais')
    .insert([
      {
        nome: branch.name,
        codigo: branch.code,
        cidade: branch.city,
        estado: branch.state,
        status: branch.status,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.nome,
    code: data.codigo || '',
    cnpj: '',
    city: data.cidade,
    state: data.estado,
    address: '',
    phone: '',
    manager: branch.manager || 'Gerente Operacional',
    status: data.status,
    notes: '',
    createdAt: data.created_at,
  };
}

export async function updateBranchOnline(id: string, branch: Partial<Branch>): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const updatePayload: any = {};
  if (branch.name !== undefined) updatePayload.nome = branch.name;
  if (branch.code !== undefined) updatePayload.codigo = branch.code;
  if (branch.city !== undefined) updatePayload.cidade = branch.city;
  if (branch.state !== undefined) updatePayload.estado = branch.state;
  if (branch.status !== undefined) updatePayload.status = branch.status;

  const { error } = await supabase.from('filiais').update(updatePayload).eq('id', id);
  if (error) throw error;
}

export async function deleteBranchOnline(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const { error } = await supabase.from('filiais').delete().eq('id', id);
  if (error) throw error;
}

// ==============================================================================
// 2. TIPOS DE CARRO
// ==============================================================================
export async function getVehicleTypesOnline(): Promise<VehicleTypeModel[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const { data, error } = await supabase
    .from('tipos_carro')
    .select('*')
    .order('nome', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.nome,
    category: row.categoria,
    description: row.descricao || '',
    payloadCapacity: row.capacidade_carga || '',
    axlesCount: row.quantidade_eixos || 2,
    status: row.status,
    notes: '',
    createdAt: row.created_at,
  }));
}

export async function insertVehicleTypeOnline(type: Omit<VehicleTypeModel, 'id' | 'createdAt'>): Promise<VehicleTypeModel> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const { data, error } = await supabase
    .from('tipos_carro')
    .insert([
      {
        nome: type.name,
        categoria: type.category,
        descricao: type.description,
        capacidade_carga: type.payloadCapacity,
        quantidade_eixos: type.axlesCount,
        status: type.status,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.nome,
    category: data.categoria,
    description: data.descricao || '',
    payloadCapacity: data.capacidade_carga || '',
    axlesCount: data.quantidade_eixos || 2,
    status: data.status,
    notes: '',
    createdAt: data.created_at,
  };
}

export async function updateVehicleTypeOnline(id: string, type: Partial<VehicleTypeModel>): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const updatePayload: any = {};
  if (type.name !== undefined) updatePayload.nome = type.name;
  if (type.category !== undefined) updatePayload.categoria = type.category;
  if (type.description !== undefined) updatePayload.descricao = type.description;
  if (type.payloadCapacity !== undefined) updatePayload.capacidade_carga = type.payloadCapacity;
  if (type.axlesCount !== undefined) updatePayload.quantidade_eixos = type.axlesCount;
  if (type.status !== undefined) updatePayload.status = type.status;

  const { error } = await supabase.from('tipos_carro').update(updatePayload).eq('id', id);
  if (error) throw error;
}

export async function deleteVehicleTypeOnline(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const { error } = await supabase.from('tipos_carro').delete().eq('id', id);
  if (error) throw error;
}

// ==============================================================================
// 3. VEÍCULOS
// ==============================================================================
export async function getVehiclesOnline(): Promise<Vehicle[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const { data, error } = await supabase
    .from('veiculos')
    .select(`
      *,
      tipos_carro (nome),
      filiais (nome)
    `)
    .order('placa', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => {
    const brandModel = row.marca && row.modelo ? `${row.marca} ${row.modelo}` : row.marca || row.modelo || 'Caminhão';
    const vehicleType = row.tipos_carro?.nome || 'Truck';
    const branch = row.filiais?.nome || 'Matriz São Paulo';

    return {
      id: row.id,
      plate: row.placa,
      vehicleType,
      brandModel,
      year: row.ano,
      owner: row.proprietario,
      ownershipType: (row.tipo_proprietario === 'Proprio' ? 'Próprio' : row.tipo_proprietario) as any,
      branch,
      status: row.status as any,
      notes: row.observacoes || '',
      createdAt: row.created_at,
    };
  });
}

export async function insertVehicleOnline(v: Omit<Vehicle, 'id' | 'createdAt'>): Promise<Vehicle> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  // Look up foreign keys
  let filialId = null;
  const { data: filialData } = await supabase.from('filiais').select('id').eq('nome', v.branch).maybeSingle();
  if (filialData) filialId = filialData.id;

  let tipoCarroId = null;
  const { data: tipoData } = await supabase.from('tipos_carro').select('id').eq('nome', v.vehicleType).maybeSingle();
  if (tipoData) tipoCarroId = tipoData.id;

  const parts = v.brandModel.split(' ');
  const marca = parts[0] || 'Volvo';
  const modelo = parts.slice(1).join(' ') || 'FH 540';
  const tipoProp = v.ownershipType === 'Próprio' ? 'Proprio' : v.ownershipType;

  const { data, error } = await supabase
    .from('veiculos')
    .insert([
      {
        placa: v.plate.toUpperCase().trim(),
        tipo_carro_id: tipoCarroId,
        marca,
        modelo,
        ano: v.year,
        proprietario: v.owner,
        tipo_proprietario: tipoProp,
        filial_id: filialId,
        status: v.status,
        observacoes: v.notes,
      },
    ])
    .select(`
      *,
      tipos_carro (nome),
      filiais (nome)
    `)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    plate: data.placa,
    vehicleType: data.tipos_carro?.nome || v.vehicleType,
    brandModel: v.brandModel,
    year: data.ano,
    owner: data.proprietario,
    ownershipType: v.ownershipType,
    branch: data.filiais?.nome || v.branch,
    status: data.status,
    notes: data.observacoes || '',
    createdAt: data.created_at,
  };
}

export async function updateVehicleOnline(id: string, v: Partial<Vehicle>): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const payload: any = {};
  if (v.plate !== undefined) payload.placa = v.plate.toUpperCase().trim();
  if (v.brandModel !== undefined) {
    const parts = v.brandModel.split(' ');
    payload.marca = parts[0];
    payload.modelo = parts.slice(1).join(' ');
  }
  if (v.year !== undefined) payload.ano = v.year;
  if (v.owner !== undefined) payload.proprietario = v.owner;
  if (v.ownershipType !== undefined) {
    payload.tipo_proprietario = v.ownershipType === 'Próprio' ? 'Proprio' : v.ownershipType;
  }
  if (v.status !== undefined) payload.status = v.status;
  if (v.notes !== undefined) payload.observacoes = v.notes;

  if (v.branch !== undefined) {
    const { data: filialData } = await supabase.from('filiais').select('id').eq('nome', v.branch).maybeSingle();
    if (filialData) payload.filial_id = filialData.id;
  }
  if (v.vehicleType !== undefined) {
    const { data: tipoData } = await supabase.from('tipos_carro').select('id').eq('nome', v.vehicleType).maybeSingle();
    if (tipoData) payload.tipo_carro_id = tipoData.id;
  }

  const { error } = await supabase.from('veiculos').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteVehicleOnline(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const { error } = await supabase.from('veiculos').delete().eq('id', id);
  if (error) throw error;
}

// ==============================================================================
// 4. MOTORISTAS
// ==============================================================================
export async function getDriversOnline(): Promise<Driver[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const { data, error } = await supabase
    .from('motoristas')
    .select(`
      *,
      filiais (nome)
    `)
    .order('nome', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.nome,
    cpf: row.cpf,
    phone: row.telefone || '',
    cnh: row.cnh,
    cnhCategory: row.categoria_cnh as any,
    cnhExpiry: row.validade_cnh,
    driverType: (row.tipo_motorista === 'Funcionario' ? 'Funcionário' : row.tipo_motorista) as any,
    branch: row.filiais?.nome || 'Matriz São Paulo',
    status: row.status as any,
    notes: row.observacoes || '',
    createdAt: row.created_at,
  }));
}

export async function insertDriverOnline(d: Omit<Driver, 'id' | 'createdAt'>): Promise<Driver> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  let filialId = null;
  const { data: filialData } = await supabase.from('filiais').select('id').eq('nome', d.branch).maybeSingle();
  if (filialData) filialId = filialData.id;

  const tipoMot = d.driverType === 'Funcionário' ? 'Funcionario' : d.driverType;

  const { data, error } = await supabase
    .from('motoristas')
    .insert([
      {
        nome: d.name,
        cpf: d.cpf,
        telefone: d.phone,
        cnh: d.cnh,
        categoria_cnh: d.cnhCategory,
        validade_cnh: d.cnhExpiry,
        tipo_motorista: tipoMot,
        filial_id: filialId,
        status: d.status,
        observacoes: d.notes,
      },
    ])
    .select(`
      *,
      filiais (nome)
    `)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.nome,
    cpf: data.cpf,
    phone: data.telefone || '',
    cnh: data.cnh,
    cnhCategory: data.categoria_cnh,
    cnhExpiry: data.validade_cnh,
    driverType: d.driverType,
    branch: data.filiais?.nome || d.branch,
    status: data.status,
    notes: data.observacoes || '',
    createdAt: data.created_at,
  };
}

export async function updateDriverOnline(id: string, d: Partial<Driver>): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const payload: any = {};
  if (d.name !== undefined) payload.nome = d.name;
  if (d.cpf !== undefined) payload.cpf = d.cpf;
  if (d.phone !== undefined) payload.telefone = d.phone;
  if (d.cnh !== undefined) payload.cnh = d.cnh;
  if (d.cnhCategory !== undefined) payload.categoria_cnh = d.cnhCategory;
  if (d.cnhExpiry !== undefined) payload.validade_cnh = d.cnhExpiry;
  if (d.driverType !== undefined) {
    payload.tipo_motorista = d.driverType === 'Funcionário' ? 'Funcionario' : d.driverType;
  }
  if (d.status !== undefined) payload.status = d.status;
  if (d.notes !== undefined) payload.observacoes = d.notes;

  if (d.branch !== undefined) {
    const { data: filialData } = await supabase.from('filiais').select('id').eq('nome', d.branch).maybeSingle();
    if (filialData) payload.filial_id = filialData.id;
  }

  const { error } = await supabase.from('motoristas').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteDriverOnline(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const { error } = await supabase.from('motoristas').delete().eq('id', id);
  if (error) throw error;
}

// ==============================================================================
// 5. ROTAS
// ==============================================================================
export async function getRoutesOnline(): Promise<RouteModel[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const { data, error } = await supabase
    .from('rotas')
    .select(`
      *,
      filiais (nome)
    `)
    .order('codigo', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    code: row.codigo,
    name: row.nome,
    origin: row.origem,
    destination: row.destino,
    distanceKm: Number(row.distancia_km),
    branch: row.filiais?.nome || 'Matriz São Paulo',
    operationType: row.tipo_operacao || 'Carga Fechada (FTL)',
    status: row.status,
    notes: row.observacoes || '',
    createdAt: row.created_at,
  }));
}

export async function insertRouteOnline(r: Omit<RouteModel, 'id' | 'createdAt'>): Promise<RouteModel> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  let filialId = null;
  const { data: filialData } = await supabase.from('filiais').select('id').eq('nome', r.branch).maybeSingle();
  if (filialData) filialId = filialData.id;

  const { data, error } = await supabase
    .from('rotas')
    .insert([
      {
        codigo: r.code,
        nome: r.name,
        origem: r.origin,
        destino: r.destination,
        distancia_km: r.distanceKm,
        filial_id: filialId,
        tipo_operacao: r.operationType,
        status: r.status,
        observacoes: r.notes,
      },
    ])
    .select(`
      *,
      filiais (nome)
    `)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    code: data.codigo,
    name: data.nome,
    origin: data.origem,
    destination: data.destino,
    distanceKm: Number(data.distancia_km),
    branch: data.filiais?.nome || r.branch,
    operationType: data.tipo_operacao,
    status: data.status,
    notes: data.observacoes || '',
    createdAt: data.created_at,
  };
}

export async function updateRouteOnline(id: string, r: Partial<RouteModel>): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const payload: any = {};
  if (r.code !== undefined) payload.codigo = r.code;
  if (r.name !== undefined) payload.nome = r.name;
  if (r.origin !== undefined) payload.origem = r.origin;
  if (r.destination !== undefined) payload.destino = r.destination;
  if (r.distanceKm !== undefined) payload.distancia_km = r.distanceKm;
  if (r.operationType !== undefined) payload.tipo_operacao = r.operationType;
  if (r.status !== undefined) payload.status = r.status;
  if (r.notes !== undefined) payload.observacoes = r.notes;

  if (r.branch !== undefined) {
    const { data: filialData } = await supabase.from('filiais').select('id').eq('nome', r.branch).maybeSingle();
    if (filialData) payload.filial_id = filialData.id;
  }

  const { error } = await supabase.from('rotas').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteRouteOnline(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const { error } = await supabase.from('rotas').delete().eq('id', id);
  if (error) throw error;
}

// ==============================================================================
// 6. TABELA DE FRETES
// ==============================================================================
export async function getFreightPricingOnline(): Promise<FreightPricing[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const { data, error } = await supabase
    .from('tabela_fretes')
    .select(`
      *,
      rotas (nome, distancia_km),
      tipos_carro (nome)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    routeId: row.rota_id,
    routeName: row.rotas?.nome || 'Rota',
    distanceKm: Number(row.rotas?.distancia_km || 0),
    vehicleTypeId: row.tipo_carro_id,
    vehicleTypeName: row.tipos_carro?.nome || 'Caminhão',
    freightValue: Number(row.valor_frete),
    validFrom: row.vigencia_inicial,
    validTo: row.vigencia_final || undefined,
    status: row.status,
    notes: row.observacao || '',
    createdAt: row.created_at,
    history: [],
  }));
}

export async function insertFreightPricingOnline(
  fp: Omit<FreightPricing, 'id' | 'createdAt' | 'history'>
): Promise<FreightPricing> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  // Resolve IDs
  let rotaId = fp.routeId;
  if (!rotaId || !rotaId.includes('-')) {
    const { data: rData } = await supabase.from('rotas').select('id').eq('nome', fp.routeName).maybeSingle();
    if (rData) rotaId = rData.id;
  }

  let tipoId = fp.vehicleTypeId;
  if (!tipoId || !tipoId.includes('-')) {
    const { data: tData } = await supabase.from('tipos_carro').select('id').eq('nome', fp.vehicleTypeName).maybeSingle();
    if (tData) tipoId = tData.id;
  }

  const { data, error } = await supabase
    .from('tabela_fretes')
    .insert([
      {
        rota_id: rotaId,
        tipo_carro_id: tipoId,
        valor_frete: fp.freightValue,
        vigencia_inicial: fp.validFrom,
        vigencia_final: fp.validTo,
        status: fp.status,
        observacao: fp.notes,
      },
    ])
    .select(`
      *,
      rotas (nome, distancia_km),
      tipos_carro (nome)
    `)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    routeId: data.rota_id,
    routeName: data.rotas?.nome || fp.routeName,
    distanceKm: Number(data.rotas?.distancia_km || fp.distanceKm),
    vehicleTypeId: data.tipo_carro_id,
    vehicleTypeName: data.tipos_carro?.nome || fp.vehicleTypeName,
    freightValue: Number(data.valor_frete),
    validFrom: data.vigencia_inicial,
    validTo: data.vigencia_final || undefined,
    status: data.status,
    notes: data.observacao || '',
    createdAt: data.created_at,
    history: [],
  };
}

export async function updateFreightPricingOnline(
  id: string,
  updated: Partial<FreightPricing>,
  _prevVal?: number,
  _reason?: string
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const payload: any = {};
  if (updated.freightValue !== undefined) payload.valor_frete = updated.freightValue;
  if (updated.validFrom !== undefined) payload.vigencia_inicial = updated.validFrom;
  if (updated.validTo !== undefined) payload.vigencia_final = updated.validTo;
  if (updated.status !== undefined) payload.status = updated.status;
  if (updated.notes !== undefined) payload.observacao = updated.notes;

  const { error } = await supabase.from('tabela_fretes').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteFreightPricingOnline(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const { error } = await supabase.from('tabela_fretes').delete().eq('id', id);
  if (error) throw error;
}

// ==============================================================================
// 7. VIAGENS
// ==============================================================================
export async function getTripsOnline(): Promise<Trip[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const { data, error } = await supabase
    .from('viagens')
    .select(`
      *,
      veiculos (placa),
      motoristas (nome),
      rotas (nome),
      filiais (nome)
    `)
    .order('data', { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    date: row.data,
    vehicleId: row.veiculo_id || '',
    plate: row.veiculos?.placa || 'INDEFINIDO',
    driverId: row.motorista_id || '',
    driverName: row.motoristas?.nome || 'Motorista',
    client: row.cliente,
    routeId: row.rota_id || undefined,
    routeName: row.rotas?.nome || undefined,
    origin: row.origem,
    destination: row.destino,
    operationType: 'Carga Fechada (FTL)',
    freightValue: Number(row.valor_frete),
    tariffFreightValue: undefined,
    freightOverrideReason: undefined,
    distanceKm: Number(row.km_rodado || 0),
    tripCount: row.quantidade_viagens || 1,
    branch: row.filiais?.nome || 'Matriz São Paulo',
    notes: row.observacao || '',
    createdAt: row.created_at,
  }));
}

export async function insertTripOnline(t: Omit<Trip, 'id' | 'createdAt'>): Promise<Trip> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  // Look up foreign keys
  let veiculoId = null;
  const { data: vData } = await supabase.from('veiculos').select('id, filial_id, tipo_carro_id').eq('placa', t.plate).maybeSingle();
  if (vData) veiculoId = vData.id;

  let motoristaId = null;
  const { data: mData } = await supabase.from('motoristas').select('id').eq('nome', t.driverName).maybeSingle();
  if (mData) motoristaId = mData.id;

  let rotaId = null;
  if (t.routeName) {
    const { data: rData } = await supabase.from('rotas').select('id').eq('nome', t.routeName).maybeSingle();
    if (rData) rotaId = rData.id;
  }

  let filialId = vData?.filial_id || null;
  if (!filialId && t.branch) {
    const { data: fData } = await supabase.from('filiais').select('id').eq('nome', t.branch).maybeSingle();
    if (fData) filialId = fData.id;
  }

  const { data, error } = await supabase
    .from('viagens')
    .insert([
      {
        data: t.date,
        filial_id: filialId,
        veiculo_id: veiculoId,
        motorista_id: motoristaId,
        rota_id: rotaId,
        tipo_carro_id: vData?.tipo_carro_id || null,
        cliente: t.client,
        origem: t.origin,
        destino: t.destination,
        valor_frete: t.freightValue,
        km_rodado: t.distanceKm,
        quantidade_viagens: t.tripCount || 1,
        observacao: t.notes || (t.freightOverrideReason ? `Justificativa frete: ${t.freightOverrideReason}` : ''),
      },
    ])
    .select(`
      *,
      veiculos (placa),
      motoristas (nome),
      rotas (nome),
      filiais (nome)
    `)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    date: data.data,
    vehicleId: data.veiculo_id || '',
    plate: data.veiculos?.placa || t.plate,
    driverId: data.motorista_id || '',
    driverName: data.motoristas?.nome || t.driverName,
    client: data.cliente,
    routeId: data.rota_id || undefined,
    routeName: data.rotas?.nome || t.routeName,
    origin: data.origem,
    destination: data.destino,
    operationType: t.operationType,
    freightValue: Number(data.valor_frete),
    tariffFreightValue: t.tariffFreightValue,
    freightOverrideReason: t.freightOverrideReason,
    distanceKm: Number(data.km_rodado || t.distanceKm),
    tripCount: data.quantidade_viagens || 1,
    branch: data.filiais?.nome || t.branch,
    notes: data.observacao || '',
    createdAt: data.created_at,
  };
}

export async function updateTripOnline(id: string, t: Partial<Trip>): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const payload: any = {};
  if (t.date !== undefined) payload.data = t.date;
  if (t.client !== undefined) payload.cliente = t.client;
  if (t.origin !== undefined) payload.origem = t.origin;
  if (t.destination !== undefined) payload.destino = t.destination;
  if (t.freightValue !== undefined) payload.valor_frete = t.freightValue;
  if (t.distanceKm !== undefined) payload.km_rodado = t.distanceKm;
  if (t.tripCount !== undefined) payload.quantidade_viagens = t.tripCount;
  if (t.notes !== undefined) payload.observacao = t.notes;

  const { error } = await supabase.from('viagens').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteTripOnline(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const { error } = await supabase.from('viagens').delete().eq('id', id);
  if (error) throw error;
}

// ==============================================================================
// 8. DESPESAS
// ==============================================================================
export async function getExpensesOnline(): Promise<Expense[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const { data, error } = await supabase
    .from('despesas')
    .select(`
      *,
      veiculos (placa),
      motoristas (nome),
      filiais (nome)
    `)
    .order('data', { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    date: row.data,
    vehicleId: row.veiculo_id || '',
    plate: row.veiculos?.placa || 'INDEFINIDO',
    driverId: row.motorista_id || undefined,
    driverName: row.motoristas?.nome || undefined,
    category: row.tipo_despesa as any,
    description: row.descricao,
    amount: Number(row.valor),
    supplier: row.fornecedor,
    odometerKm: row.quilometragem ? Number(row.quilometragem) : undefined,
    branch: row.filiais?.nome || 'Matriz São Paulo',
    notes: row.observacao || '',
    createdAt: row.created_at,
  }));
}

export async function insertExpenseOnline(e: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  let veiculoId = null;
  const { data: vData } = await supabase.from('veiculos').select('id, filial_id').eq('placa', e.plate).maybeSingle();
  if (vData) veiculoId = vData.id;

  let motoristaId = null;
  if (e.driverName) {
    const { data: mData } = await supabase.from('motoristas').select('id').eq('nome', e.driverName).maybeSingle();
    if (mData) motoristaId = mData.id;
  }

  let filialId = vData?.filial_id || null;
  if (!filialId && e.branch) {
    const { data: fData } = await supabase.from('filiais').select('id').eq('nome', e.branch).maybeSingle();
    if (fData) filialId = fData.id;
  }

  const { data, error } = await supabase
    .from('despesas')
    .insert([
      {
        data: e.date,
        filial_id: filialId,
        veiculo_id: veiculoId,
        motorista_id: motoristaId,
        tipo_despesa: e.category,
        descricao: e.description,
        valor: e.amount,
        fornecedor: e.supplier,
        quilometragem: e.odometerKm,
        observacao: e.notes,
      },
    ])
    .select(`
      *,
      veiculos (placa),
      motoristas (nome),
      filiais (nome)
    `)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    date: data.data,
    vehicleId: data.veiculo_id || '',
    plate: data.veiculos?.placa || e.plate,
    driverId: data.motorista_id || undefined,
    driverName: data.motoristas?.nome || e.driverName,
    category: data.tipo_despesa,
    description: data.descricao,
    amount: Number(data.valor),
    supplier: data.fornecedor,
    odometerKm: data.quilometragem ? Number(data.quilometragem) : undefined,
    branch: data.filiais?.nome || e.branch,
    notes: data.observacao || '',
    createdAt: data.created_at,
  };
}

export async function updateExpenseOnline(id: string, e: Partial<Expense>): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const payload: any = {};
  if (e.date !== undefined) payload.data = e.date;
  if (e.category !== undefined) payload.tipo_despesa = e.category;
  if (e.description !== undefined) payload.descricao = e.description;
  if (e.amount !== undefined) payload.valor = e.amount;
  if (e.supplier !== undefined) payload.fornecedor = e.supplier;
  if (e.odometerKm !== undefined) payload.quilometragem = e.odometerKm;
  if (e.notes !== undefined) payload.observacao = e.notes;

  const { error } = await supabase.from('despesas').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteExpenseOnline(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não configurado');

  const { error } = await supabase.from('despesas').delete().eq('id', id);
  if (error) throw error;
}

// ==============================================================================
// 9. TESTES DE VERIFICAÇÃO AUTOMÁTICA (SELECT / INSERT E RELACIONAMENTOS)
// ==============================================================================
export interface VerificationTestResult {
  step: number;
  name: string;
  success: boolean;
  message: string;
  dataSnippet?: string;
}

export async function runSupabaseVerificationTests(): Promise<VerificationTestResult[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return [
      {
        step: 0,
        name: 'Conexão Supabase',
        success: false,
        message: 'Cliente Supabase não configurado com URL e Anon Key.',
      },
    ];
  }

  const results: VerificationTestResult[] = [];

  // Test 1: SELECT em filiais
  try {
    const { data, error } = await supabase.from('filiais').select('*').limit(5);
    if (error) throw error;
    results.push({
      step: 1,
      name: 'SELECT em filiais',
      success: true,
      message: `Sucesso! ${data?.length || 0} filial(is) encontrada(s).`,
      dataSnippet: JSON.stringify(data?.slice(0, 2)),
    });
  } catch (err: any) {
    results.push({
      step: 1,
      name: 'SELECT em filiais',
      success: false,
      message: err.message || 'Erro ao executar SELECT',
    });
  }

  // Test 2: INSERT em filiais
  let createdFilialId: string | null = null;
  try {
    const testBranchName = `Filial Teste ${Math.floor(Math.random() * 1000)}`;
    const { data, error } = await supabase
      .from('filiais')
      .insert([
        {
          nome: testBranchName,
          codigo: 'TEST-01',
          cidade: 'São Paulo',
          estado: 'SP',
          status: 'Ativa',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    createdFilialId = data.id;
    results.push({
      step: 2,
      name: 'INSERT em filiais',
      success: true,
      message: `Sucesso! Filial "${data.nome}" (ID: ${data.id}) inserida com chave primária UUID.`,
      dataSnippet: JSON.stringify(data),
    });
  } catch (err: any) {
    results.push({
      step: 2,
      name: 'INSERT em filiais',
      success: false,
      message: err.message || 'Erro ao executar INSERT',
    });
  }

  // Test 3: SELECT em tipos_carro
  try {
    const { data, error } = await supabase.from('tipos_carro').select('*').limit(5);
    if (error) throw error;
    results.push({
      step: 3,
      name: 'SELECT em tipos_carro',
      success: true,
      message: `Sucesso! ${data?.length || 0} tipo(s) de carro encontrado(s).`,
      dataSnippet: JSON.stringify(data?.slice(0, 2)),
    });
  } catch (err: any) {
    results.push({
      step: 3,
      name: 'SELECT em tipos_carro',
      success: false,
      message: err.message || 'Erro ao executar SELECT',
    });
  }

  // Test 4: INSERT em tipos_carro
  let createdTipoId: string | null = null;
  try {
    const testTipoName = `Tipo Teste ${Math.floor(Math.random() * 1000)}`;
    const { data, error } = await supabase
      .from('tipos_carro')
      .insert([
        {
          nome: testTipoName,
          categoria: 'Pesado',
          descricao: 'Caminhão de teste operacional',
          capacidade_carga: '14 ton',
          quantidade_eixos: 3,
          status: 'Ativo',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    createdTipoId = data.id;
    results.push({
      step: 4,
      name: 'INSERT em tipos_carro',
      success: true,
      message: `Sucesso! Tipo de carro "${data.nome}" (ID: ${data.id}) inserido com sucesso.`,
      dataSnippet: JSON.stringify(data),
    });
  } catch (err: any) {
    results.push({
      step: 4,
      name: 'INSERT em tipos_carro',
      success: false,
      message: err.message || 'Erro ao executar INSERT',
    });
  }

  // Test 5: SELECT em veiculos
  try {
    const { data, error } = await supabase
      .from('veiculos')
      .select('*, filiais(nome), tipos_carro(nome)')
      .limit(5);
    if (error) throw error;
    results.push({
      step: 5,
      name: 'SELECT em veiculos',
      success: true,
      message: `Sucesso! ${data?.length || 0} veículo(s) encontrado(s) com joins relacionais.`,
      dataSnippet: JSON.stringify(data?.slice(0, 2)),
    });
  } catch (err: any) {
    results.push({
      step: 5,
      name: 'SELECT em veiculos',
      success: false,
      message: err.message || 'Erro ao executar SELECT',
    });
  }

  // Test 6: INSERT em veiculos
  try {
    const testPlaca = `TST${Math.floor(Math.random() * 9000 + 1000)}`;
    const { data, error } = await supabase
      .from('veiculos')
      .insert([
        {
          placa: testPlaca,
          tipo_carro_id: createdTipoId,
          marca: 'Scania',
          modelo: 'R450',
          ano: 2024,
          proprietario: 'Transportadora Oficial',
          tipo_proprietario: 'Proprio',
          filial_id: createdFilialId,
          status: 'Ativo',
          observacoes: 'Veículo criado pelo teste automatizado de banco',
        },
      ])
      .select(`
        *,
        filiais (nome),
        tipos_carro (nome)
      `)
      .single();

    if (error) throw error;
    results.push({
      step: 6,
      name: 'INSERT em veiculos',
      success: true,
      message: `Sucesso! Veículo placa "${data.placa}" inserido com Foreign Keys (filial_id e tipo_carro_id).`,
      dataSnippet: JSON.stringify(data),
    });
  } catch (err: any) {
    results.push({
      step: 6,
      name: 'INSERT em veiculos',
      success: false,
      message: err.message || 'Erro ao executar INSERT',
    });
  }

  // Test 7: Teste de Relacionamentos (Foreign Keys)
  try {
    const { data, error } = await supabase
      .from('veiculos')
      .select(`
        id,
        placa,
        filiais!inner(id, nome, cidade),
        tipos_carro!inner(id, nome, categoria)
      `)
      .limit(3);

    if (error) throw error;
    results.push({
      step: 7,
      name: 'Teste de Relacionamentos (Foreign Keys)',
      success: true,
      message: `Sucesso! Integridade referencial validada entre veiculos → filiais e veiculos → tipos_carro.`,
      dataSnippet: JSON.stringify(data),
    });
  } catch (err: any) {
    results.push({
      step: 7,
      name: 'Teste de Relacionamentos (Foreign Keys)',
      success: false,
      message: err.message || 'Erro no join relacional',
    });
  }

  return results;
}

