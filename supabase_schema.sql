-- ==============================================================================
-- RotaGestão - Schema Oficial PostgreSQL para Supabase
-- Sistema de Gestão Financeira e Operacional de Transportadora
-- ==============================================================================

-- Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TABELA: filiais
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.filiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    codigo TEXT,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Ativa' CHECK (status IN ('Ativa', 'Inativa')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 2. TABELA: tipos_carro
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tipos_carro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    categoria TEXT NOT NULL,
    descricao TEXT,
    capacidade_carga TEXT,
    quantidade_eixos INTEGER NOT NULL DEFAULT 2,
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. TABELA: veiculos
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.veiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placa TEXT NOT NULL UNIQUE,
    tipo_carro_id UUID REFERENCES public.tipos_carro(id) ON DELETE SET NULL,
    marca TEXT,
    modelo TEXT,
    ano INTEGER NOT NULL,
    proprietario TEXT NOT NULL,
    tipo_proprietario TEXT NOT NULL DEFAULT 'Proprio' CHECK (tipo_proprietario IN ('Proprio', 'Agregado', 'Terceiro')),
    filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 4. TABELA: motoristas
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.motoristas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL UNIQUE,
    telefone TEXT,
    cnh TEXT NOT NULL,
    categoria_cnh TEXT NOT NULL,
    validade_cnh DATE NOT NULL,
    tipo_motorista TEXT NOT NULL DEFAULT 'Funcionario' CHECK (tipo_motorista IN ('Funcionario', 'Agregado', 'Terceiro')),
    filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 5. TABELA: rotas
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.rotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    origem TEXT NOT NULL,
    destino TEXT NOT NULL,
    filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
    distancia_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tipo_operacao TEXT NOT NULL DEFAULT 'Carga Fechada (FTL)',
    bloco TEXT,
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Bancos criados antes da coluna bloco (não altera registros existentes)
ALTER TABLE public.rotas ADD COLUMN IF NOT EXISTS bloco TEXT;

-- ==============================================================================
-- 6. TABELA: tabela_fretes (ROTA + TIPO DE CARRO = VALOR DO FRETE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tabela_fretes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rota_id UUID REFERENCES public.rotas(id) ON DELETE CASCADE,
    tipo_carro_id UUID REFERENCES public.tipos_carro(id) ON DELETE CASCADE,
    valor_frete NUMERIC(12, 2) NOT NULL,
    vigencia_inicial DATE NOT NULL DEFAULT CURRENT_DATE,
    vigencia_final DATE,
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    observacao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 7. TABELA: viagens
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.viagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
    veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
    motorista_id UUID REFERENCES public.motoristas(id) ON DELETE SET NULL,
    rota_id UUID REFERENCES public.rotas(id) ON DELETE SET NULL,
    tipo_carro_id UUID REFERENCES public.tipos_carro(id) ON DELETE SET NULL,
    cliente TEXT NOT NULL,
    origem TEXT NOT NULL,
    destino TEXT NOT NULL,
    valor_frete NUMERIC(12, 2) NOT NULL,
    km_rodado NUMERIC(10, 2) NOT NULL DEFAULT 0,
    quantidade_viagens INTEGER NOT NULL DEFAULT 1,
    observacao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 8. TABELA: despesas
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.despesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
    veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
    motorista_id UUID REFERENCES public.motoristas(id) ON DELETE SET NULL,
    tipo_despesa TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor NUMERIC(12, 2) NOT NULL,
    fornecedor TEXT NOT NULL,
    quilometragem NUMERIC(10, 2),
    observacao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 9. TABELA: clientes
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    documento TEXT,
    telefone TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 10. TABELA: fornecedores
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    documento TEXT,
    telefone TEXT,
    categoria TEXT,
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 11. ÍNDICES DE PERFORMANCE PARA FILTROS E RELATÓRIOS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_filiais_status ON public.filiais(status);

CREATE INDEX IF NOT EXISTS idx_tipos_carro_nome ON public.tipos_carro(nome);
CREATE INDEX IF NOT EXISTS idx_tipos_carro_status ON public.tipos_carro(status);

CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON public.veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_veiculos_filial_id ON public.veiculos(filial_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_tipo_carro_id ON public.veiculos(tipo_carro_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_status ON public.veiculos(status);

CREATE INDEX IF NOT EXISTS idx_motoristas_cpf ON public.motoristas(cpf);
CREATE INDEX IF NOT EXISTS idx_motoristas_filial_id ON public.motoristas(filial_id);
CREATE INDEX IF NOT EXISTS idx_motoristas_status ON public.motoristas(status);

CREATE INDEX IF NOT EXISTS idx_rotas_codigo ON public.rotas(codigo);
CREATE INDEX IF NOT EXISTS idx_rotas_filial_id ON public.rotas(filial_id);
CREATE INDEX IF NOT EXISTS idx_rotas_status ON public.rotas(status);
CREATE INDEX IF NOT EXISTS idx_rotas_bloco ON public.rotas(bloco);

CREATE INDEX IF NOT EXISTS idx_tabela_fretes_comb ON public.tabela_fretes(rota_id, tipo_carro_id);
CREATE INDEX IF NOT EXISTS idx_tabela_fretes_status ON public.tabela_fretes(status);

CREATE INDEX IF NOT EXISTS idx_viagens_data ON public.viagens(data);
CREATE INDEX IF NOT EXISTS idx_viagens_filial_id ON public.viagens(filial_id);
CREATE INDEX IF NOT EXISTS idx_viagens_veiculo_id ON public.viagens(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_viagens_motorista_id ON public.viagens(motorista_id);
CREATE INDEX IF NOT EXISTS idx_viagens_rota_id ON public.viagens(rota_id);
CREATE INDEX IF NOT EXISTS idx_viagens_tipo_carro_id ON public.viagens(tipo_carro_id);

CREATE INDEX IF NOT EXISTS idx_despesas_data ON public.despesas(data);
CREATE INDEX IF NOT EXISTS idx_despesas_filial_id ON public.despesas(filial_id);
CREATE INDEX IF NOT EXISTS idx_despesas_veiculo_id ON public.despesas(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_despesas_tipo ON public.despesas(tipo_despesa);

-- ==============================================================================
-- 12. SEGURANÇA: ROW LEVEL SECURITY (RLS) & POLÍTICAS
-- ==============================================================================
ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_carro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabela_fretes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso total para a aplicação (anon e authenticated)
DO $$
BEGIN
    -- filiais
    DROP POLICY IF EXISTS "allow_all_filiais" ON public.filiais;
    CREATE POLICY "allow_all_filiais" ON public.filiais FOR ALL TO public USING (true) WITH CHECK (true);

    -- tipos_carro
    DROP POLICY IF EXISTS "allow_all_tipos_carro" ON public.tipos_carro;
    CREATE POLICY "allow_all_tipos_carro" ON public.tipos_carro FOR ALL TO public USING (true) WITH CHECK (true);

    -- veiculos
    DROP POLICY IF EXISTS "allow_all_veiculos" ON public.veiculos;
    CREATE POLICY "allow_all_veiculos" ON public.veiculos FOR ALL TO public USING (true) WITH CHECK (true);

    -- motoristas
    DROP POLICY IF EXISTS "allow_all_motoristas" ON public.motoristas;
    CREATE POLICY "allow_all_motoristas" ON public.motoristas FOR ALL TO public USING (true) WITH CHECK (true);

    -- rotas
    DROP POLICY IF EXISTS "allow_all_rotas" ON public.rotas;
    CREATE POLICY "allow_all_rotas" ON public.rotas FOR ALL TO public USING (true) WITH CHECK (true);

    -- tabela_fretes
    DROP POLICY IF EXISTS "allow_all_tabela_fretes" ON public.tabela_fretes;
    CREATE POLICY "allow_all_tabela_fretes" ON public.tabela_fretes FOR ALL TO public USING (true) WITH CHECK (true);

    -- viagens
    DROP POLICY IF EXISTS "allow_all_viagens" ON public.viagens;
    CREATE POLICY "allow_all_viagens" ON public.viagens FOR ALL TO public USING (true) WITH CHECK (true);

    -- despesas
    DROP POLICY IF EXISTS "allow_all_despesas" ON public.despesas;
    CREATE POLICY "allow_all_despesas" ON public.despesas FOR ALL TO public USING (true) WITH CHECK (true);

    -- clientes
    DROP POLICY IF EXISTS "allow_all_clientes" ON public.clientes;
    CREATE POLICY "allow_all_clientes" ON public.clientes FOR ALL TO public USING (true) WITH CHECK (true);

    -- fornecedores
    DROP POLICY IF EXISTS "allow_all_fornecedores" ON public.fornecedores;
    CREATE POLICY "allow_all_fornecedores" ON public.fornecedores FOR ALL TO public USING (true) WITH CHECK (true);
END $$;

-- ==============================================================================
-- 13. HABILITAR SUPABASE REALTIME NAS TABELAS
-- ==============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.viagens;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.despesas;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.veiculos;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.motoristas;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tabela_fretes;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rotas;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.filiais;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

-- Notificar PostgREST para recarregar o schema cache imediatamente
NOTIFY pgrst, 'reload schema';
