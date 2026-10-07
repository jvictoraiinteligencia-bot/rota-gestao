export type OwnershipType = 'Próprio' | 'Agregado' | 'Terceiro';
export type VehicleStatus = 'Ativo' | 'Inativo';
export type DriverStatus = 'Ativo' | 'Inativo';
export type DriverType = 'Funcionário' | 'Agregado' | 'Terceiro';
export type CnhCategory = 'B' | 'C' | 'D' | 'E';
export type BranchStatus = 'Ativa' | 'Inativa';
export type CommonStatus = 'Ativo' | 'Inativo';

export type VehicleTypeCategory = 'Leve' | 'Médio' | 'Semipesado' | 'Pesado' | 'Extrapesado';

export interface VehicleTypeModel {
  id: string;
  name: string; // ex: VUC, 3/4, Toco, Truck, Bitruck, Carreta, Bitrem
  category: VehicleTypeCategory;
  description: string;
  payloadCapacity: string; // ex: '3,5 ton', '14 ton'
  axlesCount: number; // ex: 2, 3, 4, 6, 7
  status: CommonStatus;
  notes?: string;
  createdAt: string;
}

export interface ClientModel {
  id: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  status: CommonStatus;
  createdAt: string;
}

export interface BlockModel {
  id: string;
  code: string;
  name: string; // ex: "SECOS", "FRIOS", "HORTIFRUTI"
  status: CommonStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface RouteModel {
  id: string;
  code: string; // ex: R001, R002
  name: string; // ex: "São Luís → Santa Inês"
  origin: string; // ex: "São Luís - MA"
  destination: string; // ex: "Santa Inês - MA"
  branch: string;
  clientId: string; // vazio em rotas antigas cadastradas antes do cliente
  client: string;
  blockId: string; // vazio em rotas antigas ainda não vinculadas ao cadastro de blocos
  block: string; // nome do bloco cadastrado; em rotas antigas, o texto livre original
  distanceKm: number;
  operationType: string;
  status: CommonStatus;
  notes?: string;
  createdAt: string;
}

export interface FreightPriceHistory {
  id: string;
  priceTableId: string;
  previousValue: number;
  newValue: number;
  changedAt: string; // YYYY-MM-DD
  reason?: string;
}

export interface FreightPricing {
  id: string;
  routeId: string;
  routeName: string;
  distanceKm: number;
  vehicleTypeId: string;
  vehicleTypeName: string;
  freightValue: number; // R$
  validFrom: string; // YYYY-MM-DD
  validTo?: string; // YYYY-MM-DD
  status: CommonStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  history?: FreightPriceHistory[];
}

export interface Branch {
  id: string;
  name: string; // ex: 'Matriz São Paulo', 'Filial Curitiba'
  code: string; // ex: 'FIL-01'
  cnpj: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  manager: string; // Responsável / Gerente da Filial
  status: BranchStatus;
  notes?: string;
  createdAt: string;
}

export type ExpenseCategory =
  | 'Combustível'
  | 'Manutenção'
  | 'Peças'
  | 'Pneus'
  | 'Óleo/Lubrificantes'
  | 'Pedágio'
  | 'Lavagem'
  | 'Seguro'
  | 'Documentação'
  | 'Multas'
  | 'Outros';

export interface Vehicle {
  id: string;
  plate: string;
  vehicleType: string; // ex: 'Carreta LS', 'Bitrem', 'Truck', 'Toco', 'VUC'
  brandModel: string; // ex: 'Volvo FH 540', 'Scania R450'
  year: number;
  owner: string; // ex: 'TransRota Logística', 'João Carlos Silveira'
  ownershipType: OwnershipType;
  branch: string; // ex: 'Matriz São Paulo', 'Filial Curitiba'
  status: VehicleStatus;
  notes?: string;
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  cnh: string;
  cnhCategory: CnhCategory;
  cnhExpiry: string; // YYYY-MM-DD
  driverType: DriverType;
  branch: string;
  status: DriverStatus;
  notes?: string;
  createdAt: string;
}

export interface Trip {
  id: string;
  date: string; // YYYY-MM-DD
  vehicleId: string;
  plate: string;
  driverId: string;
  driverName: string;
  client: string;
  routeId?: string;
  routeName?: string;
  origin: string; // ex: 'São Paulo - SP'
  destination: string; // ex: 'Curitiba - PR'
  operationType: string; // ex: 'Carga Fechada (FTL)', 'Fracionada', 'Granel'
  freightValue: number; // R$
  tariffFreightValue?: number; // Valor tabelado original
  freightOverrideReason?: string; // Justificativa de alteração manual
  distanceKm: number;
  tripCount: number; // default 1
  branch: string;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  vehicleId: string;
  plate: string;
  driverId?: string;
  driverName?: string;
  category: ExpenseCategory;
  description: string;
  amount: number; // R$
  supplier: string; // ex: 'Posto RodoGraal', 'Michelin Pneus'
  odometerKm?: number;
  branch: string;
  notes?: string;
  createdAt: string;
}

export type PeriodFilter =
  | 'all'
  | 'thisMonth'
  | 'lastMonth'
  | 'last30days'
  | 'thisQuarter'
  | 'thisYear'
  | 'custom';

export interface FilterState {
  period: PeriodFilter;
  startDate?: string;
  endDate?: string;
  branch: string;
  plate: string;
  driverId: string;
  vehicleType: string;
  ownershipType: string;
  searchQuery?: string;
}

export type ActiveView =
  | 'dashboard'
  | 'vehicles'
  | 'drivers'
  | 'branches'
  | 'clients'
  | 'blocks'
  | 'routes-pricing'
  | 'trips'
  | 'expenses'
  | 'vehicle-analysis'
  | 'reports';
